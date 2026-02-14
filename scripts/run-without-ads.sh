#!/bin/bash

# Script to run PromptSCAD locally without advertisements
# Usage: ./scripts/run-without-ads.sh

set -e

echo "🚀 Starting PromptSCAD without advertisements..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Save current NODE_ENV if set
ORIGINAL_NODE_ENV="${NODE_ENV}"

# Set environment variables for no-ads mode
export AD_ENV=quiet
export NODE_ENV=development  # Show all features but no ads

echo "✅ Environment configured:"
echo "   - Advertisements: DISABLED"
echo "   - Mode: Development"
echo "   - Port: 3000 (default)"
echo ""
echo "🌐 Local URLs:"
echo "   - Main UI: http://localhost:3000/main.html"
echo "   - Simple UI: http://localhost:3000/simple.html"
echo "   - Gallery: http://localhost:3000/gallery.html"
echo ""
echo "To stop the server, press Ctrl+C"
echo "========================================"
echo ""

# Run the server
node server/server.js

# Clean up on exit
cleanup() {
    echo ""
    echo "👋 Stopping server..."
    # Restore original NODE_ENV
    export NODE_ENV="${ORIGINAL_NODE_ENV}"
    unset AD_ENV
    echo "✨ Cleanup complete"
}

trap cleanup EXIT INT TERM

wait