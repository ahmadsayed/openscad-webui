# Makefile for OpenSCAD WebUI - Raspberry Pi Kubernetes Deployment
# Based on original GitHub repository approach
# Usage for Raspberry Pi with existing Kubernetes cluster

.PHONY: build build-only deploy-remote deploy-local help clean

# Configuration
IMAGE_NAME := ahmadsayed/promptscad
DEPLOYMENT_FILE := kubernetes/deployment.yaml
NETWORKING_FILE := kubernetes/networking.yaml

# Generate timestamp tag in format: MMDDHHMM
TAG := $(shell date +%m%d%H%M)
FULL_IMAGE := $(IMAGE_NAME):$(TAG)

# Remote host configuration (Raspberry Pi)
REMOTE_HOST := adam@192.168.68.60
REMOTE_DEPLOY_PATH := /home/adam/promptscad

# Default target
help:
	@echo "OpenSCAD WebUI - Raspberry Pi Kubernetes Deployment"
	@echo "=================================================="
	@echo ""
	@echo "Available targets:"
	@echo "  build          - Build and push Docker image"
	@echo "  build-only     - Build Docker image only"
	@echo "  deploy         - Build image with specific tag and deploy remotely"
	@echo "  deploy-remote  - Deploy to Raspberry Pi Kubernetes cluster"
	@echo "  deploy-local   - Deploy to local Kubernetes cluster"
	@echo "  clean          - Clean up generated files"
	@echo "  help           - Show this help message"
	@echo ""
	@echo "Configuration:"
	@echo "  Image:         $(IMAGE_NAME)"
	@echo "  Current tag:   $(TAG)"
	@echo "  Full image:    $(FULL_IMAGE)"
	@echo "  Remote host:   $(REMOTE_HOST)"
	@echo ""
	@echo "Examples:"
	@echo "  make build          # Build and push image"
	@echo "  make deploy         # Build and deploy to remote cluster"
	@echo "  make deploy-remote  # Deploy to Raspberry Pi"
	@echo "  make deploy-local   # Deploy locally"

# Build and push Docker image (multi-platform for Pi support)
build:
	@echo "🚀 Building Docker image for Raspberry Pi..."
	@echo "📦 Image: $(FULL_IMAGE)"
	@echo "🏗️  Platforms: linux/arm/v7,linux/arm64/v8,linux/amd64"
	
	# Build for multiple architectures (including ARM for Pi)
	docker buildx build --platform linux/arm/v7,linux/arm64/v8,linux/amd64 \
		-t $(FULL_IMAGE) --push .
	
	@echo "✅ Build completed successfully!"
	@echo "🐳 Pushed to registry: $(FULL_IMAGE)"

# Build Docker image only (no push)
build-only:
	@echo "🚀 Building Docker image locally..."
	@echo "📦 Image: $(FULL_IMAGE)"
	
	docker build -t $(FULL_IMAGE) .
	
	@echo "✅ Local build completed!"
	@echo "💡 To push to registry, run: docker push $(FULL_IMAGE)"

