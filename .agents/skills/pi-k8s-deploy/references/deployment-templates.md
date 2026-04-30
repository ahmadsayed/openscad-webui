# Raspberry Pi Kubernetes Deployment Templates

Ready-to-use templates and examples for Raspberry Pi Kubernetes deployments.

## Basic Deployment Template

### Minimal Deployment for Raspberry Pi
```yaml
# pi-deployment-minimal.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: promptscad
  labels:
    app: promptscad
spec:
  replicas: 1
  selector:
    matchLabels:
      app: promptscad
  template:
    metadata:
      labels:
        app: promptscad
    spec:
      nodeSelector:
        kubernetes.io/arch: arm64  # or arm for 32-bit Pi
      containers:
      - name: promptscad
        image: ahmadsayed/promptscad:latest
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        env:
        - name: NODE_ENV
          value: "production"
        - name: AD_ENV
          value: "quiet"
---
apiVersion: v1
kind: Service
metadata:
  name: promptscad
spec:
  selector:
    app: promptscad
  ports:
  - port: 80
    targetPort: 3000
  type: NodePort
```

### Production-Ready Deployment
```yaml
# pi-deployment-production.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: promptscad
  labels:
    app: promptscad
    tier: frontend
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: promptscad
      tier: frontend
  template:
    metadata:
      labels:
        app: promptscad
        tier: frontend
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - promptscad
              topologyKey: kubernetes.io/hostname
      nodeSelector:
        kubernetes.io/arch: arm64
      containers:
      - name: promptscad
        image: ahmadsayed/promptscad:latest
        ports:
        - containerPort: 3000
          name: http
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        env:
        - name: NODE_ENV
          value: "production"
        - name: AD_ENV
          value: "quiet"
        - name: DEEPSEEK_API_KEY
          valueFrom:
            secretKeyRef:
              name: deepseek-api-key
              key: DEEPSEEK_API_KEY
              optional: true
        - name: QWEN_API_KEY
          valueFrom:
            secretKeyRef:
              name: qwen-api-key
              key: QWEN_API_KEY
              optional: true
        livenessProbe:
          httpGet:
            path: /status/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /status/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          successThreshold: 1
          failureThreshold: 3
        startupProbe:
          httpGet:
            path: /status/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          successThreshold: 1
          failureThreshold: 30
---
apiVersion: v1
kind: Service
metadata:
  name: promptscad
  labels:
    app: promptscad
spec:
  selector:
    app: promptscad
  ports:
  - name: http
    port: 80
    targetPort: 3000
    protocol: TCP
  type: NodePort
```

## ConfigMap Templates

### Application Configuration
```yaml
# pi-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: promptscad-config
data:
  NODE_ENV: "production"
  AD_ENV: "quiet"
  PORT: "3000"
  LOG_LEVEL: "info"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: promptscad
spec:
  template:
    spec:
      containers:
      - name: promptscad
        envFrom:
        - configMapRef:
            name: promptscad-config
```

### Nginx Configuration for Ingress
```yaml
# pi-nginx-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
data:
  nginx.conf: |
    server {
        listen 80;
        server_name promptscad.local;
        
        location / {
            proxy_pass http://promptscad:80;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
```

## Secret Templates

### API Keys Secret
```yaml
# pi-secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: deepseek-api-key
type: Opaque
data:
  DEEPSEEK_API_KEY: <base64-encoded-api-key>
---
apiVersion: v1
kind: Secret
metadata:
  name: qwen-api-key
type: Opaque
data:
  QWEN_API_KEY: <base64-encoded-api-key>
```

### TLS Secret for HTTPS
```yaml
# pi-tls-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: promptscad-tls
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-certificate>
  tls.key: <base64-encoded-private-key>
```

## Ingress Templates

### Basic Ingress
```yaml
# pi-ingress-basic.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: promptscad-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
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
```

### TLS Ingress
```yaml
# pi-ingress-tls.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: promptscad-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - promptscad.local
    secretName: promptscad-tls
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
```

## Horizontal Pod Autoscaler (HPA)

### CPU-based Autoscaling
```yaml
# pi-hpa-cpu.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: promptscad-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: promptscad
  minReplicas: 1
  maxReplicas: 5
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
```

### Memory-based Autoscaling
```yaml
# pi-hpa-memory.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: promptscad-hpa-memory
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: promptscad
  minReplicas: 1
  maxReplicas: 3
  metrics:
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Network Policies

### Basic Network Isolation
```yaml
# pi-network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: promptscad-network-policy
spec:
  podSelector:
    matchLabels:
      app: promptscad
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: default
    - podSelector:
        matchLabels:
          app: nginx-ingress
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to: []
    ports:
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
```

## Persistent Volume Claims

### Local Path Storage
```yaml
# pi-pvc-local.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: promptscad-data
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: local-path
  resources:
    requests:
      storage: 2Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: promptscad
spec:
  template:
    spec:
      containers:
      - name: promptscad
        volumeMounts:
        - name: data
          mountPath: /app/data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: promptscad-data
```

## Pod Disruption Budget

### Ensure Availability During Updates
```yaml
# pi-pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: promptscad-pdb
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: promptscad
```

## Monitoring and Logging

### Prometheus ServiceMonitor
```yaml
# pi-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: promptscad-monitor
  labels:
    app: promptscad
