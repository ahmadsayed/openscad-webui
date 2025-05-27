// drawingSystem.js - Improved drawing system that preserves 3D models
export function initializeImprovedDrawing() {
    console.log('🎨 Initializing improved drawing system...');
    
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
    let drawingMode = false;
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
    overlay.style.pointerEvents = 'none'; // Start disabled
    overlay.style.cursor = 'default';
    overlay.style.backgroundColor = 'transparent';
    
    // Insert overlay above the render canvas
    renderCanvas.parentNode.style.position = 'relative';
    renderCanvas.parentNode.appendChild(overlay);
    
    // Add drawing event listeners to the overlay
    overlay.addEventListener('mousedown', function(e) {
        if (!drawingMode) return;
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
        if (!isDrawing || !drawingMode) return;
        
        const rect = renderCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        ctx.lineTo(x, y);
        ctx.stroke();
        
        e.preventDefault();
        e.stopPropagation();
    });
    
    overlay.addEventListener('mouseup', function(e) {
        if (!drawingMode) return;
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
        if (!drawingMode) return;
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        overlay.dispatchEvent(mouseEvent);
    });
    
    overlay.addEventListener('touchmove', function(e) {
        if (!drawingMode) return;
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        overlay.dispatchEvent(mouseEvent);
    });
    
    overlay.addEventListener('touchend', function(e) {
        if (!drawingMode) return;
        e.preventDefault();
        const mouseEvent = new MouseEvent('mouseup', {});
        overlay.dispatchEvent(mouseEvent);
    });
    
    console.log('✅ Drawing overlay created! 3D model preserved.');
    
    // Add global functions
    window.clearDrawing = function() {
        ctx.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height);
        console.log('🧹 Drawing cleared');
    };
    
    window.setDrawColor = function(color) {
        ctx.strokeStyle = color;
        console.log('🎨 Color set to:', color);
    };
    
    window.setDrawLineWidth = function(width) {
        ctx.lineWidth = width;
        console.log('📏 Line width set to:', width);
    };
    
    window.toggleDrawingMode = function() {
        drawingMode = !drawingMode;
        if (drawingMode) {
            overlay.style.pointerEvents = 'auto';
            overlay.style.cursor = 'crosshair';
            console.log('🎨 Drawing mode ON');
            
            // Update toggle button if it exists
            const toggleBtn = document.getElementById('drawingToggleBtn');
            if (toggleBtn) {
                toggleBtn.textContent = '🎮 3D Mode';
                toggleBtn.title = 'Switch to 3D navigation mode';
            }
        } else {
            overlay.style.pointerEvents = 'none';
            overlay.style.cursor = 'default';
            console.log('🎮 3D navigation mode ON');
            
            // Update toggle button if it exists
            const toggleBtn = document.getElementById('drawingToggleBtn');
            if (toggleBtn) {
                toggleBtn.textContent = '🎨 Draw';
                toggleBtn.title = 'Switch to drawing mode';
            }
        }
        return drawingMode;
    };
    
    window.enableDrawingMode = function() {
        drawingMode = true;
        overlay.style.pointerEvents = 'auto';
        overlay.style.cursor = 'crosshair';
        console.log('🎨 Drawing mode enabled');
        
        // Update toggle button if it exists
        const toggleBtn = document.getElementById('drawingToggleBtn');
        if (toggleBtn) {
            toggleBtn.textContent = '🎮 3D Mode';
            toggleBtn.title = 'Switch to 3D navigation mode';
        }
    };
    
    window.enable3DMode = function() {
        drawingMode = false;
        overlay.style.pointerEvents = 'none';
        overlay.style.cursor = 'default';
        console.log('🎮 3D navigation mode enabled');
        
        // Update toggle button if it exists
        const toggleBtn = document.getElementById('drawingToggleBtn');
        if (toggleBtn) {
            toggleBtn.textContent = '🎨 Draw';
            toggleBtn.title = 'Switch to drawing mode';
        }
    };
    
    window.getDrawingMode = function() {
        return drawingMode;
    };
    
    // Start in 3D mode by default
    window.enable3DMode();
    
    return true;
}

// Auto-initialize if this script is loaded directly
if (typeof window !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeImprovedDrawing, 1000); // Wait for canvases to be ready
    });
} else if (typeof window !== 'undefined') {
    setTimeout(initializeImprovedDrawing, 1000);
}
