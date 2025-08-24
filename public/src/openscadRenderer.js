// openscadRenderer.js - Handles OpenSCAD rendering and STL generation

// Core dependencies
import OpenSCAD from "../openscad.js";

// Utility functions
import { downloadBinaryAsFile } from './utils/fileUtils.js';
import { 
    generateCodeHash, 
    saveCodeWithHash, 
    loadCodeByHash, 
    cleanupOldEntries, 
    getHashIndex, 
    getStorageStats 
} from './utils/codeStorage.js';


/**
 * Class responsible for rendering OpenSCAD code and managing the generated STL
 */
export class OpenSCADRenderer {
    /**
     * @param {BABYLON.Scene} scene - The Babylon scene to render into
     */
    constructor(scene) {
        this.scene = scene;
        this.worker = new Worker('./src/openscadWorker.js', { type: 'module' });
        this.pendingRequests = new Map();
        this.isProcessing = false;
        this.currentCode = null;
        this.currentHash = null;
        this.currentStlData = null;
        
        // Drawing annotation properties
        this.isDrawing = false;
        this.drawingEnabled = false;
        this.drawingColor = '#ff0000';
        this.drawingLineWidth = 2;
        this.annotationCanvas = null;
        this.annotationCtx = null;
        this.lastDrawPoint = null;
        
        // Create processing indicator element
        this._createProcessingIndicator();
        
        // Initialize drawing canvas
        this._initializeDrawingCanvas();
        
        // Set up a single message handler for all worker responses
        this.worker.onmessage = (e) => {
            const data = e.data;
            
            // Handle progress updates
            if (data.type === 'progress') {
                this._updateProcessingIndicator(data.status, data.message);
                return;
            }
            
            // Handle regular responses
            const { id, result, error } = data;
            const request = this.pendingRequests.get(id);
            
            if (!request) return;
            this.pendingRequests.delete(id);
            
            // Hide processing indicator if no more pending requests
            if (this.pendingRequests.size === 0) {
                this._hideProcessingIndicator();
            }

            if (error) {
                request.reject(new Error(error));
            } else {
                if (request.type === 'render') {
                    this._handleRenderResult(result, request.code).then(request.resolve).catch(request.reject);
                } else if (request.type === 'getSTL') {
                    try {
                        const bytes = new Uint8Array(result);
                        downloadBinaryAsFile(`${this.currentHash || 'model'}.stl`, bytes);
                        request.resolve();
                    } catch (err) {
                        console.error("Error processing STL data:", err);
                        request.reject(err);
                    }
                }
            }
        };
    }
    
    /**
     * Creates the processing indicator element
     * @private
     */
    _createProcessingIndicator() {
        // Check if the indicator already exists
        if (document.querySelector('.processing-indicator')) {
            return;
        }
        
        // Create the indicator elements
        const indicator = document.createElement('div');
        indicator.className = 'processing-indicator';
        
        const spinner = document.createElement('div');
        spinner.className = 'spinner';
        
        const text = document.createElement('div');
        text.className = 'processing-text';
        text.textContent = 'Processing OpenSCAD...';
        
        // Assemble the indicator
        indicator.appendChild(spinner);
        indicator.appendChild(text);
        
        // Add to the simple 3D section instead of split__right
        const container = document.querySelector('.simple-3d-section') || document.querySelector('.split__right');
        if (container) {
            container.appendChild(indicator);
        }
    }
    
    /**
     * Updates the processing indicator with status information
     * @private
     * @param {string} status - The current processing status
     * @param {string} message - The message to display
     */
    _updateProcessingIndicator(status, message) {
        const indicator = document.querySelector('.processing-indicator');
        if (!indicator) return;
        
        const textElement = indicator.querySelector('.processing-text');
        if (textElement) {
            textElement.textContent = message || 'Processing OpenSCAD...';
        }
        
        // Make sure the indicator is visible during processing
        if (status !== 'completed' && status !== 'error') {
            this._showProcessingIndicator();
        }
        
        // If status is 'error' or 'completed', hide the indicator immediately
        if (status === 'error' || status === 'completed') {
            // Clear any existing timeout to prevent conflicts
            if (this._hideTimeout) {
                clearTimeout(this._hideTimeout);
                this._hideTimeout = null;
            }
            
            // Hide immediately for completed status
            this._hideProcessingIndicator();
        }
    }
    
    /**
     * Shows the processing indicator
     * @private
     */
    _showProcessingIndicator() {
        const indicator = document.querySelector('.processing-indicator');
        if (indicator) {
            indicator.classList.add('visible');
        }
        this.isProcessing = true;
    }
    
