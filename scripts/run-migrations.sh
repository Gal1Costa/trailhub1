#!/bin/bash
# Helper script to run Prisma migrations on the server
# This script runs migrations inside the Docker container where DATABASE_URL resolves correctly

set -e

echo "🔄 Running Prisma migrations..."

# Run migrations inside the backend container
docker compose exec -T backend sh -c "npx prisma migrate deploy"

echo "✅ Migrations completed!"

# Optional: Show migration status
echo ""
echo "📊 Current migration status:"
docker compose exec -T backend sh -c "npx prisma migrate status"
