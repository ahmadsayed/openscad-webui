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
                    // Example: rounded_cube([30,20,10], 3, facets=16);
                    
                    2. rounded_cylinder(height, radius, rounding_radius, facets)
                    // Example: rounded_cylinder(20, 5, 2, facets=16);
                    
                    3. rounded_pyramid(base=[x,y], height, radius, facets)
                    // Example: rounded_pyramid([20,15], 30, 4, facets=16);
                    
                    4. rounded_cone(base_radius, height, rounding_radius, facets)
                    // Example: rounded_cone(10, 25, 3, facets=16);
                    
                    5. gear(number_of_teeth, circular_pitch|diametral_pitch)
                    // Example: linear_extrude(height = 10, center = true, convexity = 10, twist = 0) gear(number_of_teeth=17,diametral_pitch=1);
                    
                    6. Double Helical gears:
                        translate([50,0])
                        {
                           linear_extrude(height = 10, center = true, convexity = 10, twist = -45)
                           gear(number_of_teeth=17,diametral_pitch=1);
                           translate([0,0,10])
                           rotate([0,180,180/17])
                           linear_extrude(height = 10, center = true, convexity = 10, twist = 45)
                           gear(number_of_teeth=17,diametral_pitch=1);
                        }
                    `;



app.use(express.urlencoded());
app.use(express.json());


let openai;

export function initializeOpenAI(apiKey, baseURL = 'https://api.deepseek.com', mockClient = null) {
    openai = mockClient || new OpenAI({ baseURL, apiKey });
    return openai;
}

if (process.env.NODE_ENV !== 'test') {
    initializeOpenAI(
        process.env.DEEPSEEK_API_KEY,
        process.env.DEEPSEEK_API_BASE_URL
    );
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
                    • Use $fn=16 for rounded features unless specified
                    • Parameterize values: gear_teeth=17, not magic numbers
                    • Code With minimal description of each component in \`\`\`openscad blocks 

                    [ERROR PREVENTION]
                    → Validate module parameters before use
                    → Check unit consistency (mm vs radians)
                    → Prevent facet overload: $fn≤64 unless specified
                    → Center all primitives by default
                    → If one of the mentioned module used, you MUST include <module.scad>`

    };
    if (!validateOpenSCADSyntax(code).valid) {
        code = "cube(20, center=true);"
    }
    const prompt = `OpenSCAD Code: ${code}
            Modifications: ${message}

            [DIRECTIVES]
            1. CENTER: Apply center=true to all primitives (cube(), cylinder(), sphere())
            2. PARAMETERIZE: Replace literals with variables (e.g., wheel_dia=50)
            3. RESOLUTION: $fn=16 unless 'smooth' specified then use $fn=64 and always Paremterize in a variable called facets
            4. MODULARIZE: Group repeated patterns using module
            5. OUTPUT: Only valid OpenSCAD in \`\`\` blocks

            [CONSTRAINTS]
            - No markdown beyond code fences
            - No explanation
            - Prefer translate/rotate over CSG`;
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

    // Strict extraction between ```openscad and ```
    let codeMatch = generatedText.match(/```openscad([\s\S]*?)```/i);
    if (!codeMatch) {
        codeMatch = generatedText.match(/```([\s\S]*?)```/i);
    }
    if (!codeMatch) {
        throw new Error('No OpenSCAD code block found in response');
    }
    let sanitizedText = codeMatch[1]
        .trim()
        .replace(/^[\n\r]+|[\n\r]+$/g, ''); // Remove leading/trailing newlines

    // Final validation
    if (!sanitizedText || sanitizedText.length < 10) { // Basic length check
        throw new Error('Generated code appears to be empty or too short');
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
app.use(express.static('public'));
// Start server
let server;

if (process.env.NODE_ENV !== 'test') {
    server = app.listen(PORT, () => {
        console.log(`Server listening on port: ${PORT}`);
    });
}
