// simple-enhanced.js - Enhanced version with visual improvements for history sidebar

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

// Enhanced chat history
import { initChatHistoryEnhancements, animateDelete, animateLoad } from './ui/chatHistoryEnhancements.js';

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

// Initialize the enhanced simplified application
async function init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        await new Promise(resolve => {
            document.addEventListener('DOMContentLoaded', resolve);
        });
    }

    // Add viewport meta tag for better mobile experience
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
    document.head.appendChild(meta);

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

    // Initialize touch gestures for mobile
    initTouchGestures();

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

    // Initialize enhanced chat history with animations
    initChatHistoryEnhancements();

    // Export necessary functions to window for HTML event handlers
    window.newDesign = async () => {
        const defaultCode = "cube(20, center=true);";
        currentCode = defaultCode; // Reset current code tracking
        await saveCode('simple', defaultCode);
        // Clear and render the default cube
        await renderer.renderOpenSCAD(defaultCode);
        chatEditor.value = defaultCode;
        updateParameterForm(defaultCode);

        // Add animation to the new scene
        animateSceneTransition();
    };

    window.saveDesign = async () => {
        const code = chatEditor.value;
        try {
            if (!code.trim()) {
                console.warn('⚠️ Cannot save empty code');
                return;
            }

            const timestamp = Date.now();

            // Save the code and capture STL data for enhanced preview
            await saveCode('simple', code, timestamp);

            // Load history to refresh the list with animation
            const historyItems = await loadChatHistory();

            // Show feedback animation
            showSaveFeedback();

            console.log(`💾 Design saved at ${new Date(timestamp).toLocaleTimeString()}`);
        } catch (error) {
            console.error('Failed to save code:', error);
            alert('Failed to save design. Please try again.');
        }
    };

    window.downloadSCAD = () => downloadSCAD(chatEditor.value);

    window.viewStorageStats = () => showStorageStatsWithChart();

    window.togglePreview = () => togglePreview();

    window.toggleParameters = () => toggleParameterVisibility();

    window.clearParameters = () => clearParameterValues();

    // Add history model load listener with animation
    document.addEventListener('historyModelLoad', async (e) => {
        const { code, stlData } = e.detail;

        // Add loading animation
        if (renderer) {
            // Fade out current model
            const sceneElement = document.getElementById('scene-container') || document.querySelector('.babylon-render');
            if (sceneElement) {
                sceneElement.style.transition = 'opacity 0.3s ease';
                sceneElement.style.opacity = '0.3';

                setTimeout(async () => {
                    currentCode = code;
                    await renderer.renderOpenSCAD(code);
                    updateParameterForm(code);
                    chatEditor.value = code;

                    // Fade back in
                    sceneElement.style.opacity = '1';

                    // Add transition complete animation
                    setTimeout(() => {
                        animateSceneTransition();
                    }, 300);
                }, 300);
            }
        }
    });

    // Initialize notification system
    initNotificationSystem();

    // Check storage on load
    checkStorageUsage();

    console.log('✨ Enhanced Simple interface initialized');
}

// Enhanced simple chat editor
function initSimpleChatEditor() {
    const editorElement = document.getElementById('simpleChatEditor');
    if (!editorElement) {
        console.error('Simple chat editor not found');
        return;
    }

    // Create enhanced editor with better UX
    const editorContainer = editorElement.parentElement;
    editorContainer.classList.add('enhanced-editor-container');

    chatEditor = editorElement;

    // Add placeholder with AI example
    chatEditor.placeholder = "Describe your 3D model... e.g., 'Create a pyramid with circular base and height of 50 units'";

    // Auto-resize textarea
    const autoResize = () => {
        chatEditor.style.height = 'auto';
        chatEditor.style.height = Math.min(chatEditor.scrollHeight, 300) + 'px';
    };

    chatEditor.addEventListener('input', autoResize);

    // Enhanced submit function
    window.submitSimpleCode = async () => {
        const code = chatEditor.value.trim();
        if (!code) return;

        // Add submitting animation
        addSubmittingAnimation();

        try {
            if (code.startsWith('//')) {
                const simplePrompt = code.substring(2).trim();
                const response = await fetch('/generate-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: simplePrompt,
                        existingCode: '' // Simple mode always starts fresh
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                if (!data.requestId) {
                    throw new Error('No requestId received');
                }

                // Start polling for completion
                setTimeout(() => pollForCompletion(data.requestId), 2000);
            } else {
                // Direct OpenSCAD code
                currentCode = code;
                await renderer.renderOpenSCAD(code);
                updateParameterForm(code);

                // Add transition animation
                animateSceneTransition();
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error processing request: ' + error.message);
        }

        // Restore button state
        removeSubmittingAnimation();
    };

    // Keyboard shortcuts
    chatEditor.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            window.submitSimpleCode();
        }
        if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            const start = chatEditor.selectionStart;
            chatEditor.focus();
            document.execCommand('insertText', false, '  ');
        }
    });

    // Add focus styles
    chatEditor.addEventListener('focus', () => {
        chatEditor.parentElement.classList.add('focused');
    });
    chatEditor.addEventListener('blur', () => {
        chatEditor.parentElement.classList.remove('focused');
    });

    // Clear submit animation function
    function removeSubmittingAnimation() {
        const button = document.querySelector('button[onclick="submitSimpleCode()"]');
        if (button) {
            button.classList.remove('submitting');
            button.disabled = false;
        }
        const status = document.getElementById('submitStatus');
        if (status) {
            status.style.display = 'none';
        }
    }

    // Add submit animation function
    function addSubmittingAnimation() {
        const button = document.querySelector('button[onclick="submitSimpleCode()"]');
        if (button) {
            button.classList.add('submitting');
            button.disabled = true;
        }
        const status = document.getElementById('submitStatus');
        if (status) {
            status.style.display = 'block';
            status.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
        }
    }
}

