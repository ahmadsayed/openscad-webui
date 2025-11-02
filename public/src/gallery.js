// gallery.js - Gallery functionality for PromptSCAD

class GalleryManager {
    constructor() {
        this.galleryGrid = document.querySelector('.gallery-grid');
        this.renderCanvas = document.getElementById('renderCanvas');
        this.loadingScreen = document.getElementById('loadingScreen');
        this.selectedItem = null;
        
        this.init();
    }

    init() {
        console.log('Initializing Gallery Manager');
        this.loadGalleryItems();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Keyboard navigation for accessibility
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardNavigation(e);
        });
    }

    async loadGalleryItems() {
        try {
            // For now, we'll create some sample items
            // In a real implementation, this would load from storage or API
            const sampleItems = this.createSampleItems();
            this.renderGalleryItems(sampleItems);
        } catch (error) {
            console.error('Error loading gallery items:', error);
            this.showErrorState('Failed to load gallery items');
        }
    }

    createSampleItems() {
        return [
            {
                id: 'sample-1',
                title: 'Geometric Cube',
                description: 'A simple cube with rounded corners and cutouts',
                timestamp: new Date().toISOString(),
                hasSTL: true,
                scadCode: `cube([20, 20, 20], center=true);`
            },
            {
                id: 'sample-2',
                title: 'Spiral Vase',
                description: 'Elegant spiral vase design with parametric twist',
                timestamp: new Date(Date.now() - 86400000).toISOString(),
                hasSTL: true,
                scadCode: `difference() {
    cylinder(h=40, r1=15, r2=25, $fn=60);
    cylinder(h=38, r1=13, r2=23, $fn=60);
}`
            },
            {
                id: 'sample-3',
                title: 'Gear Mechanism',
                description: 'Precision gear design for mechanical applications',
                timestamp: new Date(Date.now() - 172800000).toISOString(),
                hasSTL: false,
                scadCode: `module gear(teeth=20, height=10) {
    angle = 360 / teeth;
    for (i = [0:teeth-1]) {
        rotate([0, 0, i * angle])
        translate([15, 0, 0])
        cube([5, 2, height]);
    }
    cylinder(h=height, r=10, $fn=teeth);
}
gear();`
            }
        ];
    }

    renderGalleryItems(items) {
        if (!items || items.length === 0) {
            this.showEmptyState();
            return;
        }

        this.galleryGrid.innerHTML = '';
        
        items.forEach(item => {
            const galleryItem = this.createGalleryItem(item);
            this.galleryGrid.appendChild(galleryItem);
        });
    }

    createGalleryItem(item) {
        const itemElement = document.createElement('div');
        itemElement.className = 'gallery-item';
        itemElement.setAttribute('data-item-id', item.id);
        
        itemElement.innerHTML = `
            <div class="gallery-item-thumbnail">
                <div class="thumbnail-loading">
                    <div class="loading-spinner"></div>
                    <span>Loading Preview...</span>
                </div>
                <canvas class="thumbnail-canvas" width="300" height="300"></canvas>
            </div>
            <div class="gallery-item-content">
                <h3 class="gallery-item-title">${this.escapeHtml(item.title)}</h3>
            </div>
        `;

        // Load thumbnail preview
        this.loadThumbnail(itemElement, item);

        // Add click handler for the entire item
        itemElement.addEventListener('click', () => {
            this.selectItem(item.id);
        });

        return itemElement;
    }

    async loadThumbnail(itemElement, item) {
        const thumbnailCanvas = itemElement.querySelector('.thumbnail-canvas');
        const loadingElement = itemElement.querySelector('.thumbnail-loading');
        
        try {
            // For now, we'll just show a placeholder
            // In a real implementation, this would render the SCAD code to the thumbnail canvas
            setTimeout(() => {
                loadingElement.style.display = 'none';
                this.drawPlaceholderThumbnail(thumbnailCanvas, item);
            }, 1000);
        } catch (error) {
            console.error('Error loading thumbnail:', error);
            loadingElement.innerHTML = '<span>Preview Unavailable</span>';
        }
    }

    drawPlaceholderThumbnail(canvas, item) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.fillStyle = '#2d2d2d';
        ctx.fillRect(0, 0, width, height);
        
        // Draw placeholder geometry based on item type
        ctx.fillStyle = '#73C48F';
        ctx.strokeStyle = '#5DAF7B';
        ctx.lineWidth = 2;
        
        // Simple geometric representation
        if (item.title.includes('Cube')) {
            this.drawCube(ctx, width, height);
        } else if (item.title.includes('Vase')) {
            this.drawVase(ctx, width, height);
        } else if (item.title.includes('Gear')) {
            this.drawGear(ctx, width, height);
        } else {
            this.drawGenericShape(ctx, width, height);
        }
    }

    drawCube(ctx, width, height) {
        const size = Math.min(width, height) * 0.3;
        const x = width / 2;
        const y = height / 2;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);
        
        ctx.fillRect(-size/2, -size/2, size, size);
        ctx.strokeRect(-size/2, -size/2, size, size);
        
        ctx.restore();
    }

    drawVase(ctx, width, height) {
        const centerX = width / 2;
        const baseWidth = width * 0.3;
        const topWidth = width * 0.2;
        const vaseHeight = height * 0.6;
        
        ctx.beginPath();
        ctx.moveTo(centerX - baseWidth/2, height * 0.7);
        ctx.bezierCurveTo(
            centerX - baseWidth/2, height * 0.3,
            centerX - topWidth/2, height * 0.2,
            centerX, height * 0.1
        );
        ctx.bezierCurveTo(
            centerX + topWidth/2, height * 0.2,
            centerX + baseWidth/2, height * 0.3,
            centerX + baseWidth/2, height * 0.7
        );
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    drawGear(ctx, width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) * 0.2;
        const teeth = 8;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        
        // Draw gear body
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Draw teeth
        for (let i = 0; i < teeth; i++) {
            const angle = (i / teeth) * Math.PI * 2;
            ctx.save();
            ctx.rotate(angle);
            ctx.translate(radius, 0);
            
            ctx.beginPath();
            ctx.moveTo(-5, -8);
            ctx.lineTo(5, -8);
            ctx.lineTo(5, 8);
            ctx.lineTo(-5, 8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            ctx.restore();
        }
        
        ctx.restore();
    }

    drawGenericShape(ctx, width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        const size = Math.min(width, height) * 0.25;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - size);
        for (let i = 1; i <= 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const x = centerX + Math.sin(angle) * size;
            const y = centerY - Math.cos(angle) * size;
            ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    selectItem(itemId) {
        // Remove selection from previous item
        if (this.selectedItem) {
            const previousItem = document.querySelector(`[data-item-id="${this.selectedItem}"]`);
            if (previousItem) {
                previousItem.classList.remove('selected');
            }
        }
        
        // Select new item
        const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
        if (itemElement) {
            itemElement.classList.add('selected');
            this.selectedItem = itemId;
        }
    }

    async previewItem(itemId) {
        this.selectItem(itemId);
        
        // Show loading screen
        this.showLoadingScreen();
        
        try {
            // In a real implementation, this would render the actual SCAD code
            // For now, we'll simulate loading
            setTimeout(() => {
                this.hideLoadingScreen();
                // Here you would initialize the 3D renderer with the actual SCAD code
                console.log(`Previewing item: ${itemId}`);
            }, 1500);
        } catch (error) {
            console.error('Error previewing item:', error);
            this.hideLoadingScreen();
            this.showError('Failed to load preview');
        }
    }

    async downloadItem(itemId) {
        try {
            // In a real implementation, this would download the actual STL file
            console.log(`Downloading item: ${itemId}`);
            
            // Simulate download
            const link = document.createElement('a');
            link.href = '#'; // Would be actual STL file URL
            link.download = `model-${itemId}.stl`;
            link.click();
            
        } catch (error) {
            console.error('Error downloading item:', error);
            this.showError('Failed to download file');
        }
    }

    showLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.classList.add('visible');
        }
    }

    hideLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.classList.remove('visible');
        }
    }

    showEmptyState() {
        this.galleryGrid.innerHTML = `
            <div class="gallery-empty-state">
                <i class="bi bi-collection"></i>
                <h3>No Models Yet</h3>
                <p>Create your first 3D model to see it appear here</p>
                <a href="/simple.html" class="gallery-create-btn">
                    <i class="bi bi-magic"></i>
                    Create Your First Model
                </a>
            </div>
        `;
    }

    showErrorState(message) {
        this.galleryGrid.innerHTML = `
            <div class="gallery-empty-state">
                <i class="bi bi-exclamation-triangle"></i>
                <h3>Error Loading Gallery</h3>
                <p>${message}</p>
                <button class="gallery-create-btn" onclick="galleryManager.loadGalleryItems()">
                    <i class="bi bi-arrow-clockwise"></i>
                    Try Again
                </button>
            </div>
        `;
    }

    showError(message) {
        // Simple error notification - could be enhanced with a proper notification system
        alert(message);
    }

    handleResize() {
        // Handle canvas and layout resizing
        if (this.renderCanvas) {
            // Reset canvas size - actual rendering would be handled by the 3D engine
            this.renderCanvas.style.width = '100%';
            this.renderCanvas.style.height = '100%';
        }
    }

    handleKeyboardNavigation(e) {
        // Add keyboard navigation for accessibility
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            // Navigate between gallery items
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}

// Initialize gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.galleryManager = new GalleryManager();
});

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GalleryManager;
}
