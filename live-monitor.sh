#!/bin/bash

# PromptSCAD Live Server Monitor
# Real-time monitoring of server activity and logs

clear
echo "🚀 PromptSCAD Live Server Monitor"
echo "=================================="
echo "Started: $(date)"
echo "Server: http://localhost:3000"
echo ""

# Function to show real-time log updates
monitor_logs() {
    local last_line=$(wc -l < server.log 2>/dev/null || echo 0)
    
    while true; do
        # Check if server is still running
        if ! curl -s http://localhost:3000/health >/dev/null 2>&1; then
            echo "❌ Server stopped responding!"
            echo "Check server.log for error details"
            break
        fi
        
        # Show new log entries
        local current_lines=$(wc -l < server.log 2>/dev/null || echo 0)
        if [ $current_lines -gt $last_line ]; then
            echo "📋 $(date '+%H:%M:%S') New log entries:"
            tail -n +$((last_line + 1)) server.log | while read line; do
                echo "  $line"
            done
            last_line=$current_lines
        fi
        
        # Show request activity
        local request_count=$(ls requests/*.json 2>/dev/null | wc -l)
        local processing_count=$(grep -l '"status": "processing"' requests/*.json 2>/dev/null | wc -l)
        local complete_count=$(grep -l '"status": "complete"' requests/*.json 2>/dev/null | wc -l)
        
        # Update status line
        echo -ne "\r📊 Requests: Total=$request_count | Processing=$processing_count | Complete=$complete_count | $(date '+%H:%M:%S')"
        
        sleep 2
done
}

# Function to show summary stats
show_stats() {
    echo ""
    echo "📈 Server Statistics:"
    echo "- Total Requests: $(ls requests/*.json 2>/dev/null | wc -l)"
    echo "- Completed: $(grep -l '"status": "complete"' requests/*.json 2>/dev/null | wc -l)"
    echo "- Processing: $(grep -l '"status": "processing"' requests/*.json 2>/dev/null | wc -l)"
    echo "- API Key: $(grep -q 'OPENAI_API_KEY\|DEEPSEEK_API_KEY' .env && echo '✅ Configured' || echo '❌ Missing')"
}

# Function to test API functionality
test_api() {
    echo "🧪 Testing API endpoint..."
    local test_response=$(curl -s -X POST http://localhost:3000/generate-code \
        -H "Content-Type: application/json" \
        -d '{"prompt":"create a test cube"}' 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        local request_id=$(echo "$test_response" | jq -r '.requestId' 2>/dev/null)
        echo "✅ API Test: Success (Request ID: $request_id)"
    else
        echo "❌ API Test: Failed"
    fi
}

# Main monitoring loop
echo "🔍 Starting live monitoring..."
echo "Press Ctrl+C to stop monitoring"
echo ""

# Initial status
echo "📋 Initial Status Check:"
if curl -s http://localhost:3000/health >/dev/null 2>&1; then
    echo "✅ Server: Running"
    show_stats
    echo ""
    test_api
    echo ""
    echo "📝 Live Activity Log:"
    echo "====================="
    monitor_logs
else
    echo "❌ Server: Not responding"
    echo "Check server.log for startup errors"
fi