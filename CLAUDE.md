# PromptSCAD Architecture and Development Guide

## WHAT: Project Overview and Structure

PromptSCAD is a web-based AI-powered OpenSCAD code generator that converts natural language prompts into 3D model code. The project can also be packaged as a VSCode extension.

### Technology Stack
- **Backend**: Node.js 18+ with ES Modules, Express.js server
- **AI Integration**: OpenAI API (DeepSeek, Qwen models)
- **Frontend**: Vanilla JavaScript, Pug templates, WebAssembly OpenSCAD runtime
- **Containerization**: Docker with multi-architecture support (ARM/AMD64)
- **Orchestration**: Kubernetes deployment ready
- **Testing**: Jest with Puppeteer for UI testing

### Project Structure
```
/home/ahmedh/projects/openscad-webui/
├── index.js              # Main Express server entry point
├── modules.js            # OpenSCAD module definitions (70+ modules)
├── prompts.js            # AI prompt templates and configurations
├── src/
│   └── openscadGenerator.js  # Core OpenSCAD generation logic
├── public/               # Frontend assets
│   ├── index.html       # Landing page
│   ├── main.pug         # Main editor UI with preview
│   ├── simple.pug       # Simplified UI version
│   ├── gallery.pug      # Model gallery view
│   └── openscad.wasm.js # OpenSCAD WebAssembly runtime
├── requests/            # Request storage (UUID.json files)
├── scripts/             # Build and deployment scripts
├── kubernetes/          # K8s deployment configurations
└── tests/               # Jest test files
```

## HOW: Development Rules and Conventions

### Code Style and Patterns
- **ES Modules**: Always use ES6 import/export syntax
- **Async/Await**: Preferred over callbacks for asynchronous operations
- **Naming**: camelCase for variables/functions, PascalCase for classes
- **Error Handling**: Always wrap async operations in try-catch blocks
- **Logging**: Use console.log with emojis for visibility (see existing patterns)

### Module System Rules
1. All OpenSCAD modules are defined in `modules.js` with categories and descriptions
2. Module filtering logic should be implemented in `src/openscadGenerator.js`
3. When adding new modules, follow the existing JSON structure with category, name, and description fields

### API Development
1. All endpoints return JSON responses with `{code: number, message: string, data?: any}` structure
2. Use UUID for request identification (already implemented)
3. Implement status tracking with files in `requests/` directory
4. Follow async generation pattern with polling for long operations

### Build and Deployment
- **Development**: `npm start` or `node index.js`
- **Testing**: `npm test`
- **Docker**: `./scripts/build-docker.sh` (tags: MMDDHHMM format)
- **Kubernetes**: `./scripts/update-k8s.sh` to push new manifests after Docker build

### Environment Configuration
Required environment variables:
- `DEEPSEEK_API_KEY`: For DeepSeek AI model
- `QWEN_API_KEY`: For Qwen multimodal model
- `OPENAI_BASE_URL`: Optional, defaults to official endpoints

## WHERE: Safe and Critical Areas

### Safe to Modify
- `/src/openscadGenerator.js`: Core generation logic, feel free to optimize algorithms
- `/modules.js`: Add new OpenSCAD modules following the existing pattern
- `/public/`: Frontend files, UI/UX improvements welcome
- `/prompts.js`: Adjust AI prompts and system messages
- `tests/`: Add or improve test coverage

### Critical Areas - Modify with Care
- `index.js`: Main server file containing API endpoints and request handling
- Request file format in `requests/` directory - maintain the existing JSON structure
- Error response format - must maintain `{code, message, data}` structure
- OpenSCAD WASM integration in `/public/openscad.wasm.js`

### Do Not Modify Without Discussion
- API endpoint paths (`/generate-code`, `/status/:requestId`)
- Request file naming convention (UUID.json)
- Module filtering algorithm core logic
- Status code enums and meanings

## VERIFICATION: Testing and Quality Checks

### Running Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test -- --testPathPattern=api.test.js

# Run with coverage
npm test -- --coverage
```

### Manual Verification Steps
1. **Start Server**: `npm start` - should run on port 3000
2. **Test Generation**: Use curl or browser to test `/generate-code` endpoint
3. **Check Status**: Poll `/status/:requestId` endpoint for async operations
4. **Verify Output**: Check generated OpenSCAD code validity
5. **UI Testing**: Visit `/main` for full editor or `/simple` for simplified version

### End-to-End Test Example
```bash
# Generate code
curl -X POST http://localhost:3000/generate-code \
  -H "Content-Type: application/json" \
  -d '{"prompt":"create a cube","existingCode":""}'

# Check status (replace with actual requestId)
curl http://localhost:3000/status/your-request-id
```

### Pre-deployment Checklist
- [ ] All tests pass (`npm test`)
- [ ] Docker build successful (`./scripts/build-docker.sh`)
- [ ] Manual API testing completed
- [ ] Frontend UI tested in browser
- [ ] Environment variables configured in deployment environment