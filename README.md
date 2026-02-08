# PromptSCAD - AI-Powered OpenSCAD Web UI

A web-based UI for OpenSCAD with AI-powered 3D model generation. Create 3D models by describing them in natural language.

## Quick Start

### Standard Development (with ads)
```bash
npm install
npm run watch
```

### Development Without Advertisements
```bash
npm install
npm run local      # Recommended - runs without ads
# or
npm run dev        # Development mode (no ads)
```

## Running Options

### Advertising-Enabled (Default)
- `npm start` - Production mode with ads
- `npm run watch` - Watch mode with ads

### Advertisement-Free
- `npm run local` - Preferred local development mode
- `npm run start:no-ads` - Disable ads via environment
- `npm run dev` - Development mode
- `./scripts/run-without-ads.sh` - Standalone script

For more details about running without ads, see [docs/run-without-ads.md](/docs/run-without-ads.md).