import express from 'express';
import OpenAI from 'openai';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REQUEST_DIR = path.join(__dirname, 'requests');


let generator = null;



export const app = express();
const PORT = 3000;

const modules = `     [MODULES] Use these with include <module.scad>:
                    1. rounded_cube([width,depth,height], radius, facets)
                    // Example: facets = 16; rounded_cube([cube_width, cube_depth, cube_height], corner_radius, facets);
                    
                    2. rounded_cylinder(height, radius, rounding_radius, facets)
                    // Example: facets = 16; rounded_cylinder(cyl_height, cyl_radius, round_radius, facets);
                    
                    3. rounded_pyramid(base=[x,y], height, radius, facets)
                    // Example: facets = 16; rounded_pyramid([base_x, base_y], pyramid_height, corner_radius, facets);
                    
                    4. rounded_cone(base_radius, height, rounding_radius, facets)
                    // Example: facets = 16; rounded_cone(base_radius, cone_height, round_radius, facets);
                    
                    5. gear(number_of_teeth, circular_pitch|diametral_pitch)
                    // Example: gear_teeth = 17; gear_pitch = 1; extrude_height = 10; linear_extrude(height = extrude_height, center = true, convexity = 10, twist = 0) gear(number_of_teeth=gear_teeth, diametral_pitch=gear_pitch);
                    
                    6. Double Helical gears:
                        gear_teeth = 17; gear_pitch = 1; extrude_height = 10; twist_angle = 45; gear_spacing = 50;
                        translate([gear_spacing, 0])
                        {
                           linear_extrude(height = extrude_height, center = true, convexity = 10, twist = -twist_angle)
                           gear(number_of_teeth=gear_teeth, diametral_pitch=gear_pitch);
                           translate([0, 0, extrude_height])
                           rotate([0, 180, 180/gear_teeth])
                           linear_extrude(height = extrude_height, center = true, convexity = 10, twist = twist_angle)
                           gear(number_of_teeth=gear_teeth, diametral_pitch=gear_pitch);
                        }
                    `;



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
    let prompt = {
        "system": "You are an OpenSCAD math specialist. " +
            "First determine user intention (modification request or question about potential issues). " +
            "Then analyze the input code and: " +
            "1) For modifications: Output mathematical specifications for the changes " +
            "2) For questions: Identify potential issues and their mathematical implications " +
            "Use OpenSCAD-specific math syntax. NEVER generate code - only equations and logical conditions." +
            "Prioritize use of existing modules if suitable: " + modules,

        "user": 
            "OpenSCAD Code: " +existing_code +"\n" +
            "User Input: " +changes + "\n\n" +
            "Analyze and output mathematical specifications for:"
        ,

        "response_requirements": {
            "format": [
                "1. Intention: [modification|question]",
                "2. Coordinate System: [formulas with OpenSCAD axis references]",
                "3. Transformations: [matrix/vector operations]",
                "4. Error Conditions: [inequality checks]",
                "5. Optimizations: [simplified equations]",
                "Example: 'X-centering: x_offset = -total_width/2'"
            ],
            "constraints": [
                "No code snippets",
                "No explanations",
                "Use OpenSCAD functions: norm(), cross(), atan2()",
                "Prioritize matrix operations over trigonometry",
                "Include intention analysis first",
                "Maintain original mathematical precision"
            ]
        }
    };
    const completion = await openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [
            {
                role: "system",
                content: prompt.system
            },
            {
                role: "user",
                content: prompt.user
            }
        ]
    });

    const generatedText = completion.choices[0].message.content;
    console.log(generatedText);

    return generatedText;
}

export async function generateOpenscad(message, code, specs_and_math) {
    const systemRole = {
        role: "system",
        content: `[OpenSCAD Expert Protocol]
                    ${modules}
                    [DIRECTIVES]
                    • ALWAYS start with include <module.scad> when using modules
                    • Use facets=16 for rounded features unless specified, always parameterize $fn as facets variable
                    • Parameterize values: gear_teeth=17, dimensions, radii, angles - not magic numbers
                    • Code With minimal description of each component in \`\`\`openscad blocks 

                    [ERROR PREVENTION]
                    → Validate module parameters before use
                    → Check unit consistency (mm vs radians)
                    → Prevent facet overload: facets≤64 unless specified, always use facets variable instead of $fn
                    → Center all primitives by default
                    → If one of the mentioned module used, you MUST include <module.scad>
                    
                    [VALIDATION REQUIREMENTS]
                    1. SYNTAX VALIDATION: Check for proper OpenSCAD syntax including:
                       - Balanced parentheses and brackets
                       - Proper semicolon usage
                       - Valid function/module names
                       - Correct parameter syntax
                    
                    2. MODULE INCLUSION: Automatically add 'include <module.scad>' when using any of these modules:
                       - rounded_cube, rounded_cylinder, rounded_pyramid, rounded_cone, gear
                       - Check if include statement is missing and add it at the top
                    
                    3. CODE CORRECTION: Fix any syntax errors, missing semicolons, or malformed statements`

    };
    if (!validateOpenSCADSyntax(code).valid) {
        code = "facets = 16; $fn = facets; cube_size = 20; cube(cube_size, center=true);"
    }
    const prompt = `OpenSCAD Code: ${code}
            Modifications: ${message}

            [VALIDATION STEPS - EXECUTE IN ORDER]
            1. SYNTAX VALIDATION: Verify all OpenSCAD syntax is correct
            2. MODULE CHECK: If using rounded_cube, rounded_cylinder, rounded_pyramid, rounded_cone, or gear modules, ensure 'include <module.scad>' is at the top
            3. ERROR CORRECTION: Fix any syntax issues, missing semicolons, or malformed statements
            4. CODE GENERATION: Apply requested modifications

            [DIRECTIVES]
            1. CENTER: Apply center=true to all primitives (cube(), cylinder(), sphere())
            2. PARAMETERIZE: Replace literals with variables (e.g., wheel_dia=50)
            3. RESOLUTION: facets=16 unless 'smooth' specified then use facets=64, always parameterize $fn as facets variable and use $fn=facets
            4. MODULARIZE: Group repeated patterns using module
            5. OUTPUT: Only valid OpenSCAD in \`\`\` blocks
            6. CORE PARAMETER STRATEGY:
                - Define only BASE properties (total_height, main_dia, wall_thickness)
                - Derive SUBCOMPONENT values from base:
                    * hole_height = total_height + 2*clearance
                    * inner_radius = outer_radius - wall_thickness
                - Exceptions: Unique mechanics (gear_teeth=17) get individual params
            7. TOLERANCE HANDLING:
                - Single clearance parameter for all fits
                - Apply as: hole_dim = base_dim + 2*clearance
                - Never create hole_height/hole_dia params - calculate in-place                
            [CONSTRAINTS]
            - No markdown beyond code fences
            - No explanation
            - Prefer translate/rotate over CSG
            - Always validate syntax before output
            - Auto-correct any detected issues`;
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


        const systemPrompt = `You are a CAD assistant analyzing images of 3D models with user markings (in black). Provide detailed instructions for updating the model:
                            1. Identify the exact location of black markings as precisely as possible
                            2. Describe the shape and extent of each marked area
                            3. Focus on specific modifications needed (e.g., "add hole", "extend surface")
                            4. Reference the coordinate system:
                                - Red axis: X
                                - Green axis: Y 
                                - Blue axis: Z
                            5. Provide relative dimensions (e.g., "50% of current width")
                            6. Avoid generating OpenSCAD code`;

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
                            text: `Describe the user's intention based on this image:`
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
