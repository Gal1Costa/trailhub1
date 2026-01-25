#!/bin/bash
# Helper script to run Prisma commands from the HOST machine
# This uses localhost:5432 instead of db:5432 since we're outside Docker

set -e

# Override DATABASE_URL to use localhost instead of db
export DATABASE_URL="postgresql://trailhub:secret@localhost:5432/trailhub_db?schema=public"

echo "🔍 Running Prisma command from HOST machine..."
echo "📝 Using DATABASE_URL: postgresql://trailhub:secret@localhost:5432/trailhub_db"
echo ""

# Run the command passed as arguments
npx prisma "$@"
