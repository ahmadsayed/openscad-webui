// Side panel toggle functionality and 3D preview management
document.addEventListener('DOMContentLoaded', function() {
    const sidePanel = document.getElementById('chatHistoryPanel');
    const toggleButton = document.getElementById('historyCollapseToggle');
    const toggleIcon = toggleButton.querySelector('i');
    
    // Store active preview scenes
    const previewScenes = new Map();
    
    toggleButton.addEventListener('click', function() {
        sidePanel.classList.toggle('collapsed');
        
        // Update the icon based on panel state
        if (sidePanel.classList.contains('collapsed')) {
            toggleIcon.className = 'bi bi-chevron-right';
        } else {
            toggleIcon.className = 'bi bi-chevron-left';
        }
    });
    
    // Chat history item click handler with 3D preview
    const chatHistoryItems = document.querySelectorAll('.chat-history-item');
    chatHistoryItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // Don't trigger if clicking on the toggle icon directly
            if (e.target.closest('.item-toggle')) {
                return;
            }
            
            const isExpanded = this.classList.contains('expanded');
            
            // Collapse all other items
            chatHistoryItems.forEach(otherItem => {
                if (otherItem !== this && otherItem.classList.contains('expanded')) {
                    collapseItem(otherItem);
                }
            });
            
            // Toggle current item
            if (isExpanded) {
                collapseItem(this);
            } else {
                expandItem(this);
            }
        });
        
        // Toggle icon click handler
        const toggleIcon = item.querySelector('.item-toggle i');
        if (toggleIcon) {
            toggleIcon.addEventListener('click', function(e) {
                e.stopPropagation();
                const item = this.closest('.chat-history-item');
                const isExpanded = item.classList.contains('expanded');
                
                if (isExpanded) {
                    collapseItem(item);
                } else {
                    expandItem(item);
                }
            });
        }
    });
    
    function expandItem(item) {
        item.classList.add('expanded');
        const toggleIcon = item.querySelector('.item-toggle i');
        if (toggleIcon) {
            toggleIcon.className = 'bi bi-chevron-up';
        }
        
        // Initialize 3D preview
        initializePreview(item);
    }
    
    function collapseItem(item) {
        item.classList.remove('expanded');
        const toggleIcon = item.querySelector('.item-toggle i');
        if (toggleIcon) {
            toggleIcon.className = 'bi bi-chevron-down';
        }
        
        // Clean up 3D preview resources
        cleanupPreview(item);
    }
    
    function initializePreview(item) {
        const canvas = item.querySelector('.preview-canvas');
        if (!canvas) return;
        
        const previewId = canvas.getAttribute('data-preview-id');
        const size = parseInt(item.getAttribute('data-size')) || 20;
        const color = item.getAttribute('data-color') || '#ff6b6b';
        
        // Check if we already have a scene for this preview
        if (previewScenes.has(previewId)) {
            return;
        }
        
        try {
            // Create a new Babylon.js engine and scene for this preview
            const engine = new BABYLON.Engine(canvas, true);
            const scene = new BABYLON.Scene(engine);
            
            // Setup camera
            const camera = new BABYLON.ArcRotateCamera(
                "preview-camera", 
                -Math.PI / 2, 
                Math.PI / 2.5, 
                size * 3, 
                new BABYLON.Vector3(0, 0, 0)
            );
            camera.attachControl(canvas, true);
            camera.wheelPrecision = 50; // Slower zoom for better control
            
            // Setup lighting
            const light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0));
            const light2 = new BABYLON.HemisphericLight("light2", new BABYLON.Vector3(1, 0, 0));
            light1.intensity = 0.7;
            light2.intensity = 0.3;
            
            // Create cube geometry
            const cube = BABYLON.MeshBuilder.CreateBox("preview-cube", {
                size: size
            }, scene);
            
            // Convert hex color to Babylon Color3
            const hexColor = color.replace('#', '');
            const r = parseInt(hexColor.substr(0, 2), 16) / 255;
            const g = parseInt(hexColor.substr(2, 2), 16) / 255;
            const b = parseInt(hexColor.substr(4, 2), 16) / 255;
            
            const material = new BABYLON.StandardMaterial("cube-material", scene);
            material.diffuseColor = new BABYLON.Color3(r, g, b);
            material.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
            cube.material = material;
            
            // Start render loop
            engine.runRenderLoop(function() {
                scene.render();
            });
            
            // Handle resize
            window.addEventListener("resize", function() {
                engine.resize();
            });
            
            // Store the scene and engine for cleanup
            previewScenes.set(previewId, { scene, engine });
            
        } catch (error) {
            console.error('Failed to initialize 3D preview:', error);
        }
    }
    
    function cleanupPreview(item) {
        const canvas = item.querySelector('.preview-canvas');
        if (!canvas) return;
        
        const previewId = canvas.getAttribute('data-preview-id');
        const previewData = previewScenes.get(previewId);
        
        if (previewData) {
            // Clean up Babylon.js resources
            previewData.scene.dispose();
            previewData.engine.dispose();
            previewScenes.delete(previewId);
        }
    }
    
    // Clean up all previews when page is unloaded
    window.addEventListener('beforeunload', function() {
        previewScenes.forEach((data, previewId) => {
            data.scene.dispose();
            data.engine.dispose();
        });
        previewScenes.clear();
    });
});
