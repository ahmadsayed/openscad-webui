import express from 'express';
import OpenAI from 'openai';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REQUEST_DIR = path.join(__dirname, 'requests');

// Load prompts from external file
let prompts = null;
async function loadPrompts() {
    if (!prompts) {
        const promptsData = await fs.readFile(path.join(__dirname, 'prompts.json'), 'utf8');
        prompts = JSON.parse(promptsData);
    }
    return prompts;
}

let generator = null;



export const app = express();
const PORT = 3000;




app.use(express.urlencoded());
app.use(express.json());


let openai;
let qwenClient;

export function initializeOpenAI(apiKey, baseURL = 'https://api.deepseek.com', mockClient = null) {
    openai = mockClient || new OpenAI({ baseURL, apiKey });
    return openai;
}

export function initializeQwen(apiKey, baseURL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', mockClient = null) {
    qwenClient = mockClient || new OpenAI({
        apiKey: process.env.QWEN_API_KEY || apiKey,
        baseURL
    });
    return qwenClient;
}

if (process.env.NODE_ENV !== 'test') {
    initializeOpenAI(
        process.env.DEEPSEEK_API_KEY,
        process.env.DEEPSEEK_API_BASE_URL
    );
    
    if (process.env.QWEN_API_KEY) {
        initializeQwen(
            process.env.QWEN_API_KEY,
            process.env.QWEN_API_BASE_URL
        );
    }
}


export function validateOpenSCADSyntax(code) {
    return {
        valid: code.length > 5,
        errors: "",
    };
}


export async function verifyTheMath(existing_code, changes) {
    const promptData = await loadPrompts();
    const systemPrompt = promptData.verifyTheMath.system.replace('{modules}', promptData.modules.content);
    const userPrompt = promptData.verifyTheMath.userTemplate
        .replace('{existing_code}', existing_code)
        .replace('{changes}', changes);
    const completion = await openai.chat.completions.create({
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
        ]
    });

    const generatedText = completion.choices[0].message.content;
    console.log(generatedText);

    return generatedText;
}

