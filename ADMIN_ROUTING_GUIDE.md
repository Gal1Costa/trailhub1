# Admin Routing Implementation - Test Guide

## Implementation Summary

The admin area now implements strict authentication flow with the following rules:

### Routes
- **`/admin/access`** - The ONLY entry point for admin authentication
- **`/admin`** - Redirects to `/admin/dashboard` (dashboard is the default admin page)
- **`/admin/dashboard`** - Shows overview stats
- **`/admin/hikes`** - Manage hikes
- **`/admin/users`** - Manage users
- **`/admin/guides`** - Manage guides (NEW)
- **`/admin/*`** - All other admin routes

### Authentication Flow

1. **Unauthenticated user visits `/admin`** 
   → AdminRoute checks `/me` endpoint
   → Gets 401 (not logged in)
   → Redirects to `/admin/access`

2. **Non-admin user visits `/admin`**
   → AdminRoute checks `/me` endpoint
   → Gets role != 'admin'
   → Redirects to `/admin/access`

3. **Admin user visits `/admin/access`**
   → AdminAccess mounts
   → Checks if already admin via `/me` endpoint
   → Redirects to `/admin` (to dashboard)

4. **Non-admin logs in at `/admin/access`**
   → Login succeeds with Firebase
   → AdminAccess calls `/me` endpoint
   → Gets role != 'admin'
   → Shows error: "Account is not an admin"
   → Keeps user on `/admin/access`

5. **Admin logs in at `/admin/access`**
   → Login succeeds with Firebase
   → AdminAccess calls `/me` endpoint
   → Gets role == 'admin'
   → Redirects to `/admin`
   → AdminRoute verifies role == 'admin'
   → Shows AdminLayout with Dashboard

### API Endpoint
- **`GET /me`** - Returns current user profile with `role` field
  - Valid responses: `{ id, email, name, role: 'admin'|'hiker'|'guide'|'visitor', ... }`
  - All frontend calls use path `/me` (baseURL="/api" adds the `/api` prefix)

## Test Scenarios

### Test 1: Unauthenticated Access
```
1. Clear localStorage and all auth
2. Visit http://localhost:8080/admin
3. Expected: Redirect to /admin/access
4. Backend logs should show: GET /api/me with 401 response
```

### Test 2: Logged-in Non-Admin Access
```
1. Sign in as regular user (hiker or guide)
2. Visit http://localhost:8080/admin
3. Expected: Redirect to /admin/access
4. Backend logs should show: GET /api/me with 200 response, role != 'admin'
```

### Test 3: Admin Already Logged In Visits /admin/access
```
1. Sign in as admin
2. Visit http://localhost:8080/admin/access
3. Expected: Redirect to /admin (dashboard)
4. Backend logs should show: GET /api/me with 200 response, role == 'admin'
```

### Test 4: Non-Admin Tries Login at /admin/access
```
1. Clear all auth
2. Visit http://localhost:8080/admin/access
3. Enter non-admin credentials (sign up as hiker first if needed)
4. Click Login
5. Expected: Error message "Account is not an admin"
6. Stay on /admin/access
7. Backend logs should show: GET /me endpoint returning non-admin role
```

### Test 5: Admin Login at /admin/access
```
1. Clear all auth
2. Visit http://localhost:8080/admin/access
3. Enter admin credentials (e.g., admin@gmail.com / StartNow for dev)
4. Click Login
5. Expected: Redirect to /admin/dashboard
6. See admin dashboard with counts, tabs, etc.
7. Backend logs should show: GET /me endpoint returning role == 'admin'
```

### Test 6: No /api/api/* Paths
```
1. Open browser DevTools → Network tab
2. Sign in as admin at /admin/access
3. Check all requests in Network tab
4. Expected: No requests to /api/api/*
5. Expected paths: /api/me, /api/admin/overview, /api/admin/users, etc.
```

### Test 7: Admin Dashboard Functions
```
1. While logged in as admin, visit /admin/dashboard
2. Should see:
   - Overview stats (users, hikes, guides, bookings count)
   - Navigation tabs (Dashboard, Hikes, Users, Guides, Analytics, Moderation)
3. Click on each tab and verify page loads
4. Try search and pagination on Users/Hikes/Guides
5. Try destructive actions (Delete with typing confirmation)
```

## Code Changes Made

### Frontend

**`frontend/src/pages/admin/AdminRoute.jsx`**
- Changed to call `api.get('/me')` instead of `/admin/me`
- Checks if `res.data.role === 'admin'`
- Always redirects non-admins to `/admin/access`

**`frontend/src/pages/admin/AdminAccess.jsx`**
- Added `useEffect` to check if user is already admin on mount
- If admin, returns `<Navigate to="/admin" />`
- After login, calls `api.get('/me')` to verify role
- If admin, navigates to `/admin`
- If not admin, shows error message
- Supports loading state while checking auth

**`frontend/src/api.js`**
- Set `baseURL: "/api"` (was empty)
- Changed dev localStorage key from `dev_admin` to `dev_user`
- Components call `api.get('/me')` not `api.get('/api/me')`

**`frontend/src/main.jsx`**
- `/admin` route redirects to `/admin/dashboard`
- All `/admin/*` routes wrapped in `<AdminRoute>` guard

### Backend

**No changes needed** - Backend already has:
- `GET /api/me` endpoint returning user profile with role
- `GET /api/admin/me` endpoint (admin-only verification)
- All admin endpoints protected by `requireRole(['admin'])` middleware

## Validation Checklist

- [ ] Visit `/admin` while logged out → redirects to `/admin/access`
- [ ] Visit `/admin` as non-admin → redirects to `/admin/access`
- [ ] Visit `/admin/access` as admin → redirects to `/admin`
- [ ] Non-admin login at `/admin/access` → error message, stay on page
- [ ] Admin login at `/admin/access` → redirect to `/admin/dashboard`
- [ ] Backend logs show `/api/me` not `/api/api/me`
- [ ] Admin can view dashboard with counts
- [ ] Admin can search/paginate users/hikes/guides
- [ ] Admin can delete items (with typing confirmation)
- [ ] Admin can toggle hike status, verify guides, feature guides
- [ ] All ConfirmDialog destructive actions require typing "DELETE"

## Known Issues / Future

- None identified
