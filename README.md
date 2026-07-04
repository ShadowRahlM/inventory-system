# Inventory Management System

A full-stack tile inventory system with catalog extraction, stock tracking, user management, production Docker deployment, and a mobile companion app.

## Features

- **Inventory Operations** — receive, dispatch, adjust, and transfer stock with full atomicity
- **Carton/Piece Tracking** — separate carton and loose-piece counters; never rounds quantities
- **Batch Separation** — inventory never mixes tile batches at the same location
- **Audit Trail** — every inventory mutation creates an immutable `Movement` and `AuditLog` record
- **PDF Catalog Extraction** — multi-strategy grid detection (PyMuPDF + OCR) extracts products from PDF catalogs
- **Goodwill Catalog Import** — bulk-import products from Goodwill JSON format
- **Low Stock Alerts** — configurable threshold alerts (`GET /api/inventory/inventory/low_stock/`)
- **Reports** — stock summary and movement trends (`/reports/stock_summary/`, `/reports/movement_summary/`)
- **User Management** — admin, manager, and viewer roles with granular permissions
- **Search** — server-side search across SKU, name, category, brand, series, tile type, finish, use case
- **Mobile App** — Expo/React Native app (login, dashboard, tiles, stock, movements)
- **Docker Production** — PostgreSQL + Redis + Django ASGI + nginx, one command deploy
- **Windows Launcher** — `start.bat` (Docker) and `start.ps1` (no Docker, auto-installs deps)

## Architecture

```
inventory/
├── backend/          Django 5.0 + DRF + PostgreSQL + Redis + Celery + Channels
│   ├── inventory/    Single Django app (models, services, views, serializers)
│   ├── data/         Seed data (catalog JSON, image-to-SKU mappings)
│   └── scripts/      Catalog extraction pipeline
├── frontend/         React 19 + TypeScript 6 + Vite 8 + Tailwind 4 + Oxlint
│   └── src/          Components, hooks, API client, Zustand stores
├── mobile/           Expo 57 + React 19 + TypeScript 6 + Zustand + Axios
│   └── src/          Screens, API layer, auth store, navigation
├── docker-compose.yml      Full stack orchestration
├── start.bat / start.ps1   Windows launchers
├── LICENSE                  GNU GPL v2
├── README.md                This file
└── CONTRIBUTING.md          Contribution guide
```

### Backend architecture

**Views → Services → Models.** Business logic lives in `services.py`, views are thin, models are data-only.

| Layer | Responsibility | Location |
|---|---|---|
| Views | Parse request, call service, return response | `views.py` |
| Services | All business logic, atomic operations | `services.py` |
| Models | Data definition, constraints, computed properties | `models.py` |
| Serializers | Field definitions, no validation logic | `serializers.py` |
| Permissions | Role-based access control | `permissions.py` |

## Quick Start

### Development (Docker — recommended)

```sh
docker compose up -d --build
```

Open `http://localhost:80`. Login with `admin` / `admin123`.

### Development (manual)

**Prerequisites:** Python 3.13, Node 24, PostgreSQL 16, Redis 7.

```sh
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Frontend (separate terminal)
cd frontend
npm install
npm run dev

# Mobile (separate terminal)
cd mobile
npm install
npx expo start
```

### Windows (no Docker)

Double-click `start.ps1` — auto-installs Python, Node, PostgreSQL, and Redis via Chocolatey, then starts all three services.

## Default Users

| Username   | Password     | Role       | Permissions |
|------------|-------------|------------|-------------|
| `admin`    | `admin123`  | Superuser  | Full access (all operations, user management) |
| `manager`  | `manager123`| Manager    | Inventory operations, read-only user mgmt |
| `viewer`   | `viewer123` | Viewer     | Read-only access |

Passwords can be changed via Django admin at `/admin/`. The startup script only resets passwords if they are broken (wrong hash); existing working passwords are never overwritten.

## API Overview

All endpoints are at `/api/...` and require JWT authentication.

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/token/` | POST | Obtain JWT access + refresh tokens |
| `/api/auth/token/refresh/` | POST | Refresh an expired access token |
| `/api/auth/me/` | GET | Current user profile and role |
| `/api/inventory/tiles/` | GET/POST | List/create tiles. Supports `?search=` |
| `/api/inventory/tiles/<id>/` | GET/PUT/PATCH/DELETE | Tile CRUD |
| `/api/inventory/batches/` | GET/POST | List/create batches |
| `/api/inventory/inventory/` | GET | Read-only stock view |
| `/api/inventory/inventory/low_stock/` | GET | Low stock alerts (`?threshold=N`) |
| `/api/inventory/movements/` | GET | Read-only movement log |
| `/api/inventory/audit-logs/` | GET | Read-only audit trail |
| `/api/inventory/operations/receive/` | POST | Receive stock |
| `/api/inventory/operations/dispatch/` | POST | Dispatch stock |
| `/api/inventory/operations/adjust/` | POST | Adjust stock |
| `/api/inventory/operations/transfer/` | POST | Transfer stock |
| `/api/inventory/reports/stock_summary/` | GET | Stock summary report |
| `/api/inventory/reports/movement_summary/` | GET | Movement trends (`?period=day|week|month`) |
| `/api/inventory/users/` | GET/POST | User management (admin only) |
| `/api/inventory/tile-catalogs/` | GET/POST | Upload PDF catalogs |
| `/api/inventory/tile-catalogs/<id>/extract/` | POST | Extract products from uploaded PDF |

## Testing

```sh
# Backend (117 tests)
cd backend && python -m pytest inventory/tests/ -v

# Frontend (125 tests)
cd frontend && npm test

# Mobile (3 tests)
cd mobile && npm test
```

## Production Deployment

### Docker Compose

```sh
docker compose up -d --build
```

Services: `db` (PostgreSQL 16) → `redis` (Redis 7) → `backend` (Django ASGI, 4 workers) → `frontend` (nginx).

### Environment Variables

Copy `.env.production` to `.env` and edit:

```sh
SECRET_KEY=<random 50-char string>
DEBUG=false
ALLOWED_HOSTS=<your-domain>,backend
DB_NAME=inventory_db
DB_USER=postgres
DB_PASSWORD=<secure-password>
CORS_ALLOWED_ORIGINS=http://<your-domain>
```

Generate a secret key:
```sh
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

### Domain Setup

The nginx reverse proxy serves:
- `/` — React SPA (static files)
- `/api/*` → `backend:8000`
- `/admin/*` → `backend:8000` (Django admin)
- `/media/*` → `backend:8000` (uploaded images)
- `/static/*` → `backend:8000` (admin CSS/JS)
- `/ws/*` → `backend:8000` (WebSocket via Channels)

### Mobile App (Production)

```sh
cd mobile
EXPO_PUBLIC_API_URL=http://<your-server-ip> npx expo start
```

The mobile app connects to the nginx proxy at port 80 (`/api/...` → `backend:8000`).

## Data Seed Files

| File | Contents |
|---|---|
| `backend/data/catalog_seed.json` | 254 tile catalog items (SKU, category, collection, size) |
| `backend/data/image_sku_mappings.json` | Image-to-SKU mappings (2 source files, 31 items) + unmapped files |

These are automatically imported on every `docker compose up` via `import_goodwill_catalog`.

## License

This project is licensed under the GNU General Public License v2 — see the [LICENSE](LICENSE) file for details.
