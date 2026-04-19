/**
 * Simplified OpenAI Service
 * Streamlined AI client initialization
 */

import OpenAI from 'openai';

// Initialize OpenAI client with DeepSeek endpoint
const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
const baseURL = process.env.DEEPSEEK_API_BASE_URL || 'https://api.deepseek.com';

let openai;

if (apiKey && process.env.NODE_ENV !== 'test') {
  try {
    openai = new OpenAI({ 
      baseURL, 
      apiKey 
    });
    console.log('✅ OpenAI client initialized for DeepSeek endpoint');
  } catch (error) {
    console.warn('⚠️ Failed to initialize OpenAI client:', error.message);
  }
}

export { openai };