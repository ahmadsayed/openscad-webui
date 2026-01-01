# Makefile for OpenSCAD WebUI Docker builds
# Usage:
#   make build          - Build and push Docker image with auto-generated tag
#   make build-only     - Build Docker image only (no K8s update)
#   make update-k8s     - Update Kubernetes deployment with new tag
#   make deploy         - Build and deploy to K8s cluster via SSH (optional)
#   make help           - Show this help message

.PHONY: build build-only update-k8s deploy help

# Configuration
IMAGE_NAME := ahmadsayed/promptscad
PLATFORMS := linux/arm/v7,linux/arm64/v8,linux/amd64
DEPLOYMENT_FILE := kubernetes/deployment.yaml

# Generate timestamp tag in format: MMDDHHMM
TAG := $(shell date +%m%d%H%M)
FULL_IMAGE := $(IMAGE_NAME):$(TAG)

# Default target
help:
	@echo "OpenSCAD WebUI Build System"
	@echo "============================"
	@echo ""
	@echo "Available targets:"
	@echo "  build          - Build and push Docker image + update K8s deployment"
	@echo "  build-only     - Build and push Docker image only"
	@echo "  update-k8s     - Update Kubernetes deployment (interactive)"
	@echo "  deploy         - Build and deploy to K8s cluster via SSH (optional)"
	@echo "  clean          - Clean up generated test files and directories"
	@echo "  clean-all      - Deep clean - removes all generated files including logs"
	@echo "  help           - Show this help message"
	@echo ""
	@echo "Configuration:"
	@echo "  Image:         $(IMAGE_NAME)"
	@echo "  Current tag:   $(TAG)"
	@echo "  Full image:    $(FULL_IMAGE)"
	@echo "  Platforms:     $(PLATFORMS)"
	@echo ""
	@echo "Examples:"
	@echo "  make build                    # Full build and deploy"
	@echo "  make build-only              # Build only"
	@echo "  make update-k8s              # Update K8s deployment"
	@echo "  make deploy                   # Build and deploy to K8s cluster"
	@echo "  make clean                    # Clean up test files"
	@echo "  make clean-all               # Deep clean everything"

# Build and push Docker image, then update Kubernetes deployment
build:
	@echo "🚀 Starting Docker build and deploy process..."
	@echo "📦 Building image: $(FULL_IMAGE)"
	@echo "🏗️  Platforms: $(PLATFORMS)"
	@echo ""
	@echo "⚡ Executing build command..."
	docker buildx build --platform $(PLATFORMS) -t $(FULL_IMAGE) --push .
	@echo ""
	@echo "✅ Docker build and push completed successfully!"
	@echo "🔄 Updating Kubernetes deployment..."
	@sed -i 's|image: $(IMAGE_NAME):[^[:space:]]*|image: $(FULL_IMAGE)|g' $(DEPLOYMENT_FILE)
	@echo "✅ Updated $(DEPLOYMENT_FILE) with new tag: $(TAG)"
	@echo ""
	@echo "🎉 Build and deploy process completed successfully!"
	@echo "📋 Image tag: $(TAG)"
	@echo "🐳 Full image: $(FULL_IMAGE)"
	@echo ""
	@echo "💡 To apply to Kubernetes cluster, run:"
	@echo "   kubectl apply -f $(DEPLOYMENT_FILE)"

# Build and push Docker image only
build-only:
	@echo "🚀 Starting Docker build process..."
	@echo "📦 Building image: $(FULL_IMAGE)"
	@echo "🏗️  Platforms: $(PLATFORMS)"
	@echo ""
	@echo "⚡ Executing build command..."
	docker buildx build --platform $(PLATFORMS) -t $(FULL_IMAGE) --push .
	@echo ""
	@echo "✅ Docker build and push completed successfully!"
	@echo "📋 Image tag: $(TAG)"
	@echo "🐳 Full image: $(FULL_IMAGE)"
	@echo ""
	@echo "💡 To update Kubernetes deployment, run:"
	@echo "   make update-k8s"
	@echo "   OR"
	@echo "   npm run k8s:update"

