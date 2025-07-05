// codeEditor.js - Manages the main code editor

import { defineOpenSCADMode } from './modes/openscad.js';

let editor = null;

/**
 * Initialize the main code editor with OpenSCAD syntax highlighting
 * @param {Function} onChangeCallback - Callback function to execute when code changes
 * @returns {Object} The editor instance with helper functions
 */
export function initCodeEditor(onChangeCallback) {
    // Define the OpenSCAD mode for syntax highlighting
    defineOpenSCADMode();
    
    // Initialize the editor
    editor = ace.edit("editor");
    editor.setTheme("ace/theme/monokai");
    editor.session.setMode("ace/mode/openscad");
    editor.setOptions({
        fontSize: "12pt",
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        enableSnippets: true,
        highlightActiveLine: true,
        highlightSelectedWord: true,
        showFoldWidgets: true,
        showLineNumbers: true,
        showPrintMargin: false,
        fadeFoldWidgets: false,
        foldStyle: "markbeginend",
        enableFolding: true,
        showInvisibles: false,
        displayIndentGuides: true
    });
    editor.resize();
    
    // Setup change detection
    if (typeof onChangeCallback === 'function') {
        editor.session.on('change', function() {
            onChangeCallback(editor.getValue());
        });
    }
    
    // Setup keyboard shortcuts
    setupKeyboardShortcuts(onChangeCallback);
    
    // Return the editor interface
    return {
        getValue: () => editor.getValue(),
        setValue: (value) => editor.setValue(value),
        getEditor: () => editor
    };
}

/**
 * Setup keyboard shortcuts for the editor
 * @param {Function} onChangeCallback - Callback for code changes
 */
function setupKeyboardShortcuts(onChangeCallback) {
    const editorComponent = document.querySelector('#editor');
    
    editorComponent.addEventListener('keydown', function(e) {
        // Ctrl+S or Cmd+S: Save and render
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (typeof onChangeCallback === 'function') {
                onChangeCallback(editor.getValue());
            }
            // Also trigger the save design function
            if (window.saveDesign) {
                window.saveDesign();
            }
        }
        
        // Ctrl+N or Cmd+N: New design
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            if (window.newDesign) {
                window.newDesign();
            }
        }
        
        // Ctrl+O or Cmd+O: Open
        if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
            e.preventDefault();
            if (window.openDesign) {
                window.openDesign(e);
            }
        }
        
        // Ctrl+Shift+[ or Cmd+Shift+[: Fold current block
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '[') {
            e.preventDefault();
            editor.session.foldAll();
        }
        
        // Ctrl+Shift+] or Cmd+Shift+]: Unfold current block
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === ']') {
            e.preventDefault();
            editor.session.unfold();
        }
        
        // Alt+L: Toggle fold at current line
        if (e.altKey && e.key === 'l') {
            e.preventDefault();
            const row = editor.getCursorPosition().row;
            if (editor.session.isRowFolded(row)) {
                editor.session.unfold(row);
            } else {
                editor.session.foldAll(row, row);
            }
        }
    });
}