    /**
     * Hides the processing indicator
     * @private
     */
    _hideProcessingIndicator() {
        const indicator = document.querySelector('.processing-indicator');
        if (indicator) {
            indicator.classList.remove('visible');
        }
        this.isProcessing = false;
    }

    /**
     * Force hide the processing indicator and clear any pending timeouts
     * @public
     */
    forceHideProcessingIndicator() {
        // Clear any existing timeout
        if (this._hideTimeout) {
            clearTimeout(this._hideTimeout);
            this._hideTimeout = null;
        }
        
        // Force hide the indicator
        this._hideProcessingIndicator();
        
        // Clear pending requests if needed
        this.pendingRequests.clear();
    }

    /**
     * Initialize the drawing canvas overlay for annotations
     * @private
     */
    _initializeDrawingCanvas() {
        const renderCanvas = document.getElementById("renderCanvas");
        if (!renderCanvas) return;

        // Create annotation canvas overlay
        this.annotationCanvas = document.createElement('canvas');
        this.annotationCanvas.id = 'annotationCanvas';
        this.annotationCanvas.style.position = 'absolute';
        this.annotationCanvas.style.top = '0';
        this.annotationCanvas.style.left = '0';
        this.annotationCanvas.style.pointerEvents = 'none'; // Allow events to pass through when not drawing
        this.annotationCanvas.style.zIndex = '10';
        this.annotationCanvas.style.cursor = 'crosshair';
        
        // Match the render canvas size
        this.annotationCanvas.width = renderCanvas.width;
        this.annotationCanvas.height = renderCanvas.height;
        
        // Get 2D context for drawing
        this.annotationCtx = this.annotationCanvas.getContext('2d');
        this.annotationCtx.lineCap = 'round';
        this.annotationCtx.lineJoin = 'round';
        
        // Insert the annotation canvas after the render canvas
        renderCanvas.parentNode.insertBefore(this.annotationCanvas, renderCanvas.nextSibling);
        
        // Set up resize observer to keep annotation canvas in sync
        const resizeObserver = new ResizeObserver(() => {
            this._resizeAnnotationCanvas();
        });
        resizeObserver.observe(renderCanvas);
        
        // Set up mouse event listeners
        this._setupMouseEvents();
    }

    /**
     * Resize annotation canvas to match render canvas
     * @private
     */
    _resizeAnnotationCanvas() {
        const renderCanvas = document.getElementById("renderCanvas");
        if (!renderCanvas || !this.annotationCanvas) return;
        
        // Store current drawing before resize
        const imageData = this.annotationCtx.getImageData(0, 0, this.annotationCanvas.width, this.annotationCanvas.height);
        
        // Resize canvas
        this.annotationCanvas.width = renderCanvas.clientWidth;
        this.annotationCanvas.height = renderCanvas.clientHeight;
        this.annotationCanvas.style.width = renderCanvas.clientWidth + 'px';
        this.annotationCanvas.style.height = renderCanvas.clientHeight + 'px';
        
        // Restore drawing settings
        this.annotationCtx.lineCap = 'round';
        this.annotationCtx.lineJoin = 'round';
        this.annotationCtx.strokeStyle = this.drawingColor;
        this.annotationCtx.lineWidth = this.drawingLineWidth;
        
        // Restore previous drawing (scaled)
        this.annotationCtx.putImageData(imageData, 0, 0);
    }

