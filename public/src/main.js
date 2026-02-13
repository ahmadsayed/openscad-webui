// main.js - Entry point that initializes all modules

// Core components
import { createScene } from './scene.js';
import { OpenSCADRenderer } from './openscadRenderer.js';

// Editor components
import { initCodeEditor } from './editor/codeEditor.js';
import { initChatEditor } from './editor/chatEditor.js';

// UI components
import { splitScreen, initVerticalResize } from './ui/layout.js';
import { initMenu } from './ui/menu.js';

// Storage utilities
import { 
    saveCode, 
    loadCode, 
    getMostRecentCode, 
    syncCodeBetweenModes 
} from './utils/storage/index.js';
import { initChatHistory, loadChatHistory } from './ui/chatHistory.js';
import { downloadSCAD } from './utils/fileUtils.js';

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
        // Only render on manual save (Ctrl+S)
        // No auto-save functionality
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
            await saveCode('main', code);
            await renderer.renderOpenSCAD(code);
            
            // Reload chat history to show the new model
            loadChatHistory();
            
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

    // Drawing system removed - no initialization needed

    // Initialize chat history
    initChatHistory();

    // Export necessary functions to window for HTML event handlers
    window.newDesign = async () => {
        const defaultCode = "cube(20, center=true);";
        codeEditor.setValue(defaultCode);
        await saveCode('main', defaultCode);
        // Clear and render the default cube
        renderer.renderOpenSCAD(defaultCode);
    };
    
    window.saveDesign = async () => {
        console.log('💾 Manual save triggered - recalculating hash and checking cache...');
        const code = codeEditor.getValue();
        
        // Always render with hash recalculation and cache check
        // This will handle cache lookup and only regenerate if needed
        await manualRender(code);
        
        // After rendering, get the STL data (either from cache or newly generated)
        const stlData = renderer.getCurrentStlData();
        await saveCode('main', code, stlData);
        
        console.log('✅ Manual save complete with up-to-date hash and STL data');
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
    window.addEventListener('beforeunload', async () => {
        const currentCode = codeEditor.getValue();
        const currentStlData = renderer ? renderer.getCurrentStlData() : null;
        await syncCodeBetweenModes('main', 'simple', currentCode, currentStlData);
    });

    // Export mode switch handler to window
    window.handleModeSwitch = async (event, targetMode) => {
        await sharedHandleModeSwitch(event, targetMode, 'main', codeEditor.getValue(), renderer);
    };

    // Listen for history model load events
    document.addEventListener('historyModelLoad', (event) => {
        const { code, stlData } = event.detail;
        codeEditor.setValue(code);
        renderer.renderOpenSCAD(code);
        console.log('Model loaded from history');
    });

}

// Shared utilities
import { 
    generateCodeFromMessage as sharedGenerateCodeFromMessage,
    fallbackCodeGeneration as sharedFallbackCodeGeneration,
    handleModeSwitch as sharedHandleModeSwitch
} from './utils/sharedFunctions.js';
import { generateCodeFromTextInput } from './utils/codeGeneration.js';

// Use shared generateCodeFromMessage function
async function generateCodeFromMessage(message, currentCode) {
    return await sharedGenerateCodeFromMessage(message, currentCode, renderer);
}

// Use shared fallbackCodeGeneration function
function fallbackCodeGeneration(message) {
    return sharedFallbackCodeGeneration(message);
}

// Manual render function (called on save)
async function manualRender(code) {
    try {
        console.log('🔄 Manual render triggered...');
        await renderer.renderOpenSCAD(code);
        console.log('✅ Manual render complete');
    } catch (error) {
        console.error('Render error:', error);
    }
}


// Initialize the application when the page loads
window.addEventListener('load', init);
