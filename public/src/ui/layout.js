// layout.js - Manages UI layout and resizing functionality

/**
 * Initialize the horizontal split screen functionality
 */
export function splitScreen() {
    const bar = document.querySelector('.split__bar');
    const left = document.querySelector('.split__left');
    let mouseIsDown = false;

    // Handle mouse down on the split bar
    bar.addEventListener('mousedown', (e) => {
        mouseIsDown = true;
    });

    // Handle mouse movement for resizing
    document.addEventListener('mousemove', (e) => {
        if (!mouseIsDown) return;
        
        // Update the left panel width based on mouse position
        left.style.width = `${e.clientX}px`;
        
        // Make sure the canvas is resized as well
        const engine = BABYLON.Engine.LastCreatedEngine;
        if (engine) {
            engine.resize();
        }
    });

    // Handle mouse up to stop resizing
    document.addEventListener('mouseup', () => {
        mouseIsDown = false;
    });
}

/**
 * Initialize the vertical resize functionality for editor and chat
 */
export function initVerticalResize() {
    const resizeBar = document.querySelector('.resize-bar-vertical');
    const editorEl = document.getElementById('editor');
    const chatContainer = document.querySelector('.chat-container');
    let isDragging = false;

    // Handle mouse down on the resize bar
    resizeBar.addEventListener('mousedown', (e) => {
        isDragging = true;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    /**
     * Handle mouse movement for vertical resizing
     * @param {MouseEvent} e - The mouse event
     */
    function onMouseMove(e) {
        if (!isDragging) return;
        
        const container = editorEl.parentElement;
        const containerRect = container.getBoundingClientRect();
        const y = e.clientY - containerRect.top;

        // Update element heights
        editorEl.style.height = `${y - 2}px`;
        chatContainer.style.height = `calc(100% - ${y + 3}px)`;

        // Resize the editors
        const codeEditor = ace.edit('editor');
        const chatEditor = ace.edit('chatEditor');
        if (codeEditor) codeEditor.resize();
        if (chatEditor) chatEditor.resize();
    }

    /**
     * Handle mouse up to stop resizing
     */
    function onMouseUp() {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
}