// chatEditor.js - Manages the chat interface for code generation

/**
 * Initialize the chat editor
 * @param {Function} onSubmitCallback - Callback function to execute when chat is submitted
 * @returns {Object} - The chat editor interface
 */
export function initChatEditor(onSubmitCallback) {
    // Initialize the chat editor
    const chatEditor = ace.edit("chatEditor");
    configureEditor(chatEditor);
    
    // Setup event handlers
    setupEventHandlers(chatEditor, onSubmitCallback);
    
    // Return the editor interface
    return {
        getValue: () => chatEditor.getValue(),
        setValue: (value) => chatEditor.setValue(value),
        setReadOnly: (value) => chatEditor.setReadOnly(value),
        getEditor: () => chatEditor
    };
}

/**
 * Configure the chat editor appearance and settings
 * @param {Object} chatEditor - The Ace editor instance
 */
function configureEditor(chatEditor) {
    chatEditor.setTheme("ace/theme/chrome");
    chatEditor.session.setMode("ace/mode/text");
    chatEditor.renderer.setShowGutter(false);
    chatEditor.setOptions({
        fontSize: "14pt",
        scrollPastEnd: 0.5,
        highlightActiveLine: false,
        showPrintMargin: false,
        minLines: 3,
        maxLines: Infinity, // Allow unlimited expansion
        wrap: true,
        autoScrollEditorIntoView: true
    });
}

/**
 * Setup event handlers for the chat editor
 * @param {Object} chatEditor - The Ace editor instance
 * @param {Function} onSubmitCallback - Callback for chat submission
 */
function setupEventHandlers(chatEditor, onSubmitCallback) {
    // Handle Enter/Shift+Enter
    const chatEditorEl = document.getElementById('chatEditor');
    chatEditorEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitChat(chatEditor, onSubmitCallback);
        }
    });

    // Handle submit button click
    document.getElementById('chatSubmit').addEventListener('click', () => {
        submitChat(chatEditor, onSubmitCallback);
    });
}

/**
 * Handle chat submission
 * @param {Object} chatEditor - The Ace editor instance
 * @param {Function} onSubmitCallback - Callback for processing the message
 */
async function submitChat(chatEditor, onSubmitCallback) {
    const message = chatEditor.getValue().trim();
    const chatContainer = document.querySelector('.chat-container');
    const submitButton = document.getElementById('chatSubmit');
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
        // Show initial thinking state
        chatContainer.classList.add('thinking');
        chatEditor.setReadOnly(true);
        submitButton.classList.add('processing');
        submitButton.disabled = true;
        textSpan.textContent = 'Processing...';
        console.log('🔒 Chat button disabled for processing');

        // Process the message with the provided callback
        const success = await onSubmitCallback(message);
        
        if (success) {
            // Clear the input on success
            chatEditor.setValue("");
            
            submitButton.textContent = "Send";
            // Immediately enable button functionality while keeping visual feedback
            submitButton.disabled = false;
            chatEditor.setReadOnly(false);
            
            // Remove processing state after short delay for visual feedback
            chatContainer.classList.remove('thinking');
             submitButton.classList.remove('processing');

            
            
        } else {
            // Show error message and restore button state together
            textSpan.textContent = 'Failed!';
            
            setTimeout(() => {
                chatContainer.classList.remove('thinking');
                submitButton.classList.remove('processing');
                submitButton.disabled = false;
                textSpan.textContent = originalText;
                chatEditor.setReadOnly(false);
            }, 1800); // Wait for error message display
        }
    } catch (error) {
        console.error('Chat submission error:', error);
        textSpan.textContent = 'Error!';
        
        // Restore button state after showing error message
        setTimeout(() => {
            chatContainer.classList.remove('thinking');
            submitButton.classList.remove('processing');
            submitButton.disabled = false;
            textSpan.textContent = originalText;
            chatEditor.setReadOnly(false);
        }, 2200); // Wait for error message display
    }
}
