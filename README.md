# PromptSCAD - AI-Powered OpenSCAD Web UI

An AI-powered web-based OpenSCAD code generator that converts natural language prompts into 3D model code. Features an interactive editor with syntax highlighting, live preview, WebAssembly integration for running OpenSCAD directly in the browser, and a comprehensive library of 70+ pre-defined OpenSCAD modules.

## 🚀 Features

- **AI-Powered Generation**: Convert natural language descriptions into OpenSCAD code using DeepSeek AI models
- **Interactive Editor**: Full-featured code editor with syntax highlighting and live preview
- **WebAssembly Integration**: Runs OpenSCAD directly in the browser using WebAssembly
- **Module Library**: 70+ pre-defined OpenSCAD modules organized by category
- **Multiple UI Modes**: Choose between full editor or simplified interface
- **Real-time Preview**: See your 3D models render as you type
- **Docker Support**: Containerized deployment with multi-architecture support
- **Kubernetes Ready**: Production deployment configurations included
- **Comprehensive Testing**: Jest tests with Puppeteer for UI automation

## 🛠 Technology Stack

- **Backend**: Node.js 18+ with ES Modules, Express.js
- **AI Integration**: DeepSeek API with OpenAI-compatible endpoints
- **Frontend**: Vanilla JavaScript, Pug templates, WebAssembly OpenSCAD runtime
- **Testing**: Jest with Puppeteer for UI testing
- **Deployment**: Docker with multi-architecture support (ARM/AMD64), Kubernetes

## ⚡ Quick Start

### Prerequisites
- Node.js 18 or higher
- npm or yarn package manager

### Installation
```bash
# Clone the repository
git clone https://github.com/ahmadsayed/openscad-webui.git
cd openscad-webui

# Install dependencies
npm install

# Configure environment
echo "DEEPSEEK_API_KEY=your-api-key-here" > .env

# Start the development server
npm start
```

The application will be available at `http://localhost:3000`

## 📋 Available Scripts

```bash
# Development
npm start              # Start server with environment loading
npm run local          # Start without advertisements (recommended)
npm run dev            # Start in development mode
npm run start:legacy   # Start without environment loading

# Testing
npm test               # Run all tests
npm run test:ui        # Run UI tests with Puppeteer
npm run test:ui:modules # Run module-specific UI tests

# Docker & Deployment
npm run docker:build   # Full build and deploy pipeline
npm run docker:build-only  # Build Docker image only
npm run k8s:update     # Update Kubernetes deployment
```

## 🧪 Testing

### Manual Testing
1. **Start the server**: `npm start` (runs on port 3000)
2. **Test generation endpoint**:
   ```bash
   curl -X POST http://localhost:3000/generate-code \
     -H "Content-Type: application/json" \
     -d '{"prompt":"create a cube","existingCode":""}'
   ```
3. **Check status endpoint** (replace with actual requestId):
   ```bash
   curl http://localhost:3000/status/your-request-id
   ```
4. **Access UI**: Visit `http://localhost:3000/main` for full editor or `http://localhost:3000/simple` for simplified version

### Automated Testing
The project includes comprehensive Jest tests:
- **API tests**: Test server endpoints and response formats
- **UI tests**: Automated browser testing with Puppeteer
- **Generation tests**: Test AI code generation functionality
- **Module tests**: Verify OpenSCAD module operations

## ⚙️ Configuration

### Environment Variables
Required environment variables:
- `DEEPSEEK_API_KEY`: API key for DeepSeek AI model
- `QWEN_API_KEY`: API key for Qwen multimodal model (optional)
- `OPENAI_BASE_URL`: Optional, defaults to official DeepSeek endpoints

### Ad-free Development
```bash
# Method 1: Recommended
npm run local

# Method 2: Environment variable
AD_ENV=quiet npm start

# Method 3: Development mode
NODE_ENV=development npm start
```

## 🐳 Docker Deployment

```bash
# Build Docker image (tags in MMDDHHMM format)
npm run docker:build

# Or use the build script directly
./scripts/build.js
```

The build system supports multi-architecture builds (ARM v7, ARM64 v8, AMD64) with automatic tagging and Kubernetes deployment updates.

## ☸️ Kubernetes Deployment

```bash
# Update deployment with new image
npm run k8s:update

# Apply to Kubernetes
kubectl apply -f kubernetes/deployment.yaml
```

## 📚 Module System

The project includes 70+ pre-defined OpenSCAD modules organized by categories:

- **Basic Geometry**: Rounded cubes, cylinders, tubes, torus
- **Mechanical**: Gears, threads, bearings, fasteners
- **Structural**: Brackets, hinges, joints, supports
- **Gridfinity**: Modular storage system components
- **Artistic**: Decorative elements, patterns, text
- **Utilities**: Array patterns, transformations, helpers

Modules are automatically filtered based on user requirements using AI analysis to improve code generation relevance and accuracy.

## 🔌 API Documentation

### Core Endpoints
- `POST /generate-code`: Generate OpenSCAD code from natural language prompt
- `GET /status/:requestId`: Check generation status
- `GET /main`: Full editor interface
- `GET /simple`: Simplified interface
- `GET /gallery`: Model gallery view
- `GET /health`: Health check endpoint

All API endpoints return JSON responses with the structure:
```json
{
  "code": 200,
  "message": "Success message",
  "data": { /* response data */ }
}
```

## 🏗️ Project Structure

```
/home/ahmedh/projects/openscad-webui/
├── server/                     # Backend server code
│   ├── app.js                 # Express app configuration
│   ├── server.js              # Server entry point
│   ├── routes/                # API and page routes
│   ├── controllers/           # Request processing controllers
│   ├── services/              # Business logic services
│   └── config/                # Configuration files
├── public/                     # Frontend assets
│   ├── index.html             # Landing page
│   ├── main.pug               # Main editor UI
│   ├── simple.pug             # Simplified UI
│   ├── gallery.pug            # Model gallery
│   ├── openscad.wasm.js       # OpenSCAD WebAssembly runtime
│   └── src/                   # Frontend JavaScript
├── tests/                      # Jest test files
├── ui-test/                    # Puppeteer UI tests
├── scripts/                    # Build and deployment scripts
├── kubernetes/                 # K8s deployment configurations
└── requests/                   # Request storage (UUID.json files)
```

## 🔒 Security Considerations

- Input validation on all endpoints
- Request size limiting (64 words for prompts)
- Proper error handling without information disclosure
- Docker container runs as non-root user
- Multi-stage Docker build reduces attack surface
- Health checks included in container

## 🤝 Development Guidelines

- Use ES6 import/export syntax for all modules
- Follow camelCase for variables/functions, PascalCase for classes
- Wrap async operations in try-catch blocks
- Use console.log with emojis for logging visibility
- Maintain existing API response format
- Add tests for new features
- Follow module system rules defined in `server/config/modules.js`

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for your changes
4. Ensure all tests pass: `npm test`
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section in this README
2. Review the test files for usage examples
3. Open an issue on GitHub

---

**PromptSCAD** - Making 3D modeling accessible through the power of AI and natural language processing.