# Raspberry Pi Kubernetes Troubleshooting Guide

Comprehensive troubleshooting procedures for Raspberry Pi Kubernetes deployments.

## Deployment Issues

### 1. Image Pull Failures

**Symptoms:**
- Pods stuck in `ImagePullBackOff` or `ErrImagePull` state
- Events show "Failed to pull image" errors

**Diagnosis:**
```bash
# Check pod events
kubectl describe pod <pod-name>

# Check image availability
docker pull <your-image>:<tag>

# Verify image exists in registry
curl -I https://registry.hub.docker.com/v2/repositories/<username>/<image>/tags/<tag>
```

**Solutions:**
```bash
# 1. Manually pull image on Pi
docker pull <your-image>:<tag>

# 2. Use specific architecture tag
docker pull <your-image>:<tag>-arm64

# 3. Check and update deployment image
kubectl set image deployment/promptscad promptscad=<your-image>:<tag>

# 4. Force pod recreation
kubectl delete pods -l app=promptscad
```

### 2. Insufficient Resources

**Symptoms:**
- Pods stuck in `Pending` state
- Events show "Insufficient memory" or "Insufficient CPU"

**Diagnosis:**
```bash
# Check node resources
kubectl describe nodes

# Check resource allocation
kubectl top nodes
kubectl describe node <node-name> | grep -A 5 "Allocated resources"

# Check pod resource requests
kubectl get pods -l app=promptscad -o yaml | grep -A 5 "resources:"
```

**Solutions:**
```bash
# 1. Reduce resource requests
kubectl patch deployment promptscad -p '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "promptscad",
          "resources": {
            "requests": {
              "memory": "64Mi",
              "cpu": "50m"
            }
          }
        }]
      }
    }
  }
}'

# 2. Add node affinity for Pi nodes
kubectl patch deployment promptscad -p '
{
  "spec": {
    "template": {
      "spec": {
        "affinity": {
          "nodeAffinity": {
            "requiredDuringSchedulingIgnoredDuringExecution": {
              "nodeSelectorTerms": [{
                "matchExpressions": [{
                  "key": "kubernetes.io/arch",
                  "operator": "In",
                  "values": ["arm", "arm64"]
                }]
              }]
            }
          }
        }
      }
    }
  }
}'
```

### 3. Network Connectivity Issues

**Symptoms:**
- Service not accessible
- Pods can't reach external services
- Inter-pod communication failing

**Diagnosis:**
```bash
# Check service endpoints
kubectl get endpoints promptscad

# Test pod connectivity
kubectl run test-pod --image=busybox --rm -it -- /bin/sh
# Inside pod: ping 8.8.8.8, wget http://promptscad.default.svc.cluster.local

# Check network policies
kubectl get networkpolicies

# Check DNS resolution
kubectl run dns-test --image=busybox --rm -it -- nslookup promptscad.default.svc.cluster.local
```

**Solutions:**
```bash
# 1. Check CNI plugin status
kubectl get pods -n kube-system | grep -E "(flannel|calico|weave)"

# 2. Restart CNI pods if needed
kubectl delete pods -n kube-system -l app=flannel  # or calico/weave

# 3. Check iptables rules
sudo iptables -t nat -L KUBE-SERVICES

# 4. Verify service configuration
kubectl get service promptscad -o yaml
```

## Raspberry Pi Specific Issues

### 1. ARM Architecture Compatibility

**Symptoms:**
- Pods crash with "exec format error"
- Container exits immediately
- Architecture mismatch errors

**Diagnosis:**
```bash
# Check node architecture
kubectl get nodes -o wide
kubectl describe node <node-name> | grep Architecture

# Check image architecture
docker manifest inspect <image>:<tag>

# Check container logs
kubectl logs <pod-name> --previous
```

**Solutions:**
```bash
# 1. Build multi-arch image
docker buildx build --platform linux/arm/v7,linux/arm64/v8,linux/amd64 \
  -t <your-image>:<tag> --push .

# 2. Use architecture-specific images
kubectl set image deployment/promptscad promptscad=<your-image>:<tag>-arm64

# 3. Add node selector for architecture
kubectl patch deployment promptscad -p '
{
  "spec": {
    "template": {
      "spec": {
        "nodeSelector": {
          "kubernetes.io/arch": "arm64"
        }
      }
    }
  }
}'
```

