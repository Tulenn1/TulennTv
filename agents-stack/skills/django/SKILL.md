---
name: django-patterns
description: Django conventions with ORM, class-based views, forms, DRF, Celery, and clean architecture patterns.
license: MIT
compatibility: both
metadata:
  audience: implementers
  type: skill
---

## What I Do

Provide Django-specific coding conventions for the implementer subagent.
Loads on top of `python-patterns` (you must also follow those conventions).
Active when the implementer detects `django` or `djangorestframework` in project dependencies.

---

## Project Structure

```
  config/                 # Django project package (settings, urls, wsgi/asgi)
    settings/
      base.py             # Shared settings (INSTALLED_APPS, MIDDLEWARE, DATABASES, etc.)
      dev.py              # from .base import * + DEBUG=True, local overrides
      prod.py             # from .base import * + DEBUG=False, production overrides
      test.py             # from .base import * + in-memory DB, test runners
    urls.py               # Root URL conf, includes app URLs
    wsgi.py
    asgi.py
  apps/                   # Django apps (one directory per app)
    users/
      domain/             # Entities, value objects, domain exceptions
        entities.py       # User entity (plain Python, no ORM)
        exceptions.py     # UserNotFoundError, EmailAlreadyExistsError
      application/        # Use cases, service layer, ports (protocols)
        use_cases/
          create_user.py  # CreateUser use case with CreateUserCommand
        services/
          user_service.py # UserService (business logic)
        ports.py          # Repository protocols, EmailSender protocol
      infrastructure/     # Adapters
        models.py         # Django ORM models (only here)
        repositories/
          user_repository.py  # DjangoUserRepository implements UserRepository protocol
        email/
          sendgrid_email.py   # SendGrid adapter implements EmailSender protocol
      presentation/       # HTTP layer
        views.py          # CBVs or FBVs — HTTP handling only
        forms.py          # Django forms for validation
        serializers.py    # DRF serializers
        urls.py           # App URL conf
        admin.py          # ModelAdmin registrations
      migrations/         # Django auto-generated migrations
      tests/
        conftest.py       # pytest-django fixtures
        unit/
        integration/
  manage.py
  pyproject.toml
  requirements/
    base.txt
    dev.txt
    prod.txt
```

Key rules:
- `presentation/` only handles HTTP concerns (parsing, serialization, status codes, redirects)
- `application/` contains business logic in services/use cases — NO framework imports (no `from django...`)
- `infrastructure/` implements repository and adapter protocols defined in `application/ports.py`
- `domain/` entities are plain Python dataclasses — no ORM, no Django forms, no serializers
- Each Django app is self-contained with its own `domain/`, `application/`, `infrastructure/`, `presentation/` layers
- `config/` is the Django project package — settings, root URL conf, WSGI/ASGI

---

## Django Conventions

### Settings

Split settings by environment. Never use a single `settings.py`:

```python
# config/settings/base.py
import os
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env(
    DEBUG=(bool, False),
    SECRET_KEY=(str, ""),
    DATABASE_URL=(str, "sqlite:///db.sqlite3"),
    ALLOWED_HOSTS=(list, []),
)

environ.Env.read_env(BASE_DIR / ".env")

DEBUG = env("DEBUG")
SECRET_KEY = env("SECRET_KEY")
ALLOWED_HOSTS = env("ALLOWED_HOSTS")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    # Local apps
    "apps.users",
    "apps.orders",
]

DATABASES = {
    "default": env.db(),
}
```

```python
# config/settings/dev.py
from .base import *

DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1"]

INSTALLED_APPS += [
    "django_extensions",
]
```

### Models

Models define DB schema in `apps/<app>/infrastructure/models.py`. Use custom managers for reusable query logic:

```python
# apps/users/infrastructure/models.py
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email: str, name: str, password: str | None = None) -> "User":
        if not email:
            raise ValueError("Users must have an email address")
        user = self.model(email=self.normalize_email(email), name=name)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, name: str, password: str) -> "User":
        user = self.create_user(email, name, password)
        user.is_staff = True
        user.is_superuser = True
        user.save(using=self._db)
        return user


class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(max_length=255, unique=True)
    name = models.CharField(max_length=150)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    def __str__(self) -> str:
        return self.email
```

