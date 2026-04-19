#!/bin/bash

# PromptSCAD Server Monitor
# Continuously monitors server status and activity

echo "🚀 PromptSCAD Server Monitor Started"
echo "=================================="

# Function to check server health
check_health() {
    local health=$(curl -s http://localhost:3000/health 2>/dev/null)
    if [ $? -eq 0 ]; then
        local status=$(echo "$health" | jq -r '.message' 2>/dev/null)
        local timestamp=$(echo "$health" | jq -r '.timestamp' 2>/dev/null)
        echo "🌐 Server Status: $status"
        echo "⏰ Last Check: $timestamp"
    else
        echo "❌ Server not responding"
    fi
}

# Function to show recent activity
show_activity() {
    echo "📊 Recent Activity:"
    echo "- Active Requests: $(ls requests/*.json 2>/dev/null | wc -l)"
    echo "- Latest Log Entry: $(tail -1 server.log 2>/dev/null || echo 'No logs')"
    
    # Show last 3 completed requests
    echo "📝 Last 3 Completed Requests:"
    ls -t requests/*.json 2>/dev/null | head -3 | while read file; do
        local status=$(jq -r '.status' "$file" 2>/dev/null)
        local message=$(jq -r '.message' "$file" 2>/dev/null)
        local timestamp=$(jq -r '.timestamp' "$file" 2>/dev/null)
        if [ "$status" = "complete" ]; then
            echo "  ✅ $(basename "$file" .json) - $message"
        elif [ "$status" = "processing" ]; then
            echo "  🔄 $(basename "$file" .json) - $message"
        else
            echo "  ❓ $(basename "$file" .json) - $status"
        fi
    done
}

# Function to show API key status
check_api_key() {
    if [ -f ".env" ]; then
        if grep -q "OPENAI_API_KEY\|DEEPSEEK_API_KEY" .env; then
            echo "🔑 API Key: ✅ Configured"
        else
            echo "🔑 API Key: ❌ Missing"
        fi
    else
        echo "🔑 API Key: ❌ No .env file"
    fi
}

# Main monitoring loop
while true; do
    clear
    echo "🚀 PromptSCAD Server Monitor"
    echo "=================================="
    echo "$(date)"
    echo ""
    
    check_health
    echo ""
    check_api_key
    echo ""
    show_activity
    echo ""
    echo "Press Ctrl+C to exit monitor"
    echo "=================================="
    
    sleep 10
done