// Enhanced parameter form
function initParameterCollapse() {
    const collapseBtn = document.getElementById('collapseParameters');
    if (!collapseBtn) return;

    let isCollapsed = false;

    collapseBtn.addEventListener('click', () => {
        const form = document.getElementById('parameterForm');
        const container = form.parentElement;

        if (!isCollapsed) {
            // Collapse with animation
            form.style.height = form.scrollHeight + 'px';
            form.style.overflow = 'hidden';
            form.style.transition = 'height 0.3s ease';
            requestAnimationFrame(() => {
                form.style.height = '0px';
            });
            container.classList.add('collapsed');
            collapseBtn.innerHTML = '<i class="bi bi-chevron-down"></i> Show Parameters';
            isCollapsed = true;
        } else {
            // Expand with animation
            form.style.height = 'auto';
            const height = form.scrollHeight + 'px';
            form.style.height = '0px';
            requestAnimationFrame(() => {
                form.style.height = height;
            });
            collapseBtn.innerHTML = '<i class="bi bi-chevron-up"></i> Hide Parameters';
            setTimeout(() => {
                container.classList.remove('collapsed');
                form.style.height = 'auto';
            }, 300);
            isCollapsed = false;
        }
    });
}

// Enhanced mobile menu
function initMobileMenu() {
    const menuToggle = document.getElementById('mobileMenuToggle');
    const panel = document.getElementById('chatHistoryPanel');
    const closeBtn = document.getElementById('mobileCloseBtn');

    if (menuToggle && panel && closeBtn) {
        menuToggle.addEventListener('click', () => {
            panel.classList.remove('collapsed');
            // Add slide-in animation
            panel.animate([
                { transform: 'translateX(-100%)', opacity: 0 },
                { transform: 'translateX(0)', opacity: 1 }
            ], {
                duration: 300,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                fill: 'both'
            });
        });

        closeBtn.addEventListener('click', () => {
            // Add slide-out animation before hiding
            panel.animate([
                { transform: 'translateX(0)', opacity: 1 },
                { transform: 'translateX(-100%)', opacity: 0 }
            ], {
                duration: 250,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                fill: 'both'
            }).onfinish = () => {
                panel.classList.add('collapsed');
            };
        });
    }
}

// Touch gesture support
function initTouchGestures() {
    let touchStartX = 0;
    let touchStartY = 0;
    let swipeDetected = false;

    document.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        swipeDetected = false;
    });

    document.addEventListener('touchmove', (e) => {
        if (swipeDetected) return;

        const touchEndX = e.touches[0].clientX;
        const touchEndY = e.touches[0].clientY;
        const deltaX = touchStartX - touchEndX;
        const deltaY = touchStartY - touchEndY;

        // Check for horizontal swipe
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
            swipeDetected = true;
            if (deltaX > 0) {
                // Swipe left - close panel if open
                const panel = document.getElementById('chatHistoryPanel');
                if (panel && !panel.classList.contains('collapsed')) {
                    panel.classList.add('collapsed');
                }
            } else {
                // Swipe right - open panel if closed
                const panel = document.getElementById('chatHistoryPanel');
                if (panel && panel.classList.contains('collapsed')) {
                    panel.classList.remove('collapsed');
                }
            }
        }
    });
}

