// codeEditor.js - Manages the main code editor

import { defineOpenSCADMode } from './modes/openscad.js';

let editor = null;

/**
 * Initialize the main code editor with OpenSCAD syntax highlighting
 * @param {Function} onSaveCallback - Callback function to execute when Ctrl+S is pressed
 * @returns {Object} The editor instance with helper functions
 */
export function initCodeEditor(onSaveCallback) {
    // Define the OpenSCAD mode for syntax highlighting
    defineOpenSCADMode();
    
    // Initialize the editor
    editor = ace.edit("editor");
    editor.setTheme("ace/theme/monokai");
    editor.session.setMode("ace/mode/openscad");
    editor.setOptions({
        fontSize: "15pt"
    });
    editor.resize();
    
    // Track Ctrl key state
    let isCtrl = false;
    
    // Setup keyboard shortcuts
    setupKeyboardShortcuts(onSaveCallback);
    
    // Return the editor interface
    return {
        getValue: () => editor.getValue(),
        setValue: (value) => editor.setValue(value),
        getEditor: () => editor
    };
}

/**
 * Setup keyboard shortcuts for the editor
 * @param {Function} onSaveCallback - Callback for save action
 */
function setupKeyboardShortcuts(onSaveCallback) {
    let isCtrl = false;
    const editorComponent = document.querySelector('#editor');
    
    editorComponent.addEventListener('keydown', function(e) {
        // Track Ctrl key press
        if (e.keyCode == 17) {
            e.preventDefault();
            isCtrl = true;
        }
        
        // Ctrl+S: Save
        if (e.keyCode == 83 && isCtrl) {
            e.preventDefault();
            if (typeof onSaveCallback === 'function') {
                onSaveCallback(editor.getValue());
            }
        }
        
        // Ctrl+O: Open
        if (e.keyCode == 79 && isCtrl) {
            e.preventDefault();
            window.openDesign(e);
        }
    });
    
    editorComponent.addEventListener('keyup', function(e) {
        // Track Ctrl key release
        if (e.keyCode == 17) {
            e.preventDefault();
            isCtrl = false;
        }
    });
}