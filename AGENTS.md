# PromptSCAD - AI-Powered OpenSCAD Web UI

## Project Overview

PromptSCAD is a web-based AI-powered OpenSCAD code generator that converts natural language prompts into 3D model code. The project can also be packaged as a VSCode extension. It features an interactive editor with syntax highlighting, live preview, WebAssembly integration for running OpenSCAD directly in the browser, and a comprehensive library of 70+ pre-defined OpenSCAD modules organized by category.

## Technology Stack

- **Backend**: Node.js 18+ with ES Modules, Express.js server
- **AI Integration**: OpenAI API (DeepSeek, Qwen models)
- **Frontend**: Vanilla JavaScript, Pug templates, WebAssembly OpenSCAD runtime
- **Testing**: Jest with Puppeteer for UI testing
- **Containerization**: Docker with multi-architecture support (ARM/AMD64)
- **Orchestration**: Kubernetes deployment ready

## Project Structure

```
/home/ahmedh/projects/openscad-webui/
├── server/                     # Backend server code
│   ├── app.js                 # Express app configuration
│   ├── server.js              # Server entry point
│   ├── routes/                # API and page routes
│   │   ├── api.js             # API endpoints
│   │   ├── pages.js           # Page rendering routes
│   │   └── seo.js             # SEO routes
│   ├── controllers/           # Request processing controllers
│   │   └── openscad.js        # Main OpenSCAD processing logic
│   ├── services/              # Business logic services
│   │   ├── ai/                # AI service integrations
│   │   │   ├── openai.js      # DeepSeek AI integration
│   │   │   └── qwen.js        # Qwen multimodal integration
│   │   └── openscad/          # OpenSCAD-specific services
│   │       ├── generator.js   # Code generation logic
│   │       ├── math.js        # Mathematical verification
│   │       ├── modules.js     # Module management
│   │       └── validator.js   # Code validation
│   └── config/                # Configuration files
│       ├── modules.js         # 70+ OpenSCAD module definitions
│       └── prompts.js         # AI prompt templates
├── public/                     # Frontend assets
│   ├── index.html             # Landing page
│   ├── main.pug               # Main editor UI with preview
│   ├── simple.pug             # Simplified UI version
│   ├── gallery.pug            # Model gallery view
│   ├── openscad.wasm.js       # OpenSCAD WebAssembly runtime
│   └── src/                   # Frontend JavaScript
├── requests/                   # Request storage (UUID.json files)
├── tests/                      # Jest test files
├── scripts/                    # Build and deployment scripts
├── kubernetes/                 # K8s deployment configurations
│   ├── deployment.yaml        # Main deployment manifest
│   └── networking.yaml        # Networking configuration
└── coverage/                   # Test coverage reports
```

## Build and Test Commands

### Development
```bash
# Start development server
npm start

# Start without advertisements
npm run local
npm run start:no-ads
npm run start:dev

# Watch mode with auto-reload
npm run watch
npm run watch:no-ads
```

### Testing
```bash
# Run all tests
npm test

# Run UI tests
npm run test:ui

# Run module tests
npm run test:ui:modules
npm run test:ui:modules:quick
npm run test:ui:modules:focused
npm run test:ui:modules:all
```

### Docker and Deployment
```bash
# Build and deploy (full pipeline)
npm run docker:build
make build

# Build Docker image only
npm run docker:build-only
make build-only

# Update Kubernetes deployment
npm run k8s:update
make update-k8s

# Clean up generated files
make clean
make clean-all
```

## Code Style Guidelines

### JavaScript/Node.js
- **ES Modules**: Always use ES6 import/export syntax
- **Async/Await**: Preferred over callbacks for asynchronous operations
- **Naming**: camelCase for variables/functions, PascalCase for classes
- **Error Handling**: Always wrap async operations in try-catch blocks
- **Logging**: Use console.log with emojis for visibility (see existing patterns)

### API Development
- All endpoints return JSON responses with `{code: number, message: string, data?: any}` structure
- Use UUID for request identification
- Implement status tracking with files in `requests/` directory
- Follow async generation pattern with polling for long operations

