# PromptSCAD Kubernetes Deployment Guide

## 🚀 Quick Deployment

Since kubectl is not available in the current environment, here are the steps to deploy to your Kubernetes cluster:

### Prerequisites
- Kubernetes cluster (local or cloud)
- kubectl configured to connect to your cluster
- Docker image pushed to registry (already done: `ahmadsayed/promptscad:04191254`)

### Option 1: Automated Script (Recommended)
```bash
# Run the deployment script on your cluster
git clone https://github.com/ahmadsayed/openscad-webui.git
cd openscad-webui
./deploy-to-k8s.sh
```

### Option 2: Manual Deployment

#### Step 1: Create Secrets
```bash
# Create DeepSeek API key secret
echo -n "your-deepseek-api-key" | base64
# Replace the base64 value in k8s-secrets.yaml
kubectl apply -f k8s-secrets.yaml

# Or create directly
kubectl create secret generic deepseek-api-key \
  --from-literal=DEEPSEEK_API_KEY="your-actual-api-key" \
  --namespace=default
```

#### Step 2: Deploy Application
```bash
# Apply the deployment
kubectl apply -f kubernetes/deployment.yaml

# Check status
kubectl get pods -l app=promptscad
kubectl get services promptscad
```

#### Step 3: Verify Deployment
```bash
# Check logs
kubectl logs -l app=promptscad

# Test health endpoint
kubectl port-forward service/promptscad 8080:80
# Visit: http://localhost:8080/health
```

## 📋 Deployment Configuration

### Current Image
- **Repository**: `ahmadsayed/promptscad`
- **Tag**: `04191254`
- **Digest**: `sha256:2a6f92abcf5202eb17798427da667169c8190e5330296fc8bf4afa4f4ade5e90`

### Service Details
- **Type**: ClusterIP (default)
- **Port**: 80 → 3000
- **Target**: promptscad pods
- **Labels**: app=promptscad

### Environment Variables
- `DEEPSEEK_API_KEY`: From secret `deepseek-api-key`
- `QWEN_API_KEY`: From secret `qwen-api-key` (optional)
- `AD_ENV`: Set to `quiet` for ad-free mode

## 🔧 Scaling and Management

### Scale Deployment
```bash
# Scale to 3 replicas
kubectl scale deployment promptscad --replicas=3

# Check scaling status
kubectl get pods -l app=promptscad
```

### Update Image
```bash
# Update to new image tag
kubectl set image deployment/promptscad \
  promptscad=ahmadsayed/promptscad:new-tag

# Check rollout status
kubectl rollout status deployment/promptscad
```

### Rollback
```bash
# Rollback to previous version
kubectl rollout undo deployment/promptscad
```

### Delete Deployment
```bash
# Remove everything
kubectl delete -f kubernetes/deployment.yaml
kubectl delete secret deepseek-api-key
kubectl delete secret qwen-api-key
```

## 🌐 Accessing the Application

### Port Forwarding (Development)
```bash
# Forward local port to service
kubectl port-forward service/promptscad 8080:80

# Access at: http://localhost:8080
```

### LoadBalancer (Cloud)
If using a cloud provider that supports LoadBalancer:
```bash
# Patch service to LoadBalancer type
kubectl patch service promptscad -p '{"spec":{"type":"LoadBalancer"}}'

# Get external IP
kubectl get service promptscad -w
```

### Ingress (Production)
For production, consider setting up an Ingress:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: promptscad-ingress
spec:
  rules:
  - host: promptscad.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: promptscad
            port:
              number: 80
```

## 🔍 Monitoring and Debugging

### Check Pod Status
```bash
kubectl get pods -l app=promptscad
kubectl describe pod <pod-name>
```

### View Logs
```bash
# Recent logs
kubectl logs -l app=promptscad

# Follow logs
kubectl logs -l app=promptscad -f

# Previous container logs
kubectl logs -l app=promptscad --previous
```

### Health Checks
```bash
# Check health endpoint
kubectl run test-pod --image=curlimages/curl --rm -it -- \
  curl http://promptscad/health
```

## ⚠️ Troubleshooting

### Common Issues

1. **Image Pull Errors**
   ```bash
   # Check if image exists
   docker pull ahmadsayed/promptscad:04191254
   ```

2. **Secret Issues**
   ```bash
   # Verify secrets
   kubectl get secrets
   kubectl describe secret deepseek-api-key
   ```

3. **Pod Crashes**
   ```bash
   # Check logs
   kubectl logs -l app=promptscad
   
   # Check events
   kubectl get events --sort-by=.metadata.creationTimestamp
   ```

4. **Service Issues**
   ```bash
   # Test service connectivity
   kubectl run debug-pod --image=busybox --rm -it -- \
     wget -qO- http://promptscad:80/health
   ```

## 📊 Performance Tips

### Resource Requests/Limits
Consider adding resource constraints:
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### Horizontal Pod Autoscaler
```bash
# Enable autoscaling
kubectl autoscale deployment promptscad \
  --cpu-percent=70 \
  --min=1 \
  --max=5
```

## 🎯 Next Steps

1. **Apply the deployment** using one of the methods above
2. **Test the application** using the health endpoint
3. **Configure DNS** if using Ingress or LoadBalancer
4. **Set up monitoring** (Prometheus, Grafana)
5. **Configure SSL/TLS** for production

The Docker image is ready and waiting for deployment! 🚀