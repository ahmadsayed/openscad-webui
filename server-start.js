#!/usr/bin/env node

/**
 * Server startup with automatic environment loading
 * This script loads environment variables from .env file before starting the server
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

// Check if API key is configured
const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('❌ ERROR: No API key found!');
  console.error('Please set either OPENAI_API_KEY or DEEPSEEK_API_KEY in your .env file');
  console.error('Example: echo "OPENAI_API_KEY=your-key-here" > .env');
  process.exit(1);
}

console.log('🔑 API key configured successfully');

// Import and start the server
import('./server/server.js').catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});