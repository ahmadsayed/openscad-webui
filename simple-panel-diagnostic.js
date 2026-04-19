// Comprehensive diagnostic for simple panel issue
// Run this in browser console on simple.html page

console.log('=== SIMPLE PANEL DIAGNOSTIC ===');

// Wait for page to fully load
setTimeout(() => {
    const panel = document.getElementById('chatHistoryPanel');
    const toggle = document.getElementById('historyCollapseToggle');
    
    console.log('=== ELEMENT INSPECTION ===');
    console.log('Panel found:', !!panel);
    console.log('Toggle found:', !!toggle);
    
    if (!panel || !toggle) {
        console.error('CRITICAL: Required elements not found!');
        return;
    }
    
    console.log('Panel classes:', panel.className);
    console.log('Panel classList:', Array.from(panel.classList));
    console.log('Is collapsed (initial):', panel.classList.contains('collapsed'));
    
    // Check all computed styles that could affect visibility
    const computed = window.getComputedStyle(panel);
    console.log('=== COMPUTED STYLES ===');
    console.log('position:', computed.position);
    console.log('left:', computed.left);
    console.log('top:', computed.top);
    console.log('width:', computed.width);
    console.log('height:', computed.height);
    console.log('transform:', computed.transform);
    console.log('display:', computed.display);
    console.log('visibility:', computed.visibility);
    console.log('opacity:', computed.opacity);
    console.log('z-index:', computed.zIndex);
    
    // Check bounding rect
    const rect = panel.getBoundingClientRect();
    console.log('=== BOUNDING RECT ===');
    console.log('rect:', rect);
    console.log('rect.left:', rect.left);
    console.log('rect.right:', rect.right);
    console.log('rect.width:', rect.width);
    console.log('window.innerWidth:', window.innerWidth);
    
    // Check if actually off-screen
    const isOffScreen = rect.right <= 0;
    const isPartiallyVisible = rect.left < window.innerWidth && rect.right > 0;
    console.log('Is off-screen (right <= 0):', isOffScreen);
    console.log('Is partially visible:', isPartiallyVisible);
    
    // Check which CSS rules are applying
    console.log('=== CSS RULE ANALYSIS ===');
    
    // Check for conflicting rules
    const rules = [
        '.side-panel',
        '.simple-container .side-panel',
        '.side-panel.collapsed',
        '.simple-container .side-panel.collapsed'
    ];
    
    rules.forEach(selector => {
        try {
            const elements = document.querySelectorAll(selector);
            console.log(`${selector} matches:`, elements.length);
            if (elements.length > 0) {
                const style = window.getComputedStyle(elements[0]);
                console.log(`  transform:`, style.transform);
            }
        } catch (e) {
            console.log(`${selector} error:`, e.message);
        }
    });
    
    // Test manual toggle
    console.log('=== MANUAL TOGGLE TEST ===');
    const initialState = panel.classList.contains('collapsed');
    console.log('Initial collapsed state:', initialState);
    
    // Force toggle
    panel.classList.remove('collapsed');
    setTimeout(() => {
        const expandedRect = panel.getBoundingClientRect();
        console.log('After force expand - rect:', expandedRect);
        console.log('After force expand - transform:', window.getComputedStyle(panel).transform);
        
        panel.classList.add('collapsed');
        setTimeout(() => {
            const collapsedRect = panel.getBoundingClientRect();
            console.log('After force collapse - rect:', collapsedRect);
            console.log('After force collapse - transform:', window.getComputedStyle(panel).transform);
            
            // Restore original state
            if (initialState) {
                panel.classList.add('collapsed');
            } else {
                panel.classList.remove('collapsed');
            }
            
            console.log('=== TOGGLE BUTTON TEST ===');
            console.log('Testing toggle button click...');
            
            // Test button click
            const clickEvent = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true
            });
            toggle.dispatchEvent(clickEvent);
            
            setTimeout(() => {
                const afterClickState = panel.classList.contains('collapsed');
                const afterClickRect = panel.getBoundingClientRect();
                console.log('After button click - collapsed:', afterClickState);
                console.log('After button click - rect:', afterClickRect);
                
                console.log('=== DIAGNOSTIC COMPLETE ===');
                
                // Final analysis
                if (initialState === afterClickState) {
                    console.warn('⚠️  Button click did not change panel state!');
                } else {
                    console.log('✅ Button click successfully changed panel state');
                }
                
                if (afterClickRect.left === collapsedRect.left && afterClickRect.right === collapsedRect.right) {
                    console.log('✅ Panel positioning appears consistent');
                } else {
                    console.log('ℹ️  Panel positioning changed after button click');
                }
            }, 300);
        }, 300);
    }, 300);
    
}, 1000); // Wait 1 second for page to fully load

// Check global sidePanel object
console.log('=== GLOBAL OBJECTS ===');
console.log('window.sidePanel:', typeof window.sidePanel);
console.log('window.toggleSidePanel:', typeof window.toggleSidePanel);

// Check for any errors
window.addEventListener('error', (e) => {
    console.error('JavaScript error detected:', e.message);
});