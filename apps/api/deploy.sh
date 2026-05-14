#!/bin/bash
# ============================================================
# MonetraPOS API - VPS Deploy Script
# Usage: bash deploy.sh
# ============================================================
set -e

echo "🚀 Starting MonetraPOS API deployment..."

# 1. Install dependencies
echo "📦 Installing dependencies..."
npm install --production=false

# 2. Build
echo "🔨 Building application..."
npm run build

# 3. Copy schema.sql to dist (needed by InitialSchema migration)
echo "📋 Copying schema files..."
cp src/migrations/schema.sql dist/src/migrations/schema.sql 2>/dev/null || true

# 4. Run migrations
echo "🗄️  Running database migrations..."
npx typeorm migration:run -d dist/src/data-source.js

echo "✅ Deployment complete! Start the app with: node dist/src/main.js"
