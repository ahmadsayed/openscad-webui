// chatHistory.js - Chat history management and rendering

import { getHashIndex, loadCodeByHash } from '../utils/storage/index.js';
import { STORAGE_PREFIXES } from '../utils/storage/constants.js';

// Global state for history management
let historyItems = new Map(); // Map of hash -> history item data
let activePreviewScenes = new Map(); // Map of previewId -> { scene, engine }

/**
 * Initialize chat history functionality
 */
export function initChatHistory() {
    // Load history when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadChatHistory);
    } else {
        loadChatHistory();
    }

    // Setup event listeners
    setupHistoryEventListeners();
}

/**
 * Load chat history from storage
 */
export async function loadChatHistory() {
    const historyList = document.getElementById('chatHistoryList');
    const historyLoading = document.getElementById('historyLoading');
    const historyEmpty = document.getElementById('historyEmpty');

    if (!historyList || !historyLoading || !historyEmpty) {
        console.warn('Chat history elements not found');
        return;
    }

    // Show loading state
    historyLoading.style.display = 'flex';
    historyList.style.display = 'none';
    historyEmpty.style.display = 'none';

    try {
        // Get hash index from storage
        const hashIndex = getHashIndex();
        const hashes = Object.keys(hashIndex);

        if (hashes.length === 0) {
            // No history - show empty state
            historyLoading.style.display = 'none';
            historyEmpty.style.display = 'flex';
            return;
        }

        // Clear existing items
        historyList.innerHTML = '';
        historyItems.clear();

        // Sort hashes by timestamp (newest first)
        const sortedHashes = hashes.sort((a, b) => {
            return hashIndex[b].timestamp - hashIndex[a].timestamp;
        });

        // Create history items
        for (const hash of sortedHashes) {
            const metadata = hashIndex[hash];
            await createHistoryItem(hash, metadata, historyList);
        }

        // Show history list
        historyLoading.style.display = 'none';
        historyList.style.display = 'block';

    } catch (error) {
        console.error('Failed to load chat history:', error);
        historyLoading.style.display = 'none';
        historyEmpty.style.display = 'flex';
    }
}

/**
 * Create a history item element
 */
