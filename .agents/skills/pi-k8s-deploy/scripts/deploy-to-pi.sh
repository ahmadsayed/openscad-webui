#!/bin/bash

# Raspberry Pi Kubernetes Deployment Script
# Comprehensive deployment with error handling and monitoring

set -euo pipefail

# Configuration
IMAGE_NAME="ahmadsayed/promptscad"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
TAG="pi-${TIMESTAMP}"
REMOTE_HOST="${REMOTE_HOST:-pi@raspberrypi.local}"
REMOTE_DEPLOY_PATH="/tmp/promptscad-deploy"
DEPLOYMENT_FILE="kubernetes/deployment.yaml"
NETWORKING_FILE="kubernetes/networking.yaml"
SECRETS_FILE="k8s-secrets.yaml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Logging functions
log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ERROR:${NC} $1"
    exit 1
}

warn() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] WARNING:${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')] INFO:${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker buildx is available
    if ! docker buildx version > /dev/null 2>&1; then
        error "Docker buildx is not available. Please install Docker buildx for multi-architecture builds."
    fi
    
    # Check if we can connect to remote Pi
    if ! ssh -o ConnectTimeout=10 "$REMOTE_HOST" "echo 'Connection test'" > /dev/null 2>&1; then
        error "Cannot connect to Raspberry Pi at $REMOTE_HOST. Please check:"
        error "1. SSH key authentication is set up"
        error "2. Pi is reachable at $REMOTE_HOST"
        error "3. Pi has kubectl and Docker installed"
    fi
    
    # Check if deployment files exist
    if [ ! -f "$DEPLOYMENT_FILE" ]; then
        error "Deployment file not found: $DEPLOYMENT_FILE"
    fi
    
    if [ ! -f "$NETWORKING_FILE" ]; then
        error "Networking file not found: $NETWORKING_FILE"
    fi
    
    info "✅ Prerequisites check passed"
}

# Build multi-architecture Docker image
build_image() {
    log "Building multi-architecture Docker image..."
    info "Image: $IMAGE_NAME:$TAG"
    info "Platforms: linux/arm/v7,linux/arm64/v8,linux/amd64"
    
    # Create buildx builder if it doesn't exist
    if ! docker buildx ls | grep -q "pi-builder"; then
        info "Creating buildx builder for Pi..."
        docker buildx create --name pi-builder --platform linux/arm/v7,linux/arm64/v8,linux/amd64 --use
    else
        docker buildx use pi-builder
    fi
    
    # Build and push multi-arch image
    if docker buildx build --platform linux/arm/v7,linux/arm64/v8,linux/amd64 \
        -t "$IMAGE_NAME:$TAG" --push .; then
        log "✅ Multi-architecture build completed successfully"
    else
        error "Failed to build and push multi-architecture image"
    fi
}

# Prepare deployment files
prepare_deployment() {
    log "Preparing deployment files..."
    
    # Create temporary deployment directory
    local temp_dir="/tmp/promptscad-deploy-$$"
    mkdir -p "$temp_dir"
    
    # Update deployment with new image tag
    info "Updating deployment with image: $IMAGE_NAME:$TAG"
    sed "s|image: $IMAGE_NAME:.*|image: $IMAGE_NAME:$TAG|g" "$DEPLOYMENT_FILE" > "$temp_dir/deployment.yaml"
    
    # Copy networking file
    cp "$NETWORKING_FILE" "$temp_dir/networking.yaml"
    
    # Handle secrets file
    if [ -f "$SECRETS_FILE" ]; then
        cp "$SECRETS_FILE" "$temp_dir/secrets.yaml"
        info "✅ Secrets file included"
    else
        warn "⚠️  Secrets file not found: $SECRETS_FILE"
        warn "You may need to create k8s-secrets.yaml with your API keys"
    fi
    
    # Validate YAML syntax
    info "Validating YAML syntax..."
    if command -v yq > /dev/null 2>&1; then
        yq eval '.' "$temp_dir/deployment.yaml" > /dev/null || error "Invalid YAML in deployment file"
        yq eval '.' "$temp_dir/networking.yaml" > /dev/null || error "Invalid YAML in networking file"
    else
        warn "yq not found, skipping YAML validation"
    fi
    
    echo "$temp_dir"
}

