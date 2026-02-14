import OpenAI from 'openai';

let qwenClient;

export function initializeQwen(apiKey, baseURL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', mockClient = null) {
    qwenClient = mockClient || new OpenAI({
        apiKey: process.env.QWEN_API_KEY || apiKey,
        baseURL
    });
    return qwenClient;
}

// Initialize Qwen client if not in test environment and API key is available
// In test environment, qwenClient will be undefined by default, tests should provide their own mock client
if (process.env.NODE_ENV !== 'test' && process.env.QWEN_API_KEY) {
    initializeQwen(
        process.env.QWEN_API_KEY,
        process.env.QWEN_API_BASE_URL
    );
}

export { qwenClient };
export { initializeQwen as initQwen };