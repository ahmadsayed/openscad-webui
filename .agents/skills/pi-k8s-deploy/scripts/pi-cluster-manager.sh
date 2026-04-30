#!/bin/bash

# Raspberry Pi Kubernetes Cluster Manager
# Comprehensive cluster management and monitoring

set -euo pipefail

# Configuration
REMOTE_HOST="${REMOTE_HOST:-pi@raspberrypi.local}"
LOG_DIR="logs"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Create log directory
mkdir -p "$LOG_DIR"

# Logging functions
log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_DIR/pi-cluster-manager.log"
}

error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ERROR:${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >> "$LOG_DIR/pi-cluster-manager.log"
}

warn() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] WARNING:${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1" >> "$LOG_DIR/pi-cluster-manager.log"
}

info() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')] INFO:${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1" >> "$LOG_DIR/pi-cluster-manager.log"
}

# Check cluster connectivity
check_connectivity() {
    log "Checking cluster connectivity..."
    
    if ! ssh -o ConnectTimeout=10 "$REMOTE_HOST" "kubectl cluster-info" > /dev/null 2>&1; then
        error "Cannot connect to Kubernetes cluster on $REMOTE_HOST"
        error "Please ensure:"
        error "1. Pi is accessible via SSH"
        error "2. Kubernetes is properly installed"
        error "3. kubectl is configured correctly"
        return 1
    fi
    
    info "✅ Cluster connectivity verified"
    return 0
}

# Get cluster status
get_cluster_status() {
    log "Getting cluster status..."
    
    ssh "$REMOTE_HOST" << 'EOF'
    echo "🔍 Cluster Status Report"
    echo "======================="
    echo
    
    echo "📊 Nodes:"
    kubectl get nodes -o wide
    echo
    
    echo "🎯 System Components:"
    kubectl get pods -n kube-system | head -10
    echo
    
    echo "📦 All Namespaces:"
    kubectl get namespaces
    echo
    
    echo "🚀 Deployments:"
    kubectl get deployments --all-namespaces
    echo
    
    echo "🌐 Services:"
    kubectl get services --all-namespaces
    echo
    
    echo "💾 Storage:"
    kubectl get pv,pvc --all-namespaces 2>/dev/null | head -5 || echo "No persistent volumes"
    echo
    
    echo "🔧 Cluster Info:"
    kubectl cluster-info
EOF
}

# Monitor cluster resources
monitor_resources() {
    log "Monitoring cluster resources..."
    
    ssh "$REMOTE_HOST" << 'EOF'
    echo "📈 Resource Monitoring"
    echo "====================="
    echo
    
    # Node resources
    echo "🖥️  Node Resources:"
    echo "Node		CPU	Memory	Pods"
    kubectl top nodes 2>/dev/null | tail -n +2 | while read node cpu memory pods; do
        printf "%-15s %-8s %-8s %-8s\n" "$node" "$cpu" "$memory" "$pods"
    done || echo "⚠️  Metrics server not available"
    echo
    
    # Pod resources (promptscad only)
    echo "📦 Application Pods:"
    kubectl top pods -l app=promptscad 2>/dev/null | tail -n +2 | while read pod cpu memory; do
        printf "%-30s %-8s %-8s\n" "$pod" "$cpu" "$memory"
    done || echo "No application pods found"
    echo
    
    # Disk usage
    echo "💽 Disk Usage:"
    df -h / | tail -n +2 | while read fs size used avail use mounted; do
        printf "Root FS: %s used, %s available (%s)\n" "$used" "$avail" "$use"
    done
    echo
    
    # Memory info
    echo "🧠 Memory Info:"
    free -h | grep -E "(Mem|Swap)" | while read type total used free shared buff available; do
        printf "%-8s: %s used, %s free\n" "$type" "$used" "$free"
    done
EOF
}

