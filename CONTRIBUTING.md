# Contributing to Inventory Management System

Thank you for your interest in contributing! This document outlines the guidelines for contributing to the project.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [How to Contribute](#how-to-contribute)
3. [Development Setup](#development-setup)
4. [Architecture Rules](#architecture-rules)
5. [Code Style](#code-style)
6. [Commit Messages](#commit-messages)
7. [Pull Request Process](#pull-request-process)
8. [Testing](#testing)
9. [Environment](#environment)
10. [Known Gotchas](#known-gotchas)

## Code of Conduct

This project is governed by the [GNU General Public License v2](LICENSE). All contributors are expected to act respectfully and constructively. Harassment, discrimination, or other unprofessional behavior will not be tolerated.

## How to Contribute

1. **Open an issue** — for bugs, feature requests, or questions before starting work
2. **Fork the repository** — create your own copy on GitHub
3. **Create a feature branch** — branch from `main` using a descriptive name
4. **Make your changes** — following the guidelines below
5. **Run the tests** — ensure all tests pass
6. **Submit a pull request** — reference the issue number and describe your changes

## Development Setup

See [README.md](README.md#quick-start) for setup instructions. For Docker-based development:

```sh
docker compose up -d --build
```

For manual development, ensure PostgreSQL and Redis are running locally.

## Architecture Rules

The project follows strict architectural conventions. Violations will be rejected.

### Service Layer

- **Views → Services → Models**: Views must be thin. All business logic goes in `services.py`.
- Models are data-only — no methods with business logic (computed properties like `total_pieces` are OK).
- Serializers are pure field definitions — no `validate()` methods with business logic.

### Inventory Integrity

- **Never mix tile batches**: `UniqueConstraint(tile, batch, location)` on Inventory model; every operation works with exactly one batch.
- **Never round quantities**: All inventory fields are `IntegerField`. No decimal or float types. Use integer arithmetic for carton breakdowns.
- **Preserve loose pieces**: Dispatch/transfer operations may break cartons into loose pieces. They never convert loose pieces back into cartons.
- **Prevent negative stock**: `MinValueValidator(0)` on cartons and loose pieces. Service methods check available stock before deducting. Use `select_for_update()` within `@transaction.atomic` to prevent race conditions.
- **Track every movement**: Every inventory mutation creates a `Movement` record atomically.
- **Every change auditable**: Every mutation creates an `AuditLog` record atomically.
- **Operations are atomic**: All four mutation service methods (`receive`, `dispatch`, `adjust`, `transfer`) are decorated with `@transaction.atomic`.

### Operations

- **Inactive batch rejection**: All mutation services raise `ValidationError` if the batch is not active.
- **Sales ≤ available stock**: Dispatch and transfer services check that the total requested quantity does not exceed available pieces before deducting.
- **No silent batch metadata drift**: `receive_inventory` validates that `production_date` and `supplier` match when adding to an existing batch.

### Views

- Views catch only `ValidationError` and `ObjectDoesNotExist` from services. Never catch bare `Exception` — that masks real failures (transaction errors, DB issues).
- **Never name a DRF ViewSet action `dispatch`** — it shadows `ViewSet.dispatch()` and breaks request wrapping/permissions. Use `issue_dispatch` instead.
- `InventoryViewSet` is `ReadOnlyModelViewSet` — all mutations go through `InventoryOperationViewSet`.
- `MovementViewSet` and `AuditLogViewSet` are `ReadOnlyModelViewSet` — movements and audit logs are system-generated, never created via API.

## Code Style

### Python / Django

- Follow PEP 8. Use `black`-compatible formatting (single quotes, 88-char lines).
- Use `ruff` for linting (configured via `pyproject.toml` or `.ruff.toml` if present).
- Import order: standard library → Django → third-party → local.
- Type hints on all function signatures (Python 3.13+ typing syntax).
- Use `from __future__ import annotations` for postponed evaluation.
- Prefer `get_user_model()` over direct `User` import, but never at module level (causes `AppRegistryNotReady`).

### TypeScript / Frontend

- Strict TypeScript mode enabled (`noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `verbatimModuleSyntax`).
- No `any` types. Use `unknown` if type is truly indeterminate.
- Use `import type` for type-only imports.
- Server state → React Query. App state → Zustand. Form state → React Hook Form + Zod.
- Validation schemas via Zod with `@hookform/resolvers`.
- Styling via Tailwind CSS v4 — no CSS modules or styled-components.

### Naming Conventions

- **Models**: PascalCase singular (`class Tile`, `class Inventory`, `class Movement`)
- **Serializers**: PascalCase with `Serializer` suffix (`TileSerializer`, `ReceiveInventorySerializer`)
- **Views**: PascalCase with `ViewSet` suffix (`TileViewSet`, `InventoryOperationViewSet`)
- **Services**: PascalCase with `Service` suffix (`InventoryService`)
- **Functions/methods**: `snake_case`
- **API endpoints**: kebab-case (`/api/inventory/low-stock/`)
- **Migration files**: descriptive names (`0003_tile_image.py`)

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short description>

<optional body>
```

Types:
- `feat:` — new feature
- `fix:` — bug fix
- `refactor:` — code change that neither fixes a bug nor adds a feature
- `test:` — adding or updating tests
- `docs:` — documentation changes
- `chore:` — build, CI, or tooling changes
- `style:` — formatting changes (no logic change)

Examples:
```
feat: add low stock alerts API endpoint
fix: prevent negative stock in dispatch service
docs: add API overview to README
```

## Pull Request Process

1. **One feature per PR** — keep changes focused and reviewable
2. **Reference the issue** — include `Closes #123` in the description
3. **All tests must pass** — run the full test suite before submitting
4. **Lint and typecheck** — frontend: `npm run lint` (oxlint), backend: `ruff check .`
5. **No commented-out code or debug artifacts** — clean up before committing
6. **Keep the commit history clean** — rebase onto `main` before submitting
7. **Squash commits if needed** — a single commit per feature is preferred

### PR Checklist

- [ ] Tests pass (`python -m pytest inventory/tests/`, `npm test` in frontend and mobile)
- [ ] New tests added for new functionality
- [ ] No lint warnings (`cd frontend && npm run lint`)
- [ ] TypeScript compiles without errors (`cd frontend && npx tsc -b`)
- [ ] Architecture conventions followed (thin views, service-layer logic, atomic operations)
- [ ] Commit messages follow conventional commits format
- [ ] README updated if public API changed

## Testing

- Backend uses pytest + factory_boy. Test files live in `inventory/tests/` (package, not single file).
- Frontend uses Vitest + React Testing Library + jsdom. Test files in `src/components/__tests__/`.
- Mobile uses Vitest. Test files in `src/api/__tests__/`.
- Write tests for all new services, API operations, and edge cases.

```sh
# Backend
python -m pytest inventory/tests/ -v

# Frontend
npm test

# Mobile
npm test
```

## Environment

- `DJANGO_SETTINGS_MODULE=inventory_system.settings` (set in `manage.py` and Docker).
- Environment variables from `.env` file (loaded via `python-dotenv`).
- See `.env.production` for the full list of available variables.

### Docker Environment

The `docker-compose.yml` sets these defaults:
- `SECRET_KEY`: auto-generated if not set
- `DEBUG`: `false` in production
- `ALLOWED_HOSTS`: `localhost,backend`
- `CORS_ALLOWED_ORIGINS`: `http://localhost:80,http://localhost:3000`

Startup chain: `migrate → collectstatic → setup_inventory → import_goodwill_catalog → gunicorn`

## Known Gotchas

These are common issues and their verified fixes, collected from prior development:

- **`rest_framework_simplejwt.urls` doesn't exist** — import `TokenObtainPairView` and `TokenRefreshView` directly instead of using `include('rest_framework_simplejwt.urls')`.
- **`CheckConstraint` cannot reference joined fields** — `Q(batch__tile=models.F('tile'))` is invalid for DB check constraints. Remove or replace with application-level validation.
- **Python 3.13 + `pkg_resources`** — `djangorestframework-simplejwt==5.3.0` imports `pkg_resources` which was dropped from recent setuptools. Pin `setuptools<75` if `ModuleNotFoundError: No module named 'pkg_resources'` occurs.
- **Module-level `get_user_model()`** — Never call `get_user_model()` at module level in Django apps (e.g., in `consumers.py`). It triggers `AppRegistryNotReady` during ASGI startup. Call it inside functions instead.
- **`dispatch` as ViewSet action name** — Shadows the DRF `ViewSet.dispatch()` method. Rename any custom action currently called `dispatch` to `issue_dispatch`.
- **Password reset on startup** — `setup_inventory` will NOT reset existing working passwords. Only broken password hashes are corrected on startup, so changes made via Django admin persist across restarts.