async function createHistoryItem(hash, metadata, historyList) {
    try {
        // Load the actual code to extract a description
        const storedData = loadCodeByHash(hash);
        if (!storedData) {
            console.warn(`No data found for hash: ${hash}`);
            return;
        }

        // Generate a description from the code
        const description = generateDescriptionFromCode(storedData.code);
        
        // Format timestamp
        const timestamp = new Date(metadata.timestamp).toLocaleString();

        // Create list item
        const listItem = document.createElement('li');
        listItem.className = 'chat-history-item';
        listItem.setAttribute('data-hash', hash);
        listItem.setAttribute('data-timestamp', metadata.timestamp);
        listItem.setAttribute('data-has-stl', metadata.hasStl);

        // Generate unique preview ID
        const previewId = `preview-${hash.substring(0, 8)}`;

        listItem.innerHTML = `
            <div class="item-header">
                <div class="item-text">${description}</div>
                <div class="item-meta">
                    <span class="item-timestamp">${timestamp}</span>
                    ${metadata.hasStl ? '<span class="item-stl-badge">STL</span>' : ''}
                </div>
                <div class="item-toggle">
                    <i class="bi bi-chevron-down"></i>
                </div>
            </div>
            <div class="item-preview">
                <canvas class="preview-canvas" data-preview-id="${previewId}"></canvas>
                <div class="preview-loading" style="display: none;">
                    <div class="loading-spinner-small"></div>
                    <span>Loading preview...</span>
                </div>
                ${!metadata.hasStl ? '<div class="preview-unavailable">Preview not available</div>' : ''}
            </div>
            <div class="item-actions">
                <button class="item-load-btn" title="Load this model">
                    <i class="bi bi-arrow-clockwise"></i>
                    Load
                </button>
                <button class="item-delete-btn" title="Delete this model">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;

        // Add to history list
        historyList.appendChild(listItem);

        // Store item data
        historyItems.set(hash, {
            element: listItem,
            metadata,
            code: storedData.code,
            stlData: storedData.stlData,
            description
        });

        // Setup event listeners for this item
        setupHistoryItemEventListeners(listItem, hash);

    } catch (error) {
        console.error(`Failed to create history item for hash ${hash}:`, error);
    }
}

/**
 * Generate a description from OpenSCAD code
 */
function generateDescriptionFromCode(code) {
    // Simple heuristic to extract a description
    const lines = code.split('\n');
    
    // Look for comments at the beginning
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('//')) {
            return trimmed.substring(2).trim() || '3D Model';
        }
    }
    
    // Look for module or function definitions
    for (const line of lines) {
        if (line.includes('module') || line.includes('function')) {
            const match = line.match(/(module|function)\s+(\w+)/);
            if (match) {
                return `${match[2]} ${match[1]}`;
            }
        }
    }
    
    // Default description based on common shapes
    if (code.includes('cube')) return 'Cube';
    if (code.includes('sphere')) return 'Sphere';
    if (code.includes('cylinder')) return 'Cylinder';
    if (code.includes('polyhedron')) return 'Complex Shape';
    
    return '3D Model';
}

/**
 * Setup event listeners for history controls
 */
function setupHistoryEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refreshHistoryBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadChatHistory);
    }

    // Clear history button
    const clearBtn = document.getElementById('clearHistoryBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllHistory);
    }
}

/**
 * Setup event listeners for a history item
 */
function setupHistoryItemEventListeners(listItem, hash) {
    const itemData = historyItems.get(hash);
    if (!itemData) return;

    // Toggle expansion
    const header = listItem.querySelector('.item-header');
    const toggleIcon = listItem.querySelector('.item-toggle i');
    
    header.addEventListener('click', (e) => {
        if (e.target.closest('.item-toggle') || e.target.closest('.item-actions')) {
            return;
        }
        
        const isExpanded = listItem.classList.contains('expanded');
        if (isExpanded) {
            collapseHistoryItem(listItem);
        } else {
            expandHistoryItem(listItem, hash);
        }
    });

    // Toggle icon click
    if (toggleIcon) {
        toggleIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = listItem.classList.contains('expanded');
            if (isExpanded) {
                collapseHistoryItem(listItem);
            } else {
                expandHistoryItem(listItem, hash);
            }
        });
    }

    // Load button
    const loadBtn = listItem.querySelector('.item-load-btn');
    if (loadBtn) {
        loadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            loadHistoryModel(hash);
        });
    }

    // Delete button
    const deleteBtn = listItem.querySelector('.item-delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteHistoryItem(hash, listItem);
        });
    }
}

/**
 * Expand a history item and load preview
 */
async function expandHistoryItem(listItem, hash) {
    const itemData = historyItems.get(hash);
    if (!itemData) return;

    // Collapse other expanded items
    document.querySelectorAll('.chat-history-item.expanded').forEach(item => {
        if (item !== listItem) {
            collapseHistoryItem(item);
        }
    });

    // Expand current item
    listItem.classList.add('expanded');
    const toggleIcon = listItem.querySelector('.item-toggle i');
    if (toggleIcon) {
        toggleIcon.className = 'bi bi-chevron-up';
    }

        // Load STL preview if available
        if (itemData.metadata.hasStl && itemData.stlData) {
            await loadStlPreview(listItem, hash, itemData.stlData);
        } else {
            // Show preview unavailable message if no STL data
            const unavailableEl = listItem.querySelector('.preview-unavailable');
            if (unavailableEl) {
                unavailableEl.style.display = 'block';
                unavailableEl.textContent = 'No STL data available';
            }
        }
}

/**
 * Collapse a history item
 */
function collapseHistoryItem(listItem) {
    listItem.classList.remove('expanded');
    const toggleIcon = listItem.querySelector('.item-toggle i');
    if (toggleIcon) {
        toggleIcon.className = 'bi bi-chevron-down';
    }

    // Clean up preview resources
    const previewId = listItem.querySelector('.preview-canvas')?.getAttribute('data-preview-id');
    if (previewId) {
        cleanupPreview(previewId);
    }
}

/**
 * Load STL preview for a history item
 */
async function loadStlPreview(listItem, hash, stlData) {
    const canvas = listItem.querySelector('.preview-canvas');
    const loadingEl = listItem.querySelector('.preview-loading');
    const previewId = canvas.getAttribute('data-preview-id');

    if (!canvas || activePreviewScenes.has(previewId)) {
        return;
    }

    // Show loading state
    if (loadingEl) {
        loadingEl.style.display = 'flex';
    }

    try {
        console.log(`Loading STL preview for hash: ${hash.substring(0, 8)}...`);
        
        // Create a simple STL preview using Babylon.js
        const engine = new BABYLON.Engine(canvas, true);
        const scene = new BABYLON.Scene(engine);
        
        // Use dark background to match main renderer
        scene.clearColor = new BABYLON.Color3(0.176, 0.176, 0.176);
        
        // Setup camera
        const camera = new BABYLON.ArcRotateCamera(
            "preview-camera", 
            -Math.PI / 2, 
            Math.PI / 2.5, 
            50, 
            new BABYLON.Vector3(0, 0, 0)
        );
        camera.attachControl(canvas, true);
        camera.wheelPrecision = 100; // Slower zoom for better control
        
        // Setup lighting
        const light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0));
        const light2 = new BABYLON.HemisphericLight("light2", new BABYLON.Vector3(1, 0, 0));
        light1.intensity = 0.8;
        light2.intensity = 0.3;
        
        // Convert STL data to blob and load it
        const stlBlob = new Blob([stlData], { type: 'application/octet-stream' });
        const stlUrl = URL.createObjectURL(stlBlob);
        
        // Load STL mesh using STL file loader specifically
        BABYLON.SceneLoader.ImportMesh("", stlUrl, "", scene, function (meshes) {
            if (meshes && meshes.length > 0) {
                // Center and scale the mesh
                const rootMesh = meshes[0];
                const worldExtents = rootMesh.getHierarchyBoundingVectors();
                const size = worldExtents.max.subtract(worldExtents.min);
                const maxDimension = Math.max(size.x, size.y, size.z);
                
                // Scale to fit preview
                const scale = 40 / maxDimension;
                rootMesh.scaling = new BABYLON.Vector3(scale, scale, scale);
                
                // Center the mesh
                const center = worldExtents.min.add(worldExtents.max).scale(0.5);
                rootMesh.position = center.negate().scale(scale);
                
                // Set material
                const material = new BABYLON.StandardMaterial("stl-material", scene);
                material.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8);
                material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
                rootMesh.material = material;
                
                // Position camera based on mesh size
                camera.radius = maxDimension * scale * 2;
            }
            
            // Clean up URL
            URL.revokeObjectURL(stlUrl);
            
            // Hide loading and show canvas
            if (loadingEl) {
                loadingEl.style.display = 'none';
            }
            canvas.style.display = 'block';
        }, null, function (error) {
            console.error('Failed to load STL:', error);
            // Fallback to placeholder on error
            if (loadingEl) {
                loadingEl.style.display = 'none';
            }
            canvas.style.display = 'none';
            const unavailableEl = listItem.querySelector('.preview-unavailable');
            if (unavailableEl) {
                unavailableEl.style.display = 'block';
                unavailableEl.textContent = 'Failed to load preview';
            }
            URL.revokeObjectURL(stlUrl);
        }, ".stl");
        
        // Start render loop
        engine.runRenderLoop(function() {
            scene.render();
        });
        
        // Handle resize
        window.addEventListener("resize", function() {
            engine.resize();
        });
        
        // Store the scene and engine for cleanup
        activePreviewScenes.set(previewId, { scene, engine });
        
    } catch (error) {
        console.error('Failed to load STL preview:', error);
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
        canvas.style.display = 'none';
        const unavailableEl = listItem.querySelector('.preview-unavailable');
        if (unavailableEl) {
            unavailableEl.style.display = 'block';
            unavailableEl.textContent = 'Preview failed to load';
        }
    }
}

/**
 * Clean up preview resources
 */
function cleanupPreview(previewId) {
    const previewData = activePreviewScenes.get(previewId);
    if (previewData) {
        // Clean up Babylon.js resources
        previewData.scene.dispose();
        previewData.engine.dispose();
        activePreviewScenes.delete(previewId);
    }
}

/**
 * Load a historical model into the main editor
 */
function loadHistoryModel(hash) {
    const itemData = historyItems.get(hash);
    if (!itemData) {
        console.warn(`No data found for hash: ${hash}`);
        return;
    }

    // Dispatch custom event to notify the main application
    const loadEvent = new CustomEvent('historyModelLoad', {
        detail: {
            hash,
            code: itemData.code,
            stlData: itemData.stlData,
            description: itemData.description
        }
    });
    
    document.dispatchEvent(loadEvent);
    
    console.log(`Loading model from history: ${itemData.description}`);
}

/**
 * Delete a history item
 */
function deleteHistoryItem(hash, listItem) {
    if (!confirm('Are you sure you want to delete this model from history?')) {
        return;
    }

    try {
        // Remove from localStorage
        const codeKey = `${STORAGE_PREFIXES.CODE}${hash}`;
        const stlKey = `${STORAGE_PREFIXES.STL}${hash}`;
        const metaKey = `${STORAGE_PREFIXES.META}${hash}`;
        
        localStorage.removeItem(codeKey);
        localStorage.removeItem(stlKey);
        localStorage.removeItem(metaKey);
        
        // Remove from hash index
        const indexJson = localStorage.getItem('openscad_hash_index') || '{}';
        const index = JSON.parse(indexJson);
        delete index[hash];
        localStorage.setItem('openscad_hash_index', JSON.stringify(index));
        
        // Remove from DOM and internal state
        listItem.remove();
        historyItems.delete(hash);
        
        console.log(`Deleted history item: ${hash.substring(0, 8)}...`);
        
        // Reload history if empty
        const historyList = document.getElementById('chatHistoryList');
        if (historyList && historyList.children.length === 0) {
            loadChatHistory();
        }
        
    } catch (error) {
        console.error('Failed to delete history item:', error);
        alert('Failed to delete model from history');
    }
}

/**
 * Clear all history
 */
function clearAllHistory() {
    if (!confirm('Are you sure you want to clear ALL chat history? This cannot be undone.')) {
        return;
    }

    try {
        // Get all storage keys
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('openscad_')) {
                keysToRemove.push(key);
            }
        }
        
        // Remove all OpenSCAD-related items
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });
        
        // Clear internal state
        historyItems.clear();
        activePreviewScenes.clear();
        
        // Reload empty history
        loadChatHistory();
        
        console.log('Cleared all chat history');
        
    } catch (error) {
        console.error('Failed to clear history:', error);
        alert('Failed to clear chat history');
    }
}

// Export public API
export default {
    initChatHistory,
    loadChatHistory,
    loadHistoryModel
};
