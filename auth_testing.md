# Auth Testing Playbook

## Step 1: Backend API Testing
```bash
API="https://91c2d789-597e-42a3-aff2-bb06c883e1b5.preview.emergentagent.com"

# Login
curl -c cookies.txt -X POST "$API/api/auth/login" -H "Content-Type: application/json" -d '{"email":"admin@runtracker.com","password":"admin123"}'

# Check auth
curl -b cookies.txt "$API/api/auth/me"

# Test protected endpoint
curl -b cookies.txt "$API/api/runs"
```

## Step 2: Browser Testing
Set cookie and navigate to dashboard:
```python
await page.context.add_cookies([{
    "name": "access_token", 
    "value": "YOUR_TOKEN",
    "domain": "91c2d789-597e-42a3-aff2-bb06c883e1b5.preview.emergentagent.com",
    "path": "/",
    "httpOnly": True,
    "secure": True,
    "sameSite": "None"
}])
```

## Checklist
- [ ] Login returns user + sets cookies
- [ ] /api/auth/me returns user data  
- [ ] Dashboard loads after login
- [ ] Protected routes redirect to login if not authenticated
- [ ] Logout clears cookies
