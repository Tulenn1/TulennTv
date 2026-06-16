---
name: react-patterns
description: React conventions with hooks, components, TanStack Query, React Router, testing, and clean architecture patterns.
license: MIT
compatibility: both
metadata:
  audience: implementers
  type: skill
---

## What I Do

Provide React-specific coding conventions for the implementer subagent.
Loads on top of `typescript-patterns` (you must also follow those conventions).
Active when the implementer detects `react` in project dependencies (`package.json`).

---

## Project Structure

```
  src/
    components/          # Shared UI components (presentational, reusable)
      ui/                # Primitive components: Button, Input, Modal, Card
      layout/            # Layout components: Header, Sidebar, Footer
    features/            # Feature-specific modules (one directory per feature)
      users/
        components/      # Feature-specific components
        hooks/           # Feature-specific custom hooks
        services/        # Feature-specific API calls / data fetching
        types.ts         # Feature-specific types
      orders/
        components/
        hooks/
        services/
        types.ts
    hooks/               # Shared custom hooks (useDebounce, useLocalStorage)
    pages/               # Route-level page components
    services/            # Shared API client, auth, data fetching
    store/               # Global state (Zustand, Context, Redux)
    types/               # Shared TypeScript types and interfaces
    utils/               # Pure utility functions (formatDate, cn, validators)
    App.tsx              # Root component with providers and router
    main.tsx             # Entry point, ReactDOM.createRoot
  tests/
    unit/
    integration/
    e2e/
    factories/           # Test data factories
    mocks/               # MSW handlers, mock components
```

Key rules:
- `components/` are pure presentational components — no business logic, no data fetching
- `features/` contain feature-specific logic (components + hooks + services co-located)
- `hooks/` are reusable across features — no feature-specific hooks here
- `pages/` are thin: compose feature components, handle layout, don't contain logic
- `services/` contain API calls wrapped in TanStack Query hooks or plain async functions
- `store/` is for truly global state only (auth, theme, notifications)

---

## Component Conventions

### Functional Components Only

Never use class components. All components are functions with typed props:

```tsx
// src/components/ui/Button.tsx
interface ButtonProps {
  /** The visual variant of the button */
  variant?: "primary" | "secondary" | "danger";
  /** The size preset */
  size?: "sm" | "md" | "lg";
  /** Disabled state */
  disabled?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Button contents */
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  disabled = false,
  onClick,
  children,
}: ButtonProps) {
  return (
    <button
      className={cn(styles.button, styles[variant], styles[size])}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
```

- Props interface named `{Component}Props` — always above the component
- Default values in destructuring, never use `defaultProps`
- Use `React.ReactNode` for `children`, not `ReactNode` (import cost)
- Extract inline objects/styles to constants outside the component when possible

### Component Composition

Prefer composition over inheritance. Use these patterns:

```tsx
// Compound component pattern for complex widgets
function Tabs({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(0);
  // ...
}
Tabs.List = TabsList;
Tabs.Tab = Tab;
Tabs.Panel = TabsPanel;

// Usage
<Tabs>
  <Tabs.List>
    <Tabs.Tab>Profile</Tabs.Tab>
    <Tabs.Tab>Settings</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel><Profile /></Tabs.Panel>
  <Tabs.Panel><Settings /></Tabs.Panel>
</Tabs>
```

- Compound components for complex interactive widgets (Tabs, Accordion, Select)
- Render props when the parent needs to control what the child renders
- `React.cloneElement` only when absolutely necessary

### File Structure Per Component

```
  components/ui/Button/
    Button.tsx           # Component implementation
    Button.module.css    # Scoped styles (if CSS Modules)
    Button.test.tsx      # Unit tests
    index.ts             # Re-export only (no logic, no side effects)
```

-- A component folder should have ONE component. Split if you find multiple.
-- The `index.ts` barrel file re-exports only — never contains logic.

---

## State Management

### Local State

Use `useState` for component-local transient state:

```tsx
const [isOpen, setIsOpen] = useState(false);
const [inputValue, setInputValue] = useState("");
```

### Derived State

Never duplicate state. Derive it from existing state:

```tsx
// BAD — duplicated state, risk of desync
const [items, setItems] = useState<Item[]>([]);
const [itemCount, setItemCount] = useState(0);

// GOOD — derived from source of truth
const [items, setItems] = useState<Item[]>([]);
const itemCount = items.length;
```

- Use `useMemo` for expensive computations
- Use `useCallback` only when passing callbacks to memoized components

### Complex Component State with useReducer

Use `useReducer` when state has multiple sub-values or transitions:

