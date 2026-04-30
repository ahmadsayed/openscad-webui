---
name: promptscad-server-dev
description: Server development and debugging for PromptSCAD project. Use when Kimi needs to start, monitor, debug, or manage the PromptSCAD server, handle server crashes, check logs, or work with different server modes (development, production, ad-free).
---

# PromptSCAD Server Development and Debugging

This skill provides comprehensive support for PromptSCAD server development, debugging, and monitoring workflows.

## Quick Start Commands

### Server Startup
```bash
# Standard startup
npm start

# Development mode (no ads, debug enabled)
npm run dev

# Ad-free mode
npm run local

# With environment configuration
npm run start:env
```

### Server Monitoring
```bash
# Check if server is running
curl -s http://localhost:3000/status/health || echo "Server not responding"

# Monitor server logs in real-time
tail -f server-*.log 2>/dev/null || echo "No log files found"

# Check server status via API
curl -s http://localhost:3000/status/test-request-id | jq '.' || echo "Status check failed"
```

## Server Modes and Configuration

### Environment Variables
- `NODE_ENV=development` - Enables development mode features
- `AD_ENV=quiet` - Disables advertisements
- `PORT=3000` - Server port (default: 3000)
- `DEEPSEEK_API_KEY` - AI model API key
- `QWEN_API_KEY` - Multimodal AI API key

### Server Entry Points
- `server/server.js` - Simplified server (recommended)
- `server/server-simple.js` - Legacy server entry
- `server/app.js` - Express app configuration

## Debugging Common Issues

### Server Won't Start
1. Check API keys: `grep -E "(DEEPSEEK_API_KEY|QWEN_API_KEY|OPENAI_API_KEY)" .env`
2. Verify port availability: `lsof -i :3000`
3. Check Node.js version: `node --version` (requires 18+)
4. Review dependencies: `npm install`

### AI Integration Failures
1. Validate API keys are set correctly
2. Check API endpoint connectivity: `curl -I https://api.openai.com`
3. Review request logs in `requests/` directory
4. Test API endpoints manually (see [references/api-testing.md](references/api-testing.md))

### Performance Issues
1. Monitor memory usage: `ps aux | grep node`
2. Check for memory leaks in logs
3. Review request processing times in logs
4. Enable debug logging if available

## Development Workflow

### Setting Up Development Environment
```bash
# Install dependencies
npm install

# Set up environment file
cp .env.example .env 2>/dev/null || echo "No .env.example found"

# Configure API keys
echo "DEEPSEEK_API_KEY=your-key-here" >> .env
```

### Testing Server Endpoints
```bash
# Test code generation
curl -X POST http://localhost:3000/generate-code \
  -H "Content-Type: application/json" \
  -d '{"prompt":"create a cube","existingCode":""}'

# Test status endpoint
curl http://localhost:3000/status/test-request-id

# Test health check
curl http://localhost:3000/status/health
```

### Log Analysis
Check these locations for server logs:
- `server-*.log` - Main server logs
- `requests/*.json` - Request status files
- Console output - Real-time server output

## Advanced Debugging

### Process Monitoring
```bash
# Find server process
ps aux | grep -E "(node|server)" | grep -v grep

# Monitor resource usage
top -p $(pgrep -f "node.*server")

# Check open connections
netstat -tlnp | grep :3000
```

### Request Debugging
```bash
# List recent requests
ls -la requests/ | head -10

# Check specific request status
cat requests/[request-id].json | jq '.' 2>/dev/null || cat requests/[request-id].json

# Monitor request directory
watch -n 2 "ls -la requests/ | tail -10"
```

### API Debugging
```bash
# Test with verbose output
curl -v http://localhost:3000/generate-code \
  -H "Content-Type: application/json" \
  -d '{"prompt":"debug test","existingCode":""}'

# Check response headers
curl -I http://localhost:3000/status/health
```

## Common Error Patterns

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Module Not Found
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Permission Issues
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

### Memory Issues
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 server/server.js
```

## Server Architecture

The PromptSCAD server uses a modular Express.js architecture:

```
server/
├── server.js          # Main server entry point
├── app.js            # Express app configuration  
├── routes/           # API and page routes
├── controllers/      # Request processing logic
├── services/         # Business logic services
│   ├── ai/          # AI model integrations
│   └── openscad/    # OpenSCAD-specific services
└── config/          # Configuration files
```

For detailed API documentation, see [references/api-docs.md](references/api-docs.md).
For testing procedures, see [references/testing-guide.md](references/testing-guide.md).