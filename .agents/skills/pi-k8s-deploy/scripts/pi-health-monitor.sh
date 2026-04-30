#!/bin/bash

# Raspberry Pi Health Monitor
# System and Kubernetes health monitoring with alerts

set -euo pipefail

# Configuration
REMOTE_HOST="${REMOTE_HOST:-pi@raspberrypi.local}"
ALERT_THRESHOLD_CPU=80
ALERT_THRESHOLD_MEMORY=85
ALERT_THRESHOLD_DISK=90
CHECK_INTERVAL=30
LOG_FILE="logs/pi-health-monitor.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Create logs directory
mkdir -p logs

# Logging functions
log() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo -e "${GREEN}$message${NC}"
    echo "$message" >> "$LOG_FILE"
}

error() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1"
    echo -e "${RED}$message${NC}"
    echo "$message" >> "$LOG_FILE"
}

warn() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1"
    echo -e "${YELLOW}$message${NC}"
    echo "$message" >> "$LOG_FILE"
}

# Check system health
check_system_health() {
    local health_status="HEALTHY"
    local issues=()
    
    ssh "$REMOTE_HOST" 'bash -s' << EOF
    echo "🔍 System Health Check - \$(date)"
    echo "==================================="
    echo
    
    # CPU Usage
    cpu_usage=\$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - \$1}')
    cpu_usage_int=\${cpu_usage%.*}
    echo "💻 CPU Usage: \${cpu_usage}%"
    if [ "\${cpu_usage_int}" -gt "$ALERT_THRESHOLD_CPU" ]; then
        echo "⚠️  HIGH CPU USAGE: \${cpu_usage}% (threshold: $ALERT_THRESHOLD_CPU%)"
        health_status="WARNING"
        issues+=("High CPU usage: \${cpu_usage}%")
    fi
    echo
    
    # Memory Usage
    memory_info=\$(free | grep Mem)
    total_memory=\$(echo \$memory_info | awk '{print \$2}')
    used_memory=\$(echo \$memory_info | awk '{print \$3}')
    memory_usage=\$(awk "BEGIN {printf \"%.1f\", (\$used_memory / \$total_memory) * 100}")
    memory_usage_int=\${memory_usage%.*}
    echo "🧠 Memory Usage: \${memory_usage}% (\${used_memory}K used / \${total_memory}K total)"
    if [ "\${memory_usage_int}" -gt "$ALERT_THRESHOLD_MEMORY" ]; then
        echo "⚠️  HIGH MEMORY USAGE: \${memory_usage}% (threshold: $ALERT_THRESHOLD_MEMORY%)"
        health_status="WARNING"
        issues+=("High memory usage: \${memory_usage}%")
    fi
    echo
    
    # Disk Usage
    disk_usage=\$(df / | tail -1 | awk '{print \$5}' | sed 's/%//')
    disk_available=\$(df -h / | tail -1 | awk '{print \$4}')
    echo "💾 Disk Usage: \${disk_usage}% (\${disk_available} available)"
    if [ "\${disk_usage}" -gt "$ALERT_THRESHOLD_DISK" ]; then
        echo "⚠️  HIGH DISK USAGE: \${disk_usage}% (threshold: $ALERT_THRESHOLD_DISK%)"
        health_status="WARNING"
        issues+=("High disk usage: \${disk_usage}%")
    fi
    echo
    
    # System Load
    load_avg=\$(uptime | awk -F'load average:' '{print \$2}' | awk '{print \$1}' | sed 's/,//')
    echo "⚡ Load Average: \${load_avg}"
    echo
    
    # Temperature (if available)
    if [ -f /sys/class/thermal/thermal_zone0/temp ]; then
        temp=\$(cat /sys/class/thermal/thermal_zone0/temp)
        temp_c=\$(awk "BEGIN {printf \"%.1f\", \$temp / 1000}")
        echo "🌡️  CPU Temperature: \${temp_c}°C"
        if [ "\${temp_c%.*}" -gt 70 ]; then
            echo "⚠️  HIGH TEMPERATURE: \${temp_c}°C"
            health_status="WARNING"
            issues+=("High CPU temperature: \${temp_c}°C")
        fi
        echo
    fi
    
    # Summary
    echo "📋 System Health Summary: \$health_status"
    if [ "\${#issues[@]}" -gt 0 ]; then
        echo "Issues detected:"
        for issue in "\${issues[@]}"; do
            echo "  - \$issue"
        done
    else
        echo "✅ All system metrics within normal ranges"
    fi
EOF
}

