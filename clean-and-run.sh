#!/bin/bash

# One-liner shortcut to reset app and restart
# Usage: ./clean-and-run.sh

REPO_ROOT="/Users/ryan/Documents/GitHub/meeting-minutes"

# Run cleanup
"$REPO_ROOT/reset-app-state.sh"

# Start the app
echo ""
echo "🚀 Starting Meetily with Metal GPU acceleration..."
cd "$REPO_ROOT/frontend" && pnpm run tauri:dev:metal
