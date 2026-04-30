#!/bin/bash

# PromptSCAD Server Debug Script
# Advanced debugging and troubleshooting for server issues

set -e

# Configuration
LOG_DIR="debug-logs"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DEBUG_LOG="$LOG_DIR/debug-$TIMESTAMP.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Create debug log directory
mkdir -p "$LOG_DIR"

# Logging functions
log() {
    local message="[$(date '+%H:%M:%S')] $1"
    echo -e "${GREEN}$message${NC}"
    echo "$message" >> "$DEBUG_LOG"
}

error() {
    local message="[$(date '+%H:%M:%S')] ERROR: $1"
    echo -e "${RED}$message${NC}"
    echo "$message" >> "$DEBUG_LOG"
}

warn() {
    local message="[$(date '+%H:%M:%S')] WARNING: $1"
    echo -e "${YELLOW}$message${NC}"
    echo "$message" >> "$DEBUG_LOG"
}

info() {
    local message="[$(date '+%H:%M:%S')] INFO: $1"
    echo -e "${BLUE}$message${NC}"
    echo "$message" >> "$DEBUG_LOG"
}

debug() {
    local message="[$(date '+%H:%M:%S')] DEBUG: $1"
    echo -e "${PURPLE}$message${NC}"
    echo "$message" >> "$DEBUG_LOG"
}

# System information gathering
gather_system_info() {
    log "Gathering system information..."
    
    {
        echo "=== System Information ==="
        echo "Date: $(date)"
        echo "OS: $(uname -a)"
        echo "Node.js: $(node --version)"
        echo "NPM: $(npm --version)"
        echo "Working Directory: $(pwd)"
        echo "Available Memory: $(free -h | grep Mem | awk '{print $7}')"
        echo "Disk Space: $(df -h . | tail -1 | awk '{print $4}')"
        echo
    } >> "$DEBUG_LOG"
}

# Check server process
check_server_process() {
    log "Checking server processes..."
    
    {
        echo "=== Server Processes ==="
        ps aux | grep -E "(node.*server|server.*js)" | grep -v grep || echo "No server processes found"
        echo
        
        echo "=== Port Usage ==="
        netstat -tlnp 2>/dev/null | grep :3000 || lsof -i :3000 2>/dev/null || echo "Port 3000 not in use"
        echo
        
        echo "=== Environment Variables ==="
        env | grep -E "(NODE_ENV|PORT|AD_ENV|API_KEY|DEEPSEEK|QWEN|OPENAI)" || echo "No relevant environment variables found"
        echo
    } >> "$DEBUG_LOG"
}

# Check dependencies
check_dependencies() {
    log "Checking dependencies..."
    
    {
        echo "=== Package Dependencies ==="
        if [ -f "package.json" ]; then
            echo "Package.json exists"
            echo "Main dependencies:"
            grep -A 20 '"dependencies"' package.json | head -10
            echo
            echo "Dev dependencies:"
            grep -A 20 '"devDependencies"' package.json | head -10
        else
            echo "package.json not found!"
        fi
        echo
        
        echo "=== Node Modules ==="
        if [ -d "node_modules" ]; then
            echo "node_modules directory exists ($(find node_modules -type d | wc -l) directories)"
            echo "Key modules:"
            ls -la node_modules/ | grep -E "(express|openai|puppeteer|pug)" | head -5
        else
            echo "node_modules directory not found!"
        fi
        echo
    } >> "$DEBUG_LOG"
}

# Check configuration files
check_configuration() {
    log "Checking configuration files..."
    
    {
        echo "=== Configuration Files ==="
        
        # Check .env file
        if [ -f ".env" ]; then
            echo ".env file exists"
            echo "API Keys configured:"
            grep -E "(API_KEY|DEEPSEEK|QWEN|OPENAI)" .env | sed 's/=.*/=***/' || echo "No API keys found"
        else
            warn ".env file not found"
        fi
        echo
        
        # Check server files
        echo "=== Server Files ==="
        find server/ -name "*.js" -type f | head -10
        echo
        
        # Check public files
        echo "=== Public Files ==="
        find public/ -name "*.js" -o -name "*.pug" -o -name "*.html" | head -10
        echo
    } >> "$DEBUG_LOG"
}