# Update Kubernetes deployment (interactive)
update-k8s:
	@echo "🔄 Updating Kubernetes deployment..."
	@echo "📋 Current deployment file: $(DEPLOYMENT_FILE)"
	@echo ""
	npm run k8s:update

# Build and deploy to Kubernetes cluster via SSH
deploy:
	@echo "🚀 Starting full build and deploy to K8s cluster..."
	@echo "📦 Building image: $(FULL_IMAGE)"
	@echo "🏗️  Platforms: $(PLATFORMS)"
	@echo ""
	@echo "⚡ Executing build command..."
	docker buildx build --platform $(PLATFORMS) -t $(FULL_IMAGE) --push .
	@echo ""
	@echo "✅ Docker build and push completed successfully!"
	@echo "🔄 Updating Kubernetes deployment file..."
	@sed -i 's|image: $(IMAGE_NAME):[^[:space:]]*|image: $(FULL_IMAGE)|g' $(DEPLOYMENT_FILE)
	@echo "✅ Updated $(DEPLOYMENT_FILE) with new tag: $(TAG)"
	@echo ""
	@echo "🚀 Deploying to K8s cluster via SSH..."
	@echo "📡 Connecting to adam@192.168.68.60..."
	@scp $(DEPLOYMENT_FILE) adam@192.168.68.60:/tmp/deployment.yaml
	@scp kubernetes/networking.yaml adam@192.168.68.60:/tmp/networking.yaml
	@ssh adam@192.168.68.60 "kubectl apply -f /tmp/deployment.yaml && kubectl apply -f /tmp/networking.yaml"
	@echo ""
	@echo "🎉 Deployment completed successfully!"
	@echo "📋 Image tag: $(TAG)"
	@echo "🐳 Full image: $(FULL_IMAGE)"
	@echo "🌐 Application should be available at: http://promptscad.com"
	@echo ""
	@echo "💡 To check deployment status, run:"
	@echo "   ssh adam@192.168.68.60 'kubectl get pods -l app=promptscad'"

# Clean up generated test files and directories
clean:
	@echo "🧹 Cleaning up generated test files and directories..."
	@echo "📁 Removing module_test_output directory..."
	@rm -rf module_test_output/
	@echo "📁 Removing demo_output directory..."
	@rm -rf demo_output/
	@echo "📁 Removing test_output directory..."
	@rm -rf test_output/
	@echo "🗑️  Removing generated .scad files..."
	@rm -f *.scad
	@echo "🗑️  Removing sample test files..."
	@rm -f sample-*.scad
	@echo "🗑️  Removing improved test files..."
	@rm -f improved-*.scad
	@echo "🗑️  Removing module.scad copy..."
	@rm -f module.scad
	@echo "🗑️  Removing validation images..."
	@rm -f /tmp/validation*.png
	@echo ""
	@echo "✅ Cleanup completed successfully!"
	@echo "💡 All generated test files have been removed."

# Deep clean - removes all generated files including logs
clean-all: clean
	@echo "🧹 Performing deep clean..."
	@echo "📁 Removing log files..."
	@rm -f *.log
	@echo "🗑️  Removing temporary files..."
	@rm -f /tmp/*.png
	@echo ""
	@echo "✅ Deep clean completed!"
	@echo "💡 All generated files and logs have been removed."

# Show current configuration
info:
	@echo "OpenSCAD WebUI Build Configuration"
	@echo "=================================="
	@echo "Image name:       $(IMAGE_NAME)"
	@echo "Generated tag:    $(TAG)"
	@echo "Full image:       $(FULL_IMAGE)"
	@echo "Platforms:        $(PLATFORMS)"
	@echo "Deployment file:  $(DEPLOYMENT_FILE)"
	@echo ""
	@echo "Current image in deployment:"
	@grep "image:" $(DEPLOYMENT_FILE) | head -1 | sed 's/^[[:space:]]*//'
