# Raspberry Pi Kubernetes Deployment Skill

A comprehensive skill for deploying and managing containerized applications on Raspberry Pi Kubernetes clusters, with full support for ARM architectures, automated deployment pipelines, and cluster monitoring.

## 🚀 Quick Start

```bash
# Deploy to Raspberry Pi (build + deploy)
make deploy

# Monitor deployment
kubectl get pods -l app=promptscad

# Check cluster health
./scripts/pi-health-monitor.sh
```

## 📋 What's Included

### Core Scripts
- **`scripts/deploy-to-pi.sh`** - Complete deployment pipeline with multi-architecture Docker builds
- **`scripts/pi-cluster-manager.sh`** - Comprehensive cluster management and monitoring
- **`scripts/pi-health-monitor.sh`** - System and Kubernetes health monitoring with alerts

### Reference Documentation
- **`references/troubleshooting.md`** - Comprehensive troubleshooting guide for Pi-specific issues
- **`references/deployment-templates.md`** - Production-ready Kubernetes templates and examples

## 🎯 Key Features

### Multi-Architecture Support
- **ARM v7, ARM64, AMD64** - Builds Docker images for all Raspberry Pi architectures
- **Automated Platform Detection** - Optimizes builds for your specific Pi model
- **Cross-Platform Compatibility** - Works on any development machine

### Automated Deployment Pipeline
- **Build + Deploy** - Single command deployment (`make deploy`)
- **Remote SSH Deployment** - Automated deployment to Raspberry Pi via SSH
- **Rollback Support** - Easy rollback to previous versions
- **Health Checks** - Automated verification of deployment success

### Comprehensive Monitoring
- **System Health** - CPU, memory, disk, and temperature monitoring
- **Kubernetes Health** - Pod status, cluster events, resource usage
- **Real-time Alerts** - Configurable thresholds for critical metrics
- **Health Reports** - Detailed reports with recommendations

### Raspberry Pi Optimizations
- **Resource Management** - Optimized resource requests/limits for Pi
- **Storage Considerations** - Local path storage and cleanup procedures
- **Network Configuration** - NodePort services and ingress setup
- **Performance Tuning** - ARM-specific optimizations

## 🔧 Installation and Setup

### Prerequisites
- Raspberry Pi with Kubernetes installed
- SSH key authentication configured
- Docker with buildx support on development machine
- `kubectl` configured on both machines

### Initial Setup
```bash
# 1. Configure remote host (edit if needed)
grep REMOTE_HOST Makefile  # Default: pi@raspberrypi.local

# 2. Set up API keys
cp k8s-secrets.yaml.example k8s-secrets.yaml
# Edit k8s-secrets.yaml with your API keys

# 3. Test connectivity
ssh pi@raspberrypi.local "kubectl cluster-info"
```

## 🚀 Deployment Commands

### Basic Deployment
```bash
# Full deployment (build + deploy + monitor)
make deploy

# Deploy to local cluster
make deploy-local

# Build only (no deployment)
make build-only
```

### Advanced Deployment
```bash
# Using deployment script directly
./scripts/deploy-to-pi.sh

# Build only
./scripts/deploy-to-pi.sh build-only

# Deploy only (skip build)
./scripts/deploy-to-pi.sh deploy-only

# Monitor deployment
./scripts/deploy-to-pi.sh monitor
```

## 📊 Cluster Management

### Status and Monitoring
```bash
# Cluster status overview
./scripts/pi-cluster-manager.sh status

# Resource monitoring
./scripts/pi-cluster-manager.sh monitor

# Application health check
./scripts/pi-cluster-manager.sh health

# Real-time monitoring
./scripts/pi-cluster-manager.sh realtime
```

### Scaling and Updates
```bash
# Scale application
./scripts/pi-cluster-manager.sh scale 3

# Rolling update
./scripts/pi-cluster-manager.sh update new-image:tag

# Rollback deployment
./scripts/pi-cluster-manager.sh rollback

# View logs
./scripts/pi-cluster-manager.sh logs 200
./scripts/pi-cluster-manager.sh logs 100 true  # Follow mode
```

### System Maintenance
```bash
# System maintenance (cleanup, updates)
./scripts/pi-cluster-manager.sh maintenance

# Generate cluster report
./scripts/pi-cluster-manager.sh report

# Clean up resources
./scripts/pi-cluster-manager.sh cleanup force
```

## 🏥 Health Monitoring

### One-time Health Check
```bash
# Full health check
./scripts/pi-health-monitor.sh check

# System health only
./scripts/pi-health-monitor.sh system

# Kubernetes health only
./scripts/pi-health-monitor.sh k8s
```

### Continuous Monitoring
```bash
# Continuous monitoring (default: 30s interval)
./scripts/pi-health-monitor.sh monitor

# Generate health report
./scripts/pi-health-monitor.sh report
```

