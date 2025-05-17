// main.js - Entry point that initializes all modules

import { createScene } from './scene.js';
import { OpenSCADRenderer } from './openscadRenderer.js';
import { initCodeEditor } from './editor/codeEditor.js';
import { initChatEditor } from './editor/chatEditor.js';
import { splitScreen, initVerticalResize } from './ui/layout.js';
import { initMenu } from './ui/menu.js';

// Global state
let scene;
let renderer;
let codeEditor;
// JavaScript to handle vertical resizing between editor and chat
document.addEventListener('DOMContentLoaded', function() {
  const resizeBarVertical = document.querySelector('.resize-bar-vertical');
  const editor = document.getElementById('editor');
  const chatContainer = document.querySelector('.chat-container');
  
  if (resizeBarVertical && editor && chatContainer) {
    let isResizing = false;
    let startY, startHeightEditor, startHeightChat;
    
    // Function to handle mouse down event
    const startResize = function(e) {
      isResizing = true;
      startY = e.clientY;
      startHeightEditor = editor.offsetHeight;
      startHeightChat = chatContainer.offsetHeight;
      
      // Add resize class to body
      document.body.classList.add('resizing-vertical');
      
      // Prevent text selection during resize
      document.body.style.userSelect = 'none';
    };
    
    // Function to handle mouse move event
    const resizeElement = function(e) {
      if (!isResizing) return;
      
      // Calculate height difference
      const deltaY = e.clientY - startY;
      
      // Adjust height of editor and chat container
      const newEditorHeight = startHeightEditor + deltaY;
      const newChatHeight = startHeightChat - deltaY;
      
      // Apply new heights if they meet minimum requirements
      if (newEditorHeight > 100 && newChatHeight > 100) {
        editor.style.height = newEditorHeight + 'px';
        editor.style.flex = '0 0 ' + newEditorHeight + 'px';
        chatContainer.style.flex = '1';
      }
    };
    
    // Function to handle mouse up event
    const stopResize = function() {
      if (isResizing) {
        isResizing = false;
        document.body.classList.remove('resizing-vertical');
        document.body.style.userSelect = '';
      }
    };
    
    // Add event listeners
    resizeBarVertical.addEventListener('mousedown', startResize);
    document.addEventListener('mousemove', resizeElement);
    document.addEventListener('mouseup', stopResize);
    
    // Touch support for mobile devices
    resizeBarVertical.addEventListener('touchstart', function(e) {
      const touch = e.touches[0];
      startResize({ clientY: touch.clientY });
    });
    
    document.addEventListener('touchmove', function(e) {
      if (!isResizing) return;
      const touch = e.touches[0];
      resizeElement({ clientY: touch.clientY });
    });
    
    document.addEventListener('touchend', stopResize);
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
        renderer.renderOpenSCAD(code);
    });

        // Set default cube and render it
    const defaultCode = "cube(20, center=true);";
    codeEditor.setValue(defaultCode);
    renderer.renderOpenSCAD(defaultCode);

    // Initialize the chat editor with code generation capability
    initChatEditor(async (message) => {
        try {
            const code = await generateCodeFromMessage(message, codeEditor.getValue());
            codeEditor.setValue(code);
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
    
    // Export necessary functions to window for HTML event handlers
    window.newDesign = () => codeEditor.setValue("");
    window.saveDesign = () => renderer.renderOpenSCAD(codeEditor.getValue());
    window.downloadSTL = () => renderer.downloadSTL();
    
    window.downloadSCAD = () => {
        const code = codeEditor.getValue();
        downloadTextAsFile("code.scad", code);
    };

}

// Call API to generate code from user message
async function generateCodeFromMessage(message, currentCode) {
    try {
        const response = await fetch('/generate-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: currentCode,
                prompt: message
            }),
        });

        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        if (!data.success) throw new Error(data.error || 'Unknown error');
        return data.code;
    } catch (error) {
        console.error('Generation error:', error);
        // Fallback to simple generation
        return fallbackCodeGeneration(message);
    }
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