// Side panel toggle functionality and 3D preview management
document.addEventListener('DOMContentLoaded', function() {
    const sidePanel = document.getElementById('chatHistoryPanel');
    const toggleButton = document.getElementById('historyCollapseToggle');
    const toggleIcon = toggleButton ? toggleButton.querySelector('i') : null;
    
    if (toggleButton && toggleIcon) {
        toggleButton.addEventListener('click', function() {
            sidePanel.classList.toggle('collapsed');
            
            // Update the icon based on panel state
            if (sidePanel.classList.contains('collapsed')) {
                toggleIcon.className = 'bi bi-chevron-right';
            } else {
                toggleIcon.className = 'bi bi-chevron-left';
            }
        });
    }
    
    // Chat history item click handler with 3D preview
    // This is now handled by the chatHistory.js module
    // The old hardcoded items are replaced with dynamic content
    
    // These functions are now handled by chatHistory.js
    // The expandItem and collapseItem functions are managed there
    
    // Preview functionality is now handled by chatHistory.js
    // The old hardcoded preview system has been replaced with dynamic STL rendering
    
    // Clean up all previews when page is unloaded
    window.addEventListener('beforeunload', function() {
        // Cleanup is now handled by chatHistory.js
    });
});
