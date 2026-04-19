#!/bin/bash

# Quick Deployment Script for PromptSCAD
# This script deploys using the pre-configured API key from .env

set -e

echo "🚀 Quick Deploying PromptSCAD to Kubernetes..."
echo "=============================================="

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed or not in PATH"
    exit 1
fi

# Apply secrets first (contains API key from .env)
echo "🔐 Applying secrets with API key from .env..."
kubectl apply -f k8s-secrets.yaml

# Apply the deployment
echo "🎯 Applying deployment..."
kubectl apply -f kubernetes/deployment.yaml

# Wait for deployment to be ready
echo "⏳ Waiting for deployment to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/promptscad 2>/dev/null || echo "⚠️  Deployment may still be starting..."

# Show status
echo "📊 Deployment Status:"
kubectl get pods -l app=promptscad
kubectl get services promptscad

echo ""
echo "✅ Quick deployment complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Check status: kubectl get pods -l app=promptscad"
echo "2. View logs: kubectl logs -l app=promptscad"
echo "3. Port forward: kubectl port-forward service/promptscad 8080:80"
echo "4. Test: curl http://localhost:8080/health"