- Always set `USERNAME_FIELD` on custom user models
- Prefix boolean fields with `is_` or `has_`
- Use `auto_now_add=True` for creation timestamps, `auto_now=True` for update timestamps
- Put `Meta` class with `ordering`, `indexes`, `constraints` at the bottom
- Avoid `null=True` on `CharField`/`TextField` — use `blank=True` for optional form fields
- Use `related_name` explicitly on all `ForeignKey`/`ManyToManyField` to avoid `+` clutter

### Custom Managers and QuerySets

Encapsulate query patterns in custom QuerySets and Managers:

```python
class OrderQuerySet(models.QuerySet):
    def paid(self) -> "OrderQuerySet":
        return self.filter(status=Order.Status.PAID)

    def for_user(self, user_id: int) -> "OrderQuerySet":
        return self.filter(user_id=user_id)

    def with_items(self) -> "OrderQuerySet":
        return self.prefetch_related("items__product")


class OrderManager(models.Manager):
    def get_queryset(self) -> OrderQuerySet:
        return OrderQuerySet(self.model, using=self._db)

    def paid(self) -> OrderQuerySet:
        return self.get_queryset().paid()

    def for_user(self, user_id: int) -> OrderQuerySet:
        return self.get_queryset().for_user(user_id)
```

### Views

Prefer **class-based views** (CBVs) for standard CRUD and form handling. Use **function-based views** (FBVs) for custom logic that doesn't fit a generic pattern.

```python
# apps/users/presentation/views.py
from django.contrib.auth import login
from django.contrib.auth.views import LoginView
from django.urls import reverse_lazy
from django.views.generic import CreateView, DetailView, UpdateView

from apps.users.application.services.user_service import UserService
from apps.users.presentation.forms import UserCreationForm


class UserCreateView(CreateView):
    """HTTP handler for user registration. Delegates business logic to service."""
    form_class = UserCreationForm
    template_name = "users/register.html"
    success_url = reverse_lazy("users:login")

    def form_valid(self, form):
        service = UserService()
        user = service.register(
            email=form.cleaned_data["email"],
            name=form.cleaned_data["name"],
            password=form.cleaned_data["password"],
        )
        login(self.request, user)
        return super().form_valid(form)
```

- Keep view methods thin — delegate to `application/` services
- Use `LoginRequiredMixin`, `UserPassesTestMixin` for access control
- Override `get_queryset()` for filtering rather than doing it inline

### URL Configuration

One URL conf per app. Use `app_name` for namespacing:

```python
# config/urls.py
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("apps.api.urls")),
    path("users/", include("apps.users.presentation.urls")),
    path("orders/", include("apps.orders.presentation.urls")),
]
```

```python
# apps/users/presentation/urls.py
from django.urls import path

from apps.users.presentation.views import UserCreateView, UserDetailView, UserUpdateView

app_name = "users"

urlpatterns = [
    path("register/", UserCreateView.as_view(), name="register"),
    path("<int:pk>/", UserDetailView.as_view(), name="detail"),
    path("<int:pk>/edit/", UserUpdateView.as_view(), name="update"),
]
```

- Always set `app_name` in every app's URL conf
- Use `reverse("users:detail", kwargs={"pk": user.pk})` or `{% url "users:detail" user.pk %}`
- Never hardcode URLs in templates or views

### Forms

Django forms handle validation at the presentation layer. Keep them in `presentation/forms.py`:

```python
# apps/users/presentation/forms.py
from django import forms
from django.core.exceptions import ValidationError

from apps.users.infrastructure.models import User


class UserCreationForm(forms.ModelForm):
    password = forms.CharField(widget=forms.PasswordInput, min_length=8)
    password_confirm = forms.CharField(widget=forms.PasswordInput)

    class Meta:
        model = User
        fields = ["email", "name"]

    def clean_email(self) -> str:
        email = self.cleaned_data["email"]
        if User.objects.filter(email=email).exists():
            raise ValidationError("A user with this email already exists.")
        return email

    def clean(self) -> dict:
        cleaned = super().clean()
        if cleaned.get("password") != cleaned.get("password_confirm"):
            raise ValidationError("Passwords do not match.")
        return cleaned
```

- Inline validation in `clean_<field>()` methods
- Cross-field validation in `clean()`
- Never put business logic in form `clean()` — forms are for input validation only

### Admin

Register models in `presentation/admin.py`. Keep admin configuration thin:

```python
# apps/users/presentation/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from apps.users.infrastructure.models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["email", "name", "is_staff", "created_at"]
    list_filter = ["is_staff", "is_active"]
    search_fields = ["email", "name"]
    ordering = ["email"]
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("name",)}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups")}),
        ("Important dates", {"fields": ("last_login", "created_at")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "name", "password1", "password2"),
        }),
    )
    readonly_fields = ["created_at"]
```

