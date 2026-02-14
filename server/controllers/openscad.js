import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateOpenSCADSyntax } from '../services/openscad/validator.js';
import { filterModulesByRequirements } from '../services/openscad/modules.js';
import { verifyTheMath } from '../services/openscad/math.js';
import { generateOpenscad } from '../services/openscad/generator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const parentDir = path.join(__dirname, '..', '..');
const REQUEST_DIR = path.join(parentDir, 'requests');

export async function processRequest(requestId, message, code, openai, REQUEST_DIR) {
    try {
        console.log(`🔄 Starting request processing: ${requestId}`);

        // Check if openai is available
        if (!openai || !openai.chat || !openai.chat.completions) {
            throw new Error('OpenAI client not initialized. Please set DEEPSEEK_API_KEY environment variable.');
        }

        const requestFile = path.join(REQUEST_DIR, `${requestId}.json`);

        // Ensure REQUEST_DIR exists
        await fs.mkdir(REQUEST_DIR, { recursive: true });

        // Update status to Initial Processing
        await fs.writeFile(requestFile, JSON.stringify({
            status: 'working',
            phase: 'Initial Processing',
            progress: 10,
            success: true
        }));

        // Update status to Analyzing Geometry
        await fs.writeFile(requestFile, JSON.stringify({
            status: 'working',
            phase: 'Analyzing Geometry',
            progress: 30,
            success: true
        }));

        // First filter modules based on requirements
        let filteredModulesJson = null;
        try {
            const filterResult = await filterModulesByRequirements(message, code, openai);
            if (filterResult.filtered_modules && Object.keys(filterResult.filtered_modules).length > 0) {
                filteredModulesJson = JSON.stringify(filterResult);
                console.log(`✅ Filtered to ${Object.keys(filterResult.filtered_modules).length} modules for request ${requestId}`);
            }
        } catch (error) {
            console.warn(`⚠️ Module filtering failed for request ${requestId}:`, error);
        }

        let specs_and_math = await verifyTheMath(code, message, openai, filteredModulesJson);

        // Update status to Generating Code
        await fs.writeFile(requestFile, JSON.stringify({
            status: 'working',
            phase: 'Generating Code',
            progress: 70,
            success: true
        }));

        let openscadeCode = await generateOpenscad(message, code, specs_and_math, openai);
        console.log(openscadeCode);
        
        // Update status to Final Processing
        await fs.writeFile(requestFile, JSON.stringify({
            status: 'working',
            phase: 'Final Processing',
            progress: 90,
            success: true
        }));

        await fs.writeFile(requestFile, JSON.stringify({
            status: 'done',
            phase: 'Complete',
            progress: 100,
            code: openscadeCode,
            success: true
        }));
        
        console.log(`✅ Request ${requestId} completed successfully`);
    } catch (error) {
        console.log(`❌ Request ${requestId} failed:`, error);
        const requestFile = path.join(REQUEST_DIR, `${requestId}.json`);
        await fs.writeFile(requestFile, JSON.stringify({
            status: 'error',
            phase: 'Error',
            progress: 0,
            error: error.message,
            success: false
        }));
    }
}

export async function processVisualInput(imageData, prompt, qwenClient) {
    if (!qwenClient) {
        throw new Error('Qwen client not initialized. Please set QWEN_API_KEY environment variable.');
    }

    try {
        const { prompts } = await import('../../config/prompts.js');
        const systemPrompt = prompts.processVisualInput.systemPrompt;

        // Log the full JSON payload before sending to LLM
        const requestPayload = {
            model: "qwen-vl-plus",
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: prompts.processVisualInput.userTemplate
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: imageData
                            }
                        }
                    ]
                }
            ],
            temperature: 0.5,
            max_tokens: 2000
        };
        console.log('🔍 processVisualInput - Sending to LLM:', JSON.stringify(requestPayload, null, 2));

        const completion = await qwenClient.chat.completions.create(requestPayload);
        let content = completion.choices[0].message.content;
        console.log(content);
        return content;
    } catch (error) {
        console.error('Qwen VL API error:', error);
        throw new Error(`Visual processing failed: ${error.message}`);
    }
}

// Export individual functions for testing
export {
    validateOpenSCADSyntax,
    filterModulesByRequirements,
    verifyTheMath,
    generateOpenscad
};