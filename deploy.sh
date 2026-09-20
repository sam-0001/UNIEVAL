#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  UNIEVAL — One-command deploy script
#  Usage: ./deploy.sh
# ─────────────────────────────────────────────────────────────

set -e  # Exit immediately if any command fails

echo ""
echo "🚀 ─────────────────────────────────────"
echo "   UNIEVAL Deploy Starting..."
echo "   $(date)"
echo "─────────────────────────────────────────"
echo ""

# ── 1. Pull latest code from GitHub ──────────────────────────
echo "📦 Pulling latest code from GitHub..."
git pull origin master
echo "✅ Code updated"
echo ""

# ── 2. Install any new dependencies ──────────────────────────
echo "📚 Installing dependencies..."
# Using 'npm ci' instead of 'npm install' ensures a clean, predictable build from the lockfile
# --no-audit prevents the Arborist edgesOut crash during vitest peer dependency resolution
npm ci --no-audit --no-fund
echo "✅ Dependencies installed"
echo ""

# ── 3. Build the frontend ─────────────────────────────────────
echo "🔨 Building frontend..."
npm run build
echo "✅ Frontend built"
echo ""

# ── 4. Restart PM2 ───────────────────────────────────────────
echo "♻️  Restarting PM2 processes..."
pm2 restart ecosystem.config.cjs --env production --update-env
echo "✅ PM2 restarted"
echo ""

# ── 5. Save PM2 process list ─────────────────────────────────
pm2 save
echo ""

# ── 6. Show status ───────────────────────────────────────────
echo "📊 Current Status:"
pm2 status
echo ""
echo "✅ ─────────────────────────────────────"
echo "   Deploy Complete! 🎉"
echo "   https://unieval.in is now live"
echo "─────────────────────────────────────────"
echo ""
