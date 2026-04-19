#!/bin/bash

# OpenSCAD Modules Test Script
# Usage: ./scripts/test-modules.sh [options]
# Options:
#   --quick      Run quick test (skip low priority modules)
#   --focused    Run focused test (only high priority modules)
#   --all        Run both focused and comprehensive tests
#   --category   Run tests for specific category (uses CATEGORY env var)

echo "🚀 Starting OpenSCAD Module Tests..."
echo "📊 API Key status: ${OPENAI_API_KEY:+✅ Set}${OPENAI_API_KEY:-❌ Not set}"

# Check if OPENAI_API_KEY is provided
if [ -z "$1" ] && [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Please provide OPENAI_API_KEY environment variable or use:"
    echo "   OPENAI_API_KEY=sk-xxx npm run test:ui:modules:focused"
    exit 1
fi

# Set the API key if provided as first argument
if [ -n "$1" ] && [[ ! "$1" =~ ^-- ]]; then
    export OPENAI_API_KEY="$1"
    shift
fi

# Default to focused test
TEST_TYPE="${1:---focused}"

case "$TEST_TYPE" in
    --quick)
        echo "🏃 Running quick module tests (excludes low priority)..."
        npm run test:ui:modules:quick
        ;;

    --focused)
        echo "🎯 Running focused module tests (high priority only)..."
        npm run test:ui:modules:focused
        ;;

    --all)
        echo "🌟 Running all module tests (focused + comprehensive)..."
        npm run test:ui:modules:all
        ;;

    --category)
        echo "🏷️  Testing specific category: ${CATEGORY:-mechanical}"
        CATEGORY=${CATEGORY:-mechanical} npm run test:ui:modules:category
        ;;

    *)
        echo "❌ Unknown option: $TEST_TYPE"
        echo "Valid options: --quick, --focused, --all, --category"
        exit 1
        ;;
esac

echo ""
echo "📁 Test artifacts available in /tmp/:"
ls -la /tmp/module-test-* 2>/dev/null || echo "No artifacts found"

echo ""
echo "✅ Module tests completed!"}'}    <functions.Bash:20>{"command" chmod  +x-scripts/test-modules.sh" description":"Make test script executable"}        <functions.Write:21>       {"file_path":"/home/ahmedh/projects/openscad-webui/ui-test/TESTING_GUIDE.md","content":"# OpenSCAD Module Testing Guide

This guide explains how to test all OpenSCAD modules with the web UI.

## Prerequisites

1. The test server must be running (started automatically by test scripts)
2. OpenAI API key must be set (see environment setup below)
3. Node.js dependencies installed: `npm install`

## Environment Setup

Export your OpenAI API key:
```bash
export OPENAI_API_KEY=your-api-key-here
```

Or use it inline when running tests:
```bash
OPENAI_API_KEY=your-api-key-here npm run test:ui:modules
```

## Test Scripts

### Quick Start
Use the convenience script:
```bash
# Test high-priority modules (recommended)
./scripts/test-modules.sh

# Test specific category
CATEGORY=mechanical ./scripts/test-modules.sh --category

# Quick test (skip low priority modules)
./scripts/test-modules.sh --quick

# All tests
./scripts/test-modules.sh --all
```

### NPM Scripts

```bash
# Run focused test for high-priority modules
npm run test:ui:modules:focused

# Run comprehensive test for all modules
npm run test:ui:modules

# Quick test (skip low-priority modules)
npm run test:ui:modules:quick

# Test specific category
CATEGORY=mechanical npm run test:ui:modules:category

# Run all module tests
npm run test:ui:modules:all
```

## Module Categories

Available categories for CATEGORY environment variable:
- `basic`: Rounded geometry modules
- `advanced_geometry`: Torus, tube, prism, slot
- `mechanical`: Gear, bolt, nut, washer, bearing
- `patterns`: Honeycomb, knurling, lattice
- `mechanisms`: Flexible hinge, living hinge, dovetail joints
- `2d_operations`: Rounded rectangle, fillet, chamfer
- `complex_shapes`: Helix, spring, spiral, 3D text
- `gridfinity`: Gridfinity system components

## Test Features

### Visible UI Testing
- Tests run in a visible browser (not headless)
- Developer console is captured and displayed
- Screenshots automatically taken for successful tests
- DevTools can be opened during tests for manual debugging

### Console Monitoring
All console messages are captured and displayed:
- Errors (red)
- Warnings (yellow)
- Info messages (blue)
- Page errors and JavaScript exceptions

### Test Reports
After each test run, results are saved to:
- `/tmp/module-test-results.json` - Test status summary
- `/tmp/module-test-report.json` - Detailed test report (comprehensive tests)
- `/tmp/module-test-{moduleName}-{timestamp}.png` - Screenshots

### Test Output
The test suite provides detailed output:
```
🧪 Testing torus (High priority)
   Signature: torus(major_radius, minor_radius, facets=32)
   🚀 Generation completed in 8.2s
   📄 Code length: 245 chars
   🔍 Module pattern found: true
   📸 Screenshot saved: /tmp/module-test-torus-1234567890.png
```

## Debugging Failed Tests

1. **Check console errors**: Look for red error messages in test output
2. **Review screenshots**: Check saved PNG files for visual issues
3. **Open DevTools**: Set up breakpoints in the browser during tests
4. **Check test files**: Review `/tmp/module-test-results.json`

## Performance Notes

- High-priority modules typically generate in 5-10 seconds
- Low-priority complex modules may take 20-30 seconds
- Total test time is approximately 5-15 minutes for all modules
- Batch processing is used to optimize performance

## Example Session

```bash
# Set up environment
export OPENAI_API_KEY=your-api-key-here

# Run focused test (high-priority modules only)
npm run test:ui:modules:focused

# Test mechanical components specifically
CATEGORY=mechanical npm run test:ui:modules:category

# Run comprehensive test (all priority levels)
npm run test:ui:modules

# Check results
cat /tmp/module-test-results.json
open /tmp/module-test-*.png
```

## Success Criteria

✅ **Pass**:
- Code generation successful (non-empty result)
- No console errors or page errors
- Module name/pattern detected in generated code
- Screenshot captured successfully

⚠️ **Warning**:
- Module not explicitly in code (may be internally used)
- Console warnings (info, deprecated, etc.)

❌ **Fail**:
- Empty code generation
- Console errors or page errors
- Test timeout or browser issues

At least 80% success rate is expected for high-priority modules."}  <functions.TaskUpdate:22>{