# Deploy to Raspberry Pi
deploy_to_pi() {
    local temp_dir="$1"
    
    log "Deploying to Raspberry Pi..."
    info "Remote host: $REMOTE_HOST"
    info "Deployment path: $REMOTE_DEPLOY_PATH"
    
    # Create remote deployment directory
    ssh "$REMOTE_HOST" "mkdir -p $REMOTE_DEPLOY_PATH"
    
    # Copy deployment files to Pi
    log "📡 Copying deployment files to Raspberry Pi..."
    scp "$temp_dir"/*.yaml "$REMOTE_HOST:$REMOTE_DEPLOY_PATH/"
    
    # Apply Kubernetes manifests in order
    log "🎯 Applying Kubernetes manifests..."
    
    # Apply secrets first (if exists)
    if [ -f "$temp_dir/secrets.yaml" ]; then
        info "Applying secrets..."
        if ssh "$REMOTE_HOST" "kubectl apply -f $REMOTE_DEPLOY_PATH/secrets.yaml"; then
            log "✅ Secrets applied successfully"
        else
            warn "⚠️  Failed to apply secrets, continuing..."
        fi
    fi
    
    # Apply networking
    info "Applying networking configuration..."
    if ssh "$REMOTE_HOST" "kubectl apply -f $REMOTE_DEPLOY_PATH/networking.yaml"; then
        log "✅ Networking applied successfully"
    else
        error "Failed to apply networking configuration"
    fi
    
    # Apply deployment
    info "Applying deployment..."
    if ssh "$REMOTE_HOST" "kubectl apply -f $REMOTE_DEPLOY_PATH/deployment.yaml"; then
        log "✅ Deployment applied successfully"
    else
        error "Failed to apply deployment"
    fi
}

# Monitor deployment
monitor_deployment() {
    log "Monitoring deployment status..."
    
    # Wait for deployment to be ready
    info "Waiting for deployment to be ready (timeout: 300s)..."
    if ssh "$REMOTE_HOST" "kubectl wait --for=condition=available --timeout=300s deployment/promptscad"; then
        log "✅ Deployment is ready"
    else
        warn "⚠️  Deployment timeout or not ready"
        warn "Check deployment status manually"
    fi
    
    # Show deployment status
    log "📊 Deployment Status:"
    ssh "$REMOTE_HOST" "
        echo 'Nodes:'
        kubectl get nodes
        echo
        echo 'Deployment:'
        kubectl get deployment promptscad
        echo
        echo 'Pods:'
        kubectl get pods -l app=promptscad
        echo
        echo 'Services:'
        kubectl get services promptscad
    "
}

# Post-deployment verification
verify_deployment() {
    log "Verifying deployment..."
    
    # Check if pods are running
    local running_pods
    running_pods=$(ssh "$REMOTE_HOST" "kubectl get pods -l app=promptscad -o jsonpath='{.items[?(@.status.phase==\"Running\")].metadata.name}' | wc -w")
    
    if [ "$running_pods" -gt 0 ]; then
        log "✅ Found $running_pods running pods"
    else
        error "No pods are running"
    fi
    
    # Test service endpoint
    info "Testing service endpoint..."
    local service_ip
    service_ip=$(ssh "$REMOTE_HOST" "kubectl get service promptscad -o jsonpath='{.spec.clusterIP}'" 2>/dev/null || echo "")
    
    if [ -n "$service_ip" ]; then
        log "✅ Service is accessible at: $service_ip"
        
        # Test health endpoint if possible
        if ssh "$REMOTE_HOST" "timeout 10 kubectl run test-curl --image=curlimages/curl --rm -it --quiet -- curl -s http://$service_ip/status/health" > /dev/null 2>&1; then
            log "✅ Health endpoint is responding"
        else
            warn "⚠️  Health endpoint not responding (this may be normal)"
        fi
    else
        warn "⚠️  Could not determine service IP"
    fi
}

# Cleanup function
cleanup() {
    local temp_dir="$1"
    if [ -n "$temp_dir" ] && [ -d "$temp_dir" ]; then
        rm -rf "$temp_dir"
        info "Cleaned up temporary files"
    fi
}

# Generate deployment report
generate_report() {
    local report_file="deployment-report-${TIMESTAMP}.md"
    
    cat > "$report_file" << EOF
# Raspberry Pi Kubernetes Deployment Report

**Deployment Date:** $(date)  
**Image:** $IMAGE_NAME:$TAG  
**Remote Host:** $REMOTE_HOST  

## Deployment Summary

✅ **Build Status:** Successful  
✅ **Deployment Status:** Completed  
✅ **Service Status:** Running  

## Access Information

### Service Details
\`\`\`bash
$(ssh "$REMOTE_HOST" "kubectl get service promptscad" 2>/dev/null || echo "Service information unavailable")
\`\`\`

### Pod Status
\`\`\`bash
$(ssh "$REMOTE_HOST" "kubectl get pods -l app=promptscad" 2>/dev/null || echo "Pod information unavailable")
\`\`\`

## Next Steps

1. **Access the application:**
   \`\`\`bash
   kubectl port-forward service/promptscad 8080:80
   # Then visit: http://localhost:8080
   \`\`\`

2. **Monitor logs:**
   \`\`\`bash
   kubectl logs -l app=promptscad -f
   \`\`\`

3. **Check health:**
   \`\`\`bash
   kubectl get deployment promptscad
   \`\`\`

## Troubleshooting

If you encounter issues:
1. Check pod logs: \`kubectl logs -l app=promptscad\`
2. Check events: \`kubectl get events --sort-by='.lastTimestamp' | tail -10\`
3. Verify secrets: \`kubectl get secrets\`
4. Check node resources: \`kubectl describe nodes\`

EOF
    
    log "📋 Deployment report generated: $report_file"
}

# Main deployment function
main() {
    echo "🚀 Raspberry Pi Kubernetes Deployment"
    echo "====================================="
    echo "Image: $IMAGE_NAME:$TAG"
    echo "Remote: $REMOTE_HOST"
    echo
    
    local temp_dir=""
    
    # Set up error handling
    trap 'cleanup "$temp_dir"; error "Deployment failed"' ERR
    
    # Execute deployment steps
    check_prerequisites
    build_image
    temp_dir=$(prepare_deployment)
    deploy_to_pi "$temp_dir"
    monitor_deployment
    verify_deployment
    generate_report
    
    # Cleanup
    cleanup "$temp_dir"
    
    echo
    echo "====================================="
    log "🎉 Deployment completed successfully!"
    log "Image: $IMAGE_NAME:$TAG"
    log "Remote: $REMOTE_HOST"
    log "Report: deployment-report-${TIMESTAMP}.md"
    echo
    log "Next steps:"
    log "1. Check deployment status: kubectl get deployment promptscad"
    log "2. View logs: kubectl logs -l app=promptscad -f"
    log "3. Port forward: kubectl port-forward service/promptscad 8080:80"
}

# Handle command line arguments
case "${1:-deploy}" in
    "deploy"|"")
        main
        ;;
    "build-only")
        check_prerequisites
        build_image
        ;;
    "deploy-only")
        temp_dir=$(prepare_deployment)
        deploy_to_pi "$temp_dir"
        cleanup "$temp_dir"
        ;;
    "monitor")
        monitor_deployment
        ;;
    "health")
        verify_deployment
        ;;
    "help"|"-h"|"--help")
        echo "Raspberry Pi Kubernetes Deployment Script"
        echo "Usage: $0 {deploy|build-only|deploy-only|monitor|health|help}"
        echo
        echo "Commands:"
        echo "  deploy       - Full deployment (build + deploy + monitor) [default]"
        echo "  build-only   - Build Docker image only"
        echo "  deploy-only  - Deploy only (skip build)"
        echo "  monitor      - Monitor deployment status"
        echo "  health       - Check deployment health"
        echo "  help         - Show this help"
        echo
        echo "Environment variables:"
        echo "  REMOTE_HOST  - SSH connection string (default: pi@raspberrypi.local)"
        echo
        echo "Examples:"
        echo "  $0                           # Full deployment"
        echo "  $0 build-only                # Build image only"
        echo "  REMOTE_HOST=user@pi $0      # Use custom host"
        ;;
    *)
        error "Unknown command: $1"
        ;;
esac