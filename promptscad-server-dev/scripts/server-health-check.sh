#!/bin/bash

# PromptSCAD Server Health Check Script
# Comprehensive server status and health monitoring

set -e

# Configuration
BASE_URL="http://localhost:3000"
TIMEOUT=10
RETRY_COUNT=3
RETRY_DELAY=2

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ERROR:${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] WARNING:${NC} $1"
}

# Check if server is running
check_server_running() {
    log "Checking if server is running..."
    
    if curl -s -f --max-time $TIMEOUT "$BASE_URL/status/health" > /dev/null; then
        log "✅ Server is responding"
        return 0
    else
        error "❌ Server is not responding"
        return 1
    fi
}

# Test API endpoints
test_api_endpoints() {
    log "Testing API endpoints..."
    
    # Test health endpoint
    if curl -s -f --max-time $TIMEOUT "$BASE_URL/status/health" > /dev/null; then
        log "✅ Health endpoint working"
    else
        error "❌ Health endpoint failed"
        return 1
    fi
    
    # Test code generation
    local response
    response=$(curl -s --max-time $TIMEOUT -X POST "$BASE_URL/generate-code" \
        -H "Content-Type: application/json" \
        -d '{"prompt":"health check test","existingCode":""}')
    
    if echo "$response" | grep -q "requestId"; then
        local request_id
        request_id=$(echo "$response" | grep -o '"requestId":"[^"]*"' | cut -d'"' -f4)
        log "✅ Code generation API working: $request_id"
        
        # Clean up request file
        rm -f "requests/$request_id.json"
    else
        error "❌ Code generation API failed"
        return 1
    fi
}

# Check system resources
check_system_resources() {
    log "Checking system resources..."
    
    # Find Node.js processes
    local node_processes
    node_processes=$(pgrep -f "node.*server" || echo "")
    
    if [ -n "$node_processes" ]; then
        for pid in $node_processes; do
            local memory_kb
            memory_kb=$(ps -o rss= -p "$pid" 2>/dev/null || echo "0")
            local memory_mb=$((memory_kb / 1024))
            
            local cpu_usage
            cpu_usage=$(ps -o %cpu= -p "$pid" 2>/dev/null || echo "0")
            
            log "Process $pid: Memory: ${memory_mb}MB, CPU: ${cpu_usage}%"
            
            # Warn if memory usage is high
            if [ "$memory_mb" -gt 500 ]; then
                warn "High memory usage detected: ${memory_mb}MB"
            fi
        done
    else
        warn "No Node.js server processes found"
    fi
}

# Check log files
check_log_files() {
    log "Checking log files..."
    
    # Check for recent log files
    local log_files
    log_files=$(find . -name "server-*.log" -type f -mtime -1 2>/dev/null || echo "")
    
    if [ -n "$log_files" ]; then
        for log_file in $log_files; do
            local log_size
            log_size=$(stat -f%z "$log_file" 2>/dev/null || stat -c%s "$log_file" 2>/dev/null || echo "0")
            local log_size_mb=$((log_size / 1024 / 1024))
            
            log "Log file: $log_file (${log_size_mb}MB)"
            
            # Check for errors in recent logs
            local recent_errors
            recent_errors=$(tail -100 "$log_file" | grep -c "error\|Error\|ERROR" || echo "0")
            
            if [ "$recent_errors" -gt 0 ]; then
                warn "Found $recent_errors errors in recent log entries"
            fi
        done
    else
        log "No recent log files found"
    fi
}

# Check request directory
check_request_directory() {
    log "Checking request directory..."
    
    if [ -d "requests/" ]; then
        local request_count
        request_count=$(find requests/ -name "*.json" | wc -l | tr -d ' ')
        
        log "Found $request_count request files"
        
        # Check for old request files
        local old_requests
        old_requests=$(find requests/ -name "*.json" -mtime +7 2>/dev/null | wc -l | tr -d ' ')
        
        if [ "$old_requests" -gt 0 ]; then
            warn "Found $old_requests old request files (>7 days)"
        fi
        
        # Check request status distribution
        local completed_count
        completed_count=$(grep -r '"status":"completed"' requests/ 2>/dev/null | wc -l | tr -d ' ')
        local error_count
        error_count=$(grep -r '"status":"error"' requests/ 2>/dev/null | wc -l | tr -d ' ')
        
        log "Request status: Completed: $completed_count, Errors: $error_count"
        
    else
        warn "Request directory not found"
    fi
}

