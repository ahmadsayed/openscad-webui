// Side panel toggle functionality
document.addEventListener('DOMContentLoaded', function() {
    const sidePanel = document.getElementById('chatHistoryPanel');
    const toggleButton = document.getElementById('historyCollapseToggle');
    const toggleIcon = toggleButton.querySelector('i');
    
    toggleButton.addEventListener('click', function() {
        sidePanel.classList.toggle('collapsed');
        
        // Update the icon based on panel state
        if (sidePanel.classList.contains('collapsed')) {
            toggleIcon.className = 'bi bi-chevron-right';
        } else {
            toggleIcon.className = 'bi bi-chevron-left';
        }
    });
    
    // Chat history item click handler (placeholder)
    const chatHistoryItems = document.querySelectorAll('.chat-history-item');
    chatHistoryItems.forEach(item => {
        item.addEventListener('click', function() {
            console.log('Chat history item clicked:', this.textContent);
            // This would load the chat history in a real implementation
        });
    });
});
