# TrailHub

TrailHub is a full-stack hiking platform for discovering, booking, and managing guided hikes with roles for hikers, guides, and admins.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Getting Started (Local)](#getting-started-local)
- [Environment Variables](#environment-variables)
- [Database (Prisma)](#database-prisma)
- [Running Locally (Without Docker)](#running-locally-without-docker)
- [Running with Docker](#running-with-docker)
- [Testing](#testing)
- [Deployment](#deployment)
- [CI/CD](#cicd)
- [API Documentation](#api-documentation)
- [Roles and Permissions](#roles-and-permissions)
- [Troubleshooting](#troubleshooting)
- [Team](#team)

---

## Overview

TrailHub helps hikers find and join guided hikes, while guides can create and manage hikes and admins can moderate the platform. This repository includes:

- A React/Vite single-page app (frontend)
- A Node.js/Express REST API (backend, modular monolith)
- PostgreSQL with Prisma ORM (database)
- Docker + Nginx for containerized local/production runs

Key flows implemented in code:

- Hike discovery with filters and sorting
- Hike details with route maps and destinations
- Join/leave hike bookings (guides can also join hikes)
- Reviews after a hike occurs
- Hiker and guide profiles
- Admin dashboard with analytics, audits, user/guide management
- Email/password authentication via Firebase Auth

---

## Features

### Core Features

- **Explore hikes** with filters (difficulty, date, price, location) and sorting
- **Hike details** with map routes, destinations, and media
- **Join/leave bookings** with capacity checks
- **Reviews** after hikes occur (per-user review enforcement)
- **Profiles** for hikers and guides with joined/created hikes
- **My Trails** dashboard with upcoming hike checklist
- **Admin tools** for analytics, audits, and moderation
- **Socket.IO chat** (basic room-based messaging, stub implementation)

### Roles

| Role | Description | Capabilities |
|------|-------------|--------------|
| Visitor | Unauthenticated | Browse public data (limited) |
| Hiker | Registered | Join/leave hikes, review hikes, edit profile |
| Guide | Registered | Create/manage hikes, edit profile, **also join/leave hikes** |
| Admin | Allowlisted | Admin dashboard, moderation, analytics |

---

## Tech Stack

### Frontend
- React 18 + Vite
- React Router
- Axios
- Leaflet + React-Leaflet (map)
- Firebase Web SDK (Email/Password auth)
- Recharts (admin analytics)

### Backend
- Node.js + Express
- Socket.IO (chat gateway - stub)
- Prisma ORM
- PostgreSQL
- Firebase Admin SDK (token verification)
- Multer (file uploads, 50MB limit)
- AWS SDK S3 client (DigitalOcean Spaces)

### Infrastructure
- Docker + Docker Compose
- Nginx (SPA serving + /api reverse proxy)

---

## Architecture

TrailHub is a **modular monolith**. The backend is organized into modules (users, guides, hikes, bookings, reviews, admin, analytics, chat), each with its own controller and repository logic. The frontend is a SPA that consumes the REST API via an Axios client configured with `/api` base URL and Firebase Auth token injection.

Docker Compose runs three services:

- **db**: PostgreSQL 16
- **backend**: Express API + Socket.IO
- **web**: Nginx serving the built frontend and proxying `/api` to the backend

---

## Repository Structure

```
trailhub/
├── src/                        # Backend source
│   ├── app/                    # App bootstrap, middleware, routes
│   ├── modules/                # Feature modules (hikes, reviews, admin, etc.)
│   ├── adapters/               # Firebase, Spaces, payments, maps
│   ├── shared/                 # Prisma client, DB utilities
│   └── utils/                  # Admin and shared utilities
│
├── frontend/                   # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/              # Explore, HikeDetails, Profile, Admin, etc.
│   │   ├── components/         # UI components
│   │   ├── api.js              # Axios instance (/api)
│   │   └── firebase.js         # Firebase client config
│   └── vite.config.js          # Vite proxy for /api
│
├── prisma/                     # Prisma schema and migrations
├── docker/nginx/               # Nginx reverse proxy config
├── tests/                      # Playwright E2E tests
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.web
└── README.md
```

---

## Getting Started (Local)

### Prerequisites

- Node.js 18+ (Node 20 recommended)
- PostgreSQL (local) or Docker
- Firebase project with Email/Password enabled

### Install

```bash
git clone <repo-url>
cd trailhub1

# backend deps
npm install

# frontend deps
cd frontend
npm install
```

---

## Environment Variables

The backend loads `.env` from the repo root and also checks `prisma/.env`.

### Backend (.env)

```env
NODE_ENV=development
PORT=3000
DEV_MODE=true

# Postgres
DATABASE_URL=postgresql://trailhub:secret@localhost:5432/trailhub_db?schema=public

# Firebase Admin SDK (backend)
FIREBASE_PROJECT_ID=trailhub-82d1c
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@trailhub-82d1c.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=trailhub-82d1c.firebasestorage.app

# Admin allowlist (comma-separated Firebase UIDs)
ADMIN_UIDS=uid1,uid2

# Optional: CORS allowed origins (comma-separated)
CORS_ORIGIN=http://localhost:5173,http://localhost:8080

# DigitalOcean Spaces (optional, uses AWS SDK S3 client)
DO_SPACES_KEY=...
DO_SPACES_SECRET=...
DO_SPACES_BUCKET=...
DO_SPACES_REGION=fra1
DO_SPACES_ENDPOINT=https://fra1.digitaloceanspaces.com
DO_SPACES_CDN=https://cdn.example.com

# Frontend Firebase (Vite picks these up via VITE_ prefix)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Frontend

The frontend reads Firebase config from environment variables (see [frontend/src/firebase.js](frontend/src/firebase.js)). The root `.env` file already contains `VITE_*` prefixed Firebase vars that Vite automatically exposes to the browser during development.

For local dev, just ensure your `.env` has these vars filled in with your Firebase project values. Vite automatically loads `.env` and exposes `VITE_*` variables to the frontend.

> **Never commit secrets.** Store `.env` locally and keep private keys out of version control.

---

## Database (Prisma)

```bash
npx prisma generate
npx prisma migrate dev
```

Prisma Studio:

```bash
npx prisma studio
```

Schema is defined in [prisma/schema.prisma](prisma/schema.prisma).

---

## Running Locally (Without Docker)

### Backend

```bash
npm run dev
```

Health check:

```
http://localhost:3000/healthz
```

### Frontend

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser to view the website.

Vite proxies `/api` to `http://localhost:3000` (see [frontend/vite.config.js](frontend/vite.config.js)). All API requests will be automatically sent to the backend.

---

## Running with Docker

```bash
docker compose up --build
```

Services:

- **db** (Postgres 16): `localhost:5432`
- **backend**: `http://localhost:3000`
- **web** (Nginx): `http://localhost:8080`

Nginx proxies `/api` to the backend (see [docker/nginx/default.conf](docker/nginx/default.conf)).

Stop:

```bash
docker compose down
```

---

## Testing

### API Script

```bash
bash test_api.sh all
```

### Frontend Unit Tests

```bash
cd frontend
npm run test
```

### Playwright E2E

Playwright tests live in [tests](tests) and are used by the CI workflow. Run from repo root with:

```bash
npx playwright test
```

---

## Deployment

This repo supports Docker-based deployment (backend + web + db). A typical flow:

1. Set production `.env` on the server
2. `docker compose up --build -d`
3. Run database migrations: `npx prisma migrate deploy`
4. Verify `GET /healthz`

---

## CI/CD

GitHub Actions workflow: [Playwright E2E Tests](.github/workflows/playwright.yml)

Current behavior:

- Runs on `push` and `pull_request` to `Development`
- Validates Prisma schema and all required secrets
- Builds Docker services for backend + database
- Creates `.env` for backend and `frontend/.env.local` for frontend from GitHub Secrets
- Runs API smoke script if present
- Runs frontend build and Playwright tests

Required secrets (add in GitHub Settings → Secrets and variables → Actions):

**Backend secrets:**
- `CI_DATABASE_URL` - PostgreSQL connection string
- `CI_ADMIN_UIDS` - Comma-separated Firebase UIDs for admins

**Firebase secrets:**
- `CI_FIREBASE_API_KEY`
- `CI_FIREBASE_AUTH_DOMAIN`
- `CI_FIREBASE_PROJECT_ID`
- `CI_FIREBASE_STORAGE_BUCKET`
- `CI_FIREBASE_MESSAGING_SENDER_ID`
- `CI_FIREBASE_APP_ID`

---

## API Documentation

Base URL:

- Local backend: `http://localhost:3000`
- Docker web: `http://localhost:8080` (use `/api/*`)

Key endpoints (based on current controllers):

### Identity / Auth
- `GET /api/identity/me`
- `GET /api/me`
- `DELETE /api/me`
- `POST /api/users/register`
- `GET /api/auth/check-admin`

### Hikes
- `GET /api/hikes`
- `GET /api/hikes/:id`
- `POST /api/hikes` (guide/admin)
- `PUT /api/hikes/:id` (guide/admin)
- `DELETE /api/hikes/:id` (guide/admin)
- `POST /api/hikes/:id/join` (hiker/guide/admin)
- `DELETE /api/hikes/:id/join` (hiker/guide/admin)

### Reviews
- `POST /api/reviews` (hiker/guide/admin)
- `GET /api/reviews/guide/:id`
- `GET /api/reviews/hike/:id`
- `GET /api/reviews/user/me`

### Admin
- `GET /api/admin/overview` (admin)
- `GET /api/admin/analytics` (admin)
- `GET /api/admin/users` (admin)
- `GET /api/admin/guides` (admin)
- `PATCH /api/admin/guides/:id` (admin)
- `DELETE /api/admin/guides/:id` (admin)
- `PATCH /api/admin/hikes/:id` (admin)
- `GET /api/admin/audit` (admin)
- `GET /api/admin/me` (admin)

---

## Roles and Permissions

Role enforcement is handled by `requireRole(...)` middleware and admin checks are based on `ADMIN_UIDS`.

| Role | Allowed Examples |
|------|------------------|
| Visitor | Browse public lists, health checks |
| Hiker | Join/leave hikes, review hikes, update profile |
| Guide | Create/update/delete own hikes, **also join/leave hikes** |
| Admin | Access admin dashboard endpoints and moderation tools |

Dev auth header (only if `DEV_AUTH=1`):

```
x-dev-user: {"id":"user-id","firebaseUid":"uid","email":"user@example.com","role":"hiker"}
```

---

## Troubleshooting

**Backend not responding**
- Confirm `npm run dev` is running
- Check `PORT` in `.env`
- Visit `/healthz`

**Database connection errors**
- Verify `DATABASE_URL`
- Ensure Postgres is running
- Run `npx prisma migrate dev`

**Firebase auth issues**
- Ensure Email/Password is enabled in Firebase console
- Check Firebase Admin env vars (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`)

**Admin access denied**
- Ensure your Firebase UID is included in `ADMIN_UIDS`

---

## Team

### Tamari Tateshvili
- PostgreSQL schema & Prisma ORM
- Backend data layer (repositories)
- Admin dashboard features
- Auth and authorization

### Tamar Kvirikashvili
- Docker containerization & deployment flow
- Core frontend pages (Explore, Profile, Hike Details)
- CI/CD maintenance

### Anna Zoziashvili
- Leaflet/OpenStreetMap integration
- My Trails + Explore filters
- UI/UX and testing

---

**Last Updated:** February 2026