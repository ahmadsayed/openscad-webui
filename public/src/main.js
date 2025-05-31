// main.js - Entry point that initializes all modules

import { createScene } from './scene.js';
import { OpenSCADRenderer } from './openscadRenderer.js';
import { initCodeEditor } from './editor/codeEditor.js';
import { initChatEditor } from './editor/chatEditor.js';
import { splitScreen, initVerticalResize } from './ui/layout.js';
import { initMenu } from './ui/menu.js';
import { downloadSCAD } from './utils/fileUtils.js';
import { saveCode, loadCode, getMostRecentCode, autoSaveCode, syncCodeBetweenModes } from './utils/codeStorage.js';
import { initializeImprovedDrawing } from './utils/drawingSystem.js';

// Global state
let scene;
let renderer;
let codeEditor;
// JavaScript to handle placeholder behavior for chat editor
document.addEventListener('DOMContentLoaded', function () {
    // Get the Ace Editor instance for the chat
    const chatEditor = ace.edit("chatEditor");
    const placeholder = document.querySelector('.placeholder-text');

    // Hide placeholder immediately when editor gains focus (user clicks into it)
    chatEditor.on('focus', function () {
        placeholder.style.opacity = '0';
    });

    // Hide placeholder as soon as any key is pressed (before actual text change occurs)
    chatEditor.container.addEventListener('keydown', function () {
        placeholder.style.opacity = '0';
    });

    // Show placeholder only when editor loses focus AND is empty
    chatEditor.on('blur', function () {
        if (chatEditor.getValue().trim() === '') {
            placeholder.style.opacity = '0.7';
        }
    });

    // Initial check - if editor already has content (e.g. on page reload), hide placeholder
    if (chatEditor.getValue().trim() !== '') {
        placeholder.style.opacity = '0';
    }
});
// Initialize the application
async function init() {
    // Create the rendering scene
    scene = await createScene();

    // Initialize the OpenSCAD renderer
    renderer = new OpenSCADRenderer(scene);
    
    // Initialize the code editor
    codeEditor = initCodeEditor(code => {
        // Auto-save code when it changes
        autoSaveCode('main', code);
        
        // Don't auto-render on change - only render on save or generation complete
    });

    // Load saved code or use default
    const savedCode = loadCode('main') || getMostRecentCode();
    const defaultCode = savedCode || "cube(20, center=true);";
    codeEditor.setValue(defaultCode);
    renderer.renderOpenSCAD(defaultCode);

    // Initialize the chat editor with code generation capability
    initChatEditor(async (message) => {
        try {
            const code = await generateCodeFromMessage(message, codeEditor.getValue());
            codeEditor.setValue(code);
            // Save the generated code immediately
            saveCode('main', code);
            renderer.renderOpenSCAD(code);
            return true;
        } catch (error) {
            console.error('Error generating code:', error);
            return false;
        }
    });

    // Initialize the UI components
    splitScreen();
    initVerticalResize();
    initMenu(codeEditor, renderer);

    // Initialize improved drawing system after a short delay
    setTimeout(() => {
        initializeImprovedDrawing();
    }, 1500);

    // Export necessary functions to window for HTML event handlers
    window.newDesign = () => {
        const defaultCode = "cube(20, center=true);";
        codeEditor.setValue(defaultCode);
        saveCode('main', defaultCode);
        // Clear and render the default cube
        renderer.renderOpenSCAD(defaultCode);
    };
    
    window.saveDesign = () => {
        const code = codeEditor.getValue();
        saveCode('main', code);
        renderer.renderOpenSCAD(code);
    };
    
    // Create a render function for manual rendering
    window.renderCode = () => {
        const code = codeEditor.getValue();
        renderer.renderOpenSCAD(code);
    };
    
    window.downloadSTL = () => {
        renderer.downloadSTL().catch(error => {
            console.error("Failed to download STL:", error);
        });
    };

    window.downloadSCAD = () => {
        const code = codeEditor.getValue();
        downloadSCAD(code);
    };

    // Save code before navigating to simple mode
    window.addEventListener('beforeunload', () => {
        const currentCode = codeEditor.getValue();
        syncCodeBetweenModes('main', 'simple', currentCode);
    });

    // Export mode switch handler to window
    window.handleModeSwitch = (event, targetMode) => {
        event.preventDefault();
        
        // Force hide any processing indicators before switching
        if (renderer && renderer.forceHideProcessingIndicator) {
            renderer.forceHideProcessingIndicator();
        }
        
        const currentCode = codeEditor.getValue();
        syncCodeBetweenModes('main', targetMode, currentCode);
        window.location.href = targetMode === 'simple' ? 'simple.html' : 'main.html';
    };

}

// Call API to generate code from user message
async function generateCodeFromMessage(message, currentCode) {
    try {
        // Check if drawing mode is active and capture image if needed
        const isDrawingMode = window.getDrawingMode && window.getDrawingMode();
        
        if (isDrawingMode) {
            // Capture the annotation canvas as image
            const annotationCanvas = document.getElementById('annotationCanvas');
            if (annotationCanvas) {
                const imageData = annotationCanvas.toDataURL('image/png');
                
                // Check if there's actually any drawing on the canvas
                const hasDrawing = checkCanvasHasDrawing(annotationCanvas);
                
                if (hasDrawing) {
                    console.log('🎨 Drawing detected, using visual processing');
                    return await generateCodeFromVisualInput(imageData, message, currentCode);
                }
            }
        }
        
        // Fallback to text-only generation
        console.log('📝 Using text-only generation');
        return await generateCodeFromTextInput(message, currentCode);
    } catch (error) {
        console.error('Generation error:', error);
        // Fallback to simple generation
        return fallbackCodeGeneration(message);
    }
}

// Generate code from visual input (drawing + text)
async function generateCodeFromVisualInput(imageData, message, currentCode) {
    /*
    you are a senior cad engineer. you are giving feedback based on the red drawing attached. provide minimal instruction about the required modification include relative dimension of the change. and consider the following axis, green is y, red is x, blue is z for example : Make this modification, the size of change is x% of the current model, apply the change along Y coordinate
    */
    try {
        const visualPrompt = `${message}`;
        
        const response = await fetch('/process-visual', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imageData: imageData,
                prompt: visualPrompt
            })
        });
        
        if (!response.ok) {
            throw new Error('Visual processing failed');
        }
        
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Visual processing failed');
        }
        
        // Extract OpenSCAD code from the visual processing result
        const visualDescription = result.result;
        
        // Now use the visual description to generate code via the regular pipeline
        const enhancedMessage = `${message}. Based on this visual analysis: ${visualDescription}`;
        return await generateCodeFromTextInput(enhancedMessage, currentCode);
        
    } catch (error) {
        console.error('Visual processing error:', error);
        // Fallback to text-only generation
        return await generateCodeFromTextInput(message, currentCode);
    }
}

// Generate code from text input only
async function generateCodeFromTextInput(message, currentCode) {
    try {
        // Step 1: Initiate code generation and get request ID
        const initResponse = await fetch('/generate-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: currentCode,
                prompt: message
            }),
        });

        if (!initResponse.ok) throw new Error('Network response was not ok');
        const initData = await initResponse.json();

        if (!initData.success) throw new Error(initData.error || 'Initial request failed');
        const requestId = initData.requestId;

        // Step 2: Poll for status until completion or error
        return await pollForCompletion(requestId);
    } catch (error) {
        console.error('Text generation error:', error);
        throw error;
    }
}

// Check if canvas has any drawing on it
function checkCanvasHasDrawing(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Check if any pixel has non-zero alpha (indicating drawing)
    for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) {
            return true;
        }
    }
    return false;
}

async function pollForCompletion(requestId, interval = 1000, maxAttempts = 200) {
    // Use requestAnimationFrame for more consistent timing across browsers
    await new Promise(resolve => {
        const start = performance.now();
        const checkTime = (timestamp) => {
            if (timestamp - start >= interval) {
                resolve();
            } else {
                requestAnimationFrame(checkTime);
            }
        };
        requestAnimationFrame(checkTime);
    });

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const statusResponse = await fetch(`/status/${requestId}`);
            if (!statusResponse.ok) throw new Error('Status check failed');

            const statusData = await statusResponse.json();
            const submitButton = document.getElementById('chatSubmit');
            const chatContainer = document.querySelector('.chat-container');

            // Update submit button with current phase if available
            if (statusData.phase) {
                if (submitButton) {
                    const textSpan = submitButton.querySelector('.button-text');
                    if (textSpan) {
                        textSpan.textContent = statusData.phase;
                    }
                    submitButton.classList.add('processing');
                }
            }

            if (statusData.status === 'done' && statusData.success) {
                submitButton.classList.remove('processing');
                chatContainer.classList.remove('thinking');
                const chatEditor = ace.edit("chatEditor");
                chatEditor.setReadOnly(false);

                const textSpan = submitButton.querySelector('.button-text');
                if (textSpan) {
                    textSpan.textContent = "Send";
                }
                return statusData.code;
            }
            if (statusData.status === 'error') {
                throw new Error(statusData.error || 'Processing error');
            }

            // If still processing, wait before next poll using requestAnimationFrame
            await new Promise(resolve => {
                const start = performance.now();
                const checkTime = (timestamp) => {
                    if (timestamp - start >= interval) {
                        resolve();
                    } else {
                        requestAnimationFrame(checkTime);
                    }
                };
                requestAnimationFrame(checkTime);
            });
        } catch (error) {
            throw error; // Re-throw to be caught by outer try-catch
        }
    }
    throw new Error('Max polling attempts reached');
}

// Simple fallback code generation
function fallbackCodeGeneration(message) {
    let generatedCode = '// Generated from chat input\n';
    if (message.toLowerCase().includes('cube')) {
        const size = message.match(/\d+/)?.[0] || 10;
        generatedCode += `cube(${size}, center=true);`;
    } else if (message.toLowerCase().includes('sphere')) {
        const radius = message.match(/\d+/)?.[0] || 5;
        generatedCode += `sphere(r=${radius});`;
    } else {
        generatedCode += `// Could not generate code from: "${message}"\n`
            + `// Try asking for a cube or sphere`;
    }
    return generatedCode;
}

// Initialize the application when the page loads
window.addEventListener('load', init);
