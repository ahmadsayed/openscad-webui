// Improved drawing fix that preserves the 3D model
console.log('🎨 Loading improved drawing fix...');

function enableDrawingWithoutBreaking3D() {
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
    
    // Create an invisible overlay div to capture mouse events
    const overlay = document.createElement('div');
    overlay.id = 'drawingOverlay';
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.zIndex = '1000';
    overlay.style.pointerEvents = 'auto';
    overlay.style.cursor = 'crosshair';
    overlay.style.backgroundColor = 'transparent';
    
    // Insert overlay above the render canvas
    renderCanvas.parentNode.style.position = 'relative';
    renderCanvas.parentNode.appendChild(overlay);
    
    // Add drawing event listeners to the overlay
    overlay.addEventListener('mousedown', function(e) {
        console.log('🖱️ Drawing started');
        isDrawing = true;
        
        const rect = renderCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        
        e.preventDefault();
        e.stopPropagation();
    });
    
    overlay.addEventListener('mousemove', function(e) {
        if (!isDrawing) return;
        
        const rect = renderCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        ctx.lineTo(x, y);
        ctx.stroke();
        
        e.preventDefault();
        e.stopPropagation();
    });
    
    overlay.addEventListener('mouseup', function(e) {
        console.log('🖱️ Drawing stopped');
        isDrawing = false;
        
        e.preventDefault();
        e.stopPropagation();
    });
    
    overlay.addEventListener('mouseleave', function(e) {
        isDrawing = false;
    });
    
    // Add touch support for mobile
    overlay.addEventListener('touchstart', function(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        overlay.dispatchEvent(mouseEvent);
    });
    
    overlay.addEventListener('touchmove', function(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        overlay.dispatchEvent(mouseEvent);
    });
    
    overlay.addEventListener('touchend', function(e) {
        e.preventDefault();
        const mouseEvent = new MouseEvent('mouseup', {});
        overlay.dispatchEvent(mouseEvent);
    });
    
    console.log('✅ Drawing overlay enabled! 3D model preserved.');
    
    // Add global functions
    window.clearDrawing = function() {
        ctx.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height);
        console.log('🧹 Drawing cleared');
    };
    
    window.setDrawColor = function(color) {
        ctx.strokeStyle = color;
        console.log('🎨 Color set to:', color);
    };
    
    window.toggleDrawingMode = function() {
        if (overlay.style.pointerEvents === 'none') {
            overlay.style.pointerEvents = 'auto';
            overlay.style.cursor = 'crosshair';
            console.log('🎨 Drawing mode ON');
            return true;
        } else {
            overlay.style.pointerEvents = 'none';
            overlay.style.cursor = 'default';
            console.log('🎮 3D navigation mode ON');
            return false;
        }
    };
    
    window.enableDrawingMode = function() {
        overlay.style.pointerEvents = 'auto';
        overlay.style.cursor = 'crosshair';
        console.log('🎨 Drawing mode enabled');
    };
    
    window.enable3DMode = function() {
        overlay.style.pointerEvents = 'none';
        overlay.style.cursor = 'default';
        console.log('🎮 3D navigation mode enabled');
    };
    
    // Start in drawing mode
    window.enableDrawingMode();
    
    return true;
}

// Auto-run the improved fix
if (enableDrawingWithoutBreaking3D()) {
    console.log('🎉 Improved drawing fix applied successfully!');
    console.log('📝 Available commands:');
    console.log('   - toggleDrawingMode() - Switch between drawing and 3D navigation');
    console.log('   - enableDrawingMode() - Enable drawing mode');
    console.log('   - enable3DMode() - Enable 3D navigation mode');
    console.log('   - clearDrawing() - Clear all drawings');
    console.log('   - setDrawColor("blue") - Change drawing color');
    console.log('');
    console.log('🎨 Currently in DRAWING mode - click and drag to draw');
    console.log('💡 Use toggleDrawingMode() to switch to 3D navigation');
} else {
    console.log('❌ Improved drawing fix failed to apply');
}
