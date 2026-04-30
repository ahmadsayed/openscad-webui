# Testing Guide for PromptSCAD Server

Comprehensive testing procedures for development and debugging.

## Quick Test Commands

### Server Health Check
```bash
# Basic server test
curl -s http://localhost:3000/status/health && echo "✅ Server running" || echo "❌ Server down"

# Full server test with API
curl -s -X POST http://localhost:3000/generate-code \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test cube","existingCode":""}' | jq -r '.data.requestId'
```

### Automated Test Suites
```bash
# Run all tests
npm test

# Run specific test categories
npm run test:ui              # UI tests with Puppeteer
npm run test:ui:modules      # Module-specific UI tests
npm run test:ui:modules:quick # Quick module tests
npm run test:ui:modules:focused # Focused module tests
```

## Manual Testing Procedures

### Startup Testing
```bash
#!/bin/bash
# test-startup.sh

echo "🚀 Testing Server Startup Procedures"

# Test 1: Standard startup
echo "Test 1: Standard startup"
timeout 10s npm start &
PID=$!
sleep 3
if kill -0 $PID 2>/dev/null; then
    echo "✅ Standard startup successful"
    kill $PID
else
    echo "❌ Standard startup failed"
fi

# Test 2: Development mode
echo "Test 2: Development mode"
timeout 10s npm run dev &
PID=$!
sleep 3
if kill -0 $PID 2>/dev/null; then
    echo "✅ Development mode successful"
    kill $PID
else
    echo "❌ Development mode failed"
fi

# Test 3: Ad-free mode
echo "Test 3: Ad-free mode"
timeout 10s npm run local &
PID=$!
sleep 3
if kill -0 $PID 2>/dev/null; then
    echo "✅ Ad-free mode successful"
    kill $PID
else
    echo "❌ Ad-free mode failed"
fi

echo "🎉 Startup testing complete"
```

### API Functionality Testing
```bash
#!/bin/bash
# test-api-functionality.sh

echo "🔧 Testing API Functionality"
BASE_URL="http://localhost:3000"

# Start server in background
npm start &
SERVER_PID=$!
sleep 5

# Cleanup function
cleanup() {
    kill $SERVER_PID 2>/dev/null
    exit
}
trap cleanup EXIT

echo "Testing health endpoint..."
HEALTH=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/status/health")
if [ "$HEALTH" = "200" ]; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed: $HEALTH"
fi

echo "Testing code generation..."
RESPONSE=$(curl -s -X POST "$BASE_URL/generate-code" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"create a test cube","existingCode":""}')
REQUEST_ID=$(echo "$RESPONSE" | jq -r '.data.requestId // empty')

if [ -n "$REQUEST_ID" ]; then
    echo "✅ Code generation request: $REQUEST_ID"
    
    # Poll for completion
    for i in {1..10}; do
        STATUS=$(curl -s "$BASE_URL/status/$REQUEST_ID" | jq -r '.data.status // empty')
        if [ "$STATUS" = "completed" ]; then
            echo "✅ Code generation completed"
            break
        elif [ "$STATUS" = "error" ]; then
            echo "❌ Code generation failed"
            break
        fi
        echo "Waiting... ($i/10)"
        sleep 2
    done
else
    echo "❌ Code generation request failed"
fi

echo "🎉 API functionality testing complete"
```

## UI Testing with Puppeteer

### Basic UI Test
```javascript
// test-basic-ui.js
const puppeteer = require('puppeteer');

async function testBasicUI() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
        // Test main interface
        await page.goto('http://localhost:3000/main');
        await page.waitForSelector('#promptInput', { timeout: 5000 });
        console.log('✅ Main interface loaded');
        
        // Test simple interface
        await page.goto('http://localhost:3000/simple');
        await page.waitForSelector('#promptInput', { timeout: 5000 });
        console.log('✅ Simple interface loaded');
        
        // Test gallery
        await page.goto('http://localhost:3000/gallery');
        await page.waitForSelector('body', { timeout: 5000 });
        console.log('✅ Gallery loaded');
        
    } catch (error) {
        console.error('❌ UI test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testBasicUI();
```

