# Running PromptSCAD Without Advertisements

This guide explains how to run PromptSCAD locally without seeing advertisements.

## Quick Start

The easiest way to run without ads is:

```bash
# Method 1: Using npm script
npm run local

# Method 2: Using environment variable
AD_ENV=quiet npm start

# Method 3: Using the script
./scripts/run-without-ads.sh
```

## Available NPM Scripts

We've added several new npm scripts for convenient local development:

### Ad-Free Scripts
- `npm run local` - Run with all features but no ads (recommended)
- `npm run start:no-ads` - Disable ads via environment variable
- `npm run dev` - Run in development mode (no ads by default)

### Watch Mode Scripts
- `npm run watch:no-ads` - Watch for changes without ads

## Environment Variables

You can control advertisements using these environment variables:

- `AD_ENV=quiet` - Disables advertisements
- `AD_ENV=no-ads` - Also disables advertisements
- `NODE_ENV=test` - Testing mode (disables ads + other test-specific behavior)
- `NODE_ENV=development` - Development mode (no ads)

## Technical Details

### How It Works

The system checks for ad-blocking triggers in this priority:

1. `process.env.NODE_ENV === 'test'` (for testing)
2. `process.env.AD_ENV === 'quiet' || process.env.AD_ENV === 'no-ads'` (for local development)

When any of these conditions are met:
- The HTML templates skip loading the `monetag.js` script
- The `/monetag.js` endpoint returns an empty script instead

### Template Changes

The Pug templates now include conditional ad loading:

```pug
unless isTestEnv || (!hasAds)
  script(data-cfasync="false" type="text/javascript" src="monetag.js")
```

### Server Changes

The Express middleware makes environment variables available to templates:

```javascript
app.use((req, res, next) => {
    res.locals.isTestEnv = process.env.NODE_ENV === 'test';
    res.locals.isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    res.locals.hasAds = process.env.NODE_ENV !== 'test' &&
                         process.env.AD_ENV !== 'quiet' &&
                         process.env.AD_ENV !== 'no-ads';
    next();
});
```

## Examples

### Development Mode
```bash
npm run dev
# or
NODE_ENV=development npm start
```

### Production-like but without ads
```bash
AD_ENV=quiet NODE_ENV=production npm start
```

### Running on a different port without ads
```bash
PORT=3003 AD_ENV=quiet npm start
```

## Docker Usage

When running in Docker, you can also disable ads:

```bash
docker run -e AD_ENV=quiet -p 3000:3000 promptscad:latest
```

## Troubleshooting

### Ads still showing?
1. Check environment variables are set correctly
2. Ensure you're using the right command (`npm run local` is safest)
3. Clear browser cache
4. Check browser developer tools - the monetag.js script should not load

### Script permissions issues
If the `./scripts/run-without-ads.sh` script gives permission errors:
```bash
chmod +x scripts/run-without-ads.sh
```

### Port already in use
```bash
# Use a different port
PORT=3001 npm run local
```

## Why Run Without Ads?

Running without ads is useful for:
- Local development and testing
- Privacy-focused environments
- Better performance during development
- Meeting requirements in certain deployment environments
- Avoiding ad blockers in development

## Backward Compatibility

All existing commands continue to work as before:
- `npm start` - Runs normally with ads
- `npm test` - Already runs without ads
- Regular `node index.js` - Runs with ads (production default)

The ad-free options are opt-in and don't affect existing deployments.