```tsx
type ModalState =
  | { status: "closed" }
  | { status: "opening"; id: string }
  | { status: "open"; id: string; data: ModalData }
  | { status: "error"; error: string };

type ModalAction =
  | { type: "OPEN"; id: string }
  | { type: "LOADED"; data: ModalData }
  | { type: "CLOSE" }
  | { type: "FAIL"; error: string };

function modalReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case "OPEN":
      return { status: "opening", id: action.id };
    case "LOADED":
      return { status: "open", id: state.status === "opening" ? state.id : "", data: action.data };
    case "CLOSE":
      return { status: "closed" };
    case "FAIL":
      return { status: "error", error: action.error };
  }
}
```

- Discriminated unions for state — makes impossible states unrepresentable
- Action types as string literals in a union, not a magic string enum

### Global State

Three tiers, in order of preference:

1. **React Context** — for truly global data with infrequent updates (auth, theme, locale)
2. **Zustand** — for medium-complexity global state with selectors and middleware
3. **Redux Toolkit** — only for very large apps with complex cross-cutting state

```tsx
// Zustand example
import { create } from "zustand";

interface AuthStore {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  login: async (email, password) => {
    const user = await authService.login(email, password);
    set({ user });
  },
  logout: () => set({ user: null }),
}));
```

- Never pass the entire store to components — use selectors to subscribe to slices
- Actions can be async but should be thin — delegate to services

---

## Data Fetching

### TanStack Query (React Query)

Use TanStack Query for ALL server state. Never fetch data in `useEffect`:

```tsx
// src/features/users/services/user-queries.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "@/services/api";

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: userApi.list,
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ["users", id],
    queryFn: () => userApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
```

- Query key convention: `[resource, ...params]` — enables hierarchical invalidation
- Always set `enabled` for queries that depend on user input (e.g., search queries)
- Mutations invalidate affected queries in `onSuccess` — never manually refetch
- Extract query/mutation hooks into `{feature}/services/` — never inline `useQuery` in components

### Loading, Empty, Error States

Every data-driven component must handle all three states:

```tsx
function UserList() {
  const { data: users, isLoading, isError, error } = useUsers();

  if (isLoading) return <Skeleton variant="list" count={5} />;
  if (isError) return <ErrorDisplay message={error.message} onRetry={refetch} />;
  if (users.length === 0) return <EmptyState icon={<UsersIcon />} title="No users yet" />;

  return users.map((user) => <UserCard key={user.id} user={user} />);
}
```

- Extract skeleton/error/empty states into consistent UI components
- Never render `null` for loading or empty — the user needs visual feedback

---

## Routing

### React Router v6 Patterns

```tsx
// src/App.tsx
import { createBrowserRouter, RouterProvider } from "react-router-dom";

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        lazy: () => import("@/pages/Dashboard"),
      },
      {
        path: "users",
        lazy: () => import("@/pages/users/UserList"),
      },
      {
        path: "users/:id",
        lazy: () => import("@/pages/users/UserDetail"),
      },
      {
        path: "settings",
        lazy: () => import("@/pages/settings/SettingsLayout"),
        children: [
          { index: true, lazy: () => import("@/pages/settings/Profile") },
          { path: "billing", lazy: () => import("@/pages/settings/Billing") },
        ],
      },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
```

- Use `lazy()` for code-splitting every route (each page is its own chunk)
- One `ErrorBoundary` per layout level — errors bubble up
- Use nested routes with `<Outlet />` for shared layouts
- Route params are typed via `useParams` — narrow with Zod if uncertain
- Navigation via `useNavigate` with URL paths, never direct `window.location`

### Protected Routes

```tsx
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
```

- Redirect back to the original page after login using `location.state.from`
- Use `replace` so the browser back button works correctly

---

## Styling

### CSS Modules (Default)

Use CSS Modules for component-scoped styles:

```css
/* Button.module.css */
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.primary {
  background-color: var(--color-primary);
  color: white;
}

.sm { padding: 4px 12px; font-size: 14px; }
.md { padding: 8px 16px; font-size: 16px; }
.lg { padding: 12px 24px; font-size: 18px; }
```

```tsx
import styles from "./Button.module.css";
import { cn } from "@/utils/cn";

export function Button({ variant = "primary", size = "md", ... }: ButtonProps) {
  return (
    <button className={cn(styles.button, styles[variant], styles[size])}>
      ...
    </button>
  );
}
```

- One CSS Module per component, co-located in the component folder
- CSS custom properties for design tokens (colors, spacing, typography)
- `cn()` utility for conditional class merging (clsx or tailwind-merge)

### Tailwind CSS (Alternative)