    /**
     * Set up mouse event listeners for drawing
     * @private
     */
    _setupMouseEvents() {
        const renderCanvas = document.getElementById("renderCanvas");
        if (!renderCanvas) return;

        // Store references to event handlers for cleanup
        this._mouseDownHandler = (e) => {
            if (!this.drawingEnabled) return;
            
            console.log('Drawing started');
            this.isDrawing = true;
            this.annotationCanvas.style.pointerEvents = 'auto';
            
            const rect = renderCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            this.lastDrawPoint = { x, y };
            
            // Start new path
            this.annotationCtx.beginPath();
            this.annotationCtx.moveTo(x, y);
            this.annotationCtx.strokeStyle = this.drawingColor;
            this.annotationCtx.lineWidth = this.drawingLineWidth;
            this.annotationCtx.lineCap = 'round';
            this.annotationCtx.lineJoin = 'round';
            
            // Prevent camera movement while drawing
            e.stopPropagation();
            e.preventDefault();
        };

        this._mouseMoveHandler = (e) => {
            if (!this.isDrawing || !this.drawingEnabled) return;
            
            const rect = renderCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Draw line from last point to current point
            this.annotationCtx.lineTo(x, y);
            this.annotationCtx.stroke();
            
            this.lastDrawPoint = { x, y };
            
            // Prevent camera movement while drawing
            e.stopPropagation();
            e.preventDefault();
        };

        this._mouseUpHandler = (e) => {
            if (!this.drawingEnabled) return;
            
            console.log('Drawing stopped');
            this.isDrawing = false;
            this.annotationCanvas.style.pointerEvents = 'none';
            this.lastDrawPoint = null;
            
            // Prevent camera movement
            e.stopPropagation();
            e.preventDefault();
        };

        this._mouseLeaveHandler = (e) => {
            if (!this.drawingEnabled) return;
            
            this.isDrawing = false;
            this.annotationCanvas.style.pointerEvents = 'none';
            this.lastDrawPoint = null;
        };

        // Use event capture (true) to intercept events before Babylon.js
        renderCanvas.addEventListener('mousedown', this._mouseDownHandler, true);
        renderCanvas.addEventListener('mousemove', this._mouseMoveHandler, true);
        renderCanvas.addEventListener('mouseup', this._mouseUpHandler, true);
        renderCanvas.addEventListener('mouseleave', this._mouseLeaveHandler, true);

        // Touch events for mobile support
        this._touchStartHandler = (e) => {
            if (!this.drawingEnabled) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY,
                bubbles: true
            });
            this._mouseDownHandler(mouseEvent);
        };

        this._touchMoveHandler = (e) => {
            if (!this.drawingEnabled) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY,
                bubbles: true
            });
            this._mouseMoveHandler(mouseEvent);
        };

        this._touchEndHandler = (e) => {
            if (!this.drawingEnabled) return;
            e.preventDefault();
            
            const mouseEvent = new MouseEvent('mouseup', {
                bubbles: true
            });
            this._mouseUpHandler(mouseEvent);
        };

        renderCanvas.addEventListener('touchstart', this._touchStartHandler, true);
        renderCanvas.addEventListener('touchmove', this._touchMoveHandler, true);
        renderCanvas.addEventListener('touchend', this._touchEndHandler, true);
    }

    /**
     * Enable drawing mode
     * @public
     */
    enableDrawing() {
        this.drawingEnabled = true;
        const renderCanvas = document.getElementById("renderCanvas");
        if (renderCanvas) {
            renderCanvas.style.cursor = 'crosshair';
        }
        console.log('Drawing mode enabled');
    }

    /**
     * Disable drawing mode
     * @public
     */
    disableDrawing() {
        this.drawingEnabled = false;
        this.isDrawing = false;
        const renderCanvas = document.getElementById("renderCanvas");
        if (renderCanvas) {
            renderCanvas.style.cursor = 'default';
        }
        if (this.annotationCanvas) {
            this.annotationCanvas.style.pointerEvents = 'none';
        }
        console.log('Drawing mode disabled');
    }

    /**
     * Toggle drawing mode
     * @public
     * @returns {boolean} Current drawing enabled state
     */
    toggleDrawing() {
        if (this.drawingEnabled) {
            this.disableDrawing();
        } else {
            this.enableDrawing();
        }
        return this.drawingEnabled;
    }

    /**
     * Clear all annotations
     * @public
     */
    clearAnnotations() {
        if (this.annotationCtx) {
            this.annotationCtx.clearRect(0, 0, this.annotationCanvas.width, this.annotationCanvas.height);
        }
    }

    /**
     * Set drawing color
     * @public
     * @param {string} color - CSS color string
     */
    setDrawingColor(color) {
        this.drawingColor = color;
    }

    /**
     * Set drawing line width
     * @public
     * @param {number} width - Line width in pixels
     */
    setDrawingLineWidth(width) {
        this.drawingLineWidth = width;
    }

    /**
     * Get current drawing state
     * @public
     * @returns {Object} Drawing state object
     */
    getDrawingState() {
        return {
            enabled: this.drawingEnabled,
            color: this.drawingColor,
            lineWidth: this.drawingLineWidth,
            isDrawing: this.isDrawing
        };
    }

    /**
     * Render OpenSCAD code to the scene
     * @param {string} openscadCode - The OpenSCAD code to render
     * @returns {Promise<void>}
     */
    async renderOpenSCAD(openscadCode) {
        const id = Date.now() + Math.random().toString(36).substr(2, 5);
        
        // Always generate hash fresh from the provided code
        const newHash = await generateCodeHash(openscadCode);
        const oldHash = this.currentHash;
        
        // Store current code and hash
        this.currentCode = openscadCode;
        this.currentHash = newHash;
        
        // Debug logging
        console.log(`🔍 Code changed: ${oldHash !== newHash ? 'YES' : 'NO'}`);
        console.log(`🔍 Old hash: ${oldHash ? oldHash.substring(0, 8) + '...' : 'none'}`);
        console.log(`🔍 New hash: ${newHash.substring(0, 8)}...`);
        
        // Check if we already have this exact code/STL cached
        const cachedData = loadCodeByHash(this.currentHash);
        if (cachedData && cachedData.stlData) {
            console.log(`💾 Cache HIT for hash: ${this.currentHash.substring(0, 8)}...`);
            console.log(`📊 Skipping OpenSCAD compilation, loading cached STL.`);
            try {
                await this._handleRenderResult(cachedData.stlData.buffer, openscadCode, true);
                return;
            } catch (error) {
                console.warn('Failed to load cached model, regenerating:', error);
            }
        } else {
            console.log(`💾 Cache MISS for hash: ${this.currentHash.substring(0, 8)}...`);
            console.log(`🔄 Will generate new model with OpenSCAD compilation.`);
        }
        
        // Show processing indicator
        this._showProcessingIndicator();
        
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { 
                resolve, 
                reject,
                type: 'render',
                code: openscadCode
            });

            this.worker.postMessage({
                id,
                command: 'render',
                data: { openscadCode }
            });
        });
    }

    async _handleRenderResult(stlBuffer, code, fromCache = false) {
        // Store STL data for future use
        this.currentStlData = new Uint8Array(stlBuffer);
        
        // Save code and STL with hash if not from cache
        if (!fromCache && code && this.currentHash) {
            await saveCodeWithHash(this.currentHash, code, this.currentStlData);
            console.log(`💾 Cached model with hash: ${this.currentHash.substring(0, 8)}... (${Math.round(this.currentStlData.length / 1024)}KB)`);
            
            // Cleanup old entries periodically
            if (Math.random() < 0.1) { // 10% chance
                const deletedCount = cleanupOldEntries();
                if (deletedCount > 0) {
                    console.log(`🧹 Cleaned up ${deletedCount} old cached models`);
                }
            }
        }
        
        // Convert buffer to base64
        const buffer = this._arrayBufferToBase64(stlBuffer);
        
        // Clear scene and load STL
        this._clearScene();
        await this._loadSTLToScene(buffer);
    }
    /**
     * Download the generated STL file
     * @returns {Promise<void>}
     */
    downloadSTL() {
        // If we have cached STL data, use it directly
        if (this.currentStlData && this.currentHash) {
            const filename = `${this.currentHash.substring(0, 16)}.stl`;
            downloadBinaryAsFile(filename, this.currentStlData);
            return Promise.resolve();
        }
        
        // Otherwise request fresh STL from worker
        const id = Date.now() + Math.random().toString(36).substr(2, 5);
        
        // Show processing indicator
        this._showProcessingIndicator();
        
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { 
                resolve, 
                reject,
                type: 'getSTL'
            });

            this.worker.postMessage({
                id,
                command: 'getSTL'
            });
        });
    }
    
    /**
     * Get current code hash
     * @returns {string|null} Current code hash
     */
    getCurrentHash() {
        return this.currentHash;
    }
    
    /**
     * Get current STL data
     * @returns {Uint8Array|null} Current STL data
     */
    getCurrentStlData() {
        return this.currentStlData;
    }

    /**
     * Convert array buffer to base64 data URL
     * @private
     * @param {ArrayBuffer} buffer - The buffer to convert
     * @returns {string} The base64 data URL
     */
    _arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;

        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }

        return "data:;base64," + window.btoa(binary);
    }

    /**
     * Clear all meshes from the scene
     * @private
     */
    _clearScene() {
        for (let i = 0; i < this.scene.meshes.length; i++) {
            this.scene.meshes[i].dispose();
        }
        this.scene.meshes = [];
    }

    /**
     * Load an STL buffer into the scene
     * @private
     * @param {string} buffer - The base64 STL data
     * @returns {Promise<void>}
     */
    _loadSTLToScene(buffer) {
        return new Promise((resolve) => {
            BABYLON.SceneLoader.Append("", buffer, this.scene, (scene) => {
                // Create material for the model
                const material = new BABYLON.StandardMaterial("stlMaterial", scene);
                material.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0);
                material.alpha = 1;

                // Apply material to all meshes and apply transformation
                scene.meshes.forEach(mesh => {
                    if (mesh !== scene.activeCamera) {
                        // Apply material
                        mesh.material = material;
                    }
                });

                // Create axes viewer with custom colors to match OpenSCAD
                const axisSize = 5;
                // const axesViewer = new BABYLON.AxesViewer(scene, axisSize);

                // OpenSCAD uses red for X, green for Y, blue for Z
                // We'll manually create our rotated axes to match OpenSCAD orientation

                // X axis (red) - points right in both systems
                const xAxis = BABYLON.MeshBuilder.CreateLines("xAxis", {
                    points: [
                        new BABYLON.Vector3(0, 0, 0),
                        new BABYLON.Vector3(axisSize, 0, 0)
                    ]
                }, scene);
                xAxis.color = new BABYLON.Color3(1, 0, 0);

                // Y axis (green) - points back in OpenSCAD
                const yAxis = BABYLON.MeshBuilder.CreateLines("yAxis", {
                    points: [
                        new BABYLON.Vector3(0, 0, 0),
                        new BABYLON.Vector3(0, 0, axisSize)
                    ]
                }, scene);
                yAxis.color = new BABYLON.Color3(0, 1, 0);

                // Z axis (blue) - points up in OpenSCAD
                const zAxis = BABYLON.MeshBuilder.CreateLines("zAxis", {
                    points: [
                        new BABYLON.Vector3(0, 0, 0),
                        new BABYLON.Vector3(0, axisSize, 0)
                    ]
                }, scene);
                zAxis.color = new BABYLON.Color3(0, 0, 1);

                // Create axis labels
                const labelX = this._createAxisLabel("X", new BABYLON.Vector3(axisSize + 0.5, 0, 0), scene, new BABYLON.Color3(1, 0, 0));
                const labelY = this._createAxisLabel("Y", new BABYLON.Vector3(0, 0, axisSize + 0.5), scene, new BABYLON.Color3(0, 1, 0));
                const labelZ = this._createAxisLabel("Z", new BABYLON.Vector3(0, axisSize + 0.5, 0), scene, new BABYLON.Color3(0, 0, 1));

                // Group the axes and labels for positioning
                const axesGroup = new BABYLON.TransformNode("axesGroup", scene);
                xAxis.parent = axesGroup;
                yAxis.parent = axesGroup;
                zAxis.parent = axesGroup;
                labelX.parent = axesGroup;
                labelY.parent = axesGroup;
                labelZ.parent = axesGroup;

                // Position the axes group in a fixed position in the viewport
                scene.onBeforeRenderObservable.add(() => {
                    // Update position to keep axes in bottom left corner
                    const bottomLeft = new BABYLON.Vector3(-0.8, -0.8, 0);
                    const screenPos = BABYLON.Vector3.Project(
                        bottomLeft,
                        BABYLON.Matrix.Identity(),
                        scene.getTransformMatrix(),
                        scene.activeCamera.viewport.toGlobal(
                            scene.getEngine().getRenderWidth(),
                            scene.getEngine().getRenderHeight()
                        )
                    );

                    axesGroup.position = scene.activeCamera.position.add(
                        scene.activeCamera.getDirection(BABYLON.Vector3.Forward()).scale(10)
                    );

                    // Make sure the axis is properly sized relative to camera distance
                    const distanceFromCamera = scene.activeCamera.position.length();
                    const scaleFactor = distanceFromCamera * 0.02;
                    axesGroup.scaling = new BABYLON.Vector3(scaleFactor, scaleFactor, scaleFactor);
                });

                resolve();
            }, null, null, ".stl");
        });
    }

    // Helper method to create axis labels
    _createAxisLabel(text, position, scene, color) {
        const plane = BABYLON.MeshBuilder.CreatePlane("label-" + text, {
            width: 1,
            height: 0.5
        }, scene);
        plane.position = position;

        // Always face the camera
        plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

        const dynamicTexture = new BABYLON.DynamicTexture("labelTexture-" + text,
            { width: 128, height: 64 }, scene, true);
        dynamicTexture.hasAlpha = true;

        const context = dynamicTexture.getContext();
        context.clearRect(0, 0, 128, 64);
        context.font = "bold 58px Arial";
        context.fillStyle = `rgb(${color.r * 255}, ${color.g * 255}, ${color.b * 255})`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(text, 64, 32);
        dynamicTexture.update();

        const material = new BABYLON.StandardMaterial("textMaterial-" + text, scene);
        material.diffuseTexture = dynamicTexture;
        material.emissiveColor = color;
        material.disableLighting = true;
        material.useAlphaFromDiffuseTexture = true;
        plane.material = material;

        return plane;
    }
    
    /**
     * Get storage statistics
     * @returns {Object} Storage usage information
     */
    getStorageStats() {
        const stats = getStorageStats();
        return {
            ...stats,
            currentHash: this.currentHash ? this.currentHash.substring(0, 8) + '...' : null
        };
    }
}
