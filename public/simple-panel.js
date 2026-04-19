// simple-panel.js - Side panel toggle functionality for both main and simple interfaces

/**
 * Initialize side panel functionality
 */
function initSidePanel() {
    // Wait for DOM and all scripts to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Add a small delay to ensure other scripts are loaded
            setTimeout(setupSidePanel, 100);
        });
    } else {
        // Add a small delay to ensure other scripts are loaded
        setTimeout(setupSidePanel, 100);
    }
}

/**
 * Setup side panel event listeners and functionality
 */
function setupSidePanel() {
    const sidePanel = document.getElementById('chatHistoryPanel');
    const collapseToggle = document.getElementById('historyCollapseToggle');
    const mobileCloseBtn = document.getElementById('mobileCloseBtn');
    
    if (!sidePanel || !collapseToggle) {
        console.warn('Side panel elements not found - panel may not be available on this page');
        return;
    }
    
    console.log('Setting up side panel with elements:', {
        panel: !!sidePanel,
        toggle: !!collapseToggle,
        mobileClose: !!mobileCloseBtn
    });

    // Setup collapse toggle button
    collapseToggle.addEventListener('click', toggleSidePanel);
    
    // Setup mobile close button if it exists
    if (mobileCloseBtn) {
        mobileCloseBtn.addEventListener('click', closeSidePanel);
    }

    // Setup keyboard shortcut (Ctrl+H to toggle)
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
            e.preventDefault();
            toggleSidePanel();
        }
    });

    // Handle window resize for mobile responsiveness
    window.addEventListener('resize', handleResize);
    
    // Initial setup based on screen size
    handleResize();
    
    console.log('Side panel functionality initialized');
}

/**
 * Toggle side panel between collapsed and expanded states
 */
function toggleSidePanel() {
    const sidePanel = document.getElementById('chatHistoryPanel');
    const collapseToggle = document.getElementById('historyCollapseToggle');
    
    if (!sidePanel || !collapseToggle) {
        console.error('Cannot toggle panel - missing elements:', {
            panel: !!sidePanel,
            toggle: !!collapseToggle
        });
        return;
    }
    
    const isCollapsed = sidePanel.classList.contains('collapsed');
    console.log('Toggling panel, currently collapsed:', isCollapsed);
    
    if (isCollapsed) {
        expandSidePanel();
    } else {
        collapseSidePanel();
    }
}

/**
 * Expand the side panel
 */
function expandSidePanel() {
    const sidePanel = document.getElementById('chatHistoryPanel');
    const collapseToggle = document.getElementById('historyCollapseToggle');
    
    if (!sidePanel || !collapseToggle) return;
    
    sidePanel.classList.remove('collapsed');
    
    // Update toggle button icon
    const icon = collapseToggle.querySelector('i');
    if (icon) {
        icon.className = 'bi bi-chevron-left';
    }
    
    // Update ARIA attributes for accessibility
    collapseToggle.setAttribute('aria-expanded', 'true');
    sidePanel.setAttribute('aria-hidden', 'false');
    
    // Load chat history when expanding
    // The loadChatHistory function is imported in main.js and simple.js
    // It will be called automatically when the panel is expanded
    
    console.log('Side panel expanded');
}

/**
 * Collapse the side panel
 */
function collapseSidePanel() {
    const sidePanel = document.getElementById('chatHistoryPanel');
    const collapseToggle = document.getElementById('historyCollapseToggle');
    
    if (!sidePanel || !collapseToggle) return;
    
    sidePanel.classList.add('collapsed');
    
    // Update toggle button icon
    const icon = collapseToggle.querySelector('i');
    if (icon) {
        icon.className = 'bi bi-chevron-right';
    }
    
    // Update ARIA attributes for accessibility
    collapseToggle.setAttribute('aria-expanded', 'false');
    sidePanel.setAttribute('aria-hidden', 'true');
    
    console.log('Side panel collapsed');
}

/**
 * Close side panel (for mobile)
 */
function closeSidePanel() {
    collapseSidePanel();
    
    // Hide mobile close button
    const mobileCloseBtn = document.getElementById('mobileCloseBtn');
    if (mobileCloseBtn) {
        mobileCloseBtn.style.display = 'none';
    }
}

/**
 * Handle window resize events
 */
function handleResize() {
    const sidePanel = document.getElementById('chatHistoryPanel');
    const mobileCloseBtn = document.getElementById('mobileCloseBtn');
    
    if (!sidePanel) return;
    
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        // Mobile behavior
        sidePanel.classList.add('mobile');
        
        // Show mobile close button when panel is expanded
        if (mobileCloseBtn && !sidePanel.classList.contains('collapsed')) {
            mobileCloseBtn.style.display = 'block';
        }
        
        // Auto-collapse on mobile if not already collapsed
        if (!sidePanel.classList.contains('collapsed')) {
            collapseSidePanel();
        }
    } else {
        // Desktop behavior
        sidePanel.classList.remove('mobile');
        
        // Hide mobile close button on desktop
        if (mobileCloseBtn) {
            mobileCloseBtn.style.display = 'none';
        }
        
        // Ensure panel is accessible on desktop
        if (sidePanel.classList.contains('collapsed')) {
            // Keep collapsed state but ensure it's functional
        }
    }
}

/**
 * Check if side panel is currently expanded
 */
function isSidePanelExpanded() {
    const sidePanel = document.getElementById('chatHistoryPanel');
    return sidePanel && !sidePanel.classList.contains('collapsed');
}

/**
 * Get side panel state
 */
function getSidePanelState() {
    const sidePanel = document.getElementById('chatHistoryPanel');
    if (!sidePanel) return 'hidden';
    
    return sidePanel.classList.contains('collapsed') ? 'collapsed' : 'expanded';
}

// Export functions for use in other scripts
window.sidePanel = {
    init: initSidePanel,
    toggle: toggleSidePanel,
    expand: expandSidePanel,
    collapse: collapseSidePanel,
    close: closeSidePanel,
    isExpanded: isSidePanelExpanded,
    getState: getSidePanelState
};

// Initialize when the script loads
initSidePanel();