# Check Kubernetes health
check_kubernetes_health() {
    ssh "$REMOTE_HOST" 'bash -s' << 'EOF'
    echo "☸️  Kubernetes Health Check - $(date)"
    echo "====================================="
    echo
    
    # Check if kubectl is working
    if ! kubectl cluster-info > /dev/null 2>&1; then
        echo "❌ Kubernetes cluster is not accessible"
        return 1
    fi
    
    # Node status
    echo "📊 Node Status:"
    kubectl get nodes
    echo
    
    # Check for NotReady nodes
    not_ready_nodes=$(kubectl get nodes --no-headers | grep -c "NotReady" || echo "0")
    if [ "$not_ready_nodes" -gt 0 ]; then
        echo "⚠️  WARNING: $not_ready_nodes nodes are NotReady"
        kubectl get nodes | grep "NotReady"
    else
        echo "✅ All nodes are Ready"
    fi
    echo
    
    # System pods
    echo "🔧 System Pods:"
    system_pods=$(kubectl get pods -n kube-system --no-headers | wc -l)
    running_system_pods=$(kubectl get pods -n kube-system --no-headers | grep -c "Running" || echo "0")
    echo "System pods: $running_system_pods/$system_pods running"
    
    failed_system_pods=$(kubectl get pods -n kube-system --no-headers | grep -c "Failed\|Error" || echo "0")
    if [ "$failed_system_pods" -gt 0 ]; then
        echo "⚠️  WARNING: $failed_system_pods system pods are failing"
        kubectl get pods -n kube-system | grep -E "Failed|Error"
    fi
    echo
    
    # Application pods
    echo "📦 Application Pods:"
    if kubectl get deployment promptscad > /dev/null 2>&1; then
        app_pods=$(kubectl get pods -l app=promptscad --no-headers | wc -l)
        running_app_pods=$(kubectl get pods -l app=promptscad --no-headers | grep -c "Running" || echo "0")
        echo "Application pods: $running_app_pods/$app_pods running"
        
        if [ "$running_app_pods" -eq 0 ] && [ "$app_pods" -gt 0 ]; then
            echo "⚠️  WARNING: No application pods are running"
            kubectl get pods -l app=promptscad
        fi
    else
        echo "ℹ️  Application deployment not found"
    fi
    echo
    
    # Recent events
    echo "📋 Recent Warning Events:"
    warning_events=$(kubectl get events --field-selector type=Warning --sort-by='.lastTimestamp' | tail -5)
    if [ -n "$warning_events" ]; then
        echo "$warning_events"
    else
        echo "✅ No recent warning events"
    fi
    echo
    
    # Resource usage
    echo "💾 Cluster Resource Usage:"
    if kubectl top nodes > /dev/null 2>&1; then
        kubectl top nodes | tail -n +2 | head -3
    else
        echo "⚠️  Metrics server not available"
    fi
EOF
}

# Continuous monitoring
continuous_monitor() {
    log "Starting continuous health monitoring (interval: ${CHECK_INTERVAL}s)..."
    log "Press Ctrl+C to stop"
    echo
    
    while true; do
        clear
        echo "🔄 Raspberry Pi Health Monitor - $(date)"
        echo "========================================="
        echo
        
        if check_system_health; then
            echo
            if check_kubernetes_health; then
                echo "✅ Health check completed successfully"
            else
                error "Kubernetes health check failed"
            fi
        else
            error "System health check failed"
        fi
        
        echo
        echo "Next check in ${CHECK_INTERVAL} seconds..."
        sleep "$CHECK_INTERVAL"
    done
}

# Generate health report
generate_health_report() {
    local report_file="health-report-$(date +%Y%m%d-%H%M%S).md"
    
    log "Generating health report..."
    
    cat > "$report_file" << EOF
# Raspberry Pi Health Report

**Generated:** $(date)  
**Remote Host:** $REMOTE_HOST  
**Check Interval:** ${CHECK_INTERVAL}s  

## System Health Status

$(check_system_health 2>/dev/null || echo "System health check failed")

## Kubernetes Health Status

$(check_kubernetes_health 2>/dev/null || echo "Kubernetes health check failed")

## Alert Thresholds

- CPU Alert: ${ALERT_THRESHOLD_CPU}%
- Memory Alert: ${ALERT_THRESHOLD_MEMORY}%
- Disk Alert: ${ALERT_THRESHOLD_DISK}%

## Recommendations

$(ssh "$REMOTE_HOST" "df / | tail -1 | awk '{print \$5}' | sed 's/%//'" | grep -q "[8-9][0-9]\|100" && echo "- ⚠️  Consider cleaning up disk space" || echo "- ✅ Disk space is adequate")

$(ssh "$REMOTE_HOST" "free | grep Mem | awk '{print int(\$3/\$2*100)}'" | grep -q "[8-9][0-9]\|100" && echo "- ⚠️  Monitor memory usage closely" || echo "- ✅ Memory usage is normal")

$(ssh "$REMOTE_HOST" "kubectl get pods --all-namespaces | grep -c Error" | grep -q "[1-9]" && echo "- ⚠️  Investigate failing pods" || echo "- ✅ No failing pods detected")

## Next Steps

1. Monitor logs for errors: \`tail -f $LOG_FILE\`
2. Check system resources: \`top\` and \`free -h\`
3. Investigate Kubernetes issues: \`kubectl get events\`
4. Review application logs: \`kubectl logs -l app=promptscad\`

EOF
    
    log "📋 Health report generated: $report_file"
}

# Alert notification function
send_alert() {
    local message="$1"
    local severity="$2"
    
    log "🚨 ALERT [$severity]: $message"
    
    # You can add additional notification methods here
    # For example: email, Slack, webhook, etc.
    
    # Log to separate alert file
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$severity] $message" >> "logs/pi-alerts.log"
}

# Handle command line arguments
case "${1:-monitor}" in
    "check"|"health")
        check_system_health
        echo
        check_kubernetes_health
        ;;
    "monitor"|"")
        continuous_monitor
        ;;
    "report")
        generate_health_report
        ;;
    "system")
        check_system_health
        ;;
    "k8s"|"kubernetes")
        check_kubernetes_health
        ;;
    "help"|"-h"|"--help")
        echo "Raspberry Pi Health Monitor"
        echo "Usage: $0 {check|monitor|report|system|k8s|help}"
        echo
        echo "Commands:"
        echo "  check     - Run one-time health check"
        echo "  monitor   - Continuous monitoring [default]"
        echo "  report    - Generate health report"
        echo "  system    - Check system health only"
        echo "  k8s       - Check Kubernetes health only"
        echo "  help      - Show this help"
        echo
        echo "Environment variables:"
        echo "  REMOTE_HOST         - SSH connection string"
        echo "  CHECK_INTERVAL      - Monitoring interval (seconds)"
        echo "  ALERT_THRESHOLD_*   - Alert thresholds"
        ;;
    *)
        error "Unknown command: $1"
        exit 1
        ;;
esac