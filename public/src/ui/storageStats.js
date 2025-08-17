/**
 * Storage Statistics with Usage Information
 * Provides storage stats with usage numbers
 */

import { getStorageStats, STORAGE_LIMITS } from '../utils/storage/index.js';
import { getHashIndex } from '../utils/storage/dataManager.js';

/**
 * Show storage statistics with pie chart visualization
 * @param {Object} renderer - The OpenSCAD renderer instance (optional)
 */
export function showStorageStatsWithChart(renderer) {
    const stats = getStorageStats(STORAGE_LIMITS);
    const index = getHashIndex();
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    `;
    
    // Generate recent models list
    const recentModelsHTML = generateRecentModelsList(index);
    
    modal.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #333;">Storage Statistics</h2>
            <button onclick="this.closest('.storage-stats-overlay').remove()" 
                    style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">×</button>
        </div>
        
        <div style="margin-bottom: 25px;">
            <div style="margin-bottom: 15px;">
                <strong>Storage Usage</strong>
                <div style="display: flex; align-items: center; gap: 20px;">
                    <div style="width: 100px; height: 100px; position: relative;">
                        <svg width="100" height="100" viewBox="0 0 100 100" style="transform: rotate(-90deg)">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="#e0e0e0" stroke-width="10"/>
                            <circle cx="50" cy="50" r="45" fill="none" 
                                    stroke="${stats.usagePercent > 80 ? '#e74c3c' : stats.usagePercent > 60 ? '#f39c12' : '#27ae60'}" 
                                    stroke-width="10" stroke-dasharray="${Math.PI * 90 * stats.usagePercent/100} ${Math.PI * 90}"/>
                        </svg>
                        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                                    font-size: 24px; color: ${stats.usagePercent > 80 ? '#e74c3c' : stats.usagePercent > 60 ? '#f39c12' : '#27ae60'};">
                            ${stats.usagePercent}%
                        </div>
                    </div>
                    <div>
                        <div style="font-size: 16px; color: #666;">
                            ${stats.formattedCurrentSize} / ${stats.formattedMaxSize}
                        </div>
                        <div style="font-size: 14px; color: #888; margin-top: 5px;">
                            ${stats.totalEntries} models stored
                        </div>
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <strong>Cached Models</strong>
                <div style="font-size: 24px; color: #333;">
                    ${stats.totalEntries} / ${stats.maxEntries}
                </div>
            </div>
            
            ${renderer && renderer.getCurrentHash ? `
            <div style="margin-bottom: 15px;">
                <strong>Current Model</strong>
                <div style="font-size: 14px; color: #666; font-family: monospace;">
                    ${renderer.getCurrentHash().substring(0, 8)}...
                </div>
            </div>
            ` : ''}
            
            <div style="padding: 10px; border-radius: 6px; background: ${stats.needsCleanup ? '#fff3cd' : '#d4edda'}; color: ${stats.needsCleanup ? '#856404' : '#155724'}; font-size: 14px;">
                ${stats.needsCleanup ? '⚠️ Cleanup recommended - storage is getting full' : '✅ Storage healthy'}
            </div>
        </div>
        
        ${recentModelsHTML}
        
        <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button onclick="window.clearStorageCache()" 
                    style="flex: 1; padding: 10px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer;">
                Clear Cache
            </button>
            <button onclick="this.closest('.storage-stats-overlay').remove()" 
                    style="flex: 1; padding: 10px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer;">
                Close
            </button>
        </div>
        
        <div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px; font-size: 12px; color: #666;">
            <strong>How it works:</strong> This cache stores 3D models to avoid regeneration. 
            Each model has a unique hash based on OpenSCAD code. Cached models are automatically cleaned up when storage gets full.
        </div>
    `;
    
    overlay.className = 'storage-stats-overlay';
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
}

/**
 * Generate list of recent models
 * @param {Object} index - Hash index object
 * @returns {string} HTML string with recent models list
 */
function generateRecentModelsList(index) {
    const entries = Object.entries(index)
        .sort((a, b) => b[1].lastAccessed - a[1].lastAccessed)
        .slice(0, 5); // Show top 5 recent
    
    if (entries.length === 0) {
        return '<div style="text-align: center; color: #666; padding: 20px;">No cached models yet</div>';
    }
    
    const modelsList = entries.map(([hash, metadata]) => {
        const date = new Date(metadata.lastAccessed);
        const timeAgo = getTimeAgo(date);
        const size = metadata.hasStl ? 
            `${Math.round((metadata.codeLength + metadata.stlSize * 4/3) / 1024)}KB` : 
            `${Math.round(metadata.codeLength / 1024)}KB`;
        
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; 
                        padding: 8px 12px; border-radius: 6px; background: #f8f9fa; margin-bottom: 5px;">
                <div>
                    <div style="font-family: monospace; font-size: 12px; color: #666;">
                        ${hash.substring(0, 8)}...
                    </div>
                    <div style="font-size: 11px; color: #888;">
                        ${metadata.hasStl ? 'Model + STL' : 'Code only'} • ${size}
                    </div>
                </div>
                <div style="font-size: 11px; color: #888;">
                    ${timeAgo}
                </div>
            </div>
        `;
    }).join('');
    
    return `
        <div style="margin-top: 20px;">
            <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #333;">Recent Models</h3>
            ${modelsList}
        </div>
    `;
}

/**
 * Get human-readable time ago string
 * @param {Date} date - The date to calculate from
 * @returns {string} Human-readable time string
 */
function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

// Make available globally
window.showStorageStatsWithChart = showStorageStatsWithChart;