### 2. Memory Pressure

**Symptoms:**
- System becomes unresponsive
- Pods evicted frequently
- OOM (Out of Memory) errors

**Diagnosis:**
```bash
# Check memory usage
free -h
cat /proc/meminfo | grep MemAvailable

# Check for OOM events
dmesg | grep -i "killed process"

# Check pod eviction events
kubectl get events --sort-by='.lastTimestamp' | grep -i evict
```

**Solutions:**
```bash
# 1. Add swap space (temporary solution)
sudo dphys-swapfile swapoff
sudo sed -i 's/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=1024/' /etc/dphys-swapfile
sudo dphys-swapfile setup
sudo dphys-swapfile swapon

# 2. Reduce memory usage
kubectl patch deployment promptscad -p '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "promptscad",
          "resources": {
            "requests": {
              "memory": "32Mi"
            },
            "limits": {
              "memory": "128Mi"
            }
          }
        }]
      }
    }
  }
}'

# 3. Enable vertical pod autoscaling
kubectl patch deployment promptscad -p '
{
  "spec": {
    "template": {
      "metadata": {
        "annotations": {
          "autoscaling.k8s.io/vertical-pod-autoscaler": "enabled"
        }
      }
    }
  }
}'
```

### 3. Storage Issues

**Symptoms:**
- Pods can't write to volumes
- PersistentVolumeClaim stuck in `Pending`
- Disk space errors

**Diagnosis:**
```bash
# Check disk usage
df -h

# Check PVC status
kubectl get pvc

# Check storage class
kubectl get storageclass

# Check PV availability
kubectl get pv
```

**Solutions:**
```bash
# 1. Clean up unused Docker images
docker system prune -a

# 2. Use local-path storage for Pi
kubectl apply -f - <<EOF
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-path
provisioner: rancher.io/local-path
volumeBindingMode: WaitForFirstConsumer
EOF

# 3. Create PVC with local-path
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: promptscad-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: local-path
  resources:
    requests:
      storage: 1Gi
EOF
```

## Kubernetes Service Issues

### 1. Service Discovery Problems

**Symptoms:**
- Pods can't find services by name
- DNS resolution failing
- Service endpoints empty

**Diagnosis:**
```bash
# Check service endpoints
kubectl get endpoints promptscad

# Test DNS resolution
kubectl run test-dns --image=busybox --rm -it -- nslookup promptscad

# Check kube-dns/core-dns pods
kubectl get pods -n kube-system | grep -E "(kube-dns|core-dns)"

# Check service configuration
kubectl get service promptscad -o yaml
```

**Solutions:**
```bash
# 1. Restart DNS pods
kubectl delete pods -n kube-system -l k8s-app=kube-dns  # or k8s-app=core-dns

# 2. Check service selector matches pods
kubectl get pods -l app=promptscad --show-labels
kubectl get service promptscad -o jsonpath='{.spec.selector}'

# 3. Recreate service if needed
kubectl delete service promptscad
kubectl apply -f kubernetes/networking.yaml
```

### 2. Load Balancer Issues

**Symptoms:**
- Service not accessible externally
- LoadBalancer IP not assigned
- Connection timeouts

**Diagnosis:**
```bash
# Check service type and endpoints
kubectl get service promptscad

# Check for external IP
kubectl get service promptscad -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

# Test service connectivity
kubectl run test-curl --image=curlimages/curl --rm -it -- curl -v http://promptscad.default.svc.cluster.local
```

**Solutions:**
```bash
# 1. Use NodePort for Pi clusters
kubectl patch service promptscad -p '{"spec": {"type": "NodePort"}}'

# 2. Get NodePort and access via Pi IP
NODE_PORT=$(kubectl get service promptscad -o jsonpath='{.spec.ports[0].nodePort}')
echo "Access at: http://<pi-ip>:$NODE_PORT"

# 3. Set up port forwarding for local access
kubectl port-forward service/promptscad 8080:80
```

