// chatHistoryEnhancements.js - Visual enhancements for chat history sidebar

import { initChatHistory, loadChatHistory } from './chatHistory.js';

// Animation frame management
let animations = new Map();

/**
 * Initialize visual enhancements for chat history
 */
export function initChatHistoryEnhancements() {
    initChatHistory(); // Call base initialization first

    // Additional enhancement setup
    observeHistoryItems();
    addLoadingAnimations();
    setupSmoothScroll();
    setupKeyboardNavigation();
    setupDragAndDrop();
}

/**
 * Observe history items for animations
 */
function observeHistoryItems() {
    const historyList = document.getElementById('chatHistoryList');
    if (!historyList) return;

    // Use Intersection Observer for scroll animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateIn(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -10px 0px'
    });

    // MutationObserver to handle dynamically added items
    const mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1 && node.classList.contains('chat-history-item')) {
                    observer.observe(node);
                    // Initial hidden state for animation
                    node.style.opacity = '0';
                    node.style.transform = 'translateY(20px)';
                }
            });

            mutation.removedNodes.forEach(node => {
                if (node.nodeType === 1 && node.classList.contains('chat-history-item')) {
                    observer.unobserve(node);
                }
            });
        });
    });

    mutationObserver.observe(historyList, { childList: true });

    // Setup hover effects
    document.addEventListener('mouseover', handleHistoryHover);
    document.addEventListener('mouseout', handleHistoryUnhover);
}

/**
 * Animate in a history item
 */
function animateIn(element) {
    const animation = element.animate([
        { opacity: 0, transform: 'translateY(20px) scale(0.95)' },
        { opacity: 1, transform: 'translateY(0) scale(1)', offset: 0.6 },
        { transform: 'translateY(0) scale(1) translateX(2px)', offset: 0.8 },
        { transform: 'translateY(0) scale(1)', offset: 1 }
    ], {
        duration: 600,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        fill: 'both'
    });

    animations.set(element, animation);
}

/**
 * Handle hover effects
 */
function handleHistoryHover(e) {
    const item = e.target.closest('.chat-history-item');
    if (!item || item.classList.contains('hovered')) return;

    item.classList.add('hovered');

    // Add subtle glow effect
    item.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';

    // Animate background gradient on hover
    const overlay = document.createElement('div');
    overlay.className = 'item-hover-overlay';
    overlay.style.cssText = `
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, transparent 100%);
        border-radius: 16px;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
        z-index: 1;
    `;

    if (item.firstElementChild) {
        item.insertBefore(overlay, item.firstElementChild);
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
        });
    }

    // Subtle scale effect
    item.style.transform = 'translateY(-2px) scale(1.01)';
    item.style.filter = 'drop-shadow(0 8px 24px rgba(102, 126, 234, 0.15))';
}

/**
 * Handle unhover effects
 */
function handleHistoryUnhover(e) {
    const item = e.target.closest('.chat-history-item');
    if (!item || !item.classList.contains('hovered')) return;

    item.classList.remove('hovered');

    // Remove overlay
    const overlay = item.querySelector('.item-hover-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
    }

    // Revert transform if not expanded
    if (!item.classList.contains('expanded')) {
        item.style.transform = '';
        item.style.filter = '';
    }
}

/**
 * Add loading animations
 */
function addLoadingAnimations() {
    const loadingEl = document.getElementById('historyLoading');
    const emptyEl = document.getElementById('historyEmpty');

    if (loadingEl) {
        loadingEl.addEventListener('transitionend', () => {
            if (loadingEl.style.display !== 'none') {
                animateLoadingDots();
            }
        });
    }

    if (emptyEl) {
        // Add floating animation to empty state icon
        const icon = emptyEl.querySelector('i');
        if (icon) {
            icon.animate([
                { transform: 'translateY(0)' },
                { transform: 'translateY(-10px)' },
                { transform: 'translateY(0)' }
            ], {
                duration: 3000,
                iterations: Infinity,
                easing: 'ease-in-out'
            });
        }
    }
}

/**
 * Animate loading dots
 */
function animateLoadingDots() {
    const spinner = document.querySelector('.loading-spinner-small');
    if (!spinner) return;

    // Create animated loading sequence
    const dots = document.createElement('div');
    dots.innerHTML = '<span>.</span><span>.</span><span>.</span>';
    dots.style.cssText = `
        display: flex;
        gap: 4px;
        margin-left: 8px;
        font-size: 1.2rem;
        font-weight: bold;
        color: #667eea;
    `;

    spinner.parentNode.appendChild(dots);

    // Animate each dot
    Array.from(dots.children).forEach((dot, index) => {
        dot.animate([
            { opacity: 0.2, transform: 'scale(0.8)' },
            { opacity: 1, transform: 'scale(1.2)', offset: 0.5 },
            { opacity: 0.2, transform: 'scale(0.8)' }
        ], {
            duration: 1200,
            iterations: Infinity,
            delay: index * 200,
            easing: 'ease-in-out'
        });
    });
}

