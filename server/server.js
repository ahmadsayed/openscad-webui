/**
 * Simplified Server
 * Streamlined Express server with minimal configuration
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './routes/api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const parentDir = path.join(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 3000;

// Essential middleware only
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple template setup
app.set('view engine', 'pug');
app.set('views', path.join(parentDir, 'public'));

// Basic environment info for templates
app.use((req, res, next) => {
  res.locals.isDev = process.env.NODE_ENV === 'development';
  res.locals.hasAds = process.env.NODE_ENV !== 'test' && process.env.AD_ENV !== 'quiet';
  next();
});

// Static files
app.use(express.static('public'));

// Routes
app.use('/', apiRoutes);

// Serve main, simple, and gallery interfaces via both routes
app.get('/main', (req, res) => {
  res.render('main');
});

app.get('/simple', (req, res) => {
  res.render('simple');
});

app.get('/gallery', (req, res) => {
  res.render('gallery');
});

// Also serve via .html routes for consistency
app.get('/main.html', (req, res) => {
  res.render('main');
});

app.get('/simple.html', (req, res) => {
  res.render('simple');
});

app.get('/gallery.html', (req, res) => {
  res.render('gallery');
});

app.get('/gallery', (req, res) => {
  try {
    res.render('gallery');
  } catch (error) {
    res.status(404).send('Gallery template not found');
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🎯 Open http://localhost:${PORT} to access the application`);
  });
}

export { app };