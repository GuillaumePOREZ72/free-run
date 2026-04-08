# Project Overhaul Design

## Overview
This document outlines the three-phase design aimed at making the "free-run" application more robust and scalable. It transitions the backend from a monolithic structure to a highly scalable architecture and aligns the frontend with strict "Tactical Minimalism" performance guidelines, ending with the integration of efficient client-side state management.

## Phase 1: Backend Architectural Refactoring (Robustness)
* **Goal:** Eliminate the monolithic architecture of `backend/server.py` containing 540 lines of unified routes, auth, and DB logic.
* **Architecture:** Introduce a robust FastAPI application factory structure:
    * `backend/app/main.py`: Application entry point and middleware configuration.
    * `backend/app/api/routers/`: Individual files for domains e.g., `auth.py`, `runs.py`, `routes.py`, `profile.py`.
    * `backend/app/core/`: Security (`security.py`, `deps.py`), configuration (`config.py`).
    * `backend/app/db/`: Database configuration and motor client (`database.py`).
    * `backend/app/models/`: Pydantic schemes and MongoDB serialization (`schemas.py`).
* **Verification:** The existing `backend_test.py` must pass completely without regressions.

## Phase 2: Frontend UI/UX "Tactical Minimalism" (Aesthetics)
* **Goal:** Enforce the strict UI rules outlined in `design_guidelines.json`.
* **Strategy (Tailwind CSS):**
    * **Colors/Theme:** Implement true dark mode focusing on surface `#141414` and primary accent (Volt Blue `#00A3FF`).
    * **Components:** Replace generic shapes with sharp edges (1px border `#27272A`), completely eliminating soft shadows or Neumorphism artifacts.
    * **Typography:** Instantiate `Bebas Neue` for large headers (`text-5xl` tracking-tight upper) and `Manrope` for structural body.
* **Verification:** Execute visual audits component-by-component.

## Phase 3: Frontend State & Data Optimization (Scalability)
* **Goal:** Implement dedicated state management instead of repetitive ad-hoc local state variables and generic effects.
* **Architecture:**
    * Initialize `@tanstack/react-query`.
    * Build custom hooks (e.g., `useRuns()`, `useProfile()`) inside `src/hooks`.
    * Offload asynchronous caching, error rendering, and status loading from React Router/view layers directly to `react-query`.
* **Verification:** The app feels snappier, the code footprint inside pages is visually reduced, and offline/caching mechanisms behave as expected.
