---
name: fastapi-patterns
description: FastAPI conventions with SQLAlchemy async, Pydantic v2, Alembic, and clean architecture patterns.
license: MIT
compatibility: both
metadata:
  audience: implementers
  type: skill
---

## What I Do

Provide FastAPI-specific coding conventions for the implementer subagent.
Loads on top of `python-patterns` (you must also follow those conventions).
Active when the implementer detects `fastapi` or `uvicorn` in project dependencies.

---

## Project Structure

```
  app/
    domain/                # Entities, value objects, domain exceptions
      entities/
      exceptions.py
    application/           # Use cases, service layer, ports (protocols)
      use_cases/
      services/
      ports.py             # Repository protocols, external service protocols
    infrastructure/        # Adapters
      models/              # SQLAlchemy ORM models
      repositories/        # Repository implementations
      database.py          # Async engine, session factory, get_db dependency
    presentation/          # HTTP layer
      routers/             # One file per resource (e.g., users.py, orders.py)
      schemas/             # Pydantic request/response schemas
      dependencies.py      # Shared FastAPI dependencies (auth, pagination)
    config.py              # pydantic-settings BaseSettings
    main.py                # FastAPI app factory, lifespan, router mounting
  tests/
    conftest.py            # Shared fixtures (async client, test DB, factories)
    unit/
    integration/
  alembic/
    versions/
    env.py
  alembic.ini
  pyproject.toml
```

Key rules:
- `presentation/` only handles HTTP concerns (parsing, serialization, status codes)
- `application/` contains business logic in services/use cases — NO framework imports
- `infrastructure/` implements repository protocols defined in `application/ports.py`
- `domain/` entities are plain Python — no ORM, no Pydantic

---

## FastAPI Conventions

### Application Factory

Use the factory pattern for testability:

```python
# app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.config import Settings
from app.infrastructure.database import engine, Base
from app.presentation.routers import users, orders


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (dev only; use Alembic in production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


def create_app(settings: Settings | None = None) -> FastAPI:
    if settings is None:
        settings = Settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        lifespan=lifespan,
    )

    app.include_router(users.router, prefix="/api/users", tags=["users"])
    app.include_router(orders.router, prefix="/api/orders", tags=["orders"])

    return app


app = create_app()
```

### Routers

One file per resource, each function is a single endpoint:

```python
# app/presentation/routers/users.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database import get_db
from app.application.services.user_service import UserService
from app.application.use_cases.create_user import CreateUser, CreateUserCommand
from app.presentation.schemas.users import UserResponse, UserCreateRequest

router = APIRouter()


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreateRequest,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    ...
```

### Schemas

Pydantic v2 models — `BaseModel` with `model_config` for ORM mode:

```python
# app/presentation/schemas/users.py
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr


class UserCreateRequest(BaseModel):
    email: EmailStr
    name: str
    password: str

    model_config = ConfigDict(
        json_schema_extra={"example": {"email": "user@example.com", "name": "John", "password": "secret"}}
    )


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
```

Use `JsonSchemaExtra` for request examples, `from_attributes=True` for ORM responses.

### Dependency Injection

FastAPI's `Depends()` for DI. Database session:

```python
# app/infrastructure/database.py
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

engine = create_async_engine(url="...")
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
```

Service-level dependencies for shared concerns:

```python
# app/presentation/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer

security = HTTPBearer()


async def get_current_user(
    token: str = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    ...
```

### SQLAlchemy Async

Models use SQLAlchemy 2.0 `Mapped` style:

```python
# app/infrastructure/models/user.py
from datetime import datetime
from sqlalchemy import String, func
from sqlalchemy.orm import Mapped, mapped_column, DeclarativeBase


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
```

### Repositories

Repository protocol in `application/ports.py`:

```python
# app/application/ports.py
from typing import Protocol, runtime_checkable
from app.domain.entities.user import User


@runtime_checkable
class UserRepository(Protocol):
    async def get_by_id(self, user_id: int) -> User | None: ...
    async def get_by_email(self, email: str) -> User | None: ...
    async def create(self, user: User) -> User: ...
    async def list_all(self, limit: int = 100, offset: int = 0) -> list[User]: ...
```

Implementation in `infrastructure/repositories/`:

```python
# app/infrastructure/repositories/user_repository.py
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities.user import User
from app.infrastructure.models.user import User as UserModel


class SqlAlchemyUserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, user_id: int) -> User | None:
        result = await self._session.execute(
            select(UserModel).where(UserModel.id == user_id)
        )
        model = result.scalar_one_or_none()
        return model.to_entity() if model else None

    async def create(self, user: User) -> User:
        model = UserModel.from_entity(user)
        self._session.add(model)
        await self._session.flush()
        return model.to_entity()
```

