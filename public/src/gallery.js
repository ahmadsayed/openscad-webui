// gallery.js - Simplified STL-only gallery for PromptSCAD - Thumbnails Only

class GalleryManager {
    constructor() {
        this.galleryGrid = document.querySelector('.gallery-grid');
        this.samples = [];
        
        this.init();
    }

    async init() {
        console.log('Initializing STL Gallery Manager - Thumbnails Only');
        await this.loadGalleryItems();
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
            // Load STL samples from the samples directory
            this.samples = await this.loadSTLSamples();
            this.renderGalleryItems(this.samples);
        } catch (error) {
            console.error('Error loading gallery items:', error);
            this.showErrorState('Failed to load gallery items');
        }
    }

    async loadSTLSamples() {
        const samples = [];
        
        // Define sample directories - descriptions will be extracted from SCAD file comments
        const sampleDirs = [
            { id: 'example-1' },
            { id: 'example-2' },
            { id: 'example-3' }
        ];
        
        console.log('🔍 Starting to load STL samples...');
        
        for (const sample of sampleDirs) {
            try {
                const stlUrl = `/samples/${sample.id}/${sample.id}.stl`;
                const scadUrl = `/samples/${sample.id}/${sample.id}.scad`;
                console.log(`🔍 Checking STL file: ${stlUrl}`);
                console.log(`🔍 Checking SCAD file: ${scadUrl}`);
                
                // Check if STL file exists
                const stlResponse = await fetch(stlUrl);
                const hasSTL = stlResponse.ok;
                
                console.log(`🔍 STL file ${stlUrl}: ${hasSTL ? 'FOUND' : 'NOT FOUND'}`);
                
                if (hasSTL) {
                    // Extract description from SCAD file comment
                    let description = await this.extractDescriptionFromSCAD(scadUrl);
                    
                    samples.push({
                        id: sample.id,
                        title: this.generateFallbackTitle(scadUrl),
                        description: description,
                        stlPath: stlUrl
                    });
                    console.log(`✅ Added sample: ${description}`);
                }
            } catch (error) {
                console.warn(`❌ Failed to load sample ${sample.id}:`, error);
            }
        }
        
        console.log(`📊 Total samples loaded: ${samples.length}`);
        return samples;
    }

    async extractDescriptionFromSCAD(scadUrl) {
        try {
            console.log(`🔍 Extracting description from SCAD file: ${scadUrl}`);
            
            const response = await fetch(scadUrl);
            if (!response.ok) {
                console.warn(`❌ SCAD file not found: ${scadUrl}`);
                return this.generateFallbackDescription(scadUrl);
            }
            
            const scadContent = await response.text();
            
            // Extract comment from top of file using /* */ pattern
            const commentMatch = scadContent.match(/^\/\*\s*([\s\S]*?)\s*\*\/\s*/);
            
            if (commentMatch && commentMatch[1]) {
                const extractedDescription = commentMatch[1].trim();
                console.log(`✅ Extracted description: "${extractedDescription}"`);
                return extractedDescription;
            } else {
                console.warn(`⚠️ No comment found in SCAD file: ${scadUrl}`);
                return this.generateFallbackDescription(scadUrl);
            }
            
        } catch (error) {
            console.error(`❌ Error extracting description from SCAD file: ${scadUrl}`, error);
            return this.generateFallbackDescription(scadUrl);
        }
    }

    generateFallbackDescription(scadUrl) {
        // Extract filename from URL and clean it up as a fallback description
        const filename = scadUrl.split('/').pop().replace('.scad', '');
        const cleanedDescription = filename
            .replace(/-/g, ' ')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
        
        console.log(`📝 Generated fallback description: "${cleanedDescription}"`);
        return cleanedDescription;
    }

    generateFallbackTitle(scadUrl) {
        // Extract filename from URL and clean it up
        const filename = scadUrl.split('/').pop().replace('.scad', '');
        const cleanedTitle = filename
            .replace(/-/g, ' ')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
        
        console.log(`📝 Generated fallback title: "${cleanedTitle}"`);
        return cleanedTitle;
    }

    renderGalleryItems(items) {
        console.log(`🎨 Rendering ${items.length} gallery items`);
        
        if (!items || items.length === 0) {
            console.log('📭 No items to render, showing empty state');
            this.showEmptyState();
            return;
        }

        this.galleryGrid.innerHTML = '';
        
        items.forEach((item, index) => {
            console.log(`🎨 Creating gallery item ${index + 1}: ${item.title}`);
            const galleryItem = this.createGalleryItem(item);
            this.galleryGrid.appendChild(galleryItem);
        });
        
        console.log('✅ Gallery items rendered successfully');
    }

    createGalleryItem(item) {
        const itemElement = document.createElement('div');
        itemElement.className = 'gallery-item';
        itemElement.setAttribute('data-item-id', item.id);
        
        itemElement.innerHTML = `
            <div class="gallery-item-thumbnail">
                <canvas class="thumbnail-canvas" data-item-id="${item.id}" width="250" height="250"></canvas>
                <div class="thumbnail-loading">
                    <div class="loading-spinner"></div>
                </div>
            </div>
            <div class="gallery-item-content">
                <h3 class="gallery-item-title">${this.escapeHtml(item.title)}</h3>
                <p class="gallery-item-description">${this.escapeHtml(item.description)}</p>
            </div>
        `;

        // Add click handler for the entire item
        itemElement.addEventListener('click', () => {
            this.selectItem(item.id);
        });

        // Render thumbnail after element is created
        setTimeout(() => {
            this.renderThumbnail(item);
        }, 100);

        return itemElement;
    }

    selectItem(itemId) {
        // Remove selection from previous item
        if (this.selectedItem) {
            const previousItem = document.querySelector(`[data-item-id="${this.selectedItem}"]`);
            if (previousItem) {
                previousItem.classList.remove('selected');
            }
        }
        
        // Select new item (thumbnails only - no preview)
        const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
        if (itemElement) {
            itemElement.classList.add('selected');
            this.selectedItem = itemId;
            console.log(`Selected item: ${itemId} (thumbnails only mode)`);
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
        // No longer needed - thumbnails only
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

    async renderThumbnail(item) {
        const canvas = document.querySelector(`.thumbnail-canvas[data-item-id="${item.id}"]`);
        const loadingElement = canvas?.parentElement.querySelector('.thumbnail-loading');
        
        if (!canvas) {
            console.warn(`Canvas not found for item: ${item.id}`);
            return;
        }

        try {
            console.log(`🎨 Rendering thumbnail for: ${item.title}`);
            
            // Show loading state
            if (loadingElement) {
                loadingElement.style.display = 'flex';
            }

            // Create mini scene for thumbnail
            const engine = new BABYLON.Engine(canvas, true);
            const scene = new BABYLON.Scene(engine);
            
            // Set background color to match gallery theme
            scene.clearColor = new BABYLON.Color3(0.2, 0.2, 0.2);
            
            // Setup camera for thumbnail view with mouse controls
            const camera = new BABYLON.ArcRotateCamera(
                "thumbCamera", 
                -Math.PI / 2, 
                Math.PI / 3, 
                50, 
                new BABYLON.Vector3(0, 0, 0)
            );
            
            // Enable mouse controls for rotation and zoom
            camera.attachControl(canvas, true);
            camera.wheelPrecision = 50; // Make zoom smoother
            camera.pinchPrecision = 50; // Make pinch zoom smoother on mobile
            
            // Setup lighting
            const light1 = new BABYLON.HemisphericLight("thumbLight1", new BABYLON.Vector3(0, 1, 0));
            const light2 = new BABYLON.HemisphericLight("thumbLight2", new BABYLON.Vector3(1, 0, 0));
            light1.intensity = 0.8;
            light2.intensity = 0.4;

            // Load STL file
            await this.loadSTLToThumbnail(item.stlPath, scene);
            
            // Start render loop
            engine.runRenderLoop(() => {
                scene.render();
            });

            // Hide loading state
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }

            console.log(`✅ Thumbnail rendered for: ${item.title}`);

        } catch (error) {
            console.error(`❌ Error rendering thumbnail for ${item.title}:`, error);
            
            // Hide loading and show error state
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            
            // Show placeholder on error
            const placeholder = document.createElement('div');
            placeholder.className = 'thumbnail-placeholder';
            placeholder.innerHTML = `
                <i class="bi bi-exclamation-triangle"></i>
                <span>Failed to load</span>
            `;
            canvas.parentElement.appendChild(placeholder);
        }
    }

    async loadSTLToThumbnail(stlPath, scene) {
        return new Promise((resolve, reject) => {
            // Load STL file using Babylon.js SceneLoader
            BABYLON.SceneLoader.Append("", stlPath, scene, (scene) => {
                // Create material for the model
                const material = new BABYLON.StandardMaterial("thumbMaterial", scene);
                material.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0);
                material.alpha = 1;

                // Apply material to all meshes
                scene.meshes.forEach(mesh => {
                    if (mesh !== scene.activeCamera) {
                        mesh.material = material;
                    }
                });

                resolve();
            }, null, (scene, message, exception) => {
                console.error('Error loading STL for thumbnail:', message, exception);
                reject(new Error(`Failed to load STL for thumbnail: ${message}`));
            }, ".stl");
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