/**
 * Setup smooth scroll behavior
 */
function setupSmoothScroll() {
    const content = document.querySelector('.side-panel-content');
    if (!content) return;

    // Add smooth scroll CSS
    content.style.scrollBehavior = 'smooth';
    content.style.scrollPadding = '20px';

    // Scroll to newly added items
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length > 0) {
                const lastItem = content.querySelector('.chat-history-item:last-child');
                if (lastItem) {
                    lastItem.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }
            }
        });
    });

    observer.observe(content, { childList: true, subtree: true });
}

/**
 * Setup keyboard navigation
 */
function setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            const visibleItems = Array.from(document.querySelectorAll('.chat-history-item:not([style*="display: none"])'));

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                focusNextItem(visibleItems, 1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                focusNextItem(visibleItems, -1);
            } else if (e.key === 'Enter' && document.activeElement.classList.contains('chat-history-item')) {
                e.preventDefault();
                const loadBtn = document.activeElement.querySelector('.item-load-btn');
                if (loadBtn) loadBtn.click();
            }
        }
    });
}

/**
 * Focus next item in the list
 */
let focusedIndex = -1;

function focusNextItem(items, direction) {
    focusedIndex += direction;
    focusedIndex = Math.max(0, Math.min(focusedIndex, items.length - 1));

    if (items[focusedIndex]) {
        items[focusedIndex].focus();
        items[focusedIndex].style.outline = '2px solid #007bff';
        items[focusedIndex].style.outlineOffset = '2px';

        // Scroll into view
        items[focusedIndex].scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
}

/**
 * Setup drag and drop for reordering (optional enhancement)
 */
function setupDragAndDrop() {
    const historyList = document.getElementById('chatHistoryList');
    if (!historyList) return;

    let draggedItem = null;

    historyList.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('chat-history-item')) {
            draggedItem = e.target;
            e.target.style.opacity = '0.5';
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', e.target.innerHTML);
        }
    });

    historyList.addEventListener('dragend', (e) => {
        if (e.target.classList.contains('chat-history-item')) {
            e.target.style.opacity = '1';
        }
    });

    historyList.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });

    historyList.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!draggedItem) return;

        const afterElement = getDragAfterElement(historyList, e.clientY);
        if (afterElement == null) {
            historyList.appendChild(draggedItem);
        } else {
            historyList.insertBefore(draggedItem, afterElement);
        }

        // Animate the drop
        draggedItem.animate([
            { transform: 'scale(0.95) rotate(2deg)', opacity: 0.7 },
            { transform: 'scale(1.05) rotate(-1deg)', opacity: 1, offset: 0.6 },
            { transform: 'scale(1) rotate(0deg)' }
        ], {
            duration: 400,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
        });

        draggedItem = null;
    });
}

/**
 * Get element after drop position
 */
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.chat-history-item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

/**
 * Enhanced delete animation
 */
export function animateDelete(element, callback) {
    const animation = element.animate([
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(0.9)', opacity: 0.7, offset: 0.5 },
        { transform: 'scale(0.8) rotate(-5deg)', opacity: 0, offset: 1 }
    ], {
        duration: 300,
        easing: 'ease-in-out'
    });

    animation.onfinish = () => {
        if (callback) callback();
    };
}

/**
 * Enhanced load button animation
 */
export function animateLoad(button) {
    if (!button) return;

    // Create ripple effect
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = rect.width / 2;
    const y = rect.height / 2;

    ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x - size / 2}px;
        top: ${y - size / 2}px;
        background: rgba(255, 255, 255, 0.6);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s ease-out;
        pointer-events: none;
    `;

    button.style.position = 'relative';
    button.style.overflow = 'hidden';
    button.appendChild(ripple);

    // Clean up after animation
    setTimeout(() => ripple.remove(), 600);
}

// Add ripple animation to document styles
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }

    .chat-history-item {
        will-change: transform, filter;
    }

    .chat-history-item:focus {
        outline: none;
    }
`;
document.head.appendChild(style);

// Export enhanced functions
export default {
    initChatHistoryEnhancements,
    animateDelete,
    animateLoad
};