If the project uses Tailwind, follow these rules:

```tsx
function Button({ variant, size, className, ...props }: ButtonProps) {
  const variantStyles: Record<string, string> = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
  };

  const sizeStyles: Record<string, string> = {
    sm: "px-3 py-1 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    />
  );
}
```

- Extract repeating utility combos into named variables (variant/size maps)
- Use `cn()` for merging external `className` with internal styles
- Never use `!important` — restructure variants instead
- No inline styles (`style={{}}`) — use Tailwind classes or CSS Modules

---

## Form Handling

Use React Hook Form with Zod for validation:

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const userSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2, "Name must be at least 2 characters").max(150),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type UserFormData = z.infer<typeof userSchema>;

function CreateUserForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  const mutation = useCreateUser();

  const onSubmit = (data: UserFormData) => mutation.mutate(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input label="Email" error={errors.email?.message} {...register("email")} />
      <Input label="Name" error={errors.name?.message} {...register("name")} />
      <PasswordInput label="Password" error={errors.password?.message} {...register("password")} />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create User"}
      </Button>
      {mutation.isError && <Alert variant="error">{mutation.error.message}</Alert>}
    </form>
  );
}
```

- Schema defines the shape ONCE — derive TypeScript types with `z.infer`
- Always show field-level errors from `formState.errors`
- Disable submit button during submission or mutation loading
- Show mutation errors as alerts, not as field errors (they're server-side)

---

## Custom Hooks

Hooks encapsulate reusable logic. Every hook starts with `use`:

```tsx
// src/hooks/useDebounce.ts
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

- Hook files go in `src/hooks/` if shared, or `src/features/{name}/hooks/` if feature-specific
- One hook per file
- Always clean up timers, subscriptions, and event listeners in the returned function of `useEffect`
- Document hooks with JSDoc explaining what state they manage and when they update

### Hook Rules

- Never call hooks conditionally — always at the top level of a component or hook
- Never call hooks inside loops, callbacks, or after early returns
- Custom hooks should be pure: same input → same state behavior

---

## TypeScript with React

### Event Handlers

Always type event handler parameters:

```tsx
function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
  setValue(event.target.value);
}

function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
  event.preventDefault();
  // ...
}

function handleKeyDown(event: React.KeyboardEvent) {
  if (event.key === "Escape") closeModal();
}
```

### Ref Typing

```tsx
const inputRef = useRef<HTMLInputElement>(null);

function focusInput() {
  inputRef.current?.focus(); // null-safe access via optional chaining
}
```

### Generic Components

```tsx
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
}

function List<T>({ items, renderItem }: ListProps<T>) {
  return <ul>{items.map(renderItem)}</ul>;
}
```

---

## Testing (React)

### Framework

- **Test runner**: `vitest` (default) or `jest`
- **Component testing**: `@testing-library/react` + `@testing-library/user-event`
- **API mocking**: `msw` (Mock Service Worker)
- **Matchers**: `@testing-library/jest-dom`

### Test Setup

```tsx
// tests/setup.ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
```

### Component Test Example

```tsx
// src/components/forms/CreateUserForm.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateUserForm } from "./CreateUserForm";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>,
  );
}

describe("CreateUserForm", () => {
  it("should show validation errors when fields are empty", async () => {
    renderWithProviders(<CreateUserForm />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /create user/i }));

    expect(await screen.findByText(/invalid email/i)).toBeInTheDocument();
    expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
  });

  it("should submit when all fields are valid", async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<CreateUserForm onSubmit={onSubmit} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/name/i), "Test User");
    await user.type(screen.getByLabelText(/password/i), "securepass123");
    await user.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: "test@example.com",
        name: "Test User",
        password: "securepass123",
      });
    });
  });

  it("should show error alert when mutation fails", async () => {
    server.use(
      http.post("/api/users", () => HttpResponse.error()),
    );
    renderWithProviders(<CreateUserForm />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/name/i), "Test User");
    await user.type(screen.getByLabelText(/password/i), "securepass123");
    await user.click(screen.getByRole("button", { name: /create user/i }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
```

- Use `renderWithProviders` wrapper for components that need QueryClient, Router, Auth, etc.
- Always use `screen.findBy*` for async elements — it waits and retries
- Always use `userEvent.setup()` and await its methods — simulates real user interaction
- Mock API at the network layer with MSW — test real request/response flows
- Never test implementation details (state, methods) — test the rendered output

### Hook Tests

