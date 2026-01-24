#!/bin/sh
set -e

echo "Waiting for database to be ready..."
until nc -z db 5432; do 
  echo "Database not ready, waiting..."
  sleep 1
done

echo "Database is ready. Running migrations..."
npx prisma migrate deploy

echo "Migrations complete. Starting server..."
exec node src/app/index.js