- Always use `readonly_fields` for auto-managed timestamps
- Use `list_select_related` to avoid N+1 queries in admin list views
- Use `autocomplete_fields` for ForeignKey fields with many options

### Middleware

Write custom middleware in `apps/<app>/infrastructure/middleware.py`:

```python
# apps/common/infrastructure/middleware.py
import time
import logging

logger = logging.getLogger(__name__)


class RequestTimingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.monotonic()
        response = self.get_response(request)
        duration = time.monotonic() - start
        logger.info(
            "Request processed",
            extra={"path": request.path, "method": request.method, "duration_ms": round(duration * 1000, 2)},
        )
        return response
```

- Never put business logic in middleware — use it for cross-cutting concerns (logging, timing, auth)
- Use `process_view()` or `process_exception()` hooks for fine-grained control

### Signals

Use signals **only** for decoupled cross-app communication. Avoid signals within the same app:

```python
# apps/orders/infrastructure/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.orders.infrastructure.models import Order
from apps.notifications.application.services.notification_service import NotificationService


@receiver(post_save, sender=Order)
def send_order_confirmation(sender, instance: Order, created: bool, **kwargs) -> None:
    if created:
        NotificationService().send_order_confirmation(instance)
```

- Always connect signals in `apps/<app>/apps.py` `ready()` method or `signals.py` imported there
- Do NOT use signals within a single app — use a direct service call instead
- Signal handlers should be thin — delegate to `application/` services
- Avoid `pre_save`/`post_save` for data transformation — override model `save()` or use service layer

### Django REST Framework

Use DRF for APIs. Keep serializers in `presentation/serializers.py`:

```python
# apps/users/presentation/serializers.py
from rest_framework import serializers

from apps.users.infrastructure.models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "name", "created_at"]
        read_only_fields = ["id", "created_at"]


class UserCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    name = serializers.CharField(max_length=150)
    password = serializers.CharField(min_length=8, write_only=True)

    def validate_email(self, value: str) -> str:
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
```

Use ViewSets with explicit actions. Avoid `ModelViewSet` unless it's a pure CRUD:

```python
# apps/api/views.py
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from apps.users.application.services.user_service import UserService
from apps.users.infrastructure.repositories.user_repository import DjangoUserRepository
from apps.users.presentation.serializers import UserSerializer, UserCreateSerializer


class UserViewSet(viewsets.GenericViewSet):
    serializer_class = UserSerializer
    queryset = User.objects.all()

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._user_service = UserService(user_repo=DjangoUserRepository())

    def list(self, request: Request) -> Response:
        users = self._user_service.list_active()
        serializer = self.get_serializer(users, many=True)
        return Response(serializer.data)

    def create(self, request: Request) -> Response:
        input_serializer = UserCreateSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        user = self._user_service.register(**input_serializer.validated_data)
        output_serializer = self.get_serializer(user)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def deactivate(self, request: Request, pk: int | None = None) -> Response:
        user = self.get_object()
        self._user_service.deactivate(user)
        return Response(status=status.HTTP_204_NO_CONTENT)
```

- Explicitly define `serializer_class` per action using `get_serializer_class()` override if needed
- Avoid `ModelViewSet` — it encourages skipping the service layer
- Use `@action` for non-CRUD endpoints
- Thin viewsets: parse input, call service, serialize output — no business logic
- Set `DEFAULT_PAGINATION_CLASS` and `PAGE_SIZE` in DRF settings

### Management Commands

```python
# apps/orders/management/commands/expire_pending_orders.py
from django.core.management.base import BaseCommand

from apps.orders.application.services.order_service import OrderService


class Command(BaseCommand):
    help = "Expire orders that have been pending for more than 24 hours."

    def add_arguments(self, parser):
        parser.add_argument(
            "--hours",
            type=int,
            default=24,
            help="Hours after which pending orders are expired",
        )

    def handle(self, *args, **options):
        service = OrderService()
        count = service.expire_pending(hours=options["hours"])
        self.stdout.write(self.style.SUCCESS(f"Expired {count} pending orders"))
```

- Commands live in `apps/<app>/management/commands/`
- Keep `handle()` thin — delegate to `application/` services
- Use `self.stdout.write()` not `print()`
- Use `self.style.SUCCESS/WARNING/ERROR` for colored output

