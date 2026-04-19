# Raspberry Pi Kubernetes Deployment Guide

## 🎯 Quick Start for Raspberry Pi with Existing Kubernetes

This guide uses the proven deployment approach from the original GitHub repository for Raspberry Pi with Kubernetes already installed.

## ✅ Prerequisites (Already Configured)

- **Raspberry Pi** with Kubernetes cluster running
- **SSH Access** to `adam@192.168.68.60` (from original config)
- **kubectl** configured on the Raspberry Pi
- **Docker Registry** access (ahmadsayed/promptscad on Docker Hub)

## 🚀 One-Command Deployment

```bash
# Deploy - builds image with specific tag and deploys to Raspberry Pi
make deploy

# Or step by step:
make build          # Build and push multi-arch image
make deploy-remote  # Deploy to Raspberry Pi
```

## 📋 Manual Deployment Steps

### 1. Build Docker Image (Multi-Architecture for Pi)
```bash
make build
```
This builds for:
- `linux/arm/v7` (older Pi models)
- `linux/arm64/v8` (Pi 4, newer models) 
- `linux/amd64` (x86_64 systems)

### 2. Deploy to Raspberry Pi
```bash
make deploy-remote
```

This will:
- Update the deployment YAML with new image tag
- Copy files to Raspberry Pi via SSH
- Apply Kubernetes manifests
- Wait for deployment to be ready
- Show deployment status

### 3. Verify Deployment
```bash
# Check from your local machine
ssh adam@192.168.68.60 "kubectl get pods -l app=promptscad"

# Or check logs
ssh adam@192.168.68.60 "kubectl logs -l app=promptscad"

# Port forward to access locally
ssh adam@192.168.68.60 "kubectl port-forward service/promptscad 8080:80"
# Then visit: http://localhost:8080
```

## 🔧 Available Commands

```bash
make help              # Show all available commands
make build             # Build and push Docker image
make build-only        # Build locally only
make deploy            # Build image with specific tag and deploy to remote
make deploy-remote     # Deploy to Raspberry Pi
make deploy-local      # Deploy to local Kubernetes
make quick-deploy      # Alias for 'deploy' (deprecated)
make clean             # Clean up generated files
make info              # Show current configuration
```

## 📊 Monitoring

### Check Status
```bash
# Pod status
ssh adam@192.168.68.60 "kubectl get pods -l app=promptscad"

# Service status
ssh adam@192.168.68.60 "kubectl get services promptscad"

# Deployment status
ssh adam@192.168.68.60 "kubectl get deployment promptscad"
```

### View Logs
```bash
# Recent logs
ssh adam@192.168.68.60 "kubectl logs -l app=promptscad --tail=20"

# Follow logs in real-time
ssh adam@192.168.68.60 "kubectl logs -l app=promptscad -f"
```

### Health Check
```bash
# Test health endpoint
ssh adam@192.168.68.60 "kubectl run test-pod --image=curlimages/curl --rm -it --quiet -- curl -s http://promptscad:80/health"
```

## 🔄 Updates

### Update to New Image
```bash
make deploy
```

### Rollback Deployment
```bash
ssh adam@192.168.68.60 "kubectl rollout undo deployment/promptscad"
```

### Scale Deployment
```bash
# Scale to 3 replicas
ssh adam@192.168.68.60 "kubectl scale deployment promptscad --replicas=3"
```

## 🚨 Troubleshooting

### Common Issues

1. **SSH Connection Failed**
   ```bash
   # Test SSH connection
   ssh adam@192.168.68.60 "echo 'SSH OK'"
   
   # Check if SSH key is configured
   ssh-copy-id adam@192.168.68.60
   ```

2. **Image Pull Error**
   ```bash
   # Check if image exists on Docker Hub
   docker pull ahmadsayed/promptscad:latest
   
   # Check image pull policy
   ssh adam@192.168.68.60 "kubectl get deployment promptscad -o yaml | grep imagePullPolicy"
   ```

3. **Pod Not Starting**
   ```bash
   # Check pod events
   ssh adam@192.168.68.60 "kubectl describe pod $(kubectl get pods -l app=promptscad -o name | head -1)"
   
   # Check logs
   ssh adam@192.168.68.60 "kubectl logs -l app=promptscad --previous"
   ```

4. **Service Not Accessible**
   ```bash
   # Check service configuration
   ssh adam@192.168.68.60 "kubectl get service promptscad -o yaml"
   
   # Test service connectivity
   ssh adam@192.168.68.60 "kubectl run test-pod --image=busybox --rm -it -- wget -qO- http://promptscad:80/health"
   ```

## 📁 File Structure

```
/home/ahmedh/projects/openscad-webui/
├── Makefile                    # This deployment makefile
├── kubernetes/
│   ├── deployment.yaml         # Main deployment manifest
│   └── networking.yaml         # Service and ingress configuration
├── k8s-secrets.yaml           # API keys configuration
├── Dockerfile                 # Multi-architecture Docker build
└── scripts/                   # Build scripts
```

## 🔐 Configuration

### Current Settings (from original repo)
- **Remote Host**: `adam@192.168.68.60`
- **Image Registry**: `ahmadsayed/promptscad`
- **Tag Format**: `MMDDHHMM` (timestamp-based)
- **Platforms**: ARM + x86_64 support for Pi compatibility

### Customization
Edit the Makefile to change:
- `REMOTE_HOST` - Your Raspberry Pi SSH address
- `IMAGE_NAME` - Your Docker Hub repository
- Deployment settings in `kubernetes/` directory

## ✅ Success Indicators

After deployment, you should see:
```
✅ Remote deployment completed successfully!
🌐 Application should be accessible on your Raspberry Pi Kubernetes cluster
```

And when checking status:
```bash
$ ssh adam@192.168.68.60 "kubectl get pods -l app=promptscad"
NAME                         READY   STATUS    RESTARTS   AGE
promptscad-7d9f8b4c6-xk2jm   1/1     Running   0          2m
```

This approach uses the exact same methodology as the original GitHub repository - proven to work on Raspberry Pi Kubernetes clusters.