// Utility functions
function togglePreview() {
    const preview = document.getElementById('simplePreviewContainer');
    const button = document.querySelector('[onclick="togglePreview()"]');

    if (preview && button) {
        if (preview.style.display === 'none') {
            preview.style.display = 'block';
            preview.animate([
                { opacity: 0, transform: 'translateY(20px) scale(0.9)' },
                { opacity: 1, transform: 'translateY(0) scale(1)' }
            ], {
                duration: 400,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                fill: 'both'
            });
            button.innerHTML = '<i class="bi bi-eye-slash"></i> Hide Preview';
            window.previewVisible = true;
        } else {
            preview.animate([
                { opacity: 1, transform: 'translateY(0) scale(1)' },
                { opacity: 0, transform: 'translateY(20px) scale(0.9)' }
            ], {
                duration: 300,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                fill: 'both'
            }).onfinish = () => {
                preview.style.display = 'none';
            };
            button.innerHTML = '<i class="bi bi-eye"></i> Show Preview';
            window.previewVisible = false;
        }
    }
}

function toggleParameterVisibility() {
    const container = document.querySelector('.collapsible-container');
    if (container) {
        container.classList.toggle('hidden');
        const button = document.querySelector('[onclick="toggleParameters()"]');
        if (button) {
            const isHidden = container.classList.contains('hidden');
            button.innerHTML = isHidden ?
                '<i class="bi bi-plus-circle"></i> Show Parameters' :
                '<i class="bi bi-dash-circle"></i> Hide Parameters';
        }
    }
}

function clearParameterValues() {
    // Add confirmation dialog with animation
    const modal = document.createElement('div');
    modal.className = 'parameter-clear-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h4>Clear Parameters?</h4>
            <p>Are you sure you want to clear all parameter values?</p>
            <div class="modal-actions">
                <button class="cancel-btn">Cancel</button>
                <button class="confirm-btn">Clear</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Animate modal in
    modal.animate([
        { opacity: 0, transform: 'scale(0.9)' },
        { opacity: 1, transform: 'scale(1)' }
    ], {
        duration: 200,
        fill: 'both'
    });

    // Handle buttons
    modal.querySelector('.cancel-btn').onclick = () => {
        modal.remove();
    };

    modal.querySelector('.confirm-btn').onclick = () => {
        // Clear parameter values
        const inputs = document.querySelectorAll('#parameterForm input');
        inputs.forEach(input => {
            if (input.type === 'number' || input.type === 'range') {
                input.value = input.min || 0;
            } else if (input.type === 'checkbox') {
                input.checked = false;
            }
        });

        // Update canvas
        applyParameters();
        modal.remove();
    };

    // Remove modal on outside click
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
}

function showSaveFeedback() {
    const feedback = document.createElement('div');
    feedback.className = 'save-feedback';
    feedback.innerHTML = '<i class="bi bi-check-circle"></i> Design saved!';
    document.body.appendChild(feedback);

    // Animate in
    feedback.animate([
        { opacity: 0, transform: 'translateY(20px) scale(0.8)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' }
    ], {
        duration: 300,
        fill: 'both'
    });

    // Remove after delay
    setTimeout(() => {
        feedback.animate([
            { opacity: 1, transform: 'translateY(0) scale(1)' },
            { opacity: 0, transform: 'translateY(-20px) scale(0.8)' }
        ], {
            duration: 250,
            fill: 'both'
        }).onfinish = () => feedback.remove();
    }, 2000);
}

function animateSceneTransition() {
    const sceneElement = document.getElementById('scene-container') || document.querySelector('.babylon-render');
    if (sceneElement) {
        sceneElement.animate([
            { transform: 'scale(0.95)', opacity: '0.7' },
            { transform: 'scale(1.05)', opacity: '0.3', offset: 0.5 },
            { transform: 'scale(1)', opacity: '1' }
        ], {
            duration: 300,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
        });
    }
}

