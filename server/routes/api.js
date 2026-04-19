/**
 * Simplified API Routes
 * Streamlined endpoints with consistent response format
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { processRequest, getRequestStatus } from '../controllers/openscad.js';
import { sendError } from '../utils/errors.js';

const router = express.Router();

/**
 * Generate OpenSCAD code - simplified endpoint
 */
router.post('/generate-code', async (req, res) => {
  try {
    const requestId = uuidv4();
    const { prompt, code = '' } = req.body;
    
    if (!prompt) {
      return sendError(res, 400, 'Prompt is required');
    }
    
    // Trim very long prompts
    const trimmedPrompt = prompt.split(/\s+/).length > 64 
      ? prompt.split(/\s+/).slice(0, 64).join(' ')
      : prompt;
    
    // Import AI service
    const { openai } = await import('../services/ai/openai.js');
    if (!openai) {
      return sendError(res, 503, 'AI service not available. Please configure DEEPSEEK_API_KEY.');
    }
    
    // Start processing (async)
    processRequest(requestId, trimmedPrompt, code, openai);
    
    res.json({
      success: true,
      requestId,
      message: 'Processing started'
    });
    
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

/**
 * Check request status - simplified
 */
router.get('/status/:requestId', async (req, res) => {
  try {
    const status = await getRequestStatus(req.params.requestId);
    
    if (status.status === 'not_found') {
      return sendError(res, 404, 'Request not found');
    }
    
    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

/**
 * Simple health check
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Service is running',
    timestamp: new Date().toISOString()
  });
});

export default router;