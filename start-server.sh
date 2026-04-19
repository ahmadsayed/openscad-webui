#!/bin/bash

# PromptSCAD Server Startup Script
# Automatically loads environment variables and starts the server

echo "🚀 Starting PromptSCAD Server..."

# Check if .env file exists
if [ -f ".env" ]; then
    echo "📋 Loading environment configuration from .env file"
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "⚠️  No .env file found. Make sure to set your API key!"
fi

# Check if API key is set
if [ -z "$OPENAI_API_KEY" ] && [ -z "$DEEPSEEK_API_KEY" ]; then
    echo "❌ ERROR: No API key found!"
    echo "Please set either OPENAI_API_KEY or DEEPSEEK_API_KEY in your .env file"
    echo "Example: echo 'OPENAI_API_KEY=your-key-here' > .env"
    exit 1
fi

echo "🔑 API key configured successfully"
echo "🌐 Starting server on port 3000..."

# Start the server
npm start