# Test API connectivity
test_api_connectivity() {
    log "Testing API connectivity..."
    
    {
        echo "=== API Connectivity Tests ==="
        
        # Test health endpoint
        echo "Testing health endpoint..."
        if curl -s -f --max-time 10 "http://localhost:3000/status/health" > /dev/null; then
            echo "✅ Health endpoint responding"
        else
            echo "❌ Health endpoint not responding"
        fi
        echo
        
        # Test code generation
        echo "Testing code generation API..."
        local response
        response=$(curl -s --max-time 15 -X POST "http://localhost:3000/generate-code" \
            -H "Content-Type: application/json" \
            -d '{"prompt":"debug test","existingCode":""}' 2>&1)
        
        if echo "$response" | grep -q "requestId"; then
            local request_id
            request_id=$(echo "$response" | grep -o '"requestId":"[^"]*"' | cut -d'"' -f4)
            echo "✅ Code generation API working: $request_id"
            
            # Clean up
            rm -f "requests/$request_id.json"
        else
            echo "❌ Code generation API failed"
            echo "Response: $response"
        fi
        echo
        
        # Test external API connectivity if keys are available
        if [ -f ".env" ] && grep -q "DEEPSEEK_API_KEY\|QWEN_API_KEY" .env; then
            echo "Testing external API connectivity..."
            if ping -c 1 8.8.8.8 > /dev/null 2>&1; then
                echo "✅ Internet connectivity available"
            else
                echo "❌ Internet connectivity issues"
            fi
        fi
        echo
    } >> "$DEBUG_LOG"
}

# Check for common issues
check_common_issues() {
    log "Checking for common issues..."
    
    {
        echo "=== Common Issues Check ==="
        
        # Check port conflicts
        echo "Checking port conflicts..."
        if lsof -i :3000 > /dev/null 2>&1; then
            echo "⚠️  Port 3000 is in use:"
            lsof -i :3000
        else
            echo "✅ Port 3000 is available"
        fi
        echo
        
        # Check memory usage
        echo "Checking memory usage..."
        local node_processes
        node_processes=$(pgrep -f "node.*server" || echo "")
        if [ -n "$node_processes" ]; then
            for pid in $node_processes; do
                local memory_kb
                memory_kb=$(ps -o rss= -p "$pid" 2>/dev/null || echo "0")
                local memory_mb=$((memory_kb / 1024))
                echo "Process $pid: ${memory_mb}MB memory"
                
                if [ "$memory_mb" -gt 500 ]; then
                    echo "⚠️  High memory usage detected: ${memory_mb}MB"
                fi
            done
        fi
        echo
        
        # Check for error patterns in logs
        echo "Checking for recent errors..."
        find . -name "server-*.log" -type f -mtime -1 2>/dev/null | while read -r log_file; do
            local error_count
            error_count=$(tail -100 "$log_file" 2>/dev/null | grep -c "error\|Error\|ERROR" || echo "0")
            if [ "$error_count" -gt 0 ]; then
                echo "Found $error_count errors in $log_file"
                tail -100 "$log_file" | grep -i error | tail -3
            fi
        done
        echo
        
        # Check request directory
        echo "Checking request directory..."
        if [ -d "requests/" ]; then
            local request_count
            request_count=$(find requests/ -name "*.json" | wc -l | tr -d ' ')
            echo "Found $request_count request files"
            
            local old_requests
            old_requests=$(find requests/ -name "*.json" -mtime +7 2>/dev/null | wc -l | tr -d ' ')
            if [ "$old_requests" -gt 0 ]; then
                echo "⚠️  Found $old_requests old request files (>7 days)"
            fi
        else
            echo "Request directory not found"
        fi
        echo
    } >> "$DEBUG_LOG"
}

