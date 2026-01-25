#!/bin/bash
# Helper script to run Prisma migrations on the server
# IMPORTANT: This script runs migrations INSIDE the Docker container
# where the 'db' hostname resolves correctly.

set -e

echo "🔄 Running Prisma migrations inside Docker container..."
echo "📝 Note: Running from host requires 'localhost' instead of 'db' hostname"
echo ""

# Check if containers are running
if ! docker compose ps | grep -q "trailhub-backend.*Up"; then
  echo "❌ Error: Backend container is not running"
  echo "Please start containers first: docker compose up -d"
  exit 1
fi

# Run migrations inside the backend container where DATABASE_URL resolves correctly
echo "🚀 Executing migrations..."
if docker compose exec -T backend sh -c "npx prisma migrate deploy"; then
  echo ""
  echo "✅ Migrations completed successfully!"
else
  echo ""
  echo "❌ Migration failed!"
  exit 1
fi

# Optional: Show migration status
echo ""
echo "📊 Current migration status:"
docker compose exec -T backend sh -c "npx prisma migrate status"

