# PREFLIGHT CHECKLIST — MUST READ BEFORE ANY CHANGE

## 1. Read .cursorrules.md FIRST
Read `/run/media/shadowm/Doomsdsay/inventory/.cursorrules.md` in full before every change.

## 2. Hard rules (never violate)

| Rule | Location |
|---|---|
| **Never reset a user's password** — `set_password()` is only for initial creation in `setup_inventory.py`. If a user already exists, skip. Docker rebuilds must NOT change passwords. | `.cursorrules.md:257-267` |
| **Never install system deps outside venv** — use `backend/venv/` for Python, don't pip install globally (not even `--user`), don't apt-get on host. Activate venv before any `python`/`pip` command | `.cursorrules.md:289-293` |
| **Never mix tile batches** — `UniqueConstraint(tile, batch, location)` | `AGENTS.md:51` |
| **Never round quantities** — `IntegerField`, no Decimal/float | `AGENTS.md:52` |
| **Views thin** — business logic in services, not views/serializers | `AGENTS.md:44-45` |
| **Models data-only** — no business logic methods | `AGENTS.md:64` |

## 3. Before writing code
- [ ] Read `.cursorrules.md`
- [ ] Read `AGENTS.md` section relevant to the change
- [ ] Check existing patterns in neighboring files
- [ ] Activate `backend/venv/bin/activate` — never use system Python/pip

## 4. Venv enforcement
- **All inventory code must run inside Docker containers or `backend/venv/`**
- Host system Python (`/usr/bin/python3`, `pip3`) must never have inventory deps installed
- If a dep is needed on host for any reason, use `backend/venv/`
- Verify with: `which python` → should show `venv/bin/python`
- Docker containers are isolated — no host-side venv needed for them

## 5. Before modifying Docker/containers
- [ ] Read `.cursorrules.md` PASSWORD INTEGRITY rule
- [ ] Run `bash scripts/backup-db.sh` if touching database
- [ ] Never `docker compose down -v`
- [ ] Never `set_password()` inside a container

## 6. Before touching API/auth
- [ ] Read `.cursorrules.md:257-267` (Password Integrity)
- [ ] Never reset passwords programmatically
- [ ] Default admin password is `admin123` (from `setup_inventory.py`)
- [ ] Report URLs use underscores: `stock_summary`, `movement_summary`