### Code Generation UI Test
```javascript
// test-code-generation.js
const puppeteer = require('puppeteer');

async function testCodeGeneration() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
        await page.goto('http://localhost:3000/main');
        await page.waitForSelector('#promptInput');
        
        // Enter prompt
        await page.type('#promptInput', 'create a cube with rounded edges');
        
        // Click generate button
        await page.click('#generateButton');
        
        // Wait for response
        await page.waitForFunction(() => {
            const output = document.querySelector('#codeOutput');
            return output && output.textContent.length > 0;
        }, { timeout: 30000 });
        
        const generatedCode = await page.$eval('#codeOutput', el => el.textContent);
        console.log('✅ Code generation successful');
        console.log('Generated code length:', generatedCode.length);
        
    } catch (error) {
        console.error('❌ Code generation test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testCodeGeneration();
```

## Performance Testing

### Load Testing Script
```bash
#!/bin/bash
# load-test.sh

echo "⚡ Load Testing PromptSCAD Server"
BASE_URL="http://localhost:3000"
CONCURRENT_REQUESTS=5
TOTAL_REQUESTS=20

echo "Testing with $CONCURRENT_REQUESTS concurrent requests, $TOTAL_REQUESTS total"

# Function to make a single request
make_request() {
    local id=$1
    local start_time=$(date +%s.%N)
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/generate-code" \
      -H "Content-Type: application/json" \
      -d "{\"prompt\":\"load test $id\",\"existingCode\":\"\"}")
    
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc)
    
    echo "Request $id: ${duration}s"
}

# Run load test
for i in $(seq 1 $TOTAL_REQUESTS); do
    make_request $i &
    
    # Limit concurrent requests
    if [ $((i % CONCURRENT_REQUESTS)) -eq 0 ]; then
        wait
    fi
done
wait

echo "🎉 Load testing complete"
```

### Memory Usage Monitoring
```bash
#!/bin/bash
# monitor-memory.sh

echo "📊 Monitoring Server Memory Usage"

# Start server and monitor
npm start &
SERVER_PID=$!

echo "Monitoring PID: $SERVER_PID"
echo "Time,Memory(MB),CPU(%)" > memory_usage.csv

# Monitor for 60 seconds
for i in {1..60}; do
    if ! kill -0 $SERVER_PID 2>/dev/null; then
        echo "Server stopped"
        break
    fi
    
    # Get memory and CPU usage
    MEMORY=$(ps -o rss= -p $SERVER_PID | awk '{print int($1/1024)}')
    CPU=$(ps -o %cpu= -p $SERVER_PID)
    
    echo "$(date +%H:%M:%S),$MEMORY,$CPU" >> memory_usage.csv
    echo "Time: $(date +%H:%M:%S), Memory: ${MEMORY}MB, CPU: ${CPU}%"
    
    sleep 1
done

echo "Memory usage data saved to memory_usage.csv"
```

## Error Testing and Debugging

### Error Simulation
```bash
#!/bin/bash
# test-error-handling.sh

echo "🐛 Testing Error Handling"
BASE_URL="http://localhost:3000"

echo "Testing invalid JSON..."
curl -X POST "$BASE_URL/generate-code" \
  -H "Content-Type: application/json" \
  -d 'invalid json' \
  -w "HTTP Code: %{http_code}\n"

echo "Testing missing required fields..."
curl -X POST "$BASE_URL/generate-code" \
  -H "Content-Type: application/json" \
  -d '{}' \
  -w "HTTP Code: %{http_code}\n"

echo "Testing invalid request ID..."
curl -s "$BASE_URL/status/invalid-request-id" | jq '.'

echo "Testing server stress..."
# Send many rapid requests
for i in {1..50}; do
    curl -s -X POST "$BASE_URL/generate-code" \
      -H "Content-Type: application/json" \
      -d "{\"prompt\":\"stress test $i\",\"existingCode\":\"\"}" > /dev/null &
done
wait

echo "🎉 Error handling testing complete"
```

