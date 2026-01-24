# Admin Authentication & Routing Security Implementation

## Overview

This document describes the **strict security model** implemented for admin authentication and routing in the TrailHub application.

---

## Security Principles

### Non-Negotiable Rules

1. **Single Entry Point**: `/admin/access` is the ONLY public admin route
2. **No Auto-Dashboard Access**: `/admin` NEVER auto-redirects to `/admin/dashboard`
3. **Mandatory Authentication Gate**: All users must go through `/admin/access` first
4. **Backend Verification**: Admin status is verified by backend API (single source of truth)
5. **Zero Trust**: No admin UI is rendered without explicit backend verification
6. **Fail Secure**: All auth failures redirect to `/admin/access` (never to dashboard)

---

## Route Structure

### Public Route
- **`/admin/access`** - Login/access page (no authentication required)
  - Renders login form for unauthenticated users
  - Auto-redirects authenticated admins to `/admin/dashboard`

### Entry Point (Redirects)
- **`/admin`** - Redirects everyone to `/admin/access`
  - Forces all users through the authentication gate
  - No exceptions (applies to admins and non-admins alike)

### Protected Routes (Require AdminRoute Guard)
- **`/admin/dashboard`** - Main admin dashboard
- **`/admin/users`** - User management
- **`/admin/hikes`** - Hike management
- **`/admin/guides`** - Guide management
- **`/admin/analytics`** - Analytics dashboard
- **`/admin/audit`** - Audit logs
- **`/admin/role-requests`** - Role change requests
- **`/admin/deleted`** - Deleted accounts

---

## Security Components

### 1. Route Configuration (`main.jsx`)

```jsx
// /admin redirects to /admin/access (for everyone)
<Route path="/admin" element={<Navigate to="/admin/access" replace />} />

// Public admin route (no guard)
<Route path="/admin/access" element={<AdminAccess />} />

// Protected routes (each wrapped in AdminRoute guard)
<Route path="/admin/dashboard" element={<AdminRoute><AdminLayout /></AdminRoute>}>
  <Route index element={<AdminDashboard />} />
</Route>
```

**Key Features:**
- Each protected route is individually wrapped with `<AdminRoute>` guard
- `/admin` always redirects to `/admin/access` (never to dashboard)
- No nested route structure that could bypass guards
- Unknown admin routes are handled by React Router's catch-all

### 2. AdminRoute Guard (`AdminRoute.jsx`)

**Purpose:** Protects all admin routes except `/admin/access`

**Security Checks:**
1. Waits for Firebase auth initialization
2. Calls backend API: `GET /me`
3. Verifies `role === 'admin'`
4. Shows loading skeleton (not admin UI) while checking
5. Redirects non-admins to `/admin/access`

**Authentication Flow:**
```
User visits /admin/dashboard
  ↓
AdminRoute mounts
  ↓
Wait for Firebase auth ready
  ↓
Call GET /me
  ↓
├─ 401 / No auth → Redirect to /admin/access
├─ role !== 'admin' → Redirect to /admin/access
└─ role === 'admin' → ✅ Render children (AdminDashboard)
```

**Code Behavior:**
- Returns `<LoadingSkeleton />` while checking
- Returns `<Navigate to="/admin/access" />` for non-admins
- Returns `{children}` only for verified admins
- Attempts token refresh if initial check fails

### 3. AdminAccess Page (`AdminAccess.jsx`)

**Purpose:** The only public admin route and mandatory entry point

**Security Checks:**
1. On mount: Check if user is already authenticated admin
2. If admin: Auto-redirect to `/admin/dashboard`
3. If not: Show login form
4. On login: Verify admin status via backend
5. Non-admin login: Show error and sign out
6. Admin login: Redirect to `/admin/dashboard`

**Authentication Flows:**

#### Flow A: Unauthenticated User
```
Visit /admin/access
  ↓
onAuthStateChanged → user = null
  ↓
✅ Show login form
```

#### Flow B: Already Authenticated Admin
```
Visit /admin/access
  ↓
onAuthStateChanged → user exists
  ↓
Call GET /me → role === 'admin'
  ↓
✅ <Navigate to="/admin/dashboard" />
```

#### Flow C: Non-Admin Login
```
Enter credentials → Submit form
  ↓
Firebase signInWithEmailAndPassword()
  ↓
Call GET /me → role !== 'admin'
  ↓
❌ Show error: "This portal is for administrators only"
  ↓
auth.signOut() (force logout)
  ↓
Stay on /admin/access
```

#### Flow D: Admin Login
```
Enter credentials → Submit form
  ↓
Firebase signInWithEmailAndPassword()
  ↓
Force token refresh: getIdToken(true)
  ↓
Call GET /me → role === 'admin'
  ↓
✅ navigate('/admin/dashboard')
```

