#!/bin/bash

# PromptSCAD Server Manager
# Start, stop, restart, and monitor the server with various configurations

set -e

# Configuration
SERVER_PID_FILE="/tmp/promptscad-server.pid"
LOG_DIR="logs"
DEFAULT_PORT=3000

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ERROR:${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] WARNING:${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')] INFO:${NC} $1"
}

# Create log directory
mkdir -p "$LOG_DIR"

# Get server status
get_server_status() {
    if [ -f "$SERVER_PID_FILE" ]; then
        local pid
        pid=$(cat "$SERVER_PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            echo "running"
        else
            echo "stopped"
            rm -f "$SERVER_PID_FILE"
        fi
    else
        echo "stopped"
    fi
}

# Save server PID
save_pid() {
    echo $1 > "$SERVER_PID_FILE"
}

# Start server
start_server() {
    local mode="${1:-standard}"
    local port="${2:-$DEFAULT_PORT}"
    
    log "Starting server in $mode mode on port $port..."
    
    # Check if server is already running
    if [ "$(get_server_status)" = "running" ]; then
        warn "Server is already running"
        return 1
    fi
    
    # Check if port is available
    if lsof -i :$port > /dev/null 2>&1; then
        error "Port $port is already in use"
        return 1
    fi
    
    # Set environment variables based on mode
    case "$mode" in
        "dev"|"development")
            export NODE_ENV=development
            export AD_ENV=quiet
            ;;
        "local"|"ad-free")
            export AD_ENV=quiet
            ;;
        "debug")
            export NODE_ENV=development
            export DEBUG=promptscad:*
            ;;
        "production"|"standard")
            # Use default settings
            ;;
        *)
            error "Unknown mode: $mode"
            return 1
            ;;
    esac
    
    export PORT=$port
    
    # Create log file
    local log_file="$LOG_DIR/server-${mode}-$(date +%Y%m%d-%H%M%S).log"
    
    # Start server
    log "Starting server with command: npm start"
    log "Logging to: $log_file"
    
    nohup npm start > "$log_file" 2>&1 &
    local pid=$!
    
    # Save PID
    save_pid $pid
    
    # Wait for server to start
    log "Waiting for server to start..."
    for i in {1..30}; do
        if curl -s -f "http://localhost:$port/status/health" > /dev/null 2>&1; then
            log "✅ Server started successfully (PID: $pid)"
            log "Mode: $mode, Port: $port"
            log "Logs: $log_file"
            return 0
        fi
        sleep 1
    done
    
    error "Server failed to start within 30 seconds"
    kill $pid 2>/dev/null || true
    rm -f "$SERVER_PID_FILE"
    return 1
}

# Stop server
stop_server() {
    log "Stopping server..."
    
    if [ "$(get_server_status)" = "stopped" ]; then
        warn "Server is not running"
        return 0
    fi
    
    local pid
    pid=$(cat "$SERVER_PID_FILE")
    
    if kill -0 "$pid" 2>/dev/null; then
        log "Stopping server (PID: $pid)..."
        kill "$pid"
        
        # Wait for server to stop
        for i in {1..10}; do
            if ! kill -0 "$pid" 2>/dev/null; then
                log "✅ Server stopped successfully"
                rm -f "$SERVER_PID_FILE"
                return 0
            fi
            sleep 1
        done
        
        # Force kill if still running
        warn "Force killing server (PID: $pid)..."
        kill -9 "$pid" 2>/dev/null || true
        rm -f "$SERVER_PID_FILE"
        log "✅ Server force stopped"
    else
        warn "Server process not found (PID: $pid)"
        rm -f "$SERVER_PID_FILE"
    fi
}

# Restart server
restart_server() {
    local mode="${1:-standard}"
    local port="${2:-$DEFAULT_PORT}"
    
    log "Restarting server in $mode mode..."
    
    stop_server
    sleep 2
    start_server "$mode" "$port"
}

# Monitor server
monitor_server() {
    log "Starting server monitoring..."
    
    if [ "$(get_server_status)" = "stopped" ]; then
        error "Server is not running"
        return 1
    fi
    
    local pid
    pid=$(cat "$SERVER_PID_FILE")
    
    echo "Monitoring server (PID: $pid). Press Ctrl+C to stop."
    echo "=================================="
    
    # Monitor loop
    while true; do
        clear
        echo "🔍 PromptSCAD Server Monitor"
        echo "=================================="
        echo "Time: $(date)"
        echo "Server PID: $pid"
        echo "Status: $(get_server_status)"
        echo
        
        if kill -0 "$pid" 2>/dev/null; then
            # Get process info
            local memory_kb
            memory_kb=$(ps -o rss= -p "$pid" 2>/dev/null || echo "0")
            local memory_mb=$((memory_kb / 1024))
            
            local cpu_usage
            cpu_usage=$(ps -o %cpu= -p "$pid" 2>/dev/null || echo "0")
            
            echo "Memory Usage: ${memory_mb}MB"
            echo "CPU Usage: ${cpu_usage}%"
            echo
            
            # Check health endpoint
            if curl -s -f "http://localhost:3000/status/health" > /dev/null 2>&1; then
                echo "Health Check: ✅ Healthy"
            else
                echo "Health Check: ❌ Unhealthy"
            fi
            
            # Recent requests
            if [ -d "requests/" ]; then
                echo
                echo "Recent Requests:"
                ls -t requests/*.json 2>/dev/null | head -5 | while read -r file; do
                    local filename
                    filename=$(basename "$file" .json)
                    local status
                    status=$(grep -o '"status":"[^"]*"' "$file" 2>/dev/null | cut -d'"' -f4 || echo "unknown")
                    echo "  $filename: $status"
                done
            fi
            
            # Recent log entries
            echo
            echo "Recent Log Entries:"
            find "$LOG_DIR" -name "server-*.log" -type f -mtime -1 2>/dev/null | head -1 | while read -r log_file; do
                tail -3 "$log_file" 2>/dev/null | sed 's/^/  /'
            done
            
        else
            error "Server process not found"
            break
        fi
        
        sleep 5
    done
}

# Show server status
show_status() {
    local status
    status=$(get_server_status)
    
    echo "🔍 PromptSCAD Server Status"
    echo "=================================="
    echo "Status: $status"
    
    if [ "$status" = "running" ]; then
        local pid
        pid=$(cat "$SERVER_PID_FILE")
        
        echo "PID: $pid"
        echo "URL: http://localhost:3000"
        echo
        
        if kill -0 "$pid" 2>/dev/null; then
            local memory_kb
            memory_kb=$(ps -o rss= -p "$pid" 2>/dev/null || echo "0")
            local memory_mb=$((memory_kb / 1024))
            
            local cpu_usage
            cpu_usage=$(ps -o %cpu= -p "$pid" 2>/dev/null || echo "0")
            
            echo "Memory Usage: ${memory_mb}MB"
            echo "CPU Usage: ${cpu_usage}%"
            echo
            
            # Check health
            if curl -s -f "http://localhost:3000/status/health" > /dev/null 2>&1; then
                echo "Health: ✅ Healthy"
            else
                echo "Health: ❌ Unhealthy"
            fi
        else
            echo "Error: Process not found"
            rm -f "$SERVER_PID_FILE"
        fi
    else
        echo "Server is not running"
    fi
}

# Show logs
show_logs() {
    local lines="${1:-50}"
    
    log "Showing recent log entries ($lines lines)..."
    
    local latest_log
    latest_log=$(find "$LOG_DIR" -name "server-*.log" -type f -mtime -1 2>/dev/null | head -1)
    
    if [ -n "$latest_log" ]; then
        tail -n "$lines" "$latest_log"
    else
        warn "No recent log files found"
    fi
}

# Clean up old logs
cleanup_logs() {
    local days="${1:-7}"
    
    log "Cleaning up log files older than $days days..."
    
    local old_logs
    old_logs=$(find "$LOG_DIR" -name "server-*.log" -type f -mtime +$days 2>/dev/null || echo "")
    
    if [ -n "$old_logs" ]; then
        echo "$old_logs" | while read -r log_file; do
            rm -f "$log_file"
            log "Removed: $(basename "$log_file")"
        done
        log "✅ Cleanup complete"
    else
        log "No old log files to clean up"
    fi
}

# Show help
show_help() {
    echo "PromptSCAD Server Manager"
    echo "========================"
    echo
    echo "Usage: $0 {start|stop|restart|status|monitor|logs|cleanup|help} [options]"
    echo
    echo "Commands:"
    echo "  start [mode] [port]     Start server (modes: standard, dev, local, debug)"
    echo "  stop                    Stop server"
    echo "  restart [mode] [port]   Restart server"
    echo "  status                  Show server status"
    echo "  monitor                 Monitor server in real-time"
    echo "  logs [lines]            Show recent log entries (default: 50)"
    echo "  cleanup [days]          Clean up old log files (default: 7 days)"
    echo "  help                    Show this help message"
    echo
    echo "Examples:"
    echo "  $0 start dev            Start in development mode"
    echo "  $0 start standard 8080  Start on port 8080"
    echo "  $0 logs 100             Show last 100 log lines"
    echo "  $0 cleanup 3            Clean up logs older than 3 days"
}

# Main command handler
case "${1:-help}" in
    "start")
        start_server "${2:-standard}" "${3:-$DEFAULT_PORT}"
        ;;
    "stop")
        stop_server
        ;;
    "restart")
        restart_server "${2:-standard}" "${3:-$DEFAULT_PORT}"
        ;;
    "status")
        show_status
        ;;
    "monitor")
        monitor_server
        ;;
    "logs")
        show_logs "${2:-50}"
        ;;
    "cleanup")
        cleanup_logs "${2:-7}"
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac