/**
 * Simplified Request Controller
 * Replaces complex 5-phase status system with simple 3-state approach
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { processAIRequest } from '../services/ai-service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const parentDir = path.join(__dirname, '..', '..');
const REQUEST_DIR = path.join(parentDir, 'requests');

/**
 * Process OpenSCAD generation request - simplified version
 */
export async function processRequest(requestId, message, code, openai) {
  try {
    console.log(`🔄 Processing request: ${requestId}`);
    
    // Ensure directory exists
    await fs.mkdir(REQUEST_DIR, { recursive: true });
    
    // Single status update: processing
    await saveStatus(requestId, 'processing', 'Generating OpenSCAD code...');
    
    // Process the AI request
    const result = await processAIRequest(message, code, openai, requestId);
    
    if (result.success) {
      // Final status: complete
      await saveStatus(requestId, 'complete', 'OpenSCAD code generated successfully', result.code);
      console.log(`✅ Request completed: ${requestId}`);
    } else {
      // Error status
      await saveStatus(requestId, 'error', result.error || 'Generation failed');
      console.log(`❌ Request failed: ${requestId} - ${result.error}`);
    }
    
  } catch (error) {
    console.error(`❌ Request processing failed: ${requestId}`, error);
    await saveStatus(requestId, 'error', error.message || 'Processing failed');
  }
}

/**
 * Simplified status saving - single file write
 */
async function saveStatus(requestId, status, message, code = null) {
  const requestFile = path.join(REQUEST_DIR, `${requestId}.json`);
  const data = {
    status,
    message,
    timestamp: new Date().toISOString()
  };
  
  if (code) {
    data.code = code;
  }
  
  await fs.writeFile(requestFile, JSON.stringify(data, null, 2));
}

/**
 * Get request status
 */
export async function getRequestStatus(requestId) {
  try {
    const requestFile = path.join(REQUEST_DIR, `${requestId}.json`);
    const data = await fs.readFile(requestFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { status: 'not_found', message: 'Request not found' };
    }
    throw error;
  }
}