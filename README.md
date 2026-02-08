# PromptSCAD - AI-Powered OpenSCAD Web UI

An AI-powered web-based OpenSCAD code generator that converts natural language prompts into 3D model code. PromptSCAD can also be packaged as a VSCode extension.

## Features

- **AI-Powered Generation**: Convert natural language descriptions into OpenSCAD code using DeepSeek and Qwen AI models
- **Interactive Editor**: Full-featured code editor with syntax highlighting and live preview
- **WebAssembly Integration**: Runs OpenSCAD directly in the browser using WebAssembly
- **Module Library**: 70+ pre-defined OpenSCAD modules organized by category
- **Multiple UI Modes**: Choose between full editor or simplified interface
- **Docker Support**: Containerized deployment with multi-architecture support
- **Kubernetes Ready**: Production deployment configurations included

## Technology Stack

- **Backend**: Node.js 18+ with ES Modules, Express.js
- **AI Integration**: OpenAI API (DeepSeek, Qwen models)
- **Frontend**: Vanilla JavaScript, Pug templates, WebAssembly OpenSCAD runtime
- **Testing**: Jest with Puppeteer for UI testing
- **Deployment**: Docker, Kubernetes

## Quick Start

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

# Start the development server
npm start
```
The application will be available at `http://localhost:3000`

## Available Scripts
```bash
# Start the development server
npm start

# Run all tests
npm test

# Run specific test file
npm test -- --testPathPattern=api.test.js

# Run tests with coverage
npm test -- --coverage
```

## Testing the Application

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

### Writing Tests
Tests are located in the `/tests` directory. When adding new features:
1. Create corresponding test files following existing patterns
2. Ensure tests cover both success and error cases
3. Mock external dependencies (AI APIs) appropriately

## Configuration

### Environment Variables
Required environment variables:
- `DEEPSEEK_API_KEY`: API key for DeepSeek AI model
- `QWEN_API_KEY`: API key for Qwen multimodal model
- `OPENAI_BASE_URL`: Optional, defaults to official endpoints

### Running Without Advertisements
For ad-free development:
```bash
# Method 1: Recommended
npm run local

# Method 2: Environment variable
AD_ENV=quiet npm start

# Method 3: Development mode
NODE_ENV=development npm start
```

For more details about running without ads, see [docs/run-without-ads.md](/docs/run-without-ads.md).

### Docker Deployment
```bash
# Build Docker image (tags in MMDDHHMM format)
./scripts/build-docker.sh

# Deploy to Kubernetes
./scripts/update-k8s.sh
```

## API Documentation

### Endpoints
- `POST /generate-code`: Generate OpenSCAD code from natural language prompt
- `GET /status/:requestId`: Check generation status
- `GET /main`: Full editor interface
- `GET /simple`: Simplified interface
- `GET /gallery`: Model gallery view

All API endpoints return JSON responses with the structure:
```json
{
  "code": 200,
  "message": "Success message",
  "data": { /* response data */ }
}
```

## Development Guidelines

- Use ES6 import/export syntax for all modules
- Follow camelCase for variables/functions, PascalCase for classes
- Wrap async operations in try-catch blocks
- Use console.log with emojis for logging visibility
- Maintain existing API response format
- Follow module system rules defined in `modules.js`

## Contributing
Follow the existing code style and add tests for new features:
```bash
npm test
```

This README provides the essential information for getting started with PromptSCAD. All recent improvements are included in the codebase.""{"}," file":"README.md"}}":"file"," />
———————————————————————————————
***

## Pull Request Summary

### 🎯 **What's Fixed** - Major UI/UX Improvements

#### **History Sidebar Buttons**
✅ **Perfect horizontal alignment** - Buttons now sit side-by-side, not stacked
✅ **Vibrant, solid colors** - No more transparent effects or "fading"
✅ **Clean button design**:
- Reload button: Solid green (#73C48F) - matches Load button exactly
- Delete button: Deep red (#dc3545) - clear visual distinction

#### **Cross-Template Consistency**
✅ **All pages updated**: main.pug, simple.pug, gallery.pug
✅ **Uniform styling**: Same clean appearance across all interfaces
✅ **Professional finish**: Integrated, non-intrusive design

#### **NPM Development Experience**
✅ **Ad-free commands**: `npm run local` (recommended), `npm run dev`, etc.
✅ **Multiple approaches**: Environment variables, direct scripts
✅ **Clean documentation**: Complete guide for ad-free usage

### 📊 **Before/After Comparison**

#### **BUTTONS**
**Before**: Stacked vertically, inconsistent colors, transparent effects
**After**: Perfect horizontal alignment, vibrant solid colors, professional appearance

#### **DEVELOPMENT**
**Before**: Tests included ads, unclear options for local dev
**After**: Clean testing environment, multiple ad-free commands

**Before**: Limited documentation, styling inconsistencies
**After**: Comprehensive docs, unified design language

### 🔬 **Testing Results**

All enhancements tested and verified:
- ✅ Perfect horizontal button alignment on all screen sizes
- ✅ Vibrant colors (green reload, red delete) with no transparency
- ✅ Consistent styling across main.html, simple.html, gallery.html
- ✅ Professional, integrated appearance without visual artifacts
- ✅ All NPM commands working properly

This PR delivers substantial UX improvements that make PromptSCAD more professional and user-friendly across all interfaces. The history sidebar now provides clear, consistent buttons that work perfectly regardless of which UI mode users choose."{"":"="}}"}