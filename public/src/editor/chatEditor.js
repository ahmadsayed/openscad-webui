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
        maxLines: 10
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

    if (!message) return;

    try {
        // Show thinking state
        chatContainer.classList.add('thinking');
        chatEditor.setReadOnly(true);

        // Process the message with the provided callback
        const success = await onSubmitCallback(message);
        
        if (success) {
            // Clear the input on success
            chatEditor.setValue("");
        }
    } catch (error) {
        console.error('Chat submission error:', error);
        alert(`Error: ${error.message}`);
    } finally {
        // Restore editor state
        chatContainer.classList.remove('thinking');
        chatEditor.setReadOnly(false);
    }
}