### Alert Thresholds
Environment variables for custom thresholds:
```bash
export ALERT_THRESHOLD_CPU=80      # CPU alert threshold (%)
export ALERT_THRESHOLD_MEMORY=85   # Memory alert threshold (%)
export ALERT_THRESHOLD_DISK=90     # Disk alert threshold (%)
export CHECK_INTERVAL=30           # Check interval (seconds)
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Deployment Failures
```bash
# Check deployment status
kubectl describe deployment promptscad

# Check pod logs
kubectl logs -l app=promptscad --tail=100

# Check events
kubectl get events --sort-by='.lastTimestamp' | tail -20
```

#### 2. Image Pull Issues
```bash
# Verify image exists
docker pull ahmadsayed/promptscad:latest

# Check architecture compatibility
docker manifest inspect ahmadsayed/promptscad:latest

# Force pod recreation
kubectl delete pods -l app=promptscad
```

#### 3. Resource Constraints
```bash
# Check node resources
kubectl describe nodes

# Check resource usage
kubectl top nodes
kubectl top pods

# Check for OOM events
dmesg | grep -i "killed process"
```

### Detailed Troubleshooting
See [`references/troubleshooting.md`](references/troubleshooting.md) for comprehensive troubleshooting procedures.

## 📋 Configuration

### Makefile Configuration
```makefile
# Remote host configuration
REMOTE_HOST := pi@192.168.68.60
IMAGE_NAME := ahmadsayed/promptscad

# Deployment files
DEPLOYMENT_FILE := kubernetes/deployment.yaml
NETWORKING_FILE := kubernetes/networking.yaml
```

### Kubernetes Secrets
```yaml
# k8s-secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: deepseek-api-key
type: Opaque
data:
  DEEPSEEK_API_KEY: <base64-encoded-key>
```

### Deployment Templates
See [`references/deployment-templates.md`](references/deployment-templates.md) for:
- Production-ready deployments
- Horizontal pod autoscaling
- Network policies
- Persistent volume claims
- Ingress configurations

## 🎯 Use Cases

### Development Workflow
```bash
# 1. Deploy to Pi for testing
make deploy

# 2. Monitor application
./scripts/pi-health-monitor.sh monitor

# 3. Check logs for issues
./scripts/pi-cluster-manager.sh logs 100

# 4. Scale if needed
./scripts/pi-cluster-manager.sh scale 2
```

### Production Deployment
```bash
# 1. Full deployment with monitoring
make deploy

# 2. Verify health
./scripts/pi-health-monitor.sh check

# 3. Set up continuous monitoring
./scripts/pi-health-monitor.sh monitor &

# 4. Generate deployment report
./scripts/pi-cluster-manager.sh report
```

### Troubleshooting Scenario
```bash
# 1. Check cluster status
./scripts/pi-cluster-manager.sh status

# 2. Check application health
./scripts/pi-cluster-manager.sh health

# 3. Monitor system resources
./scripts/pi-cluster-manager.sh monitor

# 4. Check logs for errors
./scripts/pi-cluster-manager.sh logs 200

# 5. Generate troubleshooting report
./scripts/pi-cluster-manager.sh report
```

## 📈 Performance Optimization

### Resource Management
- **CPU Limits**: 100m-500m for typical workloads
- **Memory Limits**: 128Mi-512Mi depending on application
- **Storage**: Use local-path storage class for Pi

### Network Optimization
- **Service Type**: NodePort for direct access
- **Ingress**: Use nginx-ingress for load balancing
- **DNS**: Ensure CoreDNS is running properly

### Monitoring Best Practices
- Set appropriate alert thresholds
- Monitor both system and application metrics
- Use health checks for automatic recovery
- Keep logs for troubleshooting

## 🔧 Advanced Usage

### Custom Deployment Script
```bash
# Deploy with custom configuration
REMOTE_HOST=user@custom-pi ./scripts/deploy-to-pi.sh

# Deploy specific image tag
./scripts/deploy-to-pi.sh deploy-only
kubectl set image deployment/promptscad promptscad=my-image:custom-tag
```

### Automated Health Checks
```bash
# Add to crontab for automated monitoring
*/5 * * * * /path/to/pi-health-monitor.sh check >> /var/log/pi-health.log 2>&1
```

### Integration with CI/CD
```bash
# In your CI/CD pipeline
make build
make deploy-remote
./scripts/pi-health-monitor.sh check
```

## 📚 Additional Resources

- **Troubleshooting**: [`references/troubleshooting.md`](references/troubleshooting.md)
- **Deployment Templates**: [`references/deployment-templates.md`](references/deployment-templates.md)
- **Main Project**: Check the parent project's README.md
- **Kubernetes Documentation**: https://kubernetes.io/docs/

## 🤝 Contributing

When using this skill:
- Always run health checks before major operations
- Monitor resource usage on the Pi
- Use appropriate alert thresholds
- Keep deployment templates updated
- Test scripts before production use

The skill is now ready to help you deploy and manage applications on your Raspberry Pi Kubernetes cluster with confidence! 🚀