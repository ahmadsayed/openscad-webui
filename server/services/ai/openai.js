import OpenAI from 'openai';

let openai;

export function initializeOpenAI(apiKey, baseURL = 'https://api.deepseek.com', mockClient = null) {
    openai = mockClient || new OpenAI({ baseURL, apiKey });
    return openai;
}

// Initialize OpenAI client if not in test environment and API key is available
// In test environment, openai will be undefined by default, tests should provide their own mock client
// Always use DeepSeek endpoint regardless of which environment variable is set
if (process.env.NODE_ENV !== 'test') {
    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
    const baseURL = process.env.DEEPSEEK_API_BASE_URL;

    if (apiKey) {
        // Always point to DeepSeek endpoint
        initializeOpenAI(apiKey, baseURL || 'https://api.deepseek.com');
    }
}

export { openai };
export { initializeOpenAI as initOpenAI };