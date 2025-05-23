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
    let startY, startHeightEditor, startHeightChat;

    // Handle mouse down on the resize bar
    resizeBar.addEventListener('mousedown', (e) => {
        isDragging = true;
        startY = e.clientY;
        startHeightEditor = editorEl.offsetHeight;
        startHeightChat = chatContainer.offsetHeight;
        
        // Add resize class to body for visual feedback
        document.body.classList.add('resizing-vertical');
        document.body.style.userSelect = 'none';
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        e.preventDefault();
    });

    // Touch support for mobile devices
    resizeBar.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        isDragging = true;
        startY = touch.clientY;
        startHeightEditor = editorEl.offsetHeight;
        startHeightChat = chatContainer.offsetHeight;
        
        document.body.classList.add('resizing-vertical');
        document.body.style.userSelect = 'none';
        
        document.addEventListener('touchmove', onTouchMove);
        document.addEventListener('touchend', onMouseUp);
        e.preventDefault();
    });

    /**
     * Handle mouse movement for vertical resizing
     * @param {MouseEvent} e - The mouse event
     */
    function onMouseMove(e) {
        if (!isDragging) return;
        
        const deltaY = e.clientY - startY;
        const newEditorHeight = startHeightEditor + deltaY;
        const newChatHeight = startHeightChat - deltaY;

        // Apply new heights if they meet minimum requirements
        if (newEditorHeight > 100 && newChatHeight > 100) {
            editorEl.style.height = newEditorHeight + 'px';
            editorEl.style.flex = '0 0 ' + newEditorHeight + 'px';
            chatContainer.style.flex = '1';
            chatContainer.style.height = 'auto';

            // Resize the editors after a short delay to ensure proper rendering
            setTimeout(() => {
                const codeEditor = ace.edit('editor');
                const chatEditor = ace.edit('chatEditor');
                if (codeEditor) codeEditor.resize();
                if (chatEditor) chatEditor.resize();
            }, 10);
        }
    }

    /**
     * Handle touch movement for vertical resizing
     * @param {TouchEvent} e - The touch event
     */
    function onTouchMove(e) {
        if (!isDragging) return;
        const touch = e.touches[0];
        onMouseMove({ clientY: touch.clientY });
    }

    /**
     * Handle mouse up to stop resizing
     */
    function onMouseUp() {
        if (isDragging) {
            isDragging = false;
            document.body.classList.remove('resizing-vertical');
            document.body.style.userSelect = '';
            
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onMouseUp);
        }
    }
}
