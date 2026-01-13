Delete account — smoke test

This file explains how to manually verify the new "Delete account" flow locally and with curl.

Prerequisites
- Backend is running (dev): run `npm run dev` or via Docker Compose `docker compose up -d --build`.
- Prisma migration for the soft-delete fields has been applied: `npx prisma migrate dev --name add-user-soft-delete` (or `npx prisma migrate deploy` in CI).
- Frontend dev server running (Vite): `cd frontend && npm run dev`.
- A user account (hiker or guide) that can sign in via Firebase (or use the `x-dev-user` header in dev mode).

1) Quick manual test (browser)
- Sign in as a user in the app.
- Open your Profile/Settings page (`/profile` or `/profile/guide`).
- Scroll to the Danger/Delete section and click "Delete Account".
- The confirmation dialog will require you to type `DELETE`.
- Confirm. On success you should:
  - Be signed out automatically.
  - See a success toast "Account deleted".
  - Be redirected to `/`.
- After deletion, API requests using the same Firebase account should fail with 401 / "Account deleted".

2) Quick test with curl (get an ID token from Firebase or use dev header)
- Using `x-dev-user` header (convenient for local dev):

```bash
curl -v -H "x-dev-user: {\"id\":\"<USER_ID>\", \"email\":\"user@example.com\", \"role\":\"hiker\"}" \
  -X DELETE http://localhost:8080/api/me
```

- If using a real Firebase ID token (recommended for realistic test):

```bash
ID_TOKEN=$(cat /tmp/firebase_signin.json | jq -r .idToken)
curl -v -H "Authorization: Bearer $ID_TOKEN" -X DELETE http://localhost:8080/api/me
```

- Expected response: 204 No Content.

3) Verify middleware rejects a deleted user
- Immediately after deletion try an authenticated request (e.g., GET /api/me):

```bash
curl -v -H "Authorization: Bearer $ID_TOKEN" http://localhost:8080/api/me
```

- Expected response: 401 with an error indicating the account is deleted.

Notes
- The canonical delete endpoint is `/api/me`. The legacy `DELETE /api/users/me` now redirects (307) to `/api/me` to preserve compatibility.
- Be sure to run the Prisma migration before testing so `status`/`deletedAt` fields exist.
- If you want me to add an automated test (supertest) for this flow, I can add one to `src/tests` and wire it into the test script.
