import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
    processRequest,
    processVisualInput 
} from '../controllers/openscad.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const parentDir = path.join(__dirname, '..', '..');
const REQUEST_DIR = path.join(parentDir, 'requests');

const router = express.Router();

// Generate OpenSCAD code
router.post('/generate-code', async (req, res) => {
    try {
        const requestId = uuidv4();
        console.log("Start processing Request : " + requestId);

        // Trim prompt if over 64 words
        const prompt = req.body.prompt.split(/\s+/).length > 64
            ? req.body.prompt.split(/\s+/).slice(0, 64).join(' ')
            : req.body.prompt;

        // Import openai from the service
        const { openai } = await import('../services/ai/openai.js');

        // Check if openai client is properly initialized
        if (!openai) {
            throw new Error('OpenAI client not initialized. Please set DEEPSEEK_API_KEY environment variable.');
        }

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

// Check request status
router.get('/status/:requestId', async (req, res) => {
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

// Save endpoint
router.post('/save', (req, res) => {
    console.log(req.body);
    res.json({
        result: "success"
    });
});

// Generate endpoint
router.post('/generate', (req, res) => {
    console.log(req.body);
    res.json({
        result: "success"
    });
});

// Visual processing endpoint
router.post('/process-visual', async (req, res) => {
    try {
        const { imageData, prompt } = req.body;
        
        if (!imageData) {
            return res.status(400).json({
                success: false,
                error: 'Image data is required'
            });
        }

        // Import qwen client from the service
        const { qwenClient } = await import('../services/ai/qwen.js');

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

        const analysis = await processVisualInput(imageData, prompt, qwenClient);
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

export default router;