# Test Credentials

## Admin User
- **Email**: admin@runtracker.com
- **Password**: admin123
- **Role**: admin

## Auth Endpoints
- POST /api/auth/register - Register new user
- POST /api/auth/login - Login with email/password
- POST /api/auth/logout - Logout
- GET /api/auth/me - Get current user
- POST /api/auth/refresh - Refresh access token
- POST /api/auth/session - Google OAuth session exchange

## App Endpoints
- GET/POST /api/routes - List/Create routes
- GET/DELETE /api/routes/{route_id} - Get/Delete route
- GET/POST /api/runs - List/Create runs
- GET /api/runs/stats - Get running statistics
- GET/DELETE /api/runs/{run_id} - Get/Delete run
- GET/PUT /api/profile - Get/Update profile
- GET /api/health - Health check

## Test Data
- Run ID: run_5a7612eee269
- Route ID: route_ca88e420acfa
