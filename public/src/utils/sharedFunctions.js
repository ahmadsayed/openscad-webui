/**
 * Shared utility functions for both main.js and simple.js
 * This file contains common functionality to eliminate code duplication
 */

import { checkCanvasHasDrawing, generateCodeFromVisualInput, generateCodeFromTextInput } from './codeGeneration.js';
import { syncCodeBetweenModes } from './codeStorage.js';

/**
 * Shared function to generate code from user message
 * Handles both visual and text-based generation with optimized performance
 * @param {string} message - The user's message
 * @param {string} currentCode - The current code for incremental building
 * @param {Object} renderer - The renderer instance
 * @returns {Promise<string>} - The generated code
 */
export async function generateCodeFromMessage(message, currentCode, renderer) {
    try {
        // Check if drawing mode is active and capture image if needed
        const isDrawingMode = window.getDrawingMode && window.getDrawingMode();
        
        if (isDrawingMode) {
            const annotationCanvas = document.getElementById('annotationCanvas');
            const renderCanvas = document.getElementById('renderCanvas');
            
            if (annotationCanvas && renderCanvas) {
                // Quick check for drawing before expensive operations
                const hasDrawing = checkCanvasHasDrawing(annotationCanvas);
                if (!hasDrawing) {
                    return await generateCodeFromTextInput(message, currentCode);
                }
                
                // Use requestAnimationFrame for smoother rendering
                await new Promise(resolve => requestAnimationFrame(resolve));
                
                // Ensure Babylon scene is rendered
                renderer.scene.render();
                
                // Create combined canvas efficiently
                const combinedCanvas = document.createElement('canvas');
                combinedCanvas.width = renderCanvas.width;
                combinedCanvas.height = renderCanvas.height;
                const ctx = combinedCanvas.getContext('2d');
                
                // Draw both canvases in one operation
                ctx.drawImage(renderCanvas, 0, 0);
                ctx.drawImage(annotationCanvas, 0, 0);
                
                const imageData = combinedCanvas.toDataURL('image/png', 0.8); // Use compression
                
                console.log('🎨 Drawing detected, using visual processing');
                return await generateCodeFromVisualInput(imageData, message, currentCode);
            }
        }
        
        // Fast text-only generation path
        console.log('📝 Using text-only generation');
        return await generateCodeFromTextInput(message, currentCode);
    } catch (error) {
        console.error('Generation error:', error);
        // Immediate fallback without additional processing
        return fallbackCodeGeneration(message, currentCode);
    }
}

/**
 * Fallback code generation when API calls fail
 * @param {string} message - The user's message
 * @param {string} currentCode - The current code (optional)
 * @returns {string} - Generated fallback code
 */
export function fallbackCodeGeneration(message, currentCode = null) {
    const lowerMessage = message.toLowerCase();
    let generatedCode = '// Generated from chat input\n';
    
    if (currentCode) {
        generatedCode += '// Building on: ' + currentCode.split('\n')[0] + '\n\n';
    }
    
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
        // Default to a simple cube
        generatedCode += `// Try describing shapes like: cube, sphere, cylinder, house, or pyramid\n`;
        generatedCode += `cube([20, 20, 20], center=true);`;
    }
    
    return generatedCode;
}

/**
 * Shared mode switch handler for both main and simple modes
 * @param {Event} event - The click event
 * @param {string} targetMode - The target mode ('main' or 'simple')
 * @param {string} currentMode - The current mode
 * @param {string} currentCode - The current code
 * @param {Object} renderer - The renderer instance
 */
export async function handleModeSwitch(event, targetMode, currentMode, currentCode, renderer) {
    event.preventDefault();
    
    // Force hide any processing indicators before switching
    if (renderer && renderer.forceHideProcessingIndicator) {
        renderer.forceHideProcessingIndicator();
    }
    
    // Use microtask to avoid blocking the UI
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const currentStlData = renderer ? renderer.getCurrentStlData() : null;
    await syncCodeBetweenModes(currentMode, targetMode, currentCode, currentStlData);
    window.location.href = targetMode === 'simple' ? 'simple.html' : 'main.html';
}

/**
 * Shared placeholder setup for Ace editors
 * @param {Object} editor - The Ace editor instance
 * @param {string} placeholderSelector - CSS selector for the placeholder element
 */
export function setupPlaceholder(editor, placeholderSelector) {
    const placeholder = document.querySelector(placeholderSelector);
    if (!placeholder) return;

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

/**
 * Shared initialization for improved drawing system
 */
export function initializeDrawingSystem() {
    setTimeout(() => {
        import('./drawingSystem.js').then(module => {
            module.initializeImprovedDrawing();
        });
    }, 1500);
}