# Check application health
check_app_health() {
    log "Checking application health..."
    
    ssh "$REMOTE_HOST" << 'EOF'
    echo "🏥 Application Health Check"
    echo "==========================="
    echo
    
    # Check if deployment exists
    if kubectl get deployment promptscad > /dev/null 2>&1; then
        echo "✅ Deployment found"
        
        # Get deployment status
        echo "📊 Deployment Status:"
        kubectl get deployment promptscad
        echo
        
        # Check pods
        echo "📦 Pod Status:"
        kubectl get pods -l app=promptscad -o wide
        echo
        
        # Check service
        echo "🌐 Service Status:"
        kubectl get service promptscad
        echo
        
        # Check recent events
        echo "📋 Recent Events:"
        kubectl get events --field-selector involvedObject.name=promptscad --sort-by='.lastTimestamp' | tail -5
        echo
        
        # Check logs if pods are running
        local running_pods=$(kubectl get pods -l app=promptscad -o jsonpath='{.items[?(@.status.phase=="Running")].metadata.name}' | wc -w)
        if [ "$running_pods" -gt 0 ]; then
            echo "📝 Recent Logs (last 10 lines):"
            kubectl logs -l app=promptscad --tail=10 --timestamps
        else
            echo "⚠️  No running pods found"
        fi
    else
        echo "❌ Deployment 'promptscad' not found"
        echo "Available deployments:"
        kubectl get deployments
    fi
EOF
}

# Monitor logs in real-time
monitor_logs() {
    local lines="${1:-100}"
    local follow="${2:-false}"
    
    log "Monitoring logs (lines: $lines, follow: $follow)..."
    
    local log_cmd="kubectl logs -l app=promptscad --tail=$lines"
    if [ "$follow" = "true" ]; then
        log_cmd="$log_cmd -f"
    fi
    
    echo "📋 Application Logs"
    echo "=================="
    echo "Press Ctrl+C to stop"
    echo
    
    ssh "$REMOTE_HOST" "$log_cmd"
}

# Scale application
scale_app() {
    local replicas="${1:-1}"
    
    log "Scaling application to $replicas replicas..."
    
    if ssh "$REMOTE_HOST" "kubectl scale deployment promptscad --replicas=$replicas"; then
        log "✅ Scaling initiated"
        
        # Wait for scaling to complete
        log "Waiting for scaling to complete..."
        if ssh "$REMOTE_HOST" "kubectl rollout status deployment/promptscad --timeout=120s"; then
            log "✅ Scaling completed successfully"
        else
            warn "⚠️  Scaling timeout or issues detected"
        fi
        
        # Show final status
        ssh "$REMOTE_HOST" "kubectl get pods -l app=promptscad"
    else
        error "Failed to scale application"
    fi
}

# Rolling update
rolling_update() {
    local image="${1:-}"
    
    log "Performing rolling update..."
    
    if [ -n "$image" ]; then
        info "Updating image to: $image"
        if ssh "$REMOTE_HOST" "kubectl set image deployment/promptscad promptscad=$image"; then
            log "✅ Image update initiated"
        else
            error "Failed to update image"
        fi
    fi
    
    # Trigger rolling update
    log "Triggering rolling restart..."
    if ssh "$REMOTE_HOST" "kubectl rollout restart deployment/promptscad"; then
        log "✅ Rolling update initiated"
        
        # Monitor rollout
        log "Monitoring rollout status..."
        if ssh "$REMOTE_HOST" "kubectl rollout status deployment/promptscad --timeout=300s"; then
            log "✅ Rolling update completed successfully"
        else
            warn "⚠️  Rollout timeout or issues detected"
        fi
    else
        error "Failed to trigger rolling update"
    fi
}

# Rollback deployment
rollback_deployment() {
    local revision="${1:-}"
    
    log "Rolling back deployment..."
    
    local rollback_cmd="kubectl rollout undo deployment/promptscad"
    if [ -n "$revision" ]; then
        rollback_cmd="$rollback_cmd --to-revision=$revision"
    fi
    
    if ssh "$REMOTE_HOST" "$rollback_cmd"; then
        log "✅ Rollback initiated"
        
        # Monitor rollback
        log "Monitoring rollback status..."
        if ssh "$REMOTE_HOST" "kubectl rollout status deployment/promptscad --timeout=120s"; then
            log "✅ Rollback completed successfully"
        else
            warn "⚠️  Rollback timeout or issues detected"
        fi
    else
        error "Failed to rollback deployment"
    fi
}