---

## Complete Security Flows

### Scenario 1: Unauthenticated User Visits `/admin`
```
1. User navigates to /admin
2. Route config redirects to /admin/access
3. AdminAccess mounts
4. onAuthStateChanged → user = null
5. ✅ Show login form at /admin/access
```

### Scenario 2: Unauthenticated User Visits `/admin/dashboard` Directly
```
1. User navigates to /admin/dashboard
2. AdminRoute guard mounts
3. Wait for Firebase auth
4. Call GET /me → 401 (not authenticated)
5. ❌ <Navigate to="/admin/access" />
6. ✅ User lands at /admin/access login form
```

### Scenario 3: Non-Admin User Visits `/admin`
```
1. Non-admin user navigates to /admin
2. Route config redirects to /admin/access
3. AdminAccess mounts
4. onAuthStateChanged → user exists
5. Call GET /me → role === 'hiker'/'guide'
6. setIsAdmin(false)
7. ✅ Show login form (not authenticated as admin)
```

### Scenario 4: Non-Admin User Visits `/admin/dashboard` Directly
```
1. Non-admin user navigates to /admin/dashboard
2. AdminRoute guard mounts
3. Call GET /me → role !== 'admin'
4. ❌ <Navigate to="/admin/access" />
5. AdminAccess mounts
6. onAuthStateChanged → user exists
7. Call GET /me → role !== 'admin'
8. ✅ Show login form with implicit "not authorized" state
```

### Scenario 5: Non-Admin Tries to Login at `/admin/access`
```
1. User enters non-admin credentials
2. Firebase authentication succeeds
3. verifyAdmin() calls GET /me
4. Backend returns role !== 'admin'
5. ❌ Show error: "This portal is for administrators only"
6. auth.signOut() (force logout)
7. ✅ Stay on /admin/access (no redirect)
```

### Scenario 6: Admin Logs In at `/admin/access`
```
1. Admin enters credentials
2. Firebase authentication succeeds
3. Force token refresh: getIdToken(true)
4. verifyAdmin() calls GET /me
5. Backend returns role === 'admin'
6. Dispatch 'admin:signedin' event
7. ✅ navigate('/admin/dashboard', { replace: true })
```

### Scenario 7: Authenticated Admin Visits `/admin`
```
1. Admin navigates to /admin
2. Route config redirects to /admin/access
3. AdminAccess mounts
4. onAuthStateChanged → user exists
5. Call GET /me → role === 'admin'
6. setIsAdmin(true)
7. ✅ <Navigate to="/admin/dashboard" />
8. AdminRoute guard verifies admin status
9. ✅ Render AdminDashboard
```

### Scenario 8: Authenticated Admin Visits `/admin/dashboard` Directly
```
1. Admin navigates to /admin/dashboard
2. AdminRoute guard mounts
3. Call GET /me → role === 'admin'
4. ✅ Render AdminDashboard (no redirect)
```

### Scenario 9: Unknown Admin Route (e.g., `/admin/xyz`)
```
1. User navigates to /admin/xyz
2. No matching route (falls through)
3. React Router catch-all at bottom
4. ✅ Redirect to /explore (site homepage)
```

---

## Backend Security (Already Implemented)

### Admin Verification Endpoint

**`GET /api/me`**
- Returns current user profile with role
- No authentication required (returns 'visitor' for unauthenticated)
- Used by both AdminRoute and AdminAccess

**Response:**
```json
{
  "id": 123,
  "email": "admin@example.com",
  "role": "admin",  // 'admin' | 'guide' | 'hiker' | 'visitor'
  "firebaseUid": "abc123..."
}
```

### Admin-Only Endpoints

All admin endpoints are protected by `requireRole(['admin'])` middleware:
- `GET /api/admin/overview`
- `GET /api/admin/users`
- `GET /api/admin/hikes`
- `GET /api/admin/guides`
- `PATCH /api/admin/users/:id`
- `DELETE /api/admin/users/:id`
- etc.

**Middleware Behavior:**
- Verifies Firebase ID token
- Checks user role from database
- Returns 403 if not admin
- Prevents unauthorized API access

---

## Security Features

### ✅ Backend Verification
- Admin status verified by backend API (not just frontend)
- Backend checks ADMIN_UIDS environment variable
- Single source of truth for role determination

### ✅ No Frontend-Only Checks
- All guards call backend API
- No reliance on localStorage or frontend state alone
- Token refresh attempted if verification fails

### ✅ Forced Logout for Non-Admins
- Non-admin login attempts are immediately signed out
- Prevents session hijacking or role manipulation
- Clear error messaging

### ✅ Zero UI Exposure
- Loading skeleton shown while checking (not admin UI)
- Non-admins never see admin components
- No "flash of admin content" during checks

