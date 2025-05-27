// Direct drawing fix - run this in console to enable drawing
console.log('🎨 Loading direct drawing fix...');

function enableDirectDrawing() {
    const renderCanvas = document.getElementById('renderCanvas');
    const annotationCanvas = document.getElementById('annotationCanvas');
    
    if (!renderCanvas) {
        console.error('❌ Render canvas not found');
        return false;
    }
    
    if (!annotationCanvas) {
        console.error('❌ Annotation canvas not found');
        return false;
    }
    
    console.log('✅ Both canvases found');
    
    let isDrawing = false;
    const ctx = annotationCanvas.getContext('2d');
    
    // Set up drawing properties
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#ff0000';
    
    // Clear any existing listeners by removing and re-adding the canvas
    const parent = renderCanvas.parentNode;
    const newCanvas = renderCanvas.cloneNode(true);
    parent.replaceChild(newCanvas, renderCanvas);
    
    // Add our drawing listeners to the new canvas
    newCanvas.addEventListener('mousedown', function(e) {
        console.log('🖱️ Mouse down detected');
        isDrawing = true;
        
        const rect = newCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        
        // Stop all other event handling
        e.stopImmediatePropagation();
        e.preventDefault();
        return false;
    }, true);
    
    newCanvas.addEventListener('mousemove', function(e) {
        if (!isDrawing) return;
        
        console.log('🖱️ Drawing...');
        const rect = newCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        ctx.lineTo(x, y);
        ctx.stroke();
        
        // Stop all other event handling
        e.stopImmediatePropagation();
        e.preventDefault();
        return false;
    }, true);
    
    newCanvas.addEventListener('mouseup', function(e) {
        console.log('🖱️ Mouse up detected');
        isDrawing = false;
        
        // Stop all other event handling
        e.stopImmediatePropagation();
        e.preventDefault();
        return false;
    }, true);
    
    newCanvas.addEventListener('mouseleave', function(e) {
        isDrawing = false;
    }, true);
    
    // Set cursor
    newCanvas.style.cursor = 'crosshair';
    
    console.log('✅ Direct drawing enabled! Try drawing on the canvas.');
    
    // Add global functions
    window.clearDrawing = function() {
        ctx.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height);
        console.log('🧹 Drawing cleared');
    };
    
    window.setDrawColor = function(color) {
        ctx.strokeStyle = color;
        console.log('🎨 Color set to:', color);
    };
    
    return true;
}

// Auto-run the fix
if (enableDirectDrawing()) {
    console.log('🎉 Drawing fix applied successfully!');
    console.log('📝 Available commands:');
    console.log('   - clearDrawing() - Clear all drawings');
    console.log('   - setDrawColor("blue") - Change color');
} else {
    console.log('❌ Drawing fix failed to apply');
}
