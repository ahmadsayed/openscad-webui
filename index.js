import express from 'express';
import OpenAI from 'openai';


let generator = null;



const app = express();
const PORT = 3000;

const modules=`     [MODULES] Use these with include <module.scad>:
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


const openai = new OpenAI({
    baseURL: process.env.DEEPSEEK_API_BASE_URL || 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY
});


function validateOpenSCADSyntax(code) {
    return {
        valid: code.length > 5,
        errors: "",
    };
}


async function verifyTheMath(existing_code, changes) {
    let prompt = {
        "system": "You are an OpenSCAD math specialist. " +
                "Analyze input code and changes to output ONLY: " +
                "1) Formulas for object positioning  "+
                "2) Coordinate transformations " +
                "3) Error checks " +
                "4) Optimization rules. " +"Use OpenSCAD-specific math syntax. NEVER generate code - only equations and logical conditions." +
                "Prioritize the use already existing module, if suitable " + modules,
        "user": `OpenSCAD Code: ${existing_code}\nChanges Needed: ${changes}\n\nOutput mathematical specifications for:`,
        "response_requirements": {
            "format": [
                "1. Coordinate System: [formulas with OpenSCAD axis references]",
                "2. Transformations: [matrix/vector operations]",
                "3. Error Conditions: [inequality checks]",
                "4. Optimizations: [simplified equations]",
                "Example: 'X-centering: x_offset = -total_width/2'"
            ],
            "constraints": [
                "No code snippets",
                "No explanations",
                "Use OpenSCAD functions: norm(), cross(), atan2()",
                "Prioritize matrix operations over trigonometry"
            ]
        }
    }
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

async function generateOpenscad(message, code, specs_and_math) {
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
                    → Center all primitives by default`
    };
    if (!validateOpenSCADSyntax(code).valid) {
        code = "cube(20, center=true);"
    }
    const prompt = `OpenSCAD Code: ${code}
            Modifications: ${message}

            [DIRECTIVES]
            1. CENTER: Apply center=true to all primitives (cube(), cylinder(), sphere())
            2. PARAMETERIZE: Replace literals with variables (e.g., wheel_dia=50)
            3. RESOLUTION: $fn=16 unless 'smooth' specified then use $fn=64
            4. MODULARIZE: Group repeated patterns using module
            5. MATH: Reference these specs: ${specs_and_math}
            6. OUTPUT: Only valid OpenSCAD in \`\`\` blocks

            [CONSTRAINTS]
            - No markdown beyond code fences
            - No explanation
            - Prefer translate/rotate over CSG`;
    const completion = await openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [
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
    const codeMatch = generatedText.match(/```openscad([\s\S]*?)```/i);
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
        console.log(req.body);
        const message = req.body.prompt;
        const code = req.body.code;
        console.log(message);
        let specs_and_math = await verifyTheMath(code, message);
        let openscadeCode = await generateOpenscad(message, code, specs_and_math);

        res.json({
            code: openscadeCode,
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


app.post('/save', (req, res) => {
    console.log(req.body);
    res.json({
        result: "success"
    });
});

// Redirect middleware for /ads.txt
app.get('/ads.txt', (req, res) => {
  res.redirect(301, 'https://srv.adstxtmanager.com/19390/promptscad.com');
});

app.post('/generate', (req, res) => {
    console.log(req.body);
    res.json({
        result: "success"
    })
})
app.use(express.static('public'));
// Start server

app.listen(PORT, () => {
    console.log(`Server listening on port: ${PORT}`);
});
