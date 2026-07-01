# Inventory System

A full-stack inventory management system for tile products with catalog extraction, stock tracking, user management, and a mobile companion app.

## Architecture

```
Monorepo
├── backend/   — Django 5.0 + DRF + PostgreSQL + Redis + Celery + Channels
├── frontend/  — React 19 + TypeScript 6 + Vite 8 + Tailwind 4
└── mobile/    — Expo 57 + React Native + TypeScript + Zustand
```

## Quick Start

**Backend:**
```sh
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

**Frontend:**
```sh
cd frontend
npm install
npm run dev
```

**Mobile:**
```sh
cd mobile
npm install
npx expo start
```

## Production

```sh
docker compose up -d --build
```

Visit `http://localhost:80`. Login with `manager` / `manager123`.

## Features

- Inventory operations: receive, dispatch, adjust, transfer
- Catalog PDF extraction with multi-strategy grid detection
- Low stock alerts with configurable thresholds
- Reports: stock overview and movement trends
- User management with admin/manager/viewer roles
- Mobile app (Expo/React Native) for on-the-go access
- Full audit trail on every inventory movement

## Tests

```sh
cd backend && python -m pytest     # 117 tests
cd frontend && npm test            # 125 tests
cd mobile && npm test              # 3 tests
```

## License

MIT
