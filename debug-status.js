#!/usr/bin/env node

/**
 * Debug script to check request file paths
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const requestId = 'c100c642-e698-4de3-a5a9-62e8d5e146b5';

// Check different path constructions
const paths = [
  path.join(__dirname, 'requests', `${requestId}.json`),
  path.join(process.cwd(), 'requests', `${requestId}.json`),
  path.join('requests', `${requestId}.json`),
  `./requests/${requestId}.json`
];

console.log('Checking different path constructions:');
for (const p of paths) {
  try {
    await fs.access(p);
    console.log(`✅ Found: ${p}`);
  } catch (error) {
    console.log(`❌ Not found: ${p}`);
  }
}

console.log('\nCurrent working directory:', process.cwd());
console.log('__dirname:', __dirname);