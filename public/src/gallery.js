// gallery.js - Simplified STL-only gallery for PromptSCAD

// Core components
import { createScene } from './scene.js';
import { OpenSCADRenderer } from './openscadRenderer.js';

class GalleryManager {
    constructor() {
        this.galleryGrid = document.querySelector('.gallery-grid');
        this.renderCanvas = document.getElementById('renderCanvas');
        this.loadingScreen = document.getElementById('loadingScreen');
        this.selectedItem = null;
        this.scene = null;
        this.renderer = null;
        this.samples = [];
        
        this.init();
    }

    async init() {
        console.log('Initializing STL Gallery Manager');
        await this.initRenderer();
        await this.loadGalleryItems();
        this.setupEventListeners();
    }

    async initRenderer() {
        try {
            // Create the rendering scene
            this.scene = await createScene();
            
            // Initialize the OpenSCAD renderer
            this.renderer = new OpenSCADRenderer(this.scene);
            
            console.log('Gallery renderer initialized successfully');
        } catch (error) {
            console.error('Error initializing gallery renderer:', error);
        }
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
        
        // Define sample metadata - we'll scan the samples directory for STL files
        const sampleDirs = [
            { id: 'example-1', title: 'Cube with Holes', description: 'A cube with cylindrical cutouts' },
            { id: 'example-2', title: 'Sample Model 2', description: 'Second sample model' },
            { id: 'example-3', title: 'Sample Model 3', description: 'Third sample model' }
        ];
        
        console.log('🔍 Starting to load STL samples...');
        
        for (const sample of sampleDirs) {
            try {
                const stlUrl = `/samples/${sample.id}/${sample.id}.stl`;
                console.log(`🔍 Checking STL file: ${stlUrl}`);
                
                // Check if STL file exists
                const stlResponse = await fetch(stlUrl);
                const hasSTL = stlResponse.ok;
                
                console.log(`🔍 STL file ${stlUrl}: ${hasSTL ? 'FOUND' : 'NOT FOUND'}`);
                
                if (hasSTL) {
                    samples.push({
                        id: sample.id,
                        title: sample.title,
                        description: sample.description,
                        stlPath: stlUrl
                    });
                    console.log(`✅ Added sample: ${sample.title}`);
                }
            } catch (error) {
                console.warn(`❌ Failed to load sample ${sample.id}:`, error);
            }
        }
        
        console.log(`📊 Total samples loaded: ${samples.length}`);
        return samples;
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
                <div class="thumbnail-placeholder">
                    <i class="bi bi-cube"></i>
                    <span>3D Model</span>
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
        
        // Select new item
        const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
        if (itemElement) {
            itemElement.classList.add('selected');
            this.selectedItem = itemId;
            
            // Load and display the STL file
            this.loadSTLPreview(itemId);
        }
    }

    async loadSTLPreview(itemId) {
        const sample = this.samples.find(s => s.id === itemId);
        if (!sample) {
            console.warn(`Sample not found: ${itemId}`);
            return;
        }

        // Show loading screen
        this.showLoadingScreen();
        
        try {
            console.log(`Loading STL preview for: ${sample.title}`);
            
            // Load STL file directly using the same approach as simple.pug
            await this.loadSTLFile(sample.stlPath);
            console.log(`STL preview loaded successfully for: ${sample.title}`);
            
        } catch (error) {
            console.error('Error loading STL preview:', error);
            this.showError('Failed to load 3D preview');
        } finally {
            this.hideLoadingScreen();
        }
    }

    async loadSTLFile(stlPath) {
        return new Promise((resolve, reject) => {
            // Clear the scene first
            this._clearScene();
            
            // Load STL file directly using Babylon.js SceneLoader
            BABYLON.SceneLoader.Append("", stlPath, this.scene, (scene) => {
                // Create material for the model
                const material = new BABYLON.StandardMaterial("stlMaterial", scene);
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
                console.error('Error loading STL file:', message, exception);
                reject(new Error(`Failed to load STL: ${message}`));
            }, ".stl");
        });
    }

    _clearScene() {
        for (let i = 0; i < this.scene.meshes.length; i++) {
            this.scene.meshes[i].dispose();
        }
        this.scene.meshes = [];
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
}

// Initialize gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.galleryManager = new GalleryManager();
});

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GalleryManager;
}
