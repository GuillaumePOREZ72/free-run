# Project Overhaul Phase 1: Backend Refactoring Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Refactor the 540-line `backend/server.py` monolith into a scalable, modular FastAPI project structure.

**Architecture:** Create `app/` structure with `core/`, `models/`, `db/`, and `api/routers/`. Migrate code incrementally and tie it back into `main.py`.

**Tech Stack:** FastAPI, Motor (MongoDB), Pydantic, PyJWT, Pytest.

---

### Task 1: Scaffolding Directory Structure & Configuration

**Files:**
- Create: `backend/app/__init__.py`
- Create: `backend/app/core/config.py`
- Create: `backend/app/core/security.py`

**Step 1: Write the failing test**
N/A for scaffolding config, but we verify imports.

**Step 2: Write minimal implementation**
- Scaffold the `backend/app` folder structure.
- Extract `JWT_ALGORITHM`, `get_jwt_secret`, `hash_password`, `verify_password`, `create_access_token`, `create_refresh_token` into `backend/app/core/security.py`.

**Step 3: Commit**
```bash
git add backend/app
git commit -m "refactor: scaffold core security logic"
```

### Task 2: Refactoring Models & Database

**Files:**
- Create: `backend/app/models/schemas.py`
- Create: `backend/app/db/database.py`

**Step 1: Write minimal implementation**
- Move Pydantic models (`RegisterRequest`, `LoginRequest`, `RouteCreate`, `RunCreate`, `ProfileUpdate`) into `backend/app/models/schemas.py`.
- Move the MongoDB connection (`mongo_client`, `db`) into `backend/app/db/database.py`.

**Step 2: Commit**
```bash
git add backend/app/models backend/app/db
git commit -m "refactor: extract models and database connection"
```

### Task 3: Refactoring Core Dependencies

**Files:**
- Create: `backend/app/core/deps.py`

**Step 1: Write minimal implementation**
- Extract `get_current_user` into `backend/app/core/deps.py`.
- Update imports for `db` and `security`.

**Step 2: Commit**
```bash
git add backend/app/core
git commit -m "refactor: extract FastAPI dependencies"
```

### Task 4: Refactoring Routers (Auth & Profile)

**Files:**
- Create: `backend/app/api/routers/auth.py`
- Create: `backend/app/api/routers/profile.py`

**Step 1: Write minimal implementation**
- Build the `APIRouter()` for `/api/auth` (login, register, logout, me, refresh, session).
- Build the `APIRouter()` for `/api/profile`.

**Step 2: Commit**
```bash
git add backend/app/api/routers
git commit -m "refactor: modularize auth and profile routes"
```

### Task 5: Refactoring Routers (Runs, Routes, Records)

**Files:**
- Create: `backend/app/api/routers/runs.py`
- Create: `backend/app/api/routers/routes.py`
- Create: `backend/app/api/routers/records.py`

**Step 1: Write minimal implementation**
- Move `create_run`, `list_runs`, `run_stats`, `get_run`, `delete_run` to `runs.py`.
- Incorporate `check_and_update_records` logic (keep it in `records.py` or as a service).
- Move routes and records endpoints to their respective routers.

**Step 2: Commit**
```bash
git add backend/app/api/routers
git commit -m "refactor: modularize runs, routes, and records"
```

### Task 6: Assemble main.py & Test

**Files:**
- Create: `backend/app/main.py`
- Delete: `backend/server.py`

**Step 1: Write minimal implementation**
- Create `backend/app/main.py` to instantiate `FastAPI()`, add CORS middleware, and `include_router` for all created routers.
- Move the startup event (`startup`, `seed_admin`) to `main.py`.
- Run tests (`pytest backend_test.py`) to verify everything passes exactly as before.

**Step 2: Run test to verify it passes**
```bash
cd backend && pytest backend_test.py -v
```

**Step 3: Commit**
```bash
git rm backend/server.py
git add backend/app/main.py
git commit -m "refactor: assemble modular FastAPI app and drop server.py"
```