### ✅ Secure by Default
- All admin routes protected individually
- No way to bypass guards
- Unknown routes don't expose admin UI
- All failures redirect to safe public page

### ✅ Session Validation
- Firebase authentication + backend role check
- Token refresh on verification failure
- Automatic redirect for expired sessions

### ✅ Deleted Account Protection
- Backend returns 401 for deleted accounts
- Frontend handles "Account deleted" error
- Forces logout and shows appropriate message

---

## Testing Checklist

### Unauthenticated Access
- [ ] Visit `/admin` → redirects to `/admin/access`
- [ ] Visit `/admin/dashboard` → redirects to `/admin/access`
- [ ] Visit `/admin/users` → redirects to `/admin/access`
- [ ] `/admin/access` shows login form
- [ ] No admin UI visible at any point

### Non-Admin User
- [ ] Sign in as hiker/guide
- [ ] Visit `/admin` → redirects to `/admin/access`
- [ ] Visit `/admin/dashboard` → redirects to `/admin/access`
- [ ] Try login at `/admin/access` → error message shown
- [ ] User is signed out after failed admin verification
- [ ] No admin UI visible at any point

### Admin User
- [ ] Sign in as admin
- [ ] Visit `/admin` → redirects to `/admin/access` → auto-redirects to `/admin/dashboard`
- [ ] Visit `/admin/access` → auto-redirects to `/admin/dashboard`
- [ ] Visit `/admin/dashboard` directly → shows dashboard
- [ ] All admin pages accessible
- [ ] Logout works and redirects to public site

### Admin Login Flow
- [ ] Visit `/admin/access` while logged out
- [ ] Enter admin credentials
- [ ] Click "Login"
- [ ] Redirects to `/admin/dashboard`
- [ ] Backend logs show `GET /me` with role='admin'
- [ ] Admin can navigate all admin pages

### Non-Admin Login Flow
- [ ] Visit `/admin/access` while logged out
- [ ] Enter non-admin credentials
- [ ] Click "Login"
- [ ] Error: "This portal is for administrators only"
- [ ] User is signed out
- [ ] Stays on `/admin/access`
- [ ] Backend logs show `GET /me` with role!='admin'

### Direct URL Access
- [ ] Paste `/admin/dashboard` into URL bar (not logged in) → redirects to `/admin/access`
- [ ] Paste `/admin/users` into URL bar (not logged in) → redirects to `/admin/access`
- [ ] Paste `/admin/dashboard` into URL bar (logged in as admin) → shows dashboard
- [ ] No way to access admin pages without authentication

---

## Implementation Files

### Modified Files

1. **`frontend/src/main.jsx`**
   - Route configuration with strict entry point
   - `/admin` redirects to `/admin/access`
   - Each protected route individually wrapped in `<AdminRoute>`

2. **`frontend/src/pages/admin/AdminRoute.jsx`**
   - Auth guard component
   - Backend verification via `/me` endpoint
   - Redirect logic for non-admins

3. **`frontend/src/pages/admin/AdminAccess.jsx`**
   - Public login/access page
   - Admin verification on mount and after login
   - Auto-redirect for authenticated admins
   - Error handling for non-admin logins

### Backend Files (Already Implemented)

1. **`src/modules/identity/controller/index.js`**
   - `GET /api/me` endpoint
   - Returns user profile with role

2. **`src/app/roles.middleware.js`**
   - `requireRole(['admin'])` middleware
   - Protects admin endpoints

3. **`src/utils/admin.js`**
   - `isAdmin(firebaseUid)` function
   - Checks ADMIN_UIDS environment variable

---

## Security Guarantees

With this implementation:

✅ **No unauthorized access**: Non-admins cannot access any admin routes
✅ **No auto-redirect to dashboard**: `/admin` goes to `/admin/access`, not dashboard
✅ **Mandatory authentication gate**: All users must go through `/admin/access`
✅ **Backend verification**: Admin status verified by server, not just frontend
✅ **No UI exposure**: Non-admins never see admin components
✅ **Secure routing**: Each route individually protected
✅ **Clear error messages**: Non-admin login attempts show appropriate errors
✅ **Session validation**: Token refresh and re-verification on errors

---

## Conclusion

This implementation provides a **strict, defense-in-depth security model** for admin authentication and routing:

1. **Entry Point Control**: `/admin` → `/admin/access` (mandatory)
2. **Guard Enforcement**: Every protected route has `<AdminRoute>` guard
3. **Backend Verification**: All auth checks call backend API
4. **Fail Secure**: All failures redirect to safe public page
5. **Zero Trust**: No admin UI without explicit verification

The system prevents unauthorized access through multiple layers of security checks, ensuring that only authenticated admins can access protected routes.
