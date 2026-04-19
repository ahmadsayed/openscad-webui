import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { shouldDisableAds } from './utils/errors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const parentDir = path.join(__dirname, '..');

export const app = express();

// Configure PUG template engine
app.set('view engine', 'pug');
app.set('views', path.join(parentDir, 'public'));

// Middleware
app.use(express.urlencoded());
app.use(express.json());

// Add middleware to make environment info available to templates
app.use((req, res, next) => {
    res.locals.isTestEnv = process.env.NODE_ENV === 'test';
    res.locals.isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    res.locals.hasAds = !shouldDisableAds();
    next();
});

// Static files
app.use(express.static('public'));

// Disable advertisements during tests or when specifically requested
if (shouldDisableAds()) {
    app.get('/monetag.js', (req, res) => {
        // Return empty script to disable ads
        res.set('Content-Type', 'text/javascript');
        res.send('// Advertisements disabled\n');
    });
}

export default app;