# Run comprehensive tests
run_comprehensive_tests() {
    log "Running comprehensive tests..."
    
    {
        echo "=== Comprehensive Tests ==="
        
        # Test different server modes
        echo "Testing server modes..."
        local modes=("development" "production")
        for mode in "${modes[@]}"; do
            echo "Testing $mode mode..."
            export NODE_ENV="$mode"
            if curl -s -f --max-time 5 "http://localhost:3000/status/health" > /dev/null; then
                echo "✅ $mode mode working"
            else
                echo "❌ $mode mode issues detected"
            fi
        done
        echo
        
        # Test with different prompts
        echo "Testing various prompt types..."
        local prompts=("cube" "sphere" "cylinder" "complex shape with details")
        for prompt in "${prompts[@]}"; do
            local response
            response=$(curl -s --max-time 10 -X POST "http://localhost:3000/generate-code" \
                -H "Content-Type: application/json" \
                -d "{\"prompt\":\"$prompt\",\"existingCode\":\"\"}")
            
            if echo "$response" | grep -q "requestId"; then
                local request_id
                request_id=$(echo "$response" | grep -o '"requestId":"[^"]*"' | cut -d'"' -f4)
                echo "✅ Prompt '$prompt': $request_id"
                rm -f "requests/$request_id.json"
            else
                echo "❌ Prompt '$prompt' failed"
            fi
        done
        echo
    } >> "$DEBUG_LOG"
}

# Generate debug report
generate_debug_report() {
    log "Generating debug report..."
    
    local report_file="debug-report-$TIMESTAMP.md"
    
    cat > "$report_file" << EOF
# PromptSCAD Server Debug Report

**Generated:** $(date)  
**Debug Log:** $DEBUG_LOG

## Summary

This report contains comprehensive debugging information for the PromptSCAD server.

## System Information

- **OS:** $(uname -s)
- **Node.js Version:** $(node --version)
- **NPM Version:** $(npm --version)
- **Working Directory:** $(pwd)

## Quick Status

$(if curl -s -f "http://localhost:3000/status/health" > /dev/null 2>&1; then
    echo "✅ Server is running and responding"
else
    echo "❌ Server is not responding"
fi)

## Common Issues Found

$(check_common_issues > /tmp/debug-summary.log 2>&1 && cat /tmp/debug-summary.log | grep -E "⚠️|❌" | head -10 || echo "No major issues detected")

## Next Steps

1. Check the detailed debug log: \`$DEBUG_LOG\`
2. Review server logs in \`logs/\` directory
3. Verify API keys in \`.env\` file
4. Check port availability: \`lsof -i :3000\`

## Useful Commands

\`\`\`bash
# Check server status
./scripts/server-manager.sh status

# Monitor server
./scripts/server-manager.sh monitor

# View recent logs
tail -f logs/server-*.log

# Test API manually
curl -X POST http://localhost:3000/generate-code \\
  -H "Content-Type: application/json" \\
  -d '{"prompt":"test","existingCode":""}'
\`\`\`

EOF

    log "Debug report generated: $report_file"
}

# Main debug function
main() {
    echo "🔍 PromptSCAD Server Debug Tool"
    echo "================================="
    echo "Debug log: $DEBUG_LOG"
    echo
    
    # Gather all debug information
    gather_system_info
    check_server_process
    check_dependencies
    check_configuration
    test_api_connectivity
    check_common_issues
    run_comprehensive_tests
    
    # Generate final report
    generate_debug_report
    
    log "🎉 Debug analysis complete!"
    log "Check the debug log for detailed information: $DEBUG_LOG"
    log "Check the debug report for a summary: debug-report-$TIMESTAMP.md"
}

# Handle command line arguments
case "${1:-full}" in
    "quick")
        echo "Running quick debug check..."
        check_server_process
        test_api_connectivity
        check_common_issues
        ;;
    "system")
        gather_system_info
        check_dependencies
        ;;
    "api")
        test_api_connectivity
        ;;
    "logs")
        check_common_issues
        ;;
    "full"|"")
        main
        ;;
    "help"|"-h"|"--help")
        echo "PromptSCAD Server Debug Tool"
        echo "Usage: $0 {quick|system|api|logs|full|help}"
        echo
        echo "Commands:"
        echo "  quick   - Quick server status check"
        echo "  system  - System and dependency analysis"
        echo "  api     - API connectivity tests"
        echo "  logs    - Log file analysis"
        echo "  full    - Complete debug analysis (default)"
        echo "  help    - Show this help"
        ;;
    *)
        error "Unknown command: $1"
        exit 1
        ;;
esac