# Build and Deployment Guide

This document describes the build and deployment system for the OpenSCAD WebUI project.

## Overview

The build system supports multi-architecture Docker builds (ARM v7, ARM64 v8, AMD64) with automatic tagging and Kubernetes deployment updates. Tags are generated using the format `MMDDHHMM` (month, day, hour, minute).

## Prerequisites

- Docker with buildx support
- Docker Hub access (for pushing images)
- kubectl (for Kubernetes deployment)
- Node.js (for npm scripts)
- Make (for Makefile usage)

## Build Methods

### Method 1: NPM Scripts (Recommended)

#### Full Build and Deploy
```bash
npm run docker:build
```
This will:
1. Generate a timestamp tag (e.g., `25051353`)
2. Build multi-architecture Docker image
3. Push to Docker Hub
4. Update Kubernetes deployment file
5. Display next steps

#### Build Docker Image Only
```bash
npm run docker:build-only
```
This builds and pushes the Docker image without updating Kubernetes.

#### Update Kubernetes Deployment
```bash
npm run k8s:update
```
Interactive script to update the Kubernetes deployment with a new image tag.

### Method 2: Makefile

#### Full Build and Deploy
```bash
make build
```

#### Build Docker Image Only
```bash
make build-only
```

#### Update Kubernetes Deployment
```bash
make update-k8s
```

#### Show Help
```bash
make help
```

#### Show Configuration
```bash
make info
```

## Configuration

### Image Settings
- **Image Name**: `ahmadsayed/promptscad`
- **Platforms**: `linux/arm/v7,linux/arm64/v8,linux/amd64`
- **Tag Format**: `MMDDHHMM` (e.g., `25051353` for May 25, 13:53)

### Files
- **Dockerfile**: Multi-stage build with security optimizations
- **Kubernetes Deployment**: `kubernetes/deployment.yaml`
- **Build Scripts**: `scripts/` directory

## Tag Generation

Tags are automatically generated using the current timestamp:
- **MM**: Month (01-12)
- **DD**: Day (01-31)
- **HH**: Hour (00-23)
- **MM**: Minute (00-59)

Example: `25051353` = May 25, 1:53 PM

## Kubernetes Deployment

The build system automatically updates the image tag in `kubernetes/deployment.yaml`:

```yaml
containers:
- image: ahmadsayed/promptscad:25051353  # Updated automatically
  name: promptscad
```

To apply the updated deployment:
```bash
kubectl apply -f kubernetes/deployment.yaml
```

## Manual Docker Build

If you need to build manually with a custom tag:

```bash
# Generate current timestamp tag
TAG=$(date +%m%d%H%M)

# Build and push
docker buildx build \
  --platform linux/arm/v7,linux/arm64/v8,linux/amd64 \
  -t ahmadsayed/promptscad:$TAG \
  --push .
```

## Troubleshooting

### Docker Buildx Issues
```bash
# Create and use buildx builder
docker buildx create --name multiarch --use
docker buildx inspect --bootstrap
```

### Permission Issues
```bash
# Make scripts executable
chmod +x scripts/*.js
```

### Kubernetes Access
```bash
# Verify kubectl access
kubectl get nodes
kubectl get deployments -n default
```

## Examples

### Complete Build and Deploy Workflow
```bash
# Option 1: Using npm
npm run docker:build

# Option 2: Using make
make build

# Apply to Kubernetes
kubectl apply -f kubernetes/deployment.yaml
```

### Build Only Workflow
```bash
# Build image
npm run docker:build-only

# Later, update deployment
npm run k8s:update
```

### Check Current Deployment
```bash
# Show current image tag
kubectl get deployment promptscad -o jsonpath='{.spec.template.spec.containers[0].image}'

# Or use make
make info
```

## Security Notes

- The Dockerfile uses a non-root user (`appuser`)
- Multi-stage build reduces image size
- Health checks are included
- Security labels are applied

## File Structure

```
.
├── Dockerfile                 # Multi-stage Docker build
├── Makefile                  # Make-based build system
├── package.json              # NPM scripts
├── BUILD.md                  # This documentation
├── scripts/
│   ├── build-and-deploy.js   # Full build and deploy
│   ├── build-docker.js       # Docker build only
│   └── update-k8s.js         # Kubernetes update
└── kubernetes/
    ├── deployment.yaml       # Kubernetes deployment
    └── networking.yaml       # Kubernetes networking
