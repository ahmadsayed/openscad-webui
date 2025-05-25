# Quick Start Guide

## Build and Deploy Commands

### Using NPM (Recommended)
```bash
# Full build and deploy
npm run docker:build

# Build only (no K8s update)
npm run docker:build-only

# Update K8s deployment
npm run k8s:update
```

### Using Make
```bash
# Full build and deploy
make build

# Build only
make build-only

# Update K8s deployment
make update-k8s

# Show help
make help

# Show current config
make info
```

## What Each Command Does

### `npm run docker:build` / `make build`
1. Generates timestamp tag (e.g., `05251356`)
2. Builds multi-arch Docker image for ARM v7, ARM64 v8, AMD64
3. Pushes to `ahmadsayed/promptscad:MMDDHHMM`
4. Updates `kubernetes/deployment.yaml` with new tag
5. Shows next steps

### `npm run docker:build-only` / `make build-only`
1. Generates timestamp tag
2. Builds and pushes Docker image
3. Does NOT update Kubernetes deployment

### `npm run k8s:update` / `make update-k8s`
1. Shows current image tag in deployment
2. Prompts for new tag
3. Updates deployment file
4. Optionally applies to cluster

## Example Workflow

```bash
# 1. Build and deploy everything
make build

# 2. Apply to Kubernetes cluster
kubectl apply -f kubernetes/deployment.yaml

# 3. Check deployment status
kubectl get pods -l app=promptscad
kubectl logs -l app=promptscad
```

## Tag Format

Tags use format `MMDDHHMM`:
- `MM`: Month (01-12)
- `DD`: Day (01-31)  
- `HH`: Hour (00-23)
- `MM`: Minute (00-59)

Example: `05251356` = May 25, 1:56 PM

## Current Configuration

- **Image**: `ahmadsayed/promptscad`
- **Platforms**: `linux/arm/v7,linux/arm64/v8,linux/amd64`
- **Deployment**: `kubernetes/deployment.yaml`
- **Current Tag**: Run `make info` to see current tag

## Files Created

- `scripts/build-and-deploy.js` - Full build script
- `scripts/build-docker.js` - Docker build only
- `scripts/update-k8s.js` - K8s deployment updater
- `Makefile` - Make-based build system
- `BUILD.md` - Detailed documentation
- `QUICK_START.md` - This quick reference
