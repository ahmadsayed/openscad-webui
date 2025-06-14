// codeGeneration.js - Shared code generation utilities

/**
 * Checks if canvas has any drawing
 * @param {HTMLCanvasElement} canvas 
 * @returns {boolean}
 */
export function checkCanvasHasDrawing(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) {
            return true;
        }
    }
    return false;
}

/**
 * Polls for request completion
 * @param {string} requestId 
 * @param {number} interval 
 * @param {number} maxAttempts 
 * @returns {Promise<string>}
 */
export async function pollForCompletion(requestId, interval = 1000, maxAttempts = 200) {
    // Use requestAnimationFrame for consistent timing
    await new Promise(resolve => {
        const start = performance.now();
        const checkTime = (timestamp) => {
            if (timestamp - start >= interval) resolve();
            else requestAnimationFrame(checkTime);
        };
        requestAnimationFrame(checkTime);
    });

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const statusResponse = await fetch(`/status/${requestId}`);
            if (!statusResponse.ok) throw new Error('Status check failed');
            
            const statusData = await statusResponse.json();
            if (statusData.status === 'done' && statusData.success) return statusData.code;
            if (statusData.status === 'error') throw new Error(statusData.error);
            
            // Wait before next poll
            await new Promise(resolve => {
                const start = performance.now();
                const checkTime = (timestamp) => {
                    if (timestamp - start >= interval) resolve();
                    else requestAnimationFrame(checkTime);
                };
                requestAnimationFrame(checkTime);
            });
        } catch (error) {
            throw error;
        }
    }
    throw new Error('Max polling attempts reached');
}

/**
 * Generates code from visual input
 * @param {string} imageData 
 * @param {string} message 
 * @param {string} currentCode 
 * @returns {Promise<string>}
 */
export async function generateCodeFromVisualInput(imageData, message, currentCode) {
    try {
        const visualPrompt = `Provide CAD instructions for updating the 3D model based on this drawing with black markings: ${message}
        Instructions:
        1. Identify the exact location of black markings as precisely as possible
        2. Describe the axis alongside which markings are drawn (X, Y, or Z)
        3. Describe the shape and extent of each marked area
        4. Focus on specific modifications needed (e.g., "add hole", "extend surface")
        5. Reference the coordinate system:
           - Red axis: X
           - Green axis: Y 
           - Blue axis: Z
        6. Provide relative dimensions (e.g., "50% of current width")
        7. Avoid generating OpenSCAD code`;
        
        const response = await fetch('/process-visual', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageData, prompt: visualPrompt })
        });
        
        if (!response.ok) throw new Error('Visual processing failed');
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        
        const enhancedMessage = `${message}. Based on visual analysis: ${result.analysis}`;
        return await generateCodeFromTextInput(enhancedMessage, currentCode);
    } catch (error) {
        console.error('Visual processing error:', error);
        return await generateCodeFromTextInput(message, currentCode);
    }
}

/**
 * Generates code from text input
 * @param {string} message 
 * @param {string} currentCode 
 * @returns {Promise<string>}
 */
export async function generateCodeFromTextInput(message, currentCode) {
    try {
        const initResponse = await fetch('/generate-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: currentCode, prompt: message })
        });

        if (!initResponse.ok) throw new Error('Network response was not ok');
        const initData = await initResponse.json();
        if (!initData.success) throw new Error(initData.error);
        
        return await pollForCompletion(initData.requestId);
    } catch (error) {
        console.error('Text generation error:', error);
        throw error;
    }
}