## Integration Testing

### End-to-End Test
```bash
#!/bin/bash
# test-end-to-end.sh

echo "🔄 End-to-End Testing"
BASE_URL="http://localhost:3000"

# Start server
npm start &
SERVER_PID=$!
trap "kill $SERVER_PID 2>/dev/null" EXIT

sleep 5

echo "Step 1: Generate code"
REQUEST_RESPONSE=$(curl -s -X POST "$BASE_URL/generate-code" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"create a simple cube","existingCode":""}')

REQUEST_ID=$(echo "$REQUEST_RESPONSE" | jq -r '.data.requestId')
echo "Request ID: $REQUEST_ID"

echo "Step 2: Poll for completion"
for i in {1..15}; do
    STATUS_RESPONSE=$(curl -s "$BASE_URL/status/$REQUEST_ID")
    STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.data.status')
    
    case "$STATUS" in
        "completed")
            echo "✅ Code generation completed"
            GENERATED_CODE=$(echo "$STATUS_RESPONSE" | jq -r '.data.generatedCode')
            echo "Generated code length: ${#GENERATED_CODE} characters"
            break
            ;;
        "error")
            echo "❌ Code generation failed"
            ERROR=$(echo "$STATUS_RESPONSE" | jq -r '.data.error')
            echo "Error: $ERROR"
            break
            ;;
        "processing")
            echo "Still processing... ($i/15)"
            ;;
        *)
            echo "Unknown status: $STATUS"
            ;;
    esac
    
    if [ $i -eq 15 ]; then
        echo "⚠️  Timeout waiting for completion"
    fi
    
    sleep 2
done

echo "Step 3: Test UI interfaces"
curl -s "$BASE_URL/main" | grep -q "PromptSCAD" && echo "✅ Main interface accessible" || echo "❌ Main interface failed"
curl -s "$BASE_URL/simple" | grep -q "PromptSCAD" && echo "✅ Simple interface accessible" || echo "❌ Simple interface failed"

echo "🎉 End-to-end testing complete"
```

## Test Automation

### Continuous Testing Script
```bash
#!/bin/bash
# continuous-test.sh

echo "🔄 Continuous Testing Mode"
INTERVAL=30  # seconds

while true; do
    echo "$(date): Running health check..."
    
    # Basic health check
    if curl -s -f http://localhost:3000/status/health > /dev/null; then
        echo "✅ Server healthy"
    else
        echo "❌ Server unhealthy - restarting..."
        npm restart
    fi
    
    # Test API functionality
    REQUEST_ID=$(curl -s -X POST http://localhost:3000/generate-code \
      -H "Content-Type: application/json" \
      -d '{"prompt":"health check cube","existingCode":""}' | \
      jq -r '.data.requestId // empty')
    
    if [ -n "$REQUEST_ID" ]; then
        echo "✅ API responsive: $REQUEST_ID"
    else
        echo "❌ API unresponsive"
    fi
    
    echo "Next check in $INTERVAL seconds..."
    sleep $INTERVAL
done
```

## Test Results Analysis

### Log Analysis
```bash
#!/bin/bash
# analyze-test-results.sh

echo "📊 Analyzing Test Results"

# Count test files
TEST_FILES=$(find tests/ -name "*.test.js" | wc -l)
echo "Test files found: $TEST_FILES"

# Check for recent test runs
if [ -d "coverage/" ]; then
    echo "Coverage reports available"
    ls -la coverage/
fi

# Analyze request logs
if [ -d "requests/" ]; then
    echo "Recent requests:"
    ls -lat requests/ | head -10
    
    # Count by status
    echo "Request status summary:"
    for file in requests/*.json; do
        [ -f "$file" ] && grep -o '"status":"[^"]*"' "$file" | cut -d'"' -f4
    done | sort | uniq -c
fi

# Check for error patterns
echo "Error patterns in logs:"
grep -r "error\|Error\|ERROR" . --include="*.log" --include="*.json" 2>/dev/null | tail -10

echo "📈 Analysis complete"
```