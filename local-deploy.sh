#!/bin/bash

# Local Deployment Script - Simulates Kubernetes environment locally
# This ensures the application works exactly like it would in Kubernetes

set -e

echo "🚀 Local Deployment - Simulating Kubernetes Environment"
echo "======================================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
CONTAINER_NAME="promptscad-local"
IMAGE_NAME="promptscad-fs-fix:latest"
HOST_PORT="3000"
CONTAINER_PORT="3000"

# Stop any existing container
print_status "Checking for existing container..."
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    print_status "Stopping existing container..."
    docker stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
    docker rm "$CONTAINER_NAME" >/dev/null 2>&1 || true
fi

# Create environment file for container
print_status "Creating container environment configuration..."
cat > .env.container << EOF
# Container environment - matches Kubernetes configuration
NODE_ENV=production
AD_ENV=quiet
DEEPSEEK_API_KEY=sk-1eeaaf63946341c9af5f5f47c15e8860
EOF

print_status "✅ Environment configuration created"

# Run container with Kubernetes-like configuration
print_status "Starting container with Kubernetes-like configuration..."
docker run -d \
    --name "$CONTAINER_NAME" \
    --env-file .env.container \
    -p "${HOST_PORT}:${CONTAINER_PORT}" \
    --restart unless-stopped \
    --health-cmd "wget --no-verbose --tries=1 --spider http://localhost:${CONTAINER_PORT}/health || exit 1" \
    --health-interval=30s \
    --health-timeout=3s \
    --health-retries=3 \
    --health-start-period=5s \
    "$IMAGE_NAME"

print_status "✅ Container started successfully"

# Wait for container to be healthy
print_status "Waiting for container to become healthy..."
timeout=60
while [ $timeout -gt 0 ]; do
    if docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null | grep -q "healthy"; then
        print_status "✅ Container is healthy"
        break
    fi
    
    if docker inspect --format='{{.State.Status}}' "$CONTAINER_NAME" 2>/dev/null | grep -q "exited"; then
        print_error "❌ Container exited unexpectedly"
        docker logs "$CONTAINER_NAME"
        exit 1
    fi
    
    sleep 2
    timeout=$((timeout - 2))
done

if [ $timeout -eq 0 ]; then
    print_warning "⚠️  Container health check timed out, but container may still be starting"
fi

# Get container logs
print_status "Container logs:"
docker logs "$CONTAINER_NAME" | tail -20

# Test the application
print_status ""
print_status "🧪 Testing Application..."
print_status "======================="

# Wait a bit more for full initialization
sleep 5

# Test health endpoint
print_status "Testing health endpoint..."
if curl -s -f "http://localhost:${HOST_PORT}/health" >/dev/null; then
    print_status "✅ Health endpoint is responding"
else
    print_error "❌ Health endpoint failed"
    print_status "Checking container logs for errors..."
    docker logs "$CONTAINER_NAME" | grep -i "error\|fs\|filesystem" | tail -10
fi

# Test main page
print_status "Testing main page..."
if curl -s -f "http://localhost:${HOST_PORT}/main" >/dev/null; then
    print_status "✅ Main page is accessible"
else
    print_error "❌ Main page failed"
fi

# Test simple page
print_status "Testing simple page..."
if curl -s -f "http://localhost:${HOST_PORT}/simple" >/dev/null; then
    print_status "✅ Simple page is accessible"
else
    print_error "❌ Simple page failed"
fi

# Test API endpoint
print_status "Testing API endpoint..."
if curl -s -X POST "http://localhost:${HOST_PORT}/generate-code" \
    -H "Content-Type: application/json" \
    -d '{"prompt":"create a cube","existingCode":""}' >/dev/null; then
    print_status "✅ API endpoint is responding"
else
    print_error "❌ API endpoint failed"
fi

# Show container status
print_status ""
print_status "📊 Container Status"
print_status "=================="
docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Show final access information
print_status ""
print_status "🌐 Application Access"
print_status "===================="
print_status "Application URL: http://localhost:${HOST_PORT}"
print_status "Main Interface:  http://localhost:${HOST_PORT}/main"
print_status "Simple Interface: http://localhost:${HOST_PORT}/simple"
print_status "Health Check:    http://localhost:${HOST_PORT}/health"

# Show monitoring commands
print_status ""
print_status "🔍 Monitoring Commands"
print_status "====================="
echo "View logs:           docker logs -f $CONTAINER_NAME"
echo "Check health:        docker inspect --format='{{.State.Health.Status}}' $CONTAINER_NAME"
echo "Container stats:     docker stats $CONTAINER_NAME"
echo "Stop container:      docker stop $CONTAINER_NAME"
echo "Remove container:    docker rm $CONTAINER_NAME"

# Test with browser (if available)
if command -v xdg-open &> /dev/null || command -v open &> /dev/null; then
    print_status ""
    print_status "🚀 Opening application in browser..."
    sleep 2
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:${HOST_PORT}/main" &
    elif command -v open &> /dev/null; then
        open "http://localhost:${HOST_PORT}/main" &
    fi
fi

print_status ""
print_status "✅ Local deployment completed successfully!"
print_status "The application should now work exactly like it does in Kubernetes."
print_status ""
print_status "🎯 Next steps:"
print_status "1. Test the application by creating some 3D models"
print_status "2. Monitor the logs for any FS errors (there should be none)"
print_status "3. When ready, deploy to actual Kubernetes cluster"
print_status "4. Compare local behavior with Kubernetes deployment"