```tsx
// src/hooks/useDebounce.test.ts
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "./useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 500));
    expect(result.current).toBe("hello");
  });

  it("should debounce the value after delay", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: "hello" } },
    );

    rerender({ value: "world" });
    expect(result.current).toBe("hello"); // still old value

    act(() => vi.advanceTimersByTime(500));
    expect(result.current).toBe("world"); // updated after delay
  });
});
```

- Use `renderHook` from `@testing-library/react` for hook tests
- Use fake timers for debounce/timeout hooks
- Test the return value and side effects, not internal implementation

### Test Commands

```bash
npm test                        # Run all tests
npm test -- --coverage          # With coverage
vitest run                      # Single run
vitest                           # Watch mode
vitest run src/features/users/  # Run specific folder
```

---

## Common Patterns

### Container/Presentational Split

```tsx
// Container — handles data and logic
function UserListContainer() {
  const { data: users, isLoading, isError } = useUsers();
  const deleteUser = useDeleteUser();

  return (
    <UserList
      users={users}
      isLoading={isLoading}
      isError={isError}
      onDelete={(id) => deleteUser.mutate(id)}
    />
  );
}

// Presentational — pure rendering
interface UserListProps {
  users: User[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onDelete: (id: string) => void;
}

export function UserList({ users, isLoading, isError, onDelete }: UserListProps) {
  if (isLoading) return <Skeleton variant="list" />;
  if (isError) return <ErrorDisplay />;
  if (!users?.length) return <EmptyState />;

  return users.map((user) => (
    <UserCard key={user.id} user={user} onDelete={onDelete} />
  ));
}
```

- Container is often unnecessary — prefer composing hooks directly in pages
- Only use this pattern when the presentational component is reused with different data

### Error Boundaries

```tsx
import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
```

- Use ErrorBoundary at page/layout level — not around every component
- The `fallback` should show a user-friendly message + retry button
- Always log errors (`console.error` or your error reporting service)

### Skeleton Loading

```tsx
interface SkeletonProps {
  variant: "text" | "card" | "list";
  count?: number;
}

export function Skeleton({ variant, count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn(styles.skeleton, styles[variant])} />
      ))}
    </>
  );
}
```

- Centralize skeleton components — don't inline placeholder divs
- Match the approximate size/shape of the content being loaded
- Use `aria-hidden="true"` so screen readers skip them

### Optimistic Updates

For mutations where you know the likely result:

```tsx
const queryClient = useQueryClient();

const deleteUser = useMutation({
  mutationFn: userApi.delete,
  onMutate: async (userId) => {
    await queryClient.cancelQueries({ queryKey: ["users"] });
    const previous = queryClient.getQueryData<User[]>(["users"]);
    queryClient.setQueryData<User[]>(["users"], (old) =>
      old?.filter((u) => u.id !== userId),
    );
    return { previous }; // rollback context
  },
  onError: (_err, _userId, context) => {
    queryClient.setQueryData(["users"], context?.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
  },
});
```

- Snapshots of previous data are stored in `onMutate` for rollback
- Always invalidation in `onSettled` to ensure server sync
- Use only when the mutation success rate is very high (not for payments, auth)

---

## Anti-patterns to Avoid

- **Data fetching in `useEffect`**: Use TanStack Query or SWR. `useEffect` for data fetching leads to race conditions, missing loading states, and duplicate requests
- **Props drilling**: If you pass a prop through 3+ levels, lift state to Context or Zustand
- **Business logic in `useEffect`**: Effects are for synchronization with external systems (DOM, timers, subscriptions). Business logic belongs in event handlers and services
- **Mutating state directly**: Always use `setState` or the setter from `useState`/`useReducer`. Never do `state.prop = value`
- **Uncontrolled to controlled input switching**: Decide early, never switch — React warns and it breaks UX
- **`dangerouslySetInnerHTML` without sanitization**: Always sanitize HTML from users with DOMPurify
- **`index` as React key**: Always use a stable, unique identifier from the data. `index` causes bugs with reordering and filtering
- **Inline object/function props in memo'd children**: Extract to `useCallback`/`useMemo` or accept re-renders
- **Over-memoizing**: Don't wrap every function in `useCallback` or every value in `useMemo` — measure first, optimize the real bottlenecks
- **`console.log` for debugging**: Remove before committing. Use the debugger or React DevTools
- **Nested ternary operators in JSX**: Extract to a variable with a descriptive name or use `if` before return
- **Large component files**: Split components when a file exceeds 300 lines
- **Default exports**: Use named exports — better for tree-shaking and IDE auto-import
- **Commit `.env` or secrets**: Add `.env` to `.gitignore`, provide `.env.example` with placeholder values
- **Hardcoded URLs or config values**: Use environment variables with typed config objects
