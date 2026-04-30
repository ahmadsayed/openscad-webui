# API Testing Guide

This guide provides comprehensive API testing procedures for the PromptSCAD server.

## Core API Endpoints

### Code Generation
**Endpoint:** `POST /generate-code`
**Description:** Generate OpenSCAD code from natural language prompt

```bash
# Basic code generation
curl -X POST http://localhost:3000/generate-code \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "create a cube with rounded edges",
    "existingCode": ""
  }'

# With existing code context
curl -X POST http://localhost:3000/generate-code \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "add a cylinder on top",
    "existingCode": "cube([10, 10, 10]);"
  }'
```

**Expected Response:**
```json
{
  "code": 200,
  "message": "Code generation started",
  "data": {
    "requestId": "uuid-here",
    "status": "processing"
  }
}
```

### Status Checking
**Endpoint:** `GET /status/:requestId`
**Description:** Check the status of a code generation request

```bash
# Check request status
curl http://localhost:3000/status/your-request-id

# With pretty printing
curl -s http://localhost:3000/status/your-request-id | jq '.'
```

**Expected Response States:**
```json
// Processing
{
  "code": 202,
  "message": "Request is being processed",
  "data": {"status": "processing"}
}

// Completed
{
  "code": 200,
  "message": "Code generated successfully",
  "data": {
    "status": "completed",
    "generatedCode": "// OpenSCAD code here",
    "modulesUsed": ["module1", "module2"]
  }
}

// Error
{
  "code": 500,
  "message": "Error generating code",
  "data": {"error": "Error details"}
}
```

### Visual Processing
**Endpoint:** `POST /process-visual`
**Description:** Process visual input with Qwen multimodal model

```bash
# Process image (requires multipart form data)
curl -X POST http://localhost:3000/process-visual \
  -F "image=@/path/to/image.png" \
  -F "prompt=What OpenSCAD code would create this object?"
```

### Health Check
**Endpoint:** `GET /status/health`
**Description:** Basic server health check

```bash
# Simple health check
curl http://localhost:3000/status/health

# With response time
curl -w "@curl-format.txt" http://localhost:3000/status/health
```

## Testing Scripts

### Batch API Testing
Create a test script for multiple endpoints:

```bash
#!/bin/bash
# api-test-suite.sh

echo "🧪 Testing PromptSCAD API Endpoints"

BASE_URL="http://localhost:3000"

# Test health endpoint
echo "Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/status/health")
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed: $HEALTH_RESPONSE"
fi

# Test code generation
echo "Testing code generation..."
GENERATE_RESPONSE=$(curl -s -X POST "$BASE_URL/generate-code" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"create a sphere","existingCode":""}')
REQUEST_ID=$(echo "$GENERATE_RESPONSE" | jq -r '.data.requestId')

if [ "$REQUEST_ID" != "null" ]; then
    echo "✅ Code generation initiated: $REQUEST_ID"
    
    # Wait and check status
    sleep 2
    STATUS_RESPONSE=$(curl -s "$BASE_URL/status/$REQUEST_ID")
    STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.data.status')
    echo "Status after 2s: $STATUS"
else
    echo "❌ Code generation failed"
fi

echo "🎉 API testing complete"
```

### Load Testing
```bash
# Simple load test with curl
for i in {1..10}; do
    curl -s -X POST http://localhost:3000/generate-code \
      -H "Content-Type: application/json" \
      -d "{\"prompt\":\"test load $i\",\"existingCode\":\"\"}" \
      -w "Request $i: %{http_code} in %{time_total}s\\n" -o /dev/null
done
```

## Debugging API Issues

### Connection Problems
```bash
# Test basic connectivity
ping -c 4 localhost

# Test port accessibility
nc -zv localhost 3000

# Check if service is listening
ss -tlnp | grep :3000
```

### Response Debugging
```bash
# Verbose curl output
curl -v http://localhost:3000/status/health

# Full response with headers
curl -i http://localhost:3000/generate-code \
  -H "Content-Type: application/json" \
  -d '{"prompt":"debug test"}'

# Save response to file for analysis
curl -s -w "\nHTTP Code: %{http_code}\nTime: %{time_total}s\n" \
  -o response.json http://localhost:3000/generate-code \
  -H "Content-Type: application/json" \
  -d '{"prompt":"save test"}'
```

### Error Analysis
```bash
# Check server logs during API call
tail -f server-*.log &
curl -X POST http://localhost:3000/generate-code \
  -H "Content-Type: application/json" \
  -d '{"prompt":"error test"}'
pkill tail
```

## API Response Validation

### JSON Schema Validation
```bash
# Install jq for JSON processing if needed
# Test response structure
curl -s http://localhost:3000/status/test-id | jq '{
  has_code: has("code"),
  has_message: has("message"), 
  has_data: has("data"),
  code_value: .code,
  status_valid: (.code == 200 or .code == 202 or .code == 500)
}'
```

### Performance Testing
```bash
# Measure response times
for endpoint in "/status/health" "/generate-code"; do
    echo "Testing $endpoint..."
    for i in {1..5}; do
        time curl -s -o /dev/null -w "%{time_total}" \
          http://localhost:3000$endpoint
        echo "s"
    done
done
```

## Common API Errors and Solutions

### 400 Bad Request
- Check JSON syntax in request body
- Verify Content-Type header is set to "application/json"
- Ensure required fields are present

### 404 Not Found
- Verify endpoint URL is correct
- Check if server is running on expected port
- Confirm route is properly registered

### 500 Internal Server Error
- Check server logs for detailed error messages
- Verify AI API keys are configured correctly
- Ensure all dependencies are installed

### Timeout Errors
- Check server processing logs
- Verify AI service connectivity
- Monitor request queue status