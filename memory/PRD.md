# RunTracker - PRD

## Problem Statement
Application type Strava gratuite permettant de planifier des parcours de course et de tracker en temps réel avec géolocalisation et métriques.

## Architecture
- **Backend**: FastAPI + MongoDB (motor async driver)
- **Frontend**: React + Vite + Tailwind CSS
- **Maps**: Leaflet + react-leaflet (CartoDB Dark Matter tiles)
- **Charts**: Recharts
- **Auth**: JWT (email/password) + Emergent Google OAuth
- **Icons**: Phosphor Icons
- **Fonts**: Bebas Neue (headings) + Manrope (body)

## User Personas
- Personal runner wanting to plan and track runs around home

## Core Requirements
- [x] User authentication (JWT + Google OAuth)
- [x] Route planner with interactive map (click-to-draw)
- [x] Live GPS tracking with real-time metrics
- [x] Run history dashboard with stats
- [x] Run detail view with map, splits, elevation chart
- [x] Metrics: distance, duration, speed, pace, elevation, calories, splits/km
- [x] Profile management (weight/height for calorie calculation)
- [x] Dark theme (sporty/modern)

## What's Been Implemented (April 5, 2026)
- Full backend API with auth, routes CRUD, runs CRUD, stats, profile
- Login/Register with JWT cookies + Google OAuth
- Dashboard with stats grid + recent runs list
- Route Planner with Leaflet map + click-to-draw
- Live GPS Tracking with start/pause/resume/stop + real-time metrics
- Run Detail with map replay, splits table, elevation chart
- Profile page with weight/height
- Admin seeding + brute force protection
- Dark theme applied throughout
- **Personal Records system**: Auto-detects records for 1km, 5km, 10km, semi-marathon, marathon after each run. Dashboard displays records with gold trophy icons. Celebration overlay on new records. Improvement delta shown when beating previous records.

## Testing Status
- Backend: 100% passed
- Frontend: 100% passed
- Integration: 100% passed

## Backlog (P0/P1/P2)
### P1
- Export runs as GPX files
- Import GPX files from other apps
- Weekly/monthly statistics charts
- Route suggestions based on saved routes
- Records timeline / progression graph

### P2
- Interval training mode
- Heart rate zone integration (via Bluetooth)
- Weather conditions at time of run
- Personal records / achievements system
- Multi-language support (FR/EN)

## Next Tasks
- Add GPX export functionality
- Weekly stats overview with charts
- Route gallery with saved routes list
