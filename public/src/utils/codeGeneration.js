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
 * Polls for request completion with constant 5-second intervals
 * @param {string} requestId 
 * @param {number} initialInterval (ignored - uses constant 5s)
 * @param {number} maxAttempts 
 * @returns {Promise<string>}
 */
export async function pollForCompletion(requestId, initialInterval = 5000, maxAttempts = 400) {
    console.log(`🔄 Polling for completion of request: ${requestId} (5-second intervals)`);
    
    const startTime = Date.now();
    let lastPhase = '';
    let consecutiveSamePhase = 0;
    let phaseProgress = 0;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const elapsedTime = Date.now() - startTime;
            const currentInterval = getOptimizedInterval(elapsedTime, attempt, consecutiveSamePhase, phaseProgress);
            
            console.log(`📡 Poll ${attempt + 1}/${maxAttempts} for ${requestId} (elapsed: ${Math.round(elapsedTime/1000)}s, interval: 5s, phase: ${lastPhase})`);
            
            const statusResponse = await fetch(`/status/${requestId}`);
            if (!statusResponse.ok) {
                console.warn(`❌ Status check failed for ${requestId}: ${statusResponse.status} ${statusResponse.statusText}`);
                // Immediate retry for network errors with shorter delay
                if (statusResponse.status >= 500 || statusResponse.status === 0) {
                    console.log(`🔄 Immediate retry for server error...`);
                    await new Promise(resolve => setTimeout(resolve, 100));
                    continue;
                }
                throw new Error(`Status check failed: ${statusResponse.status}`);
            }
            
            const statusData = await statusResponse.json();
            console.log(`📊 Request ${requestId} status:`, statusData);
            
            // Extract the actual status data (handle both old and new API formats)
            const actualStatus = statusData.data || statusData;
            
            // Check for completion
            if ((actualStatus.status === 'done' || actualStatus.status === 'complete') && actualStatus.code) {
                const totalTime = Date.now() - startTime;
                console.log(`✅ Request ${requestId} completed successfully in ${Math.round(totalTime/1000)}s (${attempt + 1} polls)`);
                return actualStatus.code;
            }
            
            // Check for errors
            if (actualStatus.status === 'error') {
                const errorMsg = actualStatus.message || actualStatus.error || 'Unknown error occurred';
                console.error(`❌ Request ${requestId} failed:`, errorMsg);
                throw new Error(errorMsg);
            }
            
            // Track phase changes and progress for smarter polling
            const currentPhase = actualStatus.phase || 'processing';
            const currentProgress = actualStatus.progress || 0;
            
            if (currentPhase === lastPhase) {
                consecutiveSamePhase++;
            } else {
                consecutiveSamePhase = 0;
                lastPhase = currentPhase;
                console.log(`🔄 Phase changed to: ${currentPhase} (${currentProgress}%)`);
            }
            
            phaseProgress = currentProgress;
            
            // Still working, wait before next poll with optimized interval
            console.log(`⏳ Request ${requestId} working... (${currentPhase}: ${currentProgress}%, same phase: ${consecutiveSamePhase})`);
            
            // Use optimized delay based on elapsed time, phase stability, and progress
            await new Promise(resolve => setTimeout(resolve, currentInterval));
            
        } catch (error) {
            console.error(`💥 Error polling request ${requestId}:`, error);
            // Faster retry for network errors
            if (error.message.includes('fetch') || error.message.includes('Network') || error.message.includes('Failed to fetch')) {
                console.log(`🔄 Fast retry for network error...`);
                await new Promise(resolve => setTimeout(resolve, 50));
                continue;
            }
            // For other errors, continue polling for a few more attempts
            if (attempt >= 2) {
                throw error;
            }
            console.log(`🔄 Retrying after error (attempt ${attempt + 1})...`);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    const totalTime = Date.now() - startTime;
    console.error(`⏰ Request ${requestId} timed out after ${maxAttempts} attempts (${Math.round(totalTime/1000)}s)`);
    throw new Error(`Request timed out after ${Math.round(totalTime/1000)} seconds`);
}

/**
 * Calculate optimized polling interval based on elapsed time, attempt count, and phase progress
 * @param {number} elapsedTime - Time elapsed in milliseconds
 * @param {number} attempt - Current attempt number
 * @param {number} consecutiveSamePhase - How many times we've been in the same phase
 * @param {number} phaseProgress - Current progress percentage (0-100)
 * @returns {number} - Polling interval in milliseconds
 */
function getOptimizedInterval(elapsedTime, attempt, consecutiveSamePhase, phaseProgress) {
    // Constant 5-second polling interval as requested
    return 5000;
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
