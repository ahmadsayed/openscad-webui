// simple.js - Simplified entry point for non-technical users

// Core components
import { createScene } from './scene.js';
import { OpenSCADRenderer } from './openscadRenderer.js';

// Storage utilities
import { 
    saveCode, 
    loadCode, 
    getMostRecentCode, 
    syncCodeBetweenModes,
    getStorageStats, 
    cleanupOldEntries 
} from './utils/storage/index.js';
import { downloadSCAD } from './utils/fileUtils.js';
import { showStorageStatsWithChart } from './ui/storageStats.js';
import { STORAGE_LIMITS } from './utils/storage/constants.js';

// Chat history
import { initChatHistory, loadChatHistory } from './ui/chatHistory.js';

// Parameter utilities
import { 
    extractParameters, 
    updateCodeWithParameters, 
    createParameterForm 
} from './utils/parameterExtractor.js';

// Global state
let scene;
let renderer;
let chatEditor;
let currentCode = "cube(20, center=true);"; // Track the current code for incremental building
let currentParameters = []; // Track extracted parameters

// Initialize the simplified application
async function init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        await new Promise(resolve => {
            document.addEventListener('DOMContentLoaded', resolve);
        });
    }

    // Create the rendering scene
    scene = await createScene();

    // Initialize the OpenSCAD renderer
    renderer = new OpenSCADRenderer(scene);

    // Initialize the simple chat editor
    initSimpleChatEditor();

    // Initialize collapsible parameter form
    initParameterCollapse();

    // Initialize mobile menu functionality
    initMobileMenu();

    // Check for gallery-loaded code first (from gallery click-to-edit)
    const galleryCode = localStorage.getItem('gallery_loaded_code');
    const galleryTitle = localStorage.getItem('gallery_loaded_title');
    const galleryDescription = localStorage.getItem('gallery_loaded_description');
    
    let initialCode;
    if (galleryCode) {
        console.log(`🎯 Loading gallery code: ${galleryTitle} - ${galleryDescription}`);
        initialCode = galleryCode;
        
        // Clear the gallery-loaded code after use to prevent persistence
        localStorage.removeItem('gallery_loaded_code');
        localStorage.removeItem('gallery_loaded_title');
        localStorage.removeItem('gallery_loaded_description');
        
        console.log('🧹 Cleared gallery-loaded code from localStorage');
    } else {
        // Load saved code or use default
        const savedCode = loadCode('simple') || getMostRecentCode();
        initialCode = savedCode || "cube(20, center=true);";
    }
    
    currentCode = initialCode; // Initialize current code tracking
    renderer.renderOpenSCAD(initialCode);

    // Extract and display parameters for the initial code
    updateParameterForm(initialCode);

    // Drawing system removed - no initialization needed

    // Initialize chat history
    initChatHistory();

    // Export necessary functions to window for HTML event handlers
    window.newDesign = async () => {
        const defaultCode = "cube(20, center=true);";
        currentCode = defaultCode; // Reset current code tracking
        await saveCode('simple', defaultCode);
        // Clear and render the default cube
        await renderer.renderOpenSCAD(defaultCode);
        // Update parameter form
        updateParameterForm(defaultCode);
    };

    window.downloadSTL = () => {
        renderer.downloadSTL().catch(error => {
            console.error("Failed to download STL:", error);
        });
    };

    // OFF download removed - using STL only for better performance

    window.downloadSCAD = () => {
        downloadSCAD(currentCode);
    };

    // Save code before navigating to advanced mode
    window.addEventListener('beforeunload', async () => {
        const currentStlData = renderer ? renderer.getCurrentStlData() : null;
        await syncCodeBetweenModes('simple', 'main', currentCode, currentStlData);
    });

        // Export mode switch handler to window
        window.handleModeSwitch = async (event, targetMode) => {
            await sharedHandleModeSwitch(event, targetMode, 'simple', currentCode, renderer);
        };

        // Listen for history model load events
        document.addEventListener('historyModelLoad', (event) => {
            const { code, stlData } = event.detail;
            currentCode = code;
            renderer.renderOpenSCAD(code);
            updateParameterForm(code);
            console.log('Model loaded from history');
        });
}