## Performance and Scaling Issues

### 1. High CPU Usage

**Symptoms:**
- System load average high
- Container throttling
- Slow response times

**Diagnosis:**
```bash
# Check CPU usage
top -p $(pgrep -f "kube")

# Check container CPU usage
kubectl top pods

# Check for CPU throttling
kubectl describe pod <pod-name> | grep -A 5 "CPU"
```

**Solutions:**
```bash
# 1. Set CPU limits appropriately
kubectl patch deployment promptscad -p '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "promptscad",
          "resources": {
            "requests": {
              "cpu": "100m"
            },
            "limits": {
              "cpu": "500m"
            }
          }
        }]
      }
    }
  }
}'

# 2. Enable CPU manager for static policy
# Edit /var/lib/kubelet/config.yaml on Pi nodes
# Add: cpuManagerPolicy: static
# Then: sudo systemctl restart kubelet
```

### 2. Pod Startup Delays

**Symptoms:**
- Pods take long time to start
- Image pull delays
- Init container issues

**Diagnosis:**
```bash
# Check pod events
kubectl describe pod <pod-name> | grep -A 10 "Events"

# Check image pull time
kubectl logs <pod-name> -c init-container 2>/dev/null || echo "No init containers"

# Check node conditions
kubectl describe node <node-name> | grep -A 5 "Conditions"
```

**Solutions:**
```bash
# 1. Pre-pull images on Pi nodes
ssh pi@raspberrypi "docker pull <your-image>:<tag>"

# 2. Use image pull policy
kubectl patch deployment promptscad -p '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "promptscad",
          "imagePullPolicy": "IfNotPresent"
        }]
      }
    }
  }
}'

# 3. Optimize init containers
kubectl patch deployment promptscad -p '
{
  "spec": {
    "template": {
      "spec": {
        "initContainers": [{
          "name": "init-check",
          "image": "busybox:latest",
          "command": ["sh", "-c", "echo Initialization complete"]
        }]
      }
    }
  }
}'
```

## Debugging Commands Reference

### Essential Debugging Commands
```bash
# System-level debugging
sudo journalctl -u kubelet -f  # Follow kubelet logs
sudo systemctl status kubelet   # Check kubelet status
dmesg | tail -50               # Check kernel messages

# Cluster debugging
kubectl cluster-info           # Cluster information
kubectl get events --sort-by='.lastTimestamp' | tail -20
kubectl get pods --all-namespaces -o wide

# Resource debugging
kubectl describe node <node-name>
kubectl describe pod <pod-name>
kubectl logs <pod-name> --previous  # Previous container logs

# Network debugging
kubectl get services,endpoints -o wide
kubectl exec -it <pod-name> -- netstat -tulpn
kubectl exec -it <pod-name> -- nslookup kubernetes.default
```

### Automated Health Check Script
```bash
#!/bin/bash
# k8s-health-check.sh

echo "🔍 Raspberry Pi Kubernetes Health Check"
echo "========================================"

# Check node status
echo "📊 Node Status:"
kubectl get nodes

# Check system pods
echo "🔧 System Pods:"
kubectl get pods -n kube-system | grep -E "(kube-proxy|flannel|core-dns)" | head -5

# Check deployment status
echo "🎯 Application Status:"
kubectl get deployment promptscad 2>/dev/null || echo "❌ Deployment not found"
kubectl get service promptscad 2>/dev/null || echo "❌ Service not found"

# Check resource usage
echo "💾 Resource Usage:"
kubectl top nodes 2>/dev/null | head -3 || echo "⚠️  Metrics server not available"

# Check for issues
echo "🚨 Issue Detection:"
PROBLEMS=$(kubectl get events --field-selector type=Warning --sort-by='.lastTimestamp' | tail -5)
if [ -n "$PROBLEMS" ]; then
    echo "Recent warnings:"
    echo "$PROBLEMS"
else
    echo "✅ No recent warnings"
fi

echo "✅ Health check complete!"
```