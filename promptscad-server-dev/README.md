# PromptSCAD Server Development Skill

This skill provides comprehensive support for PromptSCAD server development, debugging, and monitoring workflows.

## 🚀 Quick Start

```bash
# Check server health
./scripts/server-health-check.sh --quick

# Start server in development mode
./scripts/server-manager.sh start dev

# Monitor server in real-time
./scripts/server-manager.sh monitor

# Run comprehensive debug analysis
./scripts/debug-server.sh
```

## 📋 Available Scripts

### Server Health Check (`scripts/server-health-check.sh`)
Comprehensive health monitoring with system checks, API testing, and reporting.

**Usage:**
```bash
./scripts/server-health-check.sh          # Full health check
./scripts/server-health-check.sh --quick  # Quick status check
./scripts/server-health-check.sh --report # Generate health report
```

### Server Manager (`scripts/server-manager.sh`)
Complete server lifecycle management with multiple startup modes.

**Usage:**
```bash
./scripts/server-manager.sh start [mode] [port]     # Start server
./scripts/server-manager.sh stop                    # Stop server
./scripts/server-manager.sh restart [mode] [port]   # Restart server
./scripts/server-manager.sh status                  # Show status
./scripts/server-manager.sh monitor                 # Real-time monitoring
./scripts/server-manager.sh logs [lines]            # View logs
./scripts/server-manager.sh cleanup [days]          # Clean old logs
```

**Server Modes:**
- `standard` - Production mode (default)
- `dev` - Development mode (no ads, debug enabled)
- `local` - Ad-free mode
- `debug` - Debug mode with verbose logging

### Debug Server (`scripts/debug-server.sh`)
Advanced debugging and troubleshooting with comprehensive analysis.

**Usage:**
```bash
./scripts/debug-server.sh          # Full debug analysis
./scripts/debug-server.sh quick    # Quick debug check
./scripts/debug-server.sh system   # System analysis
./scripts/debug-server.sh api      # API connectivity tests
./scripts/debug-server.sh logs     # Log analysis
```

## 🛠️ Development Workflows

### Starting Development Server
```bash
# Method 1: Using server manager
./scripts/server-manager.sh start dev

# Method 2: Using npm scripts
npm run dev

# Method 3: Using environment variables
NODE_ENV=development AD_ENV=quiet npm start
```

### Testing Server Functionality
```bash
# Health check
curl http://localhost:3000/status/health

# Test code generation
curl -X POST http://localhost:3000/generate-code \
  -H "Content-Type: application/json" \
  -d '{"prompt":"create a cube","existingCode":""}'

# Check request status (replace with actual request ID)
curl http://localhost:3000/status/your-request-id
```

### Monitoring and Debugging
```bash
# Real-time monitoring
./scripts/server-manager.sh monitor

# View recent logs
./scripts/server-manager.sh logs 100

# Check for common issues
./scripts/debug-server.sh quick

# Comprehensive debug analysis
./scripts/debug-server.sh full
```

## 🔧 Common Issues and Solutions

### Server Won't Start
1. Check port availability: `lsof -i :3000`
2. Verify API keys: `grep API_KEY .env`
3. Check Node.js version: `node --version` (requires 18+)
4. Run debug analysis: `./scripts/debug-server.sh`

### API Integration Failures
1. Test API connectivity: `./scripts/debug-server.sh api`
2. Check environment variables: `./scripts/server-health-check.sh`
3. Verify request logs in `requests/` directory
4. Test manually with curl commands

### Performance Issues
1. Monitor resource usage: `./scripts/server-manager.sh monitor`
2. Check memory consumption in process list
3. Review recent logs for error patterns
4. Clean up old request files if necessary

## 📊 Testing and Validation

### Automated Testing
```bash
# Run all tests
npm test

# Run UI tests
npm run test:ui

# Run specific test suites
npm run test:ui:modules
npm run test:ui:modules:quick
```

### Manual API Testing
See [references/api-testing.md](references/api-testing.md) for comprehensive API testing procedures.

### Load Testing
See [references/testing-guide.md](references/testing-guide.md) for performance testing and load testing scripts.

## 📁 Project Structure

```
promptscad-server-dev/
├── SKILL.md                    # Main skill documentation
├── scripts/                    # Executable scripts
│   ├── server-health-check.sh  # Health monitoring
│   ├── server-manager.sh       # Server lifecycle management
│   └── debug-server.sh         # Debug and troubleshooting
├── references/                 # Reference documentation
│   ├── api-testing.md          # API testing guide
│   └── testing-guide.md        # Comprehensive testing guide
└── README.md                   # This file
```

## 🎯 Key Features

- **Multi-mode server startup** (development, production, debug, ad-free)
- **Comprehensive health monitoring** with system checks
- **Real-time server monitoring** with resource tracking
- **Advanced debugging tools** with automated analysis
- **API testing and validation** procedures
- **Log management** and cleanup utilities
- **Performance monitoring** and load testing
- **Error detection** and troubleshooting guides

## 🔍 Debugging Workflow

1. **Quick Check**: `./scripts/server-health-check.sh --quick`
2. **Detailed Analysis**: `./scripts/debug-server.sh`
3. **Real-time Monitoring**: `./scripts/server-manager.sh monitor`
4. **Log Investigation**: `./scripts/server-manager.sh logs 200`
5. **API Testing**: Follow procedures in `references/api-testing.md`

## 📈 Performance Monitoring

The skill includes several performance monitoring capabilities:
- Memory usage tracking
- CPU utilization monitoring
- Request processing time analysis
- Log file size management
- Network connectivity checks
- API response time measurement

## 🚨 Emergency Procedures

### Server Crash Recovery
```bash
# Check what happened
./scripts/debug-server.sh logs

# Restart server
./scripts/server-manager.sh restart

# If still failing, run full debug
./scripts/debug-server.sh full
```

### Port Conflict Resolution
```bash
# Find process using port 3000
lsof -i :3000

# Kill conflicting process
kill -9 $(lsof -ti:3000)

# Restart server
./scripts/server-manager.sh start
```

### High Memory Usage
```bash
# Check memory usage
./scripts/server-health-check.sh

# Monitor in real-time
./scripts/server-manager.sh monitor

# Restart if necessary
./scripts/server-manager.sh restart
```

## 📚 Additional Resources

- **API Documentation**: See `references/api-testing.md`
- **Testing Procedures**: See `references/testing-guide.md`
- **Project Documentation**: Check the main project README.md
- **Environment Setup**: Review `.env` configuration examples

## 🤝 Contributing

When using this skill:
1. Always run health checks before major operations
2. Use appropriate server modes for different scenarios
3. Monitor logs regularly during development
4. Clean up old logs and request files periodically
5. Report any issues or improvements needed