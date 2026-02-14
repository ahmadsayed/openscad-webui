import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const parentDir = path.join(__dirname, '..', '..');

const router = express.Router();

// SEO and Crawler Routes
router.get('/sitemap.xml', (req, res) => {
    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.sendFile(path.join(parentDir, 'public', 'sitemap.xml'));
});

router.get('/robots.txt', (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.sendFile(path.join(parentDir, 'public', 'robots.txt'));
});

router.get('/sw.js', (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.sendFile(path.join(parentDir, 'public', 'sw.js'));
});

// Additional SEO routes for common crawler requests
router.get('/favicon.ico', (req, res) => {
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.sendFile(path.join(parentDir, 'public', 'favicon.ico'));
});

export default router;