// Initialize collapsible parameter form
function initParameterCollapse() {
    const parameterHeader = document.getElementById('parameterHeader');
    const parameterContent = document.getElementById('parameterContent');
    
    if (parameterHeader && parameterContent) {
        parameterHeader.addEventListener('click', () => {
            const isCollapsed = parameterHeader.classList.contains('collapsed');
            
            if (isCollapsed) {
                // Expand
                parameterHeader.classList.remove('collapsed');
                parameterContent.classList.remove('collapsed');
                
                // Calculate the actual content height including padding
                const contentHeight = parameterContent.scrollHeight;
                parameterContent.style.maxHeight = contentHeight + 'px';
                
                // After animation, remove max-height to allow natural expansion
                setTimeout(() => {
                    if (!parameterContent.classList.contains('collapsed')) {
                        parameterContent.style.maxHeight = 'none';
                    }
                }, 300);
            } else {
                // Before collapsing, set explicit height
                parameterContent.style.maxHeight = parameterContent.scrollHeight + 'px';
                
                // Force reflow then collapse
                parameterContent.offsetHeight;
                
                // Collapse
                parameterHeader.classList.add('collapsed');
                parameterContent.classList.add('collapsed');
                parameterContent.style.maxHeight = '0px';
            }
        });
    }
}

// Update parameter form based on current code
function updateParameterForm(code) {
    const parametersSection = document.getElementById('parametersSection');
    const parametersContainer = document.getElementById('parametersContainer');
    const parameterContent = document.getElementById('parameterContent');
    const parameterHeader = document.getElementById('parameterHeader');
    
    // Extract parameters from the code
    currentParameters = extractParameters(code);
    
    // Clear existing form
    parametersContainer.innerHTML = '';
    
    if (currentParameters.length > 0) {
        // Create parameter form with callback for parameter changes
        const form = createParameterForm(currentParameters, onParameterChange);
        parametersContainer.appendChild(form);
        
        // Show the parameters section
        parametersSection.style.display = 'block';
        
        // Set initial state - collapsed by default
        if (parameterHeader && parameterContent) {
            parameterHeader.classList.add('collapsed');
            parameterContent.classList.add('collapsed');
            parameterContent.style.maxHeight = '0px';
        }
    } else {
        // Hide the parameters section if no parameters found
        parametersSection.style.display = 'none';
    }
}

// Handle parameter changes
async function onParameterChange(updatedParameters) {
    console.log('🔧 Parameters changed, updating code and recalculating hash...');
    
    // Update the current code with new parameter values
    const updatedCode = updateCodeWithParameters(currentCode, updatedParameters);
    
    // Update current code tracking
    currentCode = updatedCode;
    
    // First: Render with hash recalculation and cache check
    // This will handle cache lookup and only regenerate if needed
    try {
        await renderer.renderOpenSCAD(updatedCode);
        console.log('🔄 Parameter render complete (cache checked)');
        
        // After rendering, get the correct STL data (either from cache or newly generated)
        const stlData = renderer.getCurrentStlData();
        await saveCode('simple', updatedCode, stlData);
        
        console.log('✅ Parameter update complete with correct hash and STL data');
    } catch (error) {
        console.error('Error rendering updated code:', error);
    }
}

// Initialize the simple chat editor
function initSimpleChatEditor() {
    // Initialize the chat editor
    chatEditor = ace.edit("simpleChatEditor");
    configureSimpleEditor(chatEditor);
    
    // Setup event handlers
    setupSimpleEventHandlers(chatEditor);
    
    // Setup placeholder behavior
    setupSimplePlaceholder(chatEditor);
}

// Configure the simple chat editor
function configureSimpleEditor(editor) {
    editor.setTheme("ace/theme/chrome");
    editor.session.setMode("ace/mode/text");
    editor.renderer.setShowGutter(false);
    editor.setOptions({
        fontSize: "16pt",
        scrollPastEnd: 0.5,
        highlightActiveLine: false,
        showPrintMargin: false,
        minLines: 3,
        maxLines: 3,
        wrap: true,
        autoScrollEditorIntoView: true
    });
}

// Setup event handlers for the simple chat editor
function setupSimpleEventHandlers(editor) {
    // Handle Enter/Shift+Enter
    const editorEl = document.getElementById('simpleChatEditor');
    editorEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitSimpleChat(editor);
        }
    });

    // Handle submit button click
    document.getElementById('simpleChatSubmit').addEventListener('click', () => {
        submitSimpleChat(editor);
    });
}

