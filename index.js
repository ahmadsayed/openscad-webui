import express from 'express';
import OpenAI from 'openai';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { 
    validateOpenSCADSyntax, 
    verifyTheMath, 
    generateOpenscad, 
    processVisualInput, 
    processRequest 
} from './src/openscadGenerator.js';

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

// Configure PUG template engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'public'));

// Routes for PUG templates
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/main.html', (req, res) => {
    res.render('main');
});

app.get('/simple.html', (req, res) => {
    res.render('simple');
});

app.get('/gallery.html', (req, res) => {
    res.render('gallery');
});

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




app.post('/generate-code', async (req, res) => {
    try {
        const requestId = uuidv4();
        console.log("Start processing Request : " + requestId);

        // Trim prompt if over 64 words
        const prompt = req.body.prompt.split(/\s+/).length > 64
            ? req.body.prompt.split(/\s+/).slice(0, 64).join(' ')
            : req.body.prompt;

        processRequest(requestId, prompt, req.body.code, openai, REQUEST_DIR);

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




app.get('/status/:requestId', async (req, res) => {
    try {
        const requestFile = path.join(REQUEST_DIR, `${req.params.requestId}.json`);
        const data = await fs.readFile(requestFile, 'utf8');
        const result = JSON.parse(data);
        res.set('Cache-Control', 'no-store')
        res.json({
            status: result.status,
            phase: result.phase || 'working',
            progress: result.progress || 0,
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

        const analysis  = await processVisualInput(imageData, prompt, qwenClient);
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
