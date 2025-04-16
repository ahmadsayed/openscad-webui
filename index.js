import express from 'express';
import OpenAI from 'openai';

let generator = null;



const app = express();
const PORT = 3000;

app.use(express.urlencoded());
app.use(express.json());

const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: ''
});

app.post('/generate-code', async (req, res) => {
    try {
        const { message } = req.body;

        const completion = await openai.chat.completions.create({
            model: "deepseek-chat",
            messages: [
                {
                    role: "system",
                    content: "You are an expert OpenSCAD engineer. Generate valid OpenSCAD code based on user requests." +
                        " Generate only the code with minimal comments and put the code in ```openscad blocks."
                },
                {
                    role: "user",
                    content: `Generate OpenSCAD code for: ${message}\n` +
                        'Requirements:\n' +
                        '- Use center=true for primitives\n' +
                        '- Use variables for measurements\n'
                }
            ],
            temperature: 0.3
        });

        const generatedText = completion.choices[0].message.content;

        // Remove all <think> blocks and HTML comments
        const sanitizedText = generatedText
            .replace(/<think>[\s\S]*?<\/think>/gmi, '')  // Remove <think> blocks
            .replace(/<!--[\s\S]*?-->/g, '')             // Remove HTML comments
            .replace(/```openscad/g, '')                 // Remove code block markers
            .replace(/```/g, '')                        // Remove any remaining backticks
            .trim();

        // Validate code structure
        if (!/(module|function|^cube|^sphere|^cylinder)/mi.test(sanitizedText)) {
            throw new Error('No valid OpenSCAD code generated');
        }

        res.json({
            code: sanitizedText,
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
