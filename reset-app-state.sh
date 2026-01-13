#!/bin/bash

# Meetily App State Reset Script
# Clears all app data while preserving downloaded models

set -e

echo "🧹 Cleaning Meetily application state..."

# Stop all running Meetily processes
echo "⏹️  Stopping Meetily processes..."
pkill -9 -f "meetily|tauri dev|Next.js" 2>/dev/null || true
sleep 2

# Get the app support directory
APP_SUPPORT_DIR="$HOME/Library/Application Support/com.meetily.ai"

if [ -d "$APP_SUPPORT_DIR" ]; then
    echo "📁 Removing state files from $APP_SUPPORT_DIR..."
    cd "$APP_SUPPORT_DIR"
    
    # Remove all state files but preserve models directory
    rm -f analytics.json
    rm -f onboarding-status.json
    rm -f preferences.json
    rm -f recording_preferences.json
    rm -f meeting_minutes.sqlite*
    rm -f *.sqlite-shm
    rm -f *.sqlite-wal
    rm -f *.db
    
    echo "✅ App support directory cleaned"
fi

# Remove preferences
echo "🗑️  Removing preferences..."
rm -f "$HOME/Library/Preferences/com.meetily.ai."* 2>/dev/null || true

# Remove caches
echo "🗑️  Removing caches..."
rm -rf "$HOME/Library/Caches/com.meetily.ai" 2>/dev/null || true

# Remove logs
echo "🗑️  Removing logs..."
rm -rf "$HOME/Library/Logs/com.meetily.ai" 2>/dev/null || true

echo ""
echo "✨ Cleanup complete! Remaining files:"
ls -lah "$APP_SUPPORT_DIR" 2>/dev/null | grep -v "models" || echo "App support directory empty or not found"

echo ""
echo "📝 Next steps:"
echo "   1. cd /Users/ryan/Documents/GitHub/meeting-minutes/frontend"
echo "   2. pnpm run tauri:dev:metal"
echo ""
echo "Models preserved at: $APP_SUPPORT_DIR/models/"