# Clean up resources
cleanup_resources() {
    local force="${1:-false}"
    
    log "Cleaning up resources..."
    
    if [ "$force" = "true" ]; then
        warn "🚨 Force cleanup requested - this will delete all application resources!"
        read -p "Are you sure? Type 'YES' to confirm: " confirm
        if [ "$confirm" != "YES" ]; then
            log "Cleanup cancelled"
            return 0
        fi
    fi
    
    # Delete deployment and service
    ssh "$REMOTE_HOST" << EOF
    echo "Deleting application resources..."
    kubectl delete deployment promptscad --ignore-not-found=true
    kubectl delete service promptscad --ignore-not-found=true
    kubectl delete configmap promptscad-config --ignore-not-found=true || true
    kubectl delete secret deepseek-api-key --ignore-not-found=true || true
    kubectl delete secret qwen-api-key --ignore-not-found=true || true
    echo "✅ Cleanup completed"
EOF
}

# System maintenance
system_maintenance() {
    log "Performing system maintenance..."
    
    ssh "$REMOTE_HOST" << 'EOF'
    echo "🔧 System Maintenance"
    echo "====================="
    echo
    
    # Clean up unused Docker images
    echo "🐳 Cleaning unused Docker images..."
    docker system prune -af --volumes
    echo
    
    # Clean up completed pods
    echo "🧹 Cleaning completed pods..."
    kubectl delete pods --field-selector=status.phase=Succeeded --all-namespaces
    echo
    
    # Clean up evicted pods
    echo "🗑️  Cleaning evicted pods..."
    kubectl delete pods --field-selector=status.phase=Failed --all-namespaces
    echo
    
    # Check disk space
    echo "💾 Disk Space:"
    df -h / | tail -n +2
    echo
    
    # Check memory usage
    echo "🧠 Memory Usage:"
    free -h
    echo
    
    # Update package lists (optional)
    echo "📦 Updating package lists..."
    sudo apt update > /dev/null 2>&1 || echo "Package update skipped"
    echo
    
    echo "✅ System maintenance completed"
EOF
}