---

## ORM & Database

### Preventing N+1 Queries

Always use `select_related()` for ForeignKey/OneToOne and `prefetch_related()` for ManyToMany/reverse ForeignKey:

```python
# BAD — N+1 queries
orders = Order.objects.all()
for order in orders:
    print(order.user.name)  # hits DB every iteration

# GOOD — 2 queries total
orders = Order.objects.select_related("user").all()
for order in orders:
    print(order.user.name)  # user already loaded
```

```python
# Prefetch with custom queryset
from django.db.models import Prefetch

orders = Order.objects.prefetch_related(
    Prefetch("items", queryset=OrderItem.objects.select_related("product"))
)
```

- Use `select_related()` in `get_queryset()` of DetailView/ListView
- Use `list_select_related` in ModelAdmin
- Use `django-debug-toolbar` to detect N+1 queries during development

### Query Optimization

```python
# Use values/values_list for read-only data (avoids model instantiation)
user_emails = User.objects.filter(is_active=True).values_list("email", flat=True)

# Use only/defer for large tables with many columns
users = User.objects.only("id", "email", "name")  # fetch only these columns

# Use exists() instead of count() for existence checks
if Order.objects.filter(user=user, status="paid").exists():
    ...

# Use F() expressions for atomic updates — avoid race conditions
from django.db.models import F

Product.objects.filter(id=product_id).update(stock=F("stock") - quantity)

# Use bulk_create / bulk_update for batch operations
User.objects.bulk_create([
    User(email=f"user{i}@example.com", name=f"User {i}") for i in range(1000)
])
```

### Transactions

Use `transaction.atomic()` for operations that must succeed or fail together:

```python
from django.db import transaction

@transaction.atomic
def transfer_points(from_user, to_user, amount):
    from_user.points = F("points") - amount
    from_user.save()
    to_user.points = F("points") + amount
    to_user.save()
```

- Use as decorator for whole view, or context manager for specific blocks
- Always handle `IntegrityError` at the boundary
- Use `transaction.on_commit()` for side effects that depend on transaction success (e.g., sending emails)

### Migrations

- Generate: `python manage.py makemigrations`
- Apply: `python manage.py migrate`
- Never edit migration files manually after `--autogenerate`
- Always review autogenerated migrations before committing
- Use `RunPython` for data migrations with a reverse function:

```python
from django.db import migrations


def forwards(apps, schema_editor):
    User = apps.get_model("users", "User")
    User.objects.filter(name="").update(name="Unknown")


def backwards(apps, schema_editor):
    User = apps.get_model("users", "User")
    User.objects.filter(name="Unknown").update(name="")


class Migration(migrations.Migration):
    dependencies = [("users", "0002_auto_...")]
    operations = [migrations.RunPython(forwards, backwards)]
```

- Keep migrations in version control — never delete old migrations
- Squash migrations periodically (`python manage.py squashmigrations`)
- Never import models directly in `RunPython` — use `apps.get_model()`

---

## Testing

### Framework

- `pytest` + `pytest-django` + `pytest-cov`
- `factory_boy` or `model_bakery` for test model factories
- `faker` for generating test data

### Fixtures and Factories

Use `pytest-django` fixtures with `model_bakery` instead of JSON fixtures:

```python
# tests/conftest.py
import pytest
from model_bakery import baker
from rest_framework.test import APIClient

from apps.users.infrastructure.models import User


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture
def user() -> User:
    return baker.make(User, email="test@example.com", name="Test User")


@pytest.fixture
def authenticated_client(api_client: APIClient, user: User) -> APIClient:
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def admin_user(db) -> User:
    return baker.make(User, email="admin@example.com", is_staff=True, is_superuser=True)
```

### Test Settings

```python
# config/settings/test.py
from .base import *

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

# Use faster password hasher in tests
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

# Disable template debug in tests for speed
TEMPLATES[0]["OPTIONS"]["debug"] = False
```

### Test Examples

```python
# apps/users/tests/unit/test_user_service.py
import pytest

from apps.users.application.services.user_service import UserService
from apps.users.domain.exceptions import EmailAlreadyExistsError


class TestUserRegister:
    def test_register_with_new_email_creates_user(self, user_repo_mock):
        service = UserService(user_repo=user_repo_mock)
        user = service.register(
            email="new@example.com",
            name="New User",
            password="securepass123",
        )
        assert user.email == "new@example.com"
        assert user_repo_mock.create.called

    def test_register_with_existing_email_raises_error(self, user_repo_mock):
        service = UserService(user_repo=user_repo_mock)
        with pytest.raises(EmailAlreadyExistsError):
            service.register(
                email="existing@example.com",
                name="Duplicate",
                password="securepass123",
            )
```