function initNotificationSystem() {
    // Check for storage threshold
    const stats = getStorageStats();
    if (stats.usagePercentage > 80) {
        showNotification('Storage getting full! Consider downloading and clearing old designs.', 'warning');
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="bi bi-${type === 'info' ? 'info-circle' : 'exclamation-triangle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close"><i class="bi bi-x"></i></button>
    `;
    document.body.appendChild(notification);

    // Animate in
    notification.animate([
        { transform: 'translateX(100%)', opacity: 0 },
        { transform: 'translateX(0)', opacity: 1 }
    ], {
        duration: 400,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        fill: 'both'
    });

    // Auto remove
    setTimeout(() => {
        notification.querySelector('.notification-close').click();
    }, 5000);

    // Manual close
    notification.querySelector('.notification-close').onclick = () => {
        notification.animate([
            { transform: 'translateX(0)', opacity: 1 },
            { transform: 'translateX(100%)', opacity: 0 }
        ], {
            duration: 300,
            fill: 'both'
        }).onfinish = () => notification.remove();
    };
}

async function pollForCompletion(requestId) {
    const button = document.querySelector('button[onclick="submitSimpleCode()"]');

    function updateButtonText(percentage) {
        if (button) {
            button.innerHTML = `<i class="bi bi-hourglass-split"></i> Generating ${percentage}%...`;
        }
    }

    updateButtonText(0);

    const poll = async () => {
        try {
            const response = await fetch(`/status/${requestId}`);
            const data = await response.json();

            if (data.code === 0) {
                // In progress
                const totalTime = Date.now() - data.startTime;
                const estimatedPercentage = Math.min(95, Math.round(totalTime / 1000));
                updateButtonText(Math.max(1, estimatedPercentage));
                setTimeout(poll, 1000);
            } else if (data.code === 1) {
                // Completed successfully
                updateButtonText(100);
                if (data.data && data.data.fullCode) {
                    currentCode = data.data.fullCode;
                    await renderer.renderOpenSCAD(data.data.fullCode);
                    chatEditor.value = data.data.fullCode;
                    updateParameterForm(data.data.fullCode);

                    // Add completion animation
                    animateSceneTransition();

                }
                removeSubmittingAnimation();

                setTimeout(() => {
                    if (button) {
                        button.classList.add('success');
                        button.innerHTML = '<i class="bi bi-check-circle"></i> Complete!';
                        setTimeout(() => {
                            button.classList.remove('success');
                            button.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Submit';
                        }, 2000);
                    }
                }, 300);
            } else {
                // Error case
                throw new Error(data.message || 'Unknown error');
            }
        } catch (error) {
            console.error('Error polling for completion:', error);
            removeSubmittingAnimation();
            alert('Error generating code: ' + error.message);
        }
    };

    setTimeout(poll, 2000);
}

function checkStorageUsage() {
    setInterval(() => {
        const stats = getStorageStats();
        if (stats.usagePercentage > 90) {
            showNotification('Storage is almost full! Download old designs to free up space.', 'warning');
        }
    }, 60000); // Check every minute
}

// Add enhanced styles
const enhancedStyles = `
    /* Enhanced styles for simple interface */
    .enhanced-editor-container {
        position: relative;
        transition: all 0.3s ease;
    }

    .enhanced-editor-container.focused {
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
        border-radius: 12px;
    }

    #simpleChatEditor {
        transition: all 0.3s ease;
        border: 2px solid transparent;
    }

    .enhanced-editor-container.focused #simpleChatEditor {
        border-color: #667eea;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
    }

    /* Loading animation */
    .submitting {
        position: relative;
        pointer-events: none;
    }

    .submitting::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 20px;
        height: 20px;
        border: 2px solid transparent;
        border-top: 2px solid currentColor;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        transform: translate(-50%, -50%);
    }

    /* Success animation */
    .success {
        background: linear-gradient(135deg, #28a745 0%, #20c997 100%) !important;
        animation: pulse 0.5s ease-in-out;
    }

    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }

    /* Notification styles */
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        max-width: 350px;
        padding: 16px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        border-left: 4px solid #667eea;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        z-index: 9999;
    }

    .notification-warning {
        border-left-color: #ffc107;
        background: #fffbf0;
    }

    .notification-close {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        color: inherit;
        margin-left: auto;
        opacity: 0.6;
        transition: opacity 0.2s ease;
    }

    .notification-close:hover {
        opacity: 1;
    }

    /* Save feedback */
    .save-feedback {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
        color: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(40, 167, 69, 0.3);
        z-index: 9999;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    /* Clear parameters modal */
    .parameter-clear-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    }

    .modal-content {
        background: white;
        padding: 24px;
        border-radius: 16px;
        max-width: 400px;
        width: 90%;
        text-align: center;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.2);
    }

    .modal-actions {
        display: flex;
        gap: 12px;
        justify-content: center;
        margin-top: 24px;
    }

    .modal-actions button {
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.2s ease;
    }

    .cancel-btn {
        background: #6c757d;
        color: white;
    }

    .confirm-btn {
        background: #dc3545;
        color: white;
    }

    /* Loading dots */
    .loading-dots {
        display: flex;
        gap: 6px;
    }

    .loading-dots span {
        width: 8px;
        height: 8px;
        background: #667eea;
        border-radius: 50%;
        animation: dotPulse 1.4s infinite ease-in-out both;
    }

    .loading-dots span:nth-of-type(2) { animation-delay: 0.2s; }
    .loading-dots span:nth-of-type(3) { animation-delay: 0.4s; }

    @keyframes dotPulse {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
    }
`;

// Inject styles
const style = document.createElement('style');
style.textContent = enhancedStyles;
document.head.appendChild(style);

// Export for use in simple.pug
globalThis.init = init; // Note: Changed from window.init to globalThis for ES module compatibility

export {
    init,
    updateCodeWithParameters,
    downloadSCAD,
    newDesign,
    clearParameterValues
};