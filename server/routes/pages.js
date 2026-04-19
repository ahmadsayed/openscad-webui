import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const parentDir = path.join(__dirname, '..', '..');

const router = express.Router();

// Routes for PUG templates
router.get('/', (req, res) => {
    res.sendFile(path.join(parentDir, 'public', 'index.html'));
});

router.get('/main.html', (req, res) => {
    res.render('main');
});

router.get('/simple.html', (req, res) => {
    res.render('simple');
});

router.get('/gallery.html', (req, res) => {
    res.render('gallery');
});

// Test route for module.scad fix
router.get('/test-module-fix', (req, res) => {
    res.sendFile(path.join(parentDir, 'test-worker-direct.html'));
});

// Verification page for module.scad fix
router.get('/verify-fix', (req, res) => {
    res.sendFile(path.join(parentDir, 'verify-fix.html'));
});

export default router;