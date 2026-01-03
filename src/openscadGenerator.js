import { prompts } from '../prompts.js';
import { promises as fs } from 'fs';
import path from 'path';

export function validateOpenSCADSyntax(code) {
    const errors = [];
    
    // Basic validation checks
    if (code.length < 5) {
        errors.push("Code too short");
        return { valid: false, errors: errors.join(", ") };
    }
    
    // Check for balanced brackets and parentheses
    const bracketStack = [];
    const parenStack = [];
    
    for (let i = 0; i < code.length; i++) {
        const char = code[i];
        if (char === '{') bracketStack.push('{');
        if (char === '}') {
            if (bracketStack.length === 0) errors.push("Unmatched closing brace");
            else bracketStack.pop();
        }
        if (char === '(') parenStack.push('(');
        if (char === ')') {
            if (parenStack.length === 0) errors.push("Unmatched closing parenthesis");
            else parenStack.pop();
        }
    }
    
    if (bracketStack.length > 0) errors.push("Unmatched opening brace");
    if (parenStack.length > 0) errors.push("Unmatched opening parenthesis");
    
    // Check for common OpenSCAD syntax patterns
    const validPatterns = [
        /include|module|function|cube|cylinder|sphere|rotate|translate|scale|union|difference|intersection/i,
        /;[\s]*$/m, // Ends with semicolon
        /^[\s]*[a-zA-Z_]/m // Starts with valid identifier
    ];
    
    validPatterns.forEach(pattern => {
        if (!pattern.test(code)) {
            errors.push("Invalid OpenSCAD syntax pattern");
        }
    });
    
    return {
        valid: errors.length === 0,
        errors: errors.join(", ")
    };
}

export async function verifyTheMath(existing_code, changes, openai) {
    const systemPrompt = prompts.verifyTheMath.system.replace('{modules}', prompts.modules.content);
    const userPrompt = prompts.verifyTheMath.userTemplate
        .replace('{existing_code}', existing_code)
        .replace('{changes}', changes);
    
    // Log the full JSON payload before sending to LLM
    const requestPayload = {
        model: "deepseek-chat",
        messages: [
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "user",
                content: userPrompt
            }
        ],
        max_tokens: 800,
        temperature: 0.1
    };
    console.log('🔍 verifyTheMath - Sending to LLM:', JSON.stringify(requestPayload, null, 2));
    
    const completion = await openai.chat.completions.create(requestPayload);

    const generatedText = completion.choices[0].message.content;
    console.log(generatedText);

    return generatedText;
}

export async function generateOpenscad(message, code, specs_and_math, openai) {
    const systemRoleContent = prompts.generateOpenscad.systemRole.replace('{modules}', prompts.modules.content);
    const systemRole = {
        role: "system",
        content: systemRoleContent
    };
    if (!validateOpenSCADSyntax(code).valid) {
        code = "facets = 16; $fn = facets; cube_size = 20; cube(cube_size, center=true);"
    }
    const prompt = prompts.generateOpenscad.userTemplate
        .replace('{code}', code)
        .replace('{message}', message);
    
    // Log the full JSON payload before sending to LLM
    const requestPayload = {
        model: "deepseek-chat",
        messages: [
            {
                role: "assistant",
                content: `Reference these specs: ${specs_and_math}`
            },
            systemRole,
            {
                role: "user",
                content: prompt
            }
        ],
        temperature: 0.1,
        max_tokens: 1500
    };
    console.log('🔍 generateOpenscad - Sending to LLM:', JSON.stringify(requestPayload, null, 2));
    
    const completion = await openai.chat.completions.create(requestPayload);

    const generatedText = completion.choices[0].message.content;
    console.log(generatedText);

    // Strict extraction and sanitization
    let sanitizedText = generatedText;
    
    // Remove all markdown code blocks if present
    const codeMatch = sanitizedText.match(/```(?:openscad)?([\s\S]*?)```/i);
    if (codeMatch) {
        sanitizedText = codeMatch[1];
    }
    
    // Remove any non-code explanations and artifacts
    sanitizedText = sanitizedText
        .replace(/^[\s\S]*?include <module\.scad>/i, 'include <module.scad>') // Keep only first include
        .replace(/^scad\s*\n?/i, '') // Remove "scad" prefix
        .replace(/\n\/\/[^\n]*/g, '') // Remove all comments
        .replace(/^[\n\r]+|[\n\r]+$/g, '') // Trim whitespace
        .replace(/\n{2,}/g, '\n'); // Collapse multiple newlines

    // Validate we have actual OpenSCAD code
    if (!sanitizedText.match(/include|module|function|cube|cylinder|sphere|rotate|translate|scale|union|difference|intersection/i)) {
        throw new Error('No valid OpenSCAD code found in response');
    }

    return sanitizedText;
}

export async function processVisualInput(imageData, prompt, qwenClient) {
    if (!qwenClient) {
        throw new Error('Qwen client not initialized. Please set QWEN_API_KEY environment variable.');
    }

    try {
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

export async function processRequest(requestId, message, code, openai, REQUEST_DIR) {
    try {
        console.log(`🔄 Starting request processing: ${requestId}`);
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

        let specs_and_math = await verifyTheMath(code, message, openai);

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
