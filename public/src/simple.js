// simple.js - Simplified entry point for non-technical users

import { createScene } from './scene.js';
import { OpenSCADRenderer } from './openscadRenderer.js';

// Global state
let scene;
let renderer;
let chatEditor;
let currentCode = "cube(20, center=true);"; // Track the current code for incremental building

// Initialize the simplified application
async function init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        await new Promise(resolve => {
            document.addEventListener('DOMContentLoaded', resolve);
        });
    }

    // Create the rendering scene
    scene = await createScene();

    // Initialize the OpenSCAD renderer with simple layout compatibility
    renderer = new SimpleOpenSCADRenderer(scene);

    // Initialize the simple chat editor
    initSimpleChatEditor();

    // Set default cube and render it
    const defaultCode = "cube(20, center=true);";
    currentCode = defaultCode; // Initialize current code tracking
    renderer.renderOpenSCAD(defaultCode);

    // Export necessary functions to window for HTML event handlers
    window.newDesign = () => {
        const defaultCode = "cube(20, center=true);";
        currentCode = defaultCode; // Reset current code tracking
        renderer.renderOpenSCAD(defaultCode);
    };

    window.downloadSTL = () => {
        renderer.downloadSTL().catch(error => {
            console.error("Failed to download STL:", error);
        });
    };
}

// Extended renderer class for simple layout compatibility
class SimpleOpenSCADRenderer extends OpenSCADRenderer {
    /**
     * Creates the processing indicator element for simple layout
     * @private
     */
    _createProcessingIndicator() {
        // Check if the indicator already exists
        if (document.querySelector('.processing-indicator')) {
            return;
        }
        
        // Create the indicator elements
        const indicator = document.createElement('div');
        indicator.className = 'processing-indicator';
        
        const spinner = document.createElement('div');
        spinner.className = 'spinner';
        
        const text = document.createElement('div');
        text.className = 'processing-text';
        text.textContent = 'Processing OpenSCAD...';
        
        // Assemble the indicator
        indicator.appendChild(spinner);
        indicator.appendChild(text);
        
        // Add to the simple 3D section instead of split__right
        const container = document.querySelector('.simple-3d-section') || document.querySelector('.split__right');
        if (container) {
            container.appendChild(indicator);
        }
    }
}

// Initialize the simple chat editor
function initSimpleChatEditor() {
    // Initialize the chat editor
    chatEditor = ace.edit("simpleChatEditor");
    configureSimpleEditor(chatEditor);
    
    // Setup event handlers
    setupSimpleEventHandlers(chatEditor);
    
    // Setup placeholder behavior
    setupSimplePlaceholder(chatEditor);
}

// Configure the simple chat editor
function configureSimpleEditor(editor) {
    editor.setTheme("ace/theme/chrome");
    editor.session.setMode("ace/mode/text");
    editor.renderer.setShowGutter(false);
    editor.setOptions({
        fontSize: "16pt",
        scrollPastEnd: 0.5,
        highlightActiveLine: false,
        showPrintMargin: false,
        minLines: 3,
        maxLines: 3,
        wrap: true,
        autoScrollEditorIntoView: true
    });
}

// Setup event handlers for the simple chat editor
function setupSimpleEventHandlers(editor) {
    // Handle Enter/Shift+Enter
    const editorEl = document.getElementById('simpleChatEditor');
    editorEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitSimpleChat(editor);
        }
    });

    // Handle submit button click
    document.getElementById('simpleChatSubmit').addEventListener('click', () => {
        submitSimpleChat(editor);
    });
}

// Setup placeholder behavior for simple chat editor
function setupSimplePlaceholder(editor) {
    const placeholder = document.querySelector('.simple-placeholder-text');

    // Hide placeholder immediately when editor gains focus
    editor.on('focus', function () {
        placeholder.style.opacity = '0';
    });

    // Hide placeholder as soon as any key is pressed
    editor.container.addEventListener('keydown', function () {
        placeholder.style.opacity = '0';
    });

    // Show placeholder only when editor loses focus AND is empty
    editor.on('blur', function () {
        if (editor.getValue().trim() === '') {
            placeholder.style.opacity = '0.7';
        }
    });

    // Initial check - if editor already has content, hide placeholder
    if (editor.getValue().trim() !== '') {
        placeholder.style.opacity = '0';
    }
}

// Handle simple chat submission
async function submitSimpleChat(editor) {
    const message = editor.getValue().trim();
    const submitButton = document.getElementById('simpleChatSubmit');
    const icon = submitButton.querySelector('i') || submitButton.querySelector('svg');
    const originalText = submitButton.querySelector('.button-text')?.textContent || submitButton.textContent;

    if (!message) return;

    // Check word count limit (64 words max)
    const wordCount = message.split(/\s+/).filter(word => word.length > 0).length;
    if (wordCount > 64) {
        submitButton.classList.add('error');
        const textSpan = submitButton.querySelector('.button-text') || document.createElement('span');
        textSpan.className = 'button-text';
        textSpan.textContent = 'Too long! (64 words max)';
        if (!submitButton.contains(textSpan)) {
            submitButton.innerHTML = '';
            if (icon) submitButton.appendChild(icon);
            submitButton.appendChild(textSpan);
        }
        setTimeout(() => {
            submitButton.classList.remove('error');
            textSpan.textContent = originalText;
        }, 2000);
        return;
    }

    // Create text span if it doesn't exist
    let textSpan = submitButton.querySelector('.button-text');
    if (!textSpan) {
        textSpan = document.createElement('span');
        textSpan.className = 'button-text';
        submitButton.innerHTML = '';
        if (icon) submitButton.appendChild(icon);
        submitButton.appendChild(textSpan);
    }

    try {
        // Show processing state
        editor.setReadOnly(true);
        submitButton.classList.add('processing');
        textSpan.textContent = 'Creating...';

        // Generate code from message using current code for incremental building
        const code = await generateCodeFromMessage(message, currentCode);
        
        // Update current code and render the generated code
        currentCode = code;
        await renderer.renderOpenSCAD(code);
        
        // Clear the input on success
        editor.setValue("");
        
        // Show success message briefly
        textSpan.textContent = 'Created!';
        setTimeout(() => {
            textSpan.textContent = originalText;
        }, 1500);
        
    } catch (error) {
        console.error('Simple chat submission error:', error);
        textSpan.textContent = 'Error!';
        setTimeout(() => {
            textSpan.textContent = originalText;
        }, 2000);
    } finally {
        // Restore editor state
        setTimeout(() => {
            submitButton.classList.remove('processing');
            editor.setReadOnly(false);
        }, 1000);
    }
}

// Call API to generate code from user message
async function generateCodeFromMessage(message, currentCode) {
    try {
        // Step 1: Initiate code generation and get request ID
        const initResponse = await fetch('/generate-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: currentCode, // Use current code for incremental building
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
        console.error('Generation error:', error);
        // Fallback to simple generation with current code
        return fallbackCodeGeneration(message, currentCode);
    }
}

async function pollForCompletion(requestId, interval = 1000, maxAttempts = 200) {
    // Use requestAnimationFrame for more consistent timing
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
            const submitButton = document.getElementById('simpleChatSubmit');

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
                chatEditor.setReadOnly(false);

                const textSpan = submitButton.querySelector('.button-text');
                if (textSpan) {
                    textSpan.textContent = "Create 3D Model";
                }
                return statusData.code;
            }
            if (statusData.status === 'error') {
                throw new Error(statusData.error || 'Processing error');
            }

            // If still processing, wait before next poll
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
            throw error;
        }
    }
    throw new Error('Max polling attempts reached');
}

// Simple fallback code generation with more user-friendly examples
function fallbackCodeGeneration(message, currentCode) {
    const lowerMessage = message.toLowerCase();
    let generatedCode = '// Generated from: "' + message + '"\n';
    generatedCode += '// Building on: ' + currentCode.split('\n')[0] + '\n\n';
    
    if (lowerMessage.includes('cube') || lowerMessage.includes('box')) {
        const size = message.match(/\d+/)?.[0] || 20;
        if (lowerMessage.includes('round') || lowerMessage.includes('smooth')) {
            generatedCode += `minkowski() {\n    cube([${size}, ${size}, ${size}], center=true);\n    sphere(r=2);\n}`;
        } else {
            generatedCode += `cube([${size}, ${size}, ${size}], center=true);`;
        }
    } else if (lowerMessage.includes('sphere') || lowerMessage.includes('ball')) {
        const radius = message.match(/\d+/)?.[0] || 10;
        generatedCode += `sphere(r=${radius});`;
    } else if (lowerMessage.includes('cylinder') || lowerMessage.includes('tube')) {
        const height = message.match(/\d+/)?.[0] || 20;
        const radius = Math.floor(height / 2);
        generatedCode += `cylinder(h=${height}, r=${radius}, center=true);`;
    } else if (lowerMessage.includes('house')) {
        generatedCode += `// Simple house\n`;
        generatedCode += `// Base\ncube([30, 20, 15], center=true);\n`;
        generatedCode += `// Roof\ntranslate([0, 0, 15])\n`;
        generatedCode += `rotate([90, 0, 0])\n`;
        generatedCode += `linear_extrude(height=20, center=true)\n`;
        generatedCode += `polygon([[0, 0], [15, 10], [30, 0]]);`;
    } else if (lowerMessage.includes('pyramid')) {
        const size = message.match(/\d+/)?.[0] || 20;
        generatedCode += `// Pyramid\n`;
        generatedCode += `linear_extrude(height=${size}, scale=0)\n`;
        generatedCode += `square([${size}, ${size}], center=true);`;
    } else {
        // Default to a simple cube with a helpful comment
        generatedCode += `// Try describing shapes like: cube, sphere, cylinder, house, or pyramid\n`;
        generatedCode += `cube([20, 20, 20], center=true);`;
    }
    
    return generatedCode;
}

// Initialize the application when the page loads
window.addEventListener('load', init);