spec:
  selector:
    matchLabels:
      app: promptscad
  endpoints:
  - port: http
    interval: 30s
    path: /metrics
```

### Fluent Bit Configuration
```yaml
# pi-fluent-bit-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush         1
        Log_Level     info
        Daemon        off
    [INPUT]
        Name              tail
        Path              /var/log/containers/*promptscad*.log
        Parser            docker
        Tag               kube.promptscad
        Refresh_Interval  5
    [OUTPUT]
        Name  stdout
        Match *
```

## Deployment Script Templates

### Automated Deployment Script
```bash
#!/bin/bash
# deploy-to-pi.sh

set -e

# Configuration
IMAGE_NAME="ahmadsayed/promptscad"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
TAG="pi-${TIMESTAMP}"
REMOTE_HOST="${REMOTE_HOST:-pi@raspberrypi.local}"

echo "🚀 Deploying to Raspberry Pi Kubernetes"
echo "======================================="
echo "Image: $IMAGE_NAME:$TAG"
echo "Remote: $REMOTE_HOST"
echo

# Build multi-arch image
echo "📦 Building multi-architecture image..."
docker buildx build --platform linux/arm/v7,linux/arm64/v8,linux/amd64 \
  -t "$IMAGE_NAME:$TAG" --push .

# Update deployment file
echo "📝 Updating deployment configuration..."
sed "s|image: $IMAGE_NAME:.*|image: $IMAGE_NAME:$TAG|g" kubernetes/deployment.yaml > /tmp/pi-deployment.yaml

# Copy to Pi and deploy
echo "📡 Copying to Raspberry Pi..."
scp /tmp/pi-deployment.yaml "$REMOTE_HOST":/tmp/deployment.yaml
scp kubernetes/networking.yaml "$REMOTE_HOST":/tmp/networking.yaml

# Deploy on Pi
echo "🎯 Deploying on Raspberry Pi..."
ssh "$REMOTE_HOST" "
  kubectl apply -f /tmp/networking.yaml &&
  kubectl apply -f /tmp/deployment.yaml &&
  kubectl rollout status deployment/promptscad --timeout=300s
"

echo "✅ Deployment completed!"
echo "🌐 Service should be accessible on your Pi cluster"
```

### Health Check Script
```bash
#!/bin/bash
# pi-health-check.sh

set -e

REMOTE_HOST="${REMOTE_HOST:-pi@raspberrypi.local}"

echo "🔍 Raspberry Pi Kubernetes Health Check"
echo "======================================"

# Check cluster health
ssh "$REMOTE_HOST" "
  echo '📊 Cluster Status:'
  kubectl get nodes
  echo
  echo '🎯 Application Status:'
  kubectl get deployment promptscad
  kubectl get service promptscad
  echo
  echo '📦 Pod Status:'
  kubectl get pods -l app=promptscad
  echo
  echo '💾 Resource Usage:'
  kubectl top nodes 2>/dev/null || echo 'Metrics server not available'
  echo
  echo '🚨 Recent Events:'
  kubectl get events --field-selector type=Warning --sort-by='.lastTimestamp' | tail -5
"

echo "✅ Health check completed!"
```

## Makefile Integration

### Enhanced Makefile Targets
```makefile
# Pi-specific targets
.PHONY: deploy-pi health-check-pi logs-pi shell-pi

deploy-pi:
	@echo "🚀 Deploying to Raspberry Pi..."
	@./scripts/deploy-to-pi.sh

health-check-pi:
	@echo "🔍 Checking Raspberry Pi cluster health..."
	@./scripts/pi-health-check.sh

logs-pi:
	@echo "📋 Showing logs from Raspberry Pi..."
	@ssh $(REMOTE_HOST) "kubectl logs -l app=promptscad --tail=100 -f"

shell-pi:
	@echo "🐚 Opening shell on Raspberry Pi..."
	@ssh $(REMOTE_HOST)

update-pi-image:
	@echo "🔄 Updating image on Raspberry Pi..."
	@ssh $(REMOTE_HOST) "kubectl set image deployment/promptscad promptscad=$(FULL_IMAGE)"

restart-pi:
	@echo "🔄 Restarting deployment on Raspberry Pi..."
	@ssh $(REMOTE_HOST) "kubectl rollout restart deployment/promptscad"
```

## Configuration Examples

### Multi-Pi Deployment
```yaml
# pi-deployment-multi.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: promptscad-multi
spec:
  replicas: 3
  template:
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - promptscad
            topologyKey: kubernetes.io/hostname
      containers:
      - name: promptscad
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "256Mi"
            cpu: "200m"
```

### Environment-Specific Configurations
```bash
# Development environment
kubectl create configmap promptscad-config-dev \
  --from-literal=NODE_ENV=development \
  --from-literal=AD_ENV=quiet \
  --from-literal=LOG_LEVEL=debug

# Production environment  
kubectl create configmap promptscad-config-prod \
  --from-literal=NODE_ENV=production \
  --from-literal=AD_ENV=quiet \
  --from-literal=LOG_LEVEL=info
```

These templates provide a comprehensive starting point for deploying applications to Raspberry Pi Kubernetes clusters with proper resource management, monitoring, and scaling capabilities.