# Check environment configuration
check_environment() {
    log "Checking environment configuration..."
    
    # Check for .env file
    if [ -f ".env" ]; then
        log "✅ .env file found"
        
        # Check for API keys
        if grep -q "DEEPSEEK_API_KEY\|QWEN_API_KEY\|OPENAI_API_KEY" .env; then
            log "✅ API keys configured"
        else
            warn "⚠️  No API keys found in .env file"
        fi
    else
        warn "⚠️  No .env file found"
    fi
    
    # Check Node.js version
    local node_version
    node_version=$(node --version | cut -d'v' -f2)
    local major_version
    major_version=$(echo "$node_version" | cut -d'.' -f1)
    
    if [ "$major_version" -ge 18 ]; then
        log "✅ Node.js version: $node_version"
    else
        error "❌ Node.js version too old: $node_version (requires 18+)"
    fi
}

# Network connectivity check
check_connectivity() {
    log "Checking network connectivity..."
    
    # Check if we can bind to port 3000
    if ! lsof -i :3000 > /dev/null 2>&1; then
        log "✅ Port 3000 is available"
    else
        warn "⚠️  Port 3000 is already in use"
    fi
    
    # Check external API connectivity (if API keys are configured)
    if [ -f ".env" ] && grep -q "DEEPSEEK_API_KEY\|QWEN_API_KEY" .env; then
        log "Testing external API connectivity..."
        
        # Test basic internet connectivity
        if ping -c 1 8.8.8.8 > /dev/null 2>&1; then
            log "✅ Internet connectivity available"
        else
            warn "⚠️  Internet connectivity issues detected"
        fi
    fi
}

# Generate health report
generate_report() {
    log "Generating health report..."
    
    local report_file="server-health-report-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "PromptSCAD Server Health Report"
        echo "Generated: $(date)"
        echo "================================"
        echo
        
        echo "System Information:"
        echo "- OS: $(uname -s)"
        echo "- Node.js: $(node --version)"
        echo "- NPM: $(npm --version)"
        echo "- Working Directory: $(pwd)"
        echo
        
        echo "Server Status:"
        if check_server_running > /dev/null 2>&1; then
            echo "- Status: Running ✅"
        else
            echo "- Status: Not Responding ❌"
        fi
        
        echo "Process Information:"
        pgrep -f "node.*server" | while read -r pid; do
            echo "- PID $pid: $(ps -o rss= -p "$pid" | awk '{print int($1/1024)}')MB memory"
        done
        
        echo
        echo "Recent Log Summary:"
        find . -name "server-*.log" -type f -mtime -1 -exec tail -20 {} \; | grep -E "(error|Error|ERROR)" | tail -5
        
    } > "$report_file"
    
    log "Health report saved to: $report_file"
}

# Main function
main() {
    echo "🔍 PromptSCAD Server Health Check"
    echo "=================================="
    
    local failed_checks=0
    
    # Run all checks
    check_environment || ((failed_checks++))
    check_connectivity || ((failed_checks++))
    
    if check_server_running; then
        test_api_endpoints || ((failed_checks++))
        check_system_resources
        check_log_files
        check_request_directory
    else
        error "Server is not running - skipping API tests"
        failed_checks=$((failed_checks + 2))
    fi
    
    echo
    echo "=================================="
    
    if [ "$failed_checks" -eq 0 ]; then
        log "🎉 All health checks passed!"
        generate_report
        exit 0
    else
        error "❌ $failed_checks health check(s) failed"
        generate_report
        exit 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    --report)
        generate_report
        ;;
    --quick)
        check_server_running && echo "✅ Server healthy" || echo "❌ Server issues detected"
        ;;
    *)
        main
        ;;
esac