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
            const annotationCanvas = document.getElementById('annotationCanvas');
            const renderCanvas = document.getElementById('renderCanvas');
            
            if (annotationCanvas && renderCanvas) {
                // Create a combined canvas
                const combinedCanvas = document.createElement('canvas');
                combinedCanvas.width = renderCanvas.width;
                combinedCanvas.height = renderCanvas.height;
                const ctx = combinedCanvas.getContext('2d');
                
                // Ensure Babylon scene is rendered
                renderer.scene.render();
                
                // Draw render canvas first (Babylon 3D model)
                ctx.drawImage(renderCanvas, 0, 0);
                
                // Draw annotation canvas on top (user markings)
                ctx.drawImage(annotationCanvas, 0, 0);
                
                const imageData = combinedCanvas.toDataURL('image/png');
                
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

// Import shared code generation utilities
import { 
    checkCanvasHasDrawing, 
    generateCodeFromVisualInput, 
    generateCodeFromTextInput 
} from './utils/codeGeneration.js';

// Simple fallback code generation for main.js
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