// Setup placeholder behavior for simple chat editor
function setupSimplePlaceholder(editor) {
    const placeholder = document.querySelector('.simple-placeholder-text');

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

// Handle simple chat submission
async function submitSimpleChat(editor) {
    const message = editor.getValue().trim();
    const submitButton = document.getElementById('simpleChatSubmit');
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
        // Show processing state with spinner animation
        editor.setReadOnly(true);
        submitButton.classList.add('processing');
        const buttonIcon = submitButton.querySelector('.button-icon');
        buttonIcon.className = 'bi bi-arrow-repeat button-icon';
        textSpan.textContent = 'Generating...';

        // Generate code from message using current code for incremental building
        const code = await generateCodeFromMessage(message, currentCode);
        
        // Update current code and render the generated code
        currentCode = code;
        // Save the generated code immediately
        await saveCode('simple', code);
        await renderer.renderOpenSCAD(code);
        
        // Extract and update parameters for the new code
        updateParameterForm(code);
        
        // Clear the input on success
        editor.setValue("");
        
        // Show success state briefly
        submitButton.classList.remove('processing');
        submitButton.classList.add('success');
        buttonIcon.className = 'bi bi-check button-icon';
        textSpan.textContent = 'Created!';
        
        setTimeout(() => {
            submitButton.classList.remove('success');
            buttonIcon.className = 'bi bi-magic button-icon';
            textSpan.textContent = originalText;
        }, 1500);
        
        // Reload chat history to show the new model
        loadChatHistory();
        
    } catch (error) {
        console.error('Simple chat submission error:', error);
        submitButton.classList.remove('processing');
        submitButton.classList.add('error');
        const buttonIcon = submitButton.querySelector('.button-icon');
        buttonIcon.className = 'bi bi-exclamation-triangle button-icon';
        textSpan.textContent = 'Error!';
        
        setTimeout(() => {
            submitButton.classList.remove('error');
            buttonIcon.className = 'bi bi-magic button-icon';
            textSpan.textContent = originalText;
        }, 2000);
    } finally {
        // Restore editor state
        setTimeout(() => {
            editor.setReadOnly(false);
        }, 1000);
    }
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
function fallbackCodeGeneration(message, currentCode) {
    return sharedFallbackCodeGeneration(message, currentCode);
}

// Initialize mobile menu functionality
function initMobileMenu() {
    const menuToggle = document.getElementById('mobile-menu');
    const navList = document.querySelector('.nav-list');
    
    console.log('Mobile menu initialization - elements found:', {
        menuToggle: !!menuToggle,
        navList: !!navList
    });
    
    if (!menuToggle || !navList) {
        console.error('Mobile menu elements not found:', {
            menuToggle: menuToggle,
            navList: navList
        });
        return;
    }
    
    let closeMenuHandler = null;
    
    menuToggle.addEventListener('click', function(e) {
        console.log('Mobile menu toggle clicked');
        e.stopPropagation(); // Prevent event from bubbling up
        const isActive = this.classList.toggle('active');
        navList.classList.toggle('active');
        
        console.log('Menu state:', {
            isActive: isActive,
            hasActiveClass: this.classList.contains('active'),
            hasMobileMenuActive: navList.classList.contains('active')
        });
        
        // Close menu when clicking outside
        if (isActive) {
            closeMenuHandler = function(e) {
                if (!navList.contains(e.target) && e.target !== menuToggle && !menuToggle.contains(e.target)) {
                    menuToggle.classList.remove('active');
                    navList.classList.remove('active');
                    document.removeEventListener('click', closeMenuHandler);
                }
            };
            setTimeout(() => {
                document.addEventListener('click', closeMenuHandler);
            }, 100);
        } else {
            // Remove any existing close menu listeners
            if (closeMenuHandler) {
                document.removeEventListener('click', closeMenuHandler);
            }
        }
    });
    
    // Prevent clicks inside the menu from closing it
    navList.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    console.log('Mobile menu initialized successfully');
}

// Mobile side panel toggle function
function toggleSidePanelMobile() {
    const sidePanel = document.getElementById('chatHistoryPanel');
    if (sidePanel) {
        sidePanel.classList.toggle('collapsed');
    }
}

// Add mobile side panel toggle to window
window.toggleSidePanelMobile = toggleSidePanelMobile;

// Add storage management functions to window
window.showStorageStats = function(event) {
    if (event) event.preventDefault();
    const stats = getStorageStats(STORAGE_LIMITS);
    showStorageStatsWithChart(renderer, stats);
};

window.clearStorageCache = function(event) {
    if (event) event.preventDefault();
    if (confirm('Clear all cached 3D models? This will free up storage but models will need to be regenerated.')) {
        const deletedCount = cleanupOldEntries(0); // Delete all entries;
        alert(`Cleared ${deletedCount} cached models.`);
    }
};

// Initialize the application when the page loads
window.addEventListener('load', init);
