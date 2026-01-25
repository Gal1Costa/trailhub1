# Prisma Commands Guide - Docker Setup

## ⚠️ Important: Hostname Resolution

Your `.env` file uses `DATABASE_URL="postgresql://trailhub:secret@db:5432/trailhub_db?schema=public"`

The `db` hostname **only exists inside Docker containers**, not on the host machine!

## ✅ Correct Ways to Run Prisma Commands

### Option 1: Run Inside Docker Container (Recommended)

```bash
# Run migrations
docker compose exec -T backend sh -c "npx prisma migrate deploy"

# Check migration status
docker compose exec -T backend sh -c "npx prisma migrate status"

# Generate Prisma Client
docker compose exec -T backend sh -c "npx prisma generate"

# Open Prisma Studio (interactive, needs TTY)
docker compose exec backend sh -c "npx prisma studio"
```

### Option 2: Use Helper Scripts

```bash
# Run migrations (inside container)
./scripts/run-migrations.sh

# Run Prisma commands from host (uses localhost)
./scripts/prisma-host.sh migrate status
./scripts/prisma-host.sh migrate deploy
./scripts/prisma-host.sh studio
```

### Option 3: Override DATABASE_URL for Host Commands

```bash
# Use localhost instead of db when running from host
DATABASE_URL="postgresql://trailhub:secret@localhost:5432/trailhub_db?schema=public" npx prisma migrate status
```

## 🔍 Why This Happens

- **Inside Docker**: `db` hostname resolves to the database container
- **On Host**: `db` doesn't exist, must use `localhost:5432` (port is exposed)

## 📝 Quick Reference

| Command | Inside Container | From Host |
|---------|-----------------|-----------|
| Migrate deploy | `docker compose exec -T backend sh -c "npx prisma migrate deploy"` | `DATABASE_URL="postgresql://trailhub:secret@localhost:5432/trailhub_db?schema=public" npx prisma migrate deploy` |
| Migrate status | `docker compose exec -T backend sh -c "npx prisma migrate status"` | `DATABASE_URL="postgresql://trailhub:secret@localhost:5432/trailhub_db?schema=public" npx prisma migrate status` |
| Prisma Studio | `docker compose exec backend sh -c "npx prisma studio"` | `DATABASE_URL="postgresql://trailhub:secret@localhost:5432/trailhub_db?schema=public" npx prisma studio` |

## 🚀 Recommended Workflow

**For production/deployment**: Always use Option 1 (inside container) - this is what the CI/CD pipeline does.

**For development/debugging**: Use Option 2 (helper scripts) for convenience.