### OpenSCAD Integration
- All OpenSCAD modules are defined in `server/config/modules.js` with categories and descriptions
- Module filtering logic is implemented in `server/services/openscad/modules.js`
- When adding new modules, follow the existing JSON structure with category, name, and description fields

## Testing Instructions

### Automated Testing
The project includes comprehensive Jest tests:
- **API tests**: Test server endpoints and response formats
- **UI tests**: Automated browser testing with Puppeteer
- **Generation tests**: Test AI code generation functionality
- **Module tests**: Verify OpenSCAD module operations

### Manual Testing
1. **Start Server**: `npm start` - runs on port 3000
2. **Test Generation Endpoint**:
   ```bash
   curl -X POST http://localhost:3000/generate-code \
     -H "Content-Type: application/json" \
     -d '{"prompt":"create a cube","existingCode":""}'
   ```
3. **Check Status Endpoint** (replace with actual requestId):
   ```bash
   curl http://localhost:3000/status/your-request-id
   ```
4. **Access UI**: Visit `http://localhost:3000/main` for full editor or `http://localhost:3000/simple` for simplified version

### Writing Tests
Tests are located in the `/tests` directory. When adding new features:
1. Create corresponding test files following existing patterns
2. Ensure tests cover both success and error cases
3. Mock external dependencies (AI APIs) appropriately

## Environment Configuration

### Required Environment Variables
- `DEEPSEEK_API_KEY`: API key for DeepSeek AI model
- `QWEN_API_KEY`: API key for Qwen multimodal model
- `OPENAI_BASE_URL`: Optional, defaults to official endpoints

### Ad-free Development
For ad-free development environment:
```bash
# Method 1: Recommended
npm run local

# Method 2: Environment variable
AD_ENV=quiet npm start

# Method 3: Development mode
NODE_ENV=development npm start
```

## Security Considerations

### Docker Security
- The Dockerfile uses a non-root user (`appuser`)
- Multi-stage build reduces image size and attack surface
- Health checks are included in the container
- Security labels are applied to the container

### API Security
- Input validation on all endpoints
- Request size limiting (64 words for prompts)
- Proper error handling without information disclosure
- Status endpoint returns appropriate HTTP status codes

### Kubernetes Security
- Secrets are properly configured for API keys
- Network policies can be applied via `networking.yaml`
- Resource limits should be configured based on workload

## Deployment Process

### Docker Deployment
1. **Build**: Multi-architecture builds (ARM v7, ARM64 v8, AMD64)
2. **Tag**: Automatic timestamp tagging (MMDDHHMM format)
3. **Push**: Images pushed to Docker Hub (`ahmadsayed/promptscad`)
4. **Update**: Kubernetes deployment manifests updated automatically

### Kubernetes Deployment
1. **Secrets**: Configure API keys as Kubernetes secrets
2. **Deployment**: Apply updated manifests with `kubectl apply -f kubernetes/deployment.yaml`
3. **Service**: Load balancer service exposes application on port 80
4. **Monitoring**: Check deployment status with `kubectl get pods -l app=promptscad`

## API Endpoints

### Core Endpoints
- `POST /generate-code`: Generate OpenSCAD code from natural language prompt
- `GET /status/:requestId`: Check generation status
- `POST /process-visual`: Process visual input with Qwen multimodal model
- `POST /save`: Save generated code
- `POST /generate`: Alternative generation endpoint

### UI Endpoints
- `GET /`: Landing page
- `GET /main.html`: Full editor interface
- `GET /simple.html`: Simplified interface
- `GET /gallery.html`: Model gallery view

All API endpoints return JSON responses with the structure:
```json
{
  "code": 200,
  "message": "Success message",
  "data": { /* response data */ }
}
```

## Module System

The project includes 70+ pre-defined OpenSCAD modules organized by categories:
- **Basic**: Rounded geometry (cubes, cylinders, pyramids)
- **Advanced Geometry**: Complex shapes (torus, tube, prism, ellipsoid)
- **Mechanical**: Gears, threads, fasteners
- **Structural**: Beams, joints, supports
- **Gridfinity**: Modular storage system components
- **Artistic**: Decorative elements, patterns
- **Text**: Text rendering and manipulation

Modules are automatically filtered based on user requirements using AI analysis to improve code generation relevance and accuracy.