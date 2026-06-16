---
name: typescript-patterns
description: TypeScript general conventions (strict mode, testing, linting, clean architecture). Framework-agnostic base skill.
license: MIT
compatibility: both
metadata:
  audience: implementers
  type: skill
---

## What I Do

Provide general TypeScript coding conventions for the implementer subagent.
Framework-specific skills (e.g., `react-patterns`) layer on top of this
and take precedence when available.

---

## Clean Architecture Patterns

Directory structure convention for TypeScript:

```
  src/
    domain/          # Entities, value objects, domain exceptions (pure TS, no deps)
    application/     # Use cases, ports (interfaces)
    infrastructure/  # Adapters (API clients, DB, storage, messaging implementations)
    presentation/    # Components, hooks, pages (if applicable)
  tests/
    unit/
    integration/
    e2e/
```

Key rules:
- Domain layer has ZERO external dependencies (no frameworks, no HTTP, no DOM)
- Application layer defines interfaces that infrastructure implements
- Infrastructure depends on domain interfaces, not the other way around

## Code Conventions

- **Naming**: `PascalCase` for types, interfaces, classes, React components, and enums
              `camelCase` for functions, methods, variables, and properties
              `UPPER_CASE` for module-level constants (if truly immutable)
- **File naming**: `kebab-case.ts` / `kebab-case.tsx` (e.g., `user-repository.ts`, `create-user.ts`)
- **Type annotations**: REQUIRED on all public function signatures, parameters, and return types
                         No `any` — use `unknown` and narrow with type guards
                         Prefer `interface` over `type` for object shapes
                         Use discriminated unions for state variants
- **Import order**: external libraries → internal modules → relative imports
- **Exports**: Prefer named exports over default exports (better tree-shaking + IDE support)
- **Max function length**: 20 lines
- **Max file length**: 300 lines
- **Doc comments**: JSDoc on all public functions, classes, and interfaces
                     `@param`, `@returns`, `@throws` for non-trivial items
- **No wildcard imports**: `import *` is forbidden
- **Trailing commas**: Use trailing commas in multi-line objects, arrays, and parameter lists

## TypeScript Configuration

`tsconfig.json` strictly typed:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

- `strict: true` is non-negotiable
- Enable `noUncheckedIndexedAccess` to catch `undefined` from array/object access
- Never use `@ts-ignore` or `@ts-expect-error` without a comment explaining why

## Tooling

- **Linting**: `eslint` with `@typescript-eslint` parser and strict rules
- **Formatting**: `prettier` with default config (2 spaces, semicolons, single quotes)
- **Type check**: `tsc --noEmit`
- **Install command**: `npm install` / `pnpm install` / `yarn install`
- **Run lint**: `npm run lint` (typically `eslint . --ext .ts,.tsx`)
- **Run type check**: `tsc --noEmit`

## Testing

- **Test framework**: `vitest` (default) or `jest`
- **DOM testing**: `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`
- **API mocking**: `msw` (Mock Service Worker) for network-level mocking
- **Test file convention**: `*.test.ts` or `*.spec.ts` alongside source or in `tests/` directory
- **Fixture/test data**: Factory functions in `tests/factories/`, not inline JSON
- **Run command**: `npm test` or `vitest run`
- **Run with coverage**: `vitest run --coverage`
- **Test naming**: `it('should <expected behavior> when <condition>')` pattern
                   e.g., `it('should return user when valid id is provided')`

## Common Patterns

### Dependency Injection

Use constructor injection — pass dependencies through the constructor:

```typescript
class CreateUserUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly emailService: EmailService,
  ) {}

  async execute(command: CreateUserCommand): Promise<User> {
    // ...
  }
}
```

Never use service locators or singleton DI containers.

### Error Handling

- Create domain-specific error classes extending `Error`
- Use discriminated unions (`Result<T, E>` pattern) for expected failures
- Never throw generic `Error` — always use typed errors
- Catch errors at infrastructure boundaries, not in domain/application layers

### Logging

- Use a dedicated logger abstraction (e.g., `pino`, `winston`), not `console.log`
- Log at appropriate levels: debug for detail, info for key events, warn for recoverable issues, error for failures
- Never use `console.log` in production code

### Configuration

- Use environment variables for secrets (never hardcode)
- Use `.env` files for local development only (never commit)
- Define config as a typed object loaded at startup, validated with Zod or similar

### Data Fetching

- Use repository pattern or API client interfaces for data access
- Data access interfaces live in `application/ports`
- Implementations live in `infrastructure/`
- Never couple domain logic to a specific HTTP client or ORM

## Anti-patterns to Avoid

- Using `any` — use `unknown` and narrow with type guards
- Using `as` type assertions — use type narrowing with `typeof`/`instanceof` or Zod validation
- Using `console.log` for logging — use a proper logger
- Mutating function parameters — use immutable patterns, spread, or structuredClone
- Default exports — use named exports for better discoverability and tree-shaking
- Over-using `useEffect` in React for business logic — prefer event handlers and derived state
- Using `index.ts` barrel files with heavy re-exports — can cause circular dependencies
- String literals for status/states — use string enums or union types
- Optional chaining abuse — consider early returns or proper null checks
- Committing `.env` files or secrets to version control