```python
# apps/users/tests/integration/test_user_api.py
import pytest
from rest_framework import status


class TestUserCreateAPI:
    def test_create_user_returns_201(self, api_client):
        response = api_client.post("/api/users/", {
            "email": "new@example.com",
            "name": "New User",
            "password": "securepass123",
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["email"] == "new@example.com"

    def test_create_user_duplicate_email_returns_400(self, api_client, user):
        response = api_client.post("/api/users/", {
            "email": user.email,
            "name": "Duplicate",
            "password": "securepass123",
        })
        assert response.status_code == status.HTTP_400_BAD_REQUEST
```

### Test Commands

```bash
pytest --ds=config.settings.test -v
pytest --ds=config.settings.test -v --cov=apps --cov-report=term-missing
pytest --ds=config.settings.test apps/users/tests/unit/ -v
pytest --ds=config.settings.test apps/users/tests/integration/ -v
# Run with DB reuse for speed (local dev only)
pytest --ds=config.settings.test -v --reuse-db
```

### conftest.py and pytest.ini

```ini
# pytest.ini
[pytest]
DJANGO_SETTINGS_MODULE = config.settings.test
python_files = test_*.py
addopts = --strict-markers --tb=short
markers =
    slow: marks tests as slow (deselect with '-m "not slow"')
    integration: marks tests as integration tests
```

---

## Common Patterns

### Service Layer

Services contain business logic with dependencies injected via constructor:

```python
# apps/users/application/services/user_service.py
from apps.users.application.ports import UserRepository
from apps.users.domain.entities import User
from apps.users.domain.exceptions import EmailAlreadyExistsError, UserNotFoundError


class UserService:
    def __init__(self, user_repo: UserRepository) -> None:
        self._user_repo = user_repo

    def register(self, email: str, name: str, password: str) -> User:
        if self._user_repo.exists_by_email(email):
            raise EmailAlreadyExistsError(email)
        user = User.create(email=email, name=name, password=password)
        return self._user_repo.create(user)

    def get_by_id(self, user_id: int) -> User:
        user = self._user_repo.get_by_id(user_id)
        if user is None:
            raise UserNotFoundError(user_id)
        return user

    def deactivate(self, user: User) -> None:
        user.deactivate()
        self._user_repo.update(user)
```

### Repository Pattern with Django ORM

Protocol in `application/ports.py`:

```python
# apps/users/application/ports.py
from typing import Protocol, runtime_checkable

from apps.users.domain.entities import User


@runtime_checkable
class UserRepository(Protocol):
    def get_by_id(self, user_id: int) -> User | None: ...
    def get_by_email(self, email: str) -> User | None: ...
    def exists_by_email(self, email: str) -> bool: ...
    def create(self, user: User) -> User: ...
    def update(self, user: User) -> User: ...
    def list_active(self) -> list[User]: ...
```

Implementation in `infrastructure/repositories/`:

```python
# apps/users/infrastructure/repositories/user_repository.py
from django.core.exceptions import ObjectDoesNotExist

from apps.users.domain.entities import User as UserEntity
from apps.users.infrastructure.models import User as UserModel


class DjangoUserRepository:
    def get_by_id(self, user_id: int) -> UserEntity | None:
        try:
            model = UserModel.objects.get(id=user_id)
            return self._to_entity(model)
        except ObjectDoesNotExist:
            return None

    def get_by_email(self, email: str) -> UserEntity | None:
        try:
            model = UserModel.objects.get(email=email)
            return self._to_entity(model)
        except ObjectDoesNotExist:
            return None

    def exists_by_email(self, email: str) -> bool:
        return UserModel.objects.filter(email=email).exists()

    def create(self, user: UserEntity) -> UserEntity:
        model = UserModel.objects.create_user(
            email=user.email,
            name=user.name,
            password=user.password,
        )
        return self._to_entity(model)

    def update(self, user: UserEntity) -> UserEntity:
        model = UserModel.objects.get(id=user.id)
        model.name = user.name
        model.is_active = user.is_active
        model.save(update_fields=["name", "is_active"])
        return self._to_entity(model)

    def list_active(self) -> list[UserEntity]:
        models = UserModel.objects.filter(is_active=True)
        return [self._to_entity(m) for m in models]

    @staticmethod
    def _to_entity(model: UserModel) -> UserEntity:
        return UserEntity(
            id=model.id,
            email=model.email,
            name=model.name,
            is_active=model.is_active,
            created_at=model.created_at,
        )
```