### Configuration

Use `pydantic-settings`:

```python
# app/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "My API"
    app_version: str = "0.1.0"
    database_url: str
    secret_key: str

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )
```

### Error Handling

Always use `HTTPException` with appropriate status codes:

```python
from fastapi import HTTPException, status

raise HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail=f"User with id {user_id} not found",
)
```

Add a global exception handler for domain exceptions:

```python
from fastapi import Request
from fastapi.responses import JSONResponse

from app.domain.exceptions import EntityNotFoundError


async def entity_not_found_handler(request: Request, exc: EntityNotFoundError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": str(exc)},
    )
```

### Alembic Migrations

- Init: `alembic init -t async alembic`
- Configure `alembic/env.py` to use async engine and import Base metadata
- Create migration: `alembic revision --autogenerate -m "description"`
- Apply: `alembic upgrade head`
- Never edit migration files manually after `--autogenerate`
- Always review autogenerated migrations before committing

---

## Testing (FastAPI)

### Framework

- `pytest` + `pytest-asyncio` + `pytest-cov`
- `httpx.AsyncClient` for integration/API tests
- Fixtures in `tests/conftest.py`

### Test Database

Use a separate test database or SQLite in-memory:

```python
# tests/conftest.py
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.main import create_app
from app.infrastructure.database import Base
from app.config import Settings


@pytest_asyncio.fixture
async def async_client():
    """Async test client with a clean test database."""
    engine = create_async_engine("sqlite+aiosqlite://")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    settings = Settings(database_url="sqlite+aiosqlite://", secret_key="test-secret")
    app = create_app(settings)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    await engine.dispose()


@pytest_asyncio.fixture
async def db_session():
    """Raw async session for unit/repository tests."""
    engine = create_async_engine("sqlite+aiosqlite://")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session

    await engine.dispose()
```

### Integration Test Example

```python
# tests/integration/test_users.py
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_user_returns_201(async_client: AsyncClient):
    response = await async_client.post(
        "/api/users/",
        json={"email": "test@example.com", "name": "Test User", "password": "secret123"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["name"] == "Test User"
    assert "id" in data
```

### Test Commands

```bash
pytest tests/ -v
pytest tests/ -v --cov=app --cov-report=term-missing
pytest tests/unit/ -v
pytest tests/integration/ -v
```

---

## Common Patterns

### Service Layer

Services contain business logic, receive repositories via constructor:

```python
# app/application/services/user_service.py
from app.application.ports import UserRepository, PasswordHasher
from app.domain.exceptions import EntityNotFoundError


class UserService:
    def __init__(self, user_repo: UserRepository, password_hasher: PasswordHasher) -> None:
        self._user_repo = user_repo
        self._password_hasher = password_hasher

    async def authenticate(self, email: str, password: str) -> User:
        user = await self._user_repo.get_by_email(email)
        if not user or not self._password_hasher.verify(password, user.hashed_password):
            raise InvalidCredentialsError()
        return user
```

### Use Case (CQRS-style)

```python
# app/application/use_cases/create_user.py
from dataclasses import dataclass


@dataclass(frozen=True)
class CreateUserCommand:
    email: str
    name: str
    password: str


class CreateUser:
    def __init__(self, user_repo: UserRepository, password_hasher: PasswordHasher) -> None:
        self._user_repo = user_repo
        self._password_hasher = password_hasher

    async def execute(self, command: CreateUserCommand) -> User:
        if await self._user_repo.get_by_email(command.email):
            raise EmailAlreadyExistsError(command.email)

        hashed = self._password_hasher.hash(command.password)
        user = User.create(email=command.email, name=command.name, hashed_password=hashed)
        return await self._user_repo.create(user)
```

### Pagination

```python
from fastapi import Query


async def pagination_params(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Items per page"),
) -> dict[str, int]:
    return {"offset": (page - 1) * size, "limit": size}
```

---

## Anti-patterns to Avoid

- **Business logic in routers**: Routers handle HTTP only — delegate to services/use cases
- **Direct ORM usage in routers or services**: Always go through repository protocol
- **`print()` for logging**: Use `logging.getLogger(__name__)`. Use `logger.info` not `print`
- **Committing `.env` or secrets**: Use `.env.example` with placeholder values
- **Synchronous DB calls in async endpoints**: Always `await` async ORM methods
- **Returning ORM objects from endpoints**: Return Pydantic `response_model` schemas
- **`*` import in routers**: Import only what you need
- **Mixing test and production databases**: Always use a separate test DB or in-memory SQLite
- **Hardcoding URLs or config values**: Use `pydantic-settings` with env vars
- **Long-running sync code in async handlers**: Offload CPU-bound work to `run_in_executor`