# Deploy to Raspberry Pi Kubernetes cluster via SSH
deploy-remote:
	@echo "🚀 Deploying to Raspberry Pi Kubernetes cluster..."
	@echo "📡 Connecting to $(REMOTE_HOST)..."
	
	# Update deployment file with new image tag
	@sed -i 's|image: $(IMAGE_NAME):[^[:space:]]*|image: $(FULL_IMAGE)|g' $(DEPLOYMENT_FILE)
	@echo "✅ Updated $(DEPLOYMENT_FILE) with image: $(FULL_IMAGE)"
	
	# Copy deployment files to Raspberry Pi
	@echo "📋 Copying deployment files to Raspberry Pi..."
	@scp $(DEPLOYMENT_FILE) $(REMOTE_HOST):/tmp/deployment.yaml
	@scp $(NETWORKING_FILE) $(REMOTE_HOST):/tmp/networking.yaml
	@scp k8s-secrets.yaml $(REMOTE_HOST):/tmp/k8s-secrets.yaml
	
	# Deploy on Raspberry Pi
	@echo "🎯 Applying Kubernetes manifests on Raspberry Pi..."
	@ssh $(REMOTE_HOST) "kubectl apply -f /tmp/k8s-secrets.yaml"
	@ssh $(REMOTE_HOST) "kubectl apply -f /tmp/deployment.yaml"
	@ssh $(REMOTE_HOST) "kubectl apply -f /tmp/networking.yaml"
	
	# Wait for deployment to be ready
	@echo "⏳ Waiting for deployment to be ready..."
	@ssh $(REMOTE_HOST) "kubectl wait --for=condition=available --timeout=300s deployment/promptscad" || echo "⚠️  Deployment may still be starting..."
	
	# Show deployment status
	@echo "📊 Deployment Status:"
	@ssh $(REMOTE_HOST) "kubectl get pods -l app=promptscad"
	@ssh $(REMOTE_HOST) "kubectl get services promptscad"
	
	@echo ""
	@echo "✅ Remote deployment completed successfully!"
	@echo "🌐 Application should be accessible on your Raspberry Pi Kubernetes cluster"

# Deploy to local Kubernetes cluster
deploy-local:
	@echo "🚀 Deploying to local Kubernetes cluster..."
	
	# Update deployment file with new image tag
	@sed -i 's|image: $(IMAGE_NAME):[^[:space:]]*|image: $(FULL_IMAGE)|g' $(DEPLOYMENT_FILE)
	@echo "✅ Updated $(DEPLOYMENT_FILE) with image: $(FULL_IMAGE)"
	
	# Apply Kubernetes manifests locally
	@echo "🎯 Applying Kubernetes manifests..."
	kubectl apply -f k8s-secrets.yaml
	kubectl apply -f $(DEPLOYMENT_FILE)
	kubectl apply -f $(NETWORKING_FILE)
	
	# Wait for deployment to be ready
	@echo "⏳ Waiting for deployment to be ready..."
	kubectl wait --for=condition=available --timeout=300s deployment/promptscad 2>/dev/null || echo "⚠️  Deployment may still be starting..."
	
	# Show deployment status
	@echo "📊 Deployment Status:"
	kubectl get pods -l app=promptscad
	kubectl get services promptscad
	
	@echo ""
	@echo "✅ Local deployment completed successfully!"
	@echo "💡 Use 'kubectl port-forward service/promptscad 8080:80' to access the application"

# Deploy target - builds image with specific tag and deploys remotely
deploy: build deploy-remote
	@echo "🎉 Deployment completed with tag: $(TAG)"
	@echo "🐳 Image: $(FULL_IMAGE)"
	@echo "🚀 Deployed to remote Kubernetes cluster"

# Quick deployment alias (deprecated, use 'deploy' instead)
quick-deploy: deploy
	@echo "⚠️  'quick-deploy' is deprecated, use 'deploy' instead"

# Quick local deployment (build + local deploy)
quick-deploy-local: build deploy-local
	@echo "🎉 Quick local deployment completed!"

# Clean up generated files
clean:
	@echo "🧹 Cleaning up generated files..."
	@rm -rf module_test_output/ demo_output/ test_output/
	@rm -f *.scad sample-*.scad improved-*.scad
	@rm -f /tmp/validation*.png
	@echo "✅ Cleanup completed!"

# Show current configuration
info:
	@echo "OpenSCAD WebUI - Raspberry Pi Deployment Configuration"
	@echo "====================================================="
	@echo "Image name:       $(IMAGE_NAME)"
	@echo "Generated tag:    $(TAG)"
	@echo "Full image:       $(FULL_IMAGE)"
	@echo "Remote host:      $(REMOTE_HOST)"
	@echo "Deployment file:  $(DEPLOYMENT_FILE)"
	@echo "Networking file:  $(NETWORKING_FILE)"
	@echo ""
	@echo "Current image in deployment:"
	@grep "image:" $(DEPLOYMENT_FILE) | head -1 | sed 's/^[[:space:]]*//'