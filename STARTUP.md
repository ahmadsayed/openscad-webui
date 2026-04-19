# PromptSCAD Server Startup Guide

## Quick Start

Your API key has been saved in the `.env` file. To start the server, simply run:

```bash
npm start
```

## Available Scripts

- `npm start` - Start server with automatic environment loading (recommended)
- `npm run start:env` - Same as `npm start` (alias)
- `npm run start:legacy` - Start server without environment loading
- `npm run dev` - Start in development mode
- `npm run local` - Start without ads
- `./start-server.sh` - Alternative startup script

## Environment Configuration

The server automatically loads environment variables from the `.env` file. Your API key is already configured:

```
OPENAI_API_KEY=your-api-key-here
```

## Troubleshooting

If you see an error about missing API key:
1. Check that `.env` file exists in the project root
2. Verify the API key is correctly set in the `.env` file
3. Try running `npm run start:legacy` to bypass environment loading

## API Key Management

The server supports both `OPENAI_API_KEY` and `DEEPSEEK_API_KEY` environment variables. You can use either one in your `.env` file.

To update your API key, edit the `.env` file:
```bash
nano .env
```

Then restart the server.