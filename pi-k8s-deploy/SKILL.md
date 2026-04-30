---
name: pi-k8s-deploy
description: Raspberry Pi Kubernetes deployment and management for containerized applications. Use when Kimi needs to deploy, manage, or troubleshoot applications on Raspberry Pi Kubernetes clusters using make deploy commands, handle Docker builds for ARM architectures, manage k8s manifests, secrets, and monitor cluster status.
---

# Raspberry Pi Kubernetes Deployment and Management

This skill provides comprehensive support for deploying and managing containerized applications on Raspberry Pi Kubernetes clusters.

## Quick Deployment Commands

```bash
# Deploy to Raspberry Pi cluster (build + deploy)
make deploy

# Deploy to local k8s cluster
make deploy-local

# Build multi-arch Docker image for Pi
make build

# Check deployment status
kubectl get pods -l app=promptscad
kubectl get services promptscad
```

## Core Deployment Workflow

### 1. Build and Deploy to Raspberry Pi
```bash
# Full deployment pipeline
make deploy

# This executes:
# 1. make build - Builds multi-arch Docker image (ARM/AMD64)
# 2. make deploy-remote - Deploys to Raspberry Pi via SSH
```

### 2. Local Development Deployment
```bash
# Deploy to local Kubernetes cluster
make deploy-local

# Quick local deployment (build + deploy)
make quick-deploy-local
```

### 3. Build Only (No Deployment)
```bash
# Build Docker image locally
make build-only

# Build and push multi-arch image
make build
```

## Configuration Management

### Environment Setup
```bash
# Check current configuration
make info

# Update remote host in Makefile (if needed)
sed -i 's/REMOTE_HOST :=.*/REMOTE_HOST := user@your-pi-ip/' Makefile

# Set up Kubernetes secrets
cp k8s-secrets.yaml.example k8s-secrets.yaml
# Edit k8s-secrets.yaml with your API keys
```

### Kubernetes Secrets
```bash
# Create secrets from example file
kubectl apply -f k8s-secrets.yaml

# Verify secrets are created
kubectl get secrets
kubectl describe secret deepseek-api-key
kubectl describe secret qwen-api-key
```

## Monitoring and Troubleshooting

### Cluster Status
```bash
# Check deployment status
kubectl get deployments
kubectl get pods -l app=promptscad
kubectl get services promptscad

# Detailed pod information
kubectl describe pod -l app=promptscad

# Check logs
kubectl logs -l app=promptscad --tail=100
```

### Service Access
```bash
# Port forward to access locally
kubectl port-forward service/promptscad 8080:80

# Get service endpoint
kubectl get service promptscad -o wide
```

## Common Issues and Solutions

### Deployment Failures
```bash
# Check deployment events
kubectl describe deployment promptscad

# Check pod events
kubectl describe pod -l app=promptscad

# View recent logs
kubectl logs -l app=promptscad --tail=50
```

### Image Pull Issues
```bash
# Check image availability
docker pull ahmadsayed/promptscad:latest

# Verify image tag in deployment
kubectl get deployment promptscad -o yaml | grep image:

# Force pod recreation
kubectl rollout restart deployment promptscad
```

### Resource Constraints on Pi
```bash
# Check node resources
kubectl describe nodes

# Check resource usage
kubectl top nodes
kubectl top pods

# Adjust resource limits if needed
kubectl edit deployment promptscad
```

## Advanced Operations

### Rolling Updates
```bash
# Update deployment with new image
make deploy  # Automatically updates image tag

# Manual rollout status
kubectl rollout status deployment/promptscad

# Rollback if needed
kubectl rollout undo deployment/promptscad
```

### Scaling
```bash
# Scale deployment
kubectl scale deployment promptscad --replicas=3

# Check scaling status
kubectl get pods -l app=promptscad
```

### Cleanup
```bash
# Delete deployment and service
kubectl delete deployment promptscad
kubectl delete service promptscad
kubectl delete secrets deepseek-api-key qwen-api-key
```

## Raspberry Pi Specific Considerations

### ARM Architecture Support
```bash
# Verify ARM support in Docker image
docker manifest inspect ahmadsayed/promptscad:latest

# Build for specific ARM version
docker buildx build --platform linux/arm/v7 -t your-image:armv7 .
```

### Resource Management
```bash
# Set resource requests/limits for Pi
kubectl patch deployment promptscad -p '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "promptscad",
          "resources": {
            "requests": {
              "memory": "128Mi",
              "cpu": "100m"
            },
            "limits": {
              "memory": "512Mi",
              "cpu": "500m"
            }
          }
        }]
      }
    }
  }
}'
```

### Storage Considerations
```bash
# Check storage usage
kubectl get pv,pvc

# Clean up unused resources
kubectl delete pvc --field-selector status.phase=Released
```

## Network Configuration

### Service Types
```bash
# Change service type if needed
kubectl patch service promptscad -p '{"spec": {"type": "NodePort"}}'

# Get NodePort
kubectl get service promptscad -o jsonpath='{.spec.ports[0].nodePort}'
```

### Ingress Setup
```bash
# Create ingress (if ingress controller is installed)
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: promptscad-ingress
spec:
  rules:
  - host: promptscad.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: promptscad
            port:
              number: 80
EOF
```

## Health Checks and Probes

### Configure Liveness and Readiness Probes
```bash
# Add health checks to deployment
kubectl patch deployment promptscad -p '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "promptscad",
          "livenessProbe": {
            "httpGet": {
              "path": "/status/health",
              "port": 3000
            },
            "initialDelaySeconds": 30,
            "periodSeconds": 10
          },
          "readinessProbe": {
            "httpGet": {
              "path": "/status/health",
              "port": 3000
            },
            "initialDelaySeconds": 5,
            "periodSeconds": 5
          }
        }]
      }
    }
  }
}'
```

For detailed troubleshooting procedures, see [references/troubleshooting.md](references/troubleshooting.md).
For deployment examples and templates, see [references/deployment-templates.md](references/deployment-templates.md).