### Domain Entity (Plain Python)

```python
# apps/users/domain/entities.py
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class User:
    email: str
    name: str
    password: str  # plain text at creation, hashed after persistence
    id: int | None = None
    is_active: bool = True
    created_at: datetime | None = None

    @classmethod
    def create(cls, email: str, name: str, password: str) -> "User":
        return cls(email=email, name=name, password=password)

    def deactivate(self) -> None:
        self.is_active = False
```

### Use Case (CQRS-style)

```python
# apps/users/application/use_cases/create_user.py
from dataclasses import dataclass

from apps.users.application.ports import UserRepository
from apps.users.domain.entities import User


@dataclass(frozen=True)
class CreateUserCommand:
    email: str
    name: str
    password: str


class CreateUser:
    def __init__(self, user_repo: UserRepository) -> None:
        self._user_repo = user_repo

    def execute(self, command: CreateUserCommand) -> User:
        if self._user_repo.exists_by_email(command.email):
            raise EmailAlreadyExistsError(command.email)
        user = User.create(
            email=command.email,
            name=command.name,
            password=command.password,
        )
        return self._user_repo.create(user)
```

### Celery Tasks

Keep tasks thin — delegate to application services:

```python
# apps/notifications/infrastructure/tasks.py
from celery import shared_task

from apps.notifications.application.services.notification_service import NotificationService


@shared_task(
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
)
def send_welcome_email(user_id: int) -> None:
    service = NotificationService()
    service.send_welcome(user_id)


@shared_task
def process_daily_reports() -> None:
    from apps.reports.application.services.report_service import ReportService
    service = ReportService()
    service.generate_daily_reports()
```

- Task functions should be thin — instantiate service, call one method
- Define `max_retries` and `default_retry_delay` for idempotent tasks
- Use `autoretry_for` for transient failures (network, timeouts)
- Never pass ORM model instances as task arguments — pass IDs

### Pagination (DRF)

```python
# config/settings/base.py
REST_FRAMEWORK = {
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
}
```

For custom pagination:

```python
from rest_framework.pagination import PageNumberPagination


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100
```

### Select Related / Prefetch Related in Views

```python
class OrderListView(ListView):
    model = Order
    template_name = "orders/list.html"
    context_object_name = "orders"

    def get_queryset(self):
        return (
            Order.objects
            .select_related("user")
            .prefetch_related("items__product")
            .order_by("-created_at")
        )
```

---

## Anti-patterns to Avoid

- **Fat models**: Models should represent DB schema only. Put business logic in `application/services/`, not in `model.save()` or model methods
- **Business logic in views**: Views handle HTTP only — parse input, call service, return response. Never write business rules in views/viewsets
- **Raw SQL in views or templates**: Use the ORM and repository pattern. If you need raw SQL, it belongs in `infrastructure/`
- **N+1 queries**: Always use `select_related()` and `prefetch_related()`. Use `django-debug-toolbar` to catch these
- **`null=True` on `CharField`**: Django stores empty strings, not NULL. Use `blank=True` for optional form fields instead
- **Skipping `select_related` in admin**: Use `list_select_related` in ModelAdmin to avoid N+1 in list views
- **Signals for same-app logic**: Use direct service calls within an app. Reserve signals for decoupled cross-app communication
- **Single `settings.py`**: Split into `base.py`, `dev.py`, `prod.py`, `test.py`. Never commit secrets
- **Hardcoding URLs**: Use `reverse()` and `{% url %}`. Never write raw URL paths in views or templates
- **`GenericForeignKey`**: Avoid unless absolutely necessary. Use concrete ForeignKeys or a proper polymorphic solution
- **Committing `.env` or secrets**: Use `.env.example` with placeholder values. Add `.env` to `.gitignore`
- **`print()` for logging**: Use `logging.getLogger(__name__)`. Use `logger.info` not `print`
- **Skipping `select_for_update()`**: Use it for locking rows during concurrent operations
- **Bare `except:`**: In Django views, use `Http404`, `HttpResponseServerError`, or DRF exception handlers
- **Mixing test and production databases**: Always use a separate test DB or in-memory SQLite (`config/settings/test.py`)