# Generate cluster report
generate_report() {
    local report_file="cluster-report-${TIMESTAMP}.md"
    
    log "Generating cluster report..."
    
    cat > "$report_file" << EOF
# Raspberry Pi Kubernetes Cluster Report

**Generated:** $(date)  
**Remote Host:** $REMOTE_HOST  

## Cluster Overview

\`\`\`bash
$(ssh "$REMOTE_HOST" "kubectl cluster-info" 2>/dev/null || echo "Cluster info unavailable")
\`\`\`

## Node Status

\`\`\`bash
$(ssh "$REMOTE_HOST" "kubectl get nodes -o wide" 2>/dev/null || echo "Node information unavailable")
\`\`\`

## System Components

\`\`\`bash
$(ssh "$REMOTE_HOST" "kubectl get pods -n kube-system | head -10" 2>/dev/null || echo "System pods unavailable")
\`\`\`

## Application Status

\`\`\`bash
$(ssh "$REMOTE_HOST" "kubectl get deployment promptscad 2>/dev/null || echo 'Deployment not found'")
\`\`\`

\`\`\`bash
$(ssh "$REMOTE_HOST" "kubectl get pods -l app=promptscad 2>/dev/null || echo 'No application pods found'")
\`\`\`

## Resource Usage

\`\`\`bash
$(ssh "$REMOTE_HOST" "kubectl top nodes 2>/dev/null || echo 'Metrics server not available'")
\`\`\`

## Recent Events

\`\`\`bash
$(ssh "$REMOTE_HOST" "kubectl get events --field-selector type=Warning --sort-by='.lastTimestamp' | tail -10" 2>/dev/null || echo 'No recent events')
\`\`\`

## System Information

\`\`\`bash
$(ssh "$REMOTE_HOST" "uptime && free -h && df -h /" 2>/dev/null || echo 'System information unavailable')
\`\`\`

## Recommendations

$(ssh "$REMOTE_HOST" "kubectl top nodes 2>/dev/null" | grep -q "<unknown>" && echo "- ⚠️  Consider installing metrics server for resource monitoring" || echo "- ✅ Metrics server is available")

$(ssh "$REMOTE_HOST" "kubectl get pods --all-namespaces | grep -c Error" | grep -q "[1-9]" && echo "- ⚠️  Some pods are in Error state - investigate with kubectl get events" || echo "- ✅ No pods in Error state")

$(ssh "$REMOTE_HOST" "df / | tail -1 | awk '{print \$5}' | sed 's/%//'" | grep -q "[8-9][0-9]\|100" && echo "- ⚠️  Disk space is running low - consider cleanup" || echo "- ✅ Disk space is adequate")

EOF
    
    log "📋 Cluster report generated: $report_file"
}

# Real-time monitoring
realtime_monitor() {
    log "Starting real-time cluster monitoring..."
    
    echo "🔍 Real-time Cluster Monitor"
    echo "==========================="
    echo "Press Ctrl+C to stop"
    echo
    
    # Monitor loop
    while true; do
        clear
        echo "$(date) - Raspberry Pi Cluster Monitor"
        echo "======================================="
        echo
        
        ssh "$REMOTE_HOST" << 'EOF'
        # Node status
        echo "📊 Nodes:"
        kubectl get nodes -o wide | head -5
        echo
        
        # Pod status
        echo "📦 Pods (promptscad):"
        kubectl get pods -l app=promptscad 2>/dev/null | tail -n +2 | head -3 || echo "No pods found"
        echo
        
        # Resource usage
        echo "💾 Resource Usage:"
        kubectl top nodes 2>/dev/null | tail -n +2 | head -2 | while read node cpu memory pods; do
            printf "%-15s %-8s %-8s %-8s\n" "$node" "$cpu" "$memory" "$pods"
        done || echo "Metrics unavailable"
        echo
        
        # Recent events
        echo "🚨 Recent Events:"
        kubectl get events --field-selector type=Warning --sort-by='.lastTimestamp' | tail -3 | while read time type reason message; do
            echo "$time $reason: $message"
        done 2>/dev/null || echo "No recent events"
EOF
        
        sleep 5
    done
}

# Show help
show_help() {
    echo "Raspberry Pi Kubernetes Cluster Manager"
    echo "======================================"
    echo
    echo "Usage: $0 {status|monitor|health|logs|scale|update|rollback|cleanup|maintenance|report|realtime|help} [options]"
    echo
    echo "Commands:"
    echo "  status       - Show cluster status"
    echo "  monitor      - Monitor cluster resources"
    echo "  health       - Check application health"
    echo "  logs [n]     - Show application logs (default: 100 lines)"
    echo "  scale <n>    - Scale application to n replicas"
    echo "  update [img] - Perform rolling update (optionally with new image)"
    echo "  rollback [rev] - Rollback deployment (optionally to specific revision)"
    echo "  cleanup [force] - Clean up application resources"
    echo "  maintenance  - Perform system maintenance"
    echo "  report       - Generate cluster report"
    echo "  realtime     - Real-time cluster monitoring"
    echo "  help         - Show this help message"
    echo
    echo "Environment variables:"
    echo "  REMOTE_HOST  - SSH connection string (default: pi@raspberrypi.local)"
    echo
    echo "Examples:"
    echo "  $0 status                    # Show cluster status"
    echo "  $0 scale 3                   # Scale to 3 replicas"
    echo "  $0 update new-image:tag      # Update with new image"
    echo "  $0 logs 50                   # Show last 50 log lines"
    echo "  $0 logs 100 true             # Follow logs (100 lines)"
    echo "  REMOTE_HOST=user@pi $0 health # Custom host"
}

# Main command handler
case "${1:-status}" in
    "status")
        check_connectivity && get_cluster_status
        ;;
    "monitor")
        check_connectivity && monitor_resources
        ;;
    "health")
        check_connectivity && check_app_health
        ;;
    "logs")
        check_connectivity && monitor_logs "${2:-100}" "${3:-false}"
        ;;
    "scale")
        if [ -z "${2:-}" ]; then
            error "Please specify number of replicas"
            echo "Usage: $0 scale <number>"
            exit 1
        fi
        check_connectivity && scale_app "$2"
        ;;
    "update")
        check_connectivity && rolling_update "${2:-}"
        ;;
    "rollback")
        check_connectivity && rollback_deployment "${2:-}"
        ;;
    "cleanup")
        check_connectivity && cleanup_resources "${2:-false}"
        ;;
    "maintenance")
        check_connectivity && system_maintenance
        ;;
    "report")
        check_connectivity && generate_report
        ;;
    "realtime")
        check_connectivity && realtime_monitor
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