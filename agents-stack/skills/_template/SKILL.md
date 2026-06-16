---
name: go-patterns
description: Template for creating stack-specific implementation skills. Copy this directory, rename it, and customize for your language/framework.
license: MIT
compatibility: both
metadata:
  audience: implementers
  type: template
---

## What I Do

Provide language-specific (or framework-specific) coding conventions for the
implementer subagent. Skills are loaded on demand when the implementer detects
the matching stack in a project.

## Naming Convention

The implementer loads skills by calling `skill({ name: "<name>" })` where `name`
matches the `name` field in the frontmatter above.

| Element | Convention | Example |
|---------|-----------|---------|
| Frontmatter `name` | `<language-or-framework>-patterns` | `go-patterns` |
| Directory name | `<language-or-framework>` | `go/` |
| File name | `SKILL.md` | `skills/go/SKILL.md` |

The directory name does NOT need to match the `name` field — the frontmatter
`name` is what the implementer uses.

## Create a New Skill

1. Copy this directory to `agents-stack/skills/<name>/`:
   ```
   cp -r agents-stack/skills/_template agents-stack/skills/go
   ```
2. Edit `SKILL.md` — update the `name` and `description` in frontmatter, then
   replace the sections below with conventions for your language/framework.
3. Re-run the installer:
   ```
   cd agents-stack && ./install.sh --target opencode
   ```

The implementer will auto-detect the project stack and load this skill when
it finds matching config files (e.g., `go.mod`, `Cargo.toml`, `package.json`).

## Layered Loading

Skills support inheritance — framework-specific skills load ON TOP of a
language base skill. The implementer auto-detects both layers.

```
python-patterns          ← base language (framework-agnostic)
  └── django-patterns    ← framework layer (adds Django-specific rules)
  └── fastapi-patterns   ← framework layer (adds FastAPI-specific rules)

typescript-patterns      ← base language (framework-agnostic)
  └── react-patterns     ← framework layer (adds React-specific rules)
```

For a framework skill, reference your base language skill in the description:

```yaml
name: gin-patterns
description: Gin conventions for Go REST APIs. Loads on top of go-patterns.
```

And add a note in the body:
```
This skill layers on top of `go-patterns`. Conventions defined here take
precedence over the base language skill.
```

**Rule**: If you create a framework skill, you should also create (or ensure
exists) a base language skill for that language.

---

## Clean Architecture Patterns

Directory structure convention for this language:

```
  src/ (or app/)
    domain/          # Entities, value objects, domain exceptions
    application/     # Use cases, ports (interfaces/protocols)
    infrastructure/  # Adapters (DB, HTTP, messaging implementations)
    presentation/    # Routers, handlers, views (if applicable)
  tests/
    unit/
    integration/
    e2e/
```

Key rules:
- Domain layer has ZERO external dependencies (no frameworks, no DB, no HTTP)
- Application layer defines interfaces/protocols that infrastructure implements
- Infrastructure depends on domain interfaces, not the other way around

## Code Conventions

Example — adapt for your language:

```
- Naming:
    PascalCase  for classes, interfaces, structs, enums
    camelCase   for functions, methods, variables, properties
    UPPER_CASE  for module-level constants
- File naming:    kebab-case.go  or  snake_case.go
- Imports:        stdlib → third-party → internal (grouped with blank lines)
- Type annotations: REQUIRED on all public function signatures
- Max function length:  20 lines
- Max file length:      300 lines
- Documentation comments: on all public items
- No unused imports or variables
```

## Tooling

```
- Linting/formatting:   [e.g., ruff, eslint, golangci-lint, clippy]
- Type checking:        [e.g., mypy, tsc --noEmit, go vet]
- Install command:      [e.g., npm install, go mod tidy, cargo build]
- Run lint:             [paste command]
- Run type check:       [paste command]
```

## Testing

```
- Test framework:    [e.g., pytest, vitest, "testing" stdlib, cargo test]
- Test file naming:  [e.g., test_*.py, *.test.ts, *_test.go]
- Fixtures:          [e.g., conftest.py, factories/, testdata/]
- Run command:       [command to run tests with verbose output]
- Run coverage:      [command to run tests with coverage report]
- Mocking library:   [e.g., unittest.mock, testify/mock, msw]
- Test naming:       [e.g., test_<method>_<scenario>_<result>]
```

## Common Patterns

### Dependency Injection

Use constructor injection — pass dependencies through the constructor:

```python
class CreateUserUseCase:
    def __init__(self, user_repo: UserRepository, email_svc: EmailService) -> None:
        self._user_repo = user_repo
        self._email_svc = email_svc

    async def execute(self, command: CreateUserCommand) -> User:
        ...
```

Never use service locators or global singletons for DI.

### Error Handling

- Raise specific domain exceptions (not generic `Error` or `Exception`)
- Catch errors at infrastructure boundaries; don't leak framework errors to domain
- Use the language's idiomatic error pattern (Result types, exceptions, etc.)

### Logging

- Use a proper logger library, not `print()` or `console.log`
- Log levels: DEBUG (detail), INFO (key events), WARN (recoverable), ERROR (failures)
- Always include context (user ID, request ID) in log entries

### Configuration

- Environment variables for secrets (never hardcode or commit)
- `.env` files for local dev only (never commit — add to `.gitignore`)
- Validate configuration at startup, not lazily

## Anti-patterns to Avoid

- Mixing domain logic with framework code (business rules in HTTP handlers)
- Using `print()`/`console.log()` for logging — use the logging library
- Mutating function parameters — prefer immutable patterns
- Catching all exceptions broadly and silencing them
- Returning `null`/`None`/`undefined` to indicate errors — use idiomatic error patterns
- Over-engineering: don't add abstractions without a concrete need
- Committing secrets or `.env` files to version control