export async function generateOpenscad(message, code, specs_and_math) {
    const promptData = await loadPrompts();
    const systemRoleContent = promptData.generateOpenscad.systemRole.replace('{modules}', promptData.modules.content);
    const systemRole = {
        role: "system",
        content: systemRoleContent
    };
    if (!validateOpenSCADSyntax(code).valid) {
        code = "facets = 16; $fn = facets; cube_size = 20; cube(cube_size, center=true);"
    }
    const prompt = promptData.generateOpenscad.userTemplate
        .replace('{code}', code)
        .replace('{message}', message);
    const completion = await openai.chat.completions.create({
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
        temperature: 0.3
    });

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


app.post('/generate-code', async (req, res) => {
    try {
        const requestId = uuidv4();
        console.log("Start processing Request : " + requestId);

        // Trim prompt if over 64 words
        const prompt = req.body.prompt.split(/\s+/).length > 64
            ? req.body.prompt.split(/\s+/).slice(0, 64).join(' ')
            : req.body.prompt;

        processRequest(requestId, prompt, req.body.code);

        const requestFile = path.join(REQUEST_DIR, `${requestId}.json`);

        // Ensure REQUEST_DIR exists
        await fs.mkdir(REQUEST_DIR, { recursive: true });

        // Save initial status
        await fs.writeFile(requestFile, JSON.stringify({
            status: 'working',
            message: req.body.prompt,
            code: req.body.code
        }));

        // Process in background

        res.json({
            requestId: requestId,
            success: true
        });

    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});



export async function processVisualInput(imageData, prompt = "Describe this image in detail") {
    if (!qwenClient) {
        throw new Error('Qwen client not initialized. Please set QWEN_API_KEY environment variable.');
    }

    try {


        const promptData = await loadPrompts();
        const systemPrompt = promptData.processVisualInput.systemPrompt;

        const completion = await qwenClient.chat.completions.create({
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
                            text: promptData.processVisualInput.userTemplate
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
        });
        let content = completion.choices[0].message.content;
        console.log(content);
        return content;
    } catch (error) {
        console.error('Qwen VL API error:', error);
        throw new Error(`Visual processing failed: ${error.message}`);
    }
}


export async function processRequest(requestId, message, code) {
    try {
        console.log(requestId);
        const requestFile = path.join(REQUEST_DIR, `${requestId}.json`);

        // Update status to Calculating Geometry
        await fs.writeFile(requestFile, JSON.stringify({
            status: 'working',
            phase: 'Calculating Geometry',
            success: true
        }));

        let specs_and_math = await verifyTheMath(code, message);

        // Update status to Generating Code
        await fs.writeFile(requestFile, JSON.stringify({
            status: 'working',
            phase: 'Generating Code',
            success: true
        }));

        let openscadeCode = await generateOpenscad(message, code, specs_and_math);
        console.log(openscadeCode);
        await fs.writeFile(requestFile, JSON.stringify({
            status: 'done',
            phase: '',
            code: openscadeCode,
            success: true
        }));
        console.log(requestFile);
    } catch (error) {
        console.log(error);
        const requestFile = path.join(REQUEST_DIR, `${requestId}.json`);
        await fs.writeFile(requestFile, JSON.stringify({
            status: 'error',
            phase: 'Error',
            error: error.message,
            success: false
        }));
    }
}


app.get('/status/:requestId', async (req, res) => {
    try {
        const requestFile = path.join(REQUEST_DIR, `${req.params.requestId}.json`);
        const data = await fs.readFile(requestFile, 'utf8');
        const result = JSON.parse(data);
        res.set('Cache-Control', 'no-store')
        res.json({
            status: result.status,
            phase: result.phase || 'working',
            ...(result.status === 'done' && { code: result.code }),
            ...(result.status === 'error' && { error: result.error }),
            success: result.success !== false
        });
    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).json({
                success: false,
                error: 'Request not found'
            });
        }
        console.error('Status check error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/save', (req, res) => {
    console.log(req.body);
    res.json({
        result: "success"
    });
});


app.post('/generate', (req, res) => {
    console.log(req.body);
    res.json({
        result: "success"
    })
})

// Visual processing endpoint for c
app.post('/process-visual', async (req, res) => {
    try {
        const { imageData, prompt } = req.body;
        
        if (!imageData) {
            return res.status(400).json({
                success: false,
                error: 'Image data is required'
            });
        }

        if (!qwenClient) {
            return res.status(503).json({
                success: false,
                error: 'Qwen visual model not available. Please configure QWEN_API_KEY environment variable.'
            });
        }

        console.log('Processing visual input with Qwen2.5-VL-72B-Instruct');

        // Extract base64 data and save image
        const base64Data = imageData.replace(/^data:image\/png;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const imageName = `visual-input-${Date.now()}.png`;
        const imagePath = path.join(REQUEST_DIR, imageName);
        
        await fs.mkdir(REQUEST_DIR, { recursive: true });
        await fs.writeFile(imagePath, imageBuffer);
        
        console.log(`Saved visual input to: ${imagePath}`);

        const analysis  = await processVisualInput(imageData, prompt);
        console.log("******************************************");
        console.log("Analysis:", analysis);
        console.log("******************************************");
        
        res.json({
            success: true,
            analysis,
            imagePath: imageName
        });

    } catch (error) {
        console.error('Visual processing error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// SEO and Crawler Routes
app.get('/sitemap.xml', (req, res) => {
    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.sendFile(path.join(__dirname, 'public', 'sitemap.xml'));
});

app.get('/robots.txt', (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.sendFile(path.join(__dirname, 'public', 'robots.txt'));
});


app.get('/sw.js', (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});

// Additional SEO routes for common crawler requests
app.get('/favicon.ico', (req, res) => {
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.sendFile(path.join(__dirname, 'public', 'favicon.ico'));
});

app.use(express.static('public'));
// Start server
let server;

if (process.env.NODE_ENV !== 'test') {
    server = app.listen(PORT, () => {
        console.log(`Server listening on port: ${PORT}`);
    });
}
