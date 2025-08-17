/**
 * Storage Statistics with Pie Chart Visualization
 * Provides enhanced storage stats with visual pie chart representation
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
    
    // Generate pie chart HTML
    const pieChartHTML = generatePieChart(stats);
    
    // Generate recent models list
    const recentModelsHTML = generateRecentModelsList(index);
    
    modal.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #333;">Storage Statistics</h2>
            <button onclick="this.closest('.storage-stats-overlay').remove()" 
                    style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">×</button>
        </div>
        
        <div style="display: flex; gap: 30px; align-items: center; margin-bottom: 25px;">
            ${pieChartHTML}
            <div style="flex: 1;">
                <div style="margin-bottom: 15px;">
                    <strong>Storage Usage</strong>
                    <div style="font-size: 24px; color: ${stats.usagePercent > 80 ? '#e74c3c' : stats.usagePercent > 60 ? '#f39c12' : '#27ae60'};">
                        ${stats.usagePercent}%
                    </div>
                    <div style="font-size: 14px; color: #666;">
                        ${stats.formattedCurrentSize} / ${stats.formattedMaxSize}
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <strong>Cached Models</strong>
                    <div style="font-size: 18px; color: #333;">
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
 * Generate SVG pie chart for storage utilization
 * @param {Object} stats - Storage statistics
 * @returns {string} HTML string with SVG pie chart
 */
function generatePieChart(stats) {
    const radius = 60;
    const center = 70;
    const strokeWidth = 12;
    
    // Calculate pie slice
    const percentage = Math.min(stats.usagePercent, 100);
    const angle = (percentage / 100) * 2 * Math.PI;
    const x = center + radius * Math.sin(angle);
    const y = center - radius * Math.cos(angle);
    
    const largeArcFlag = percentage > 50 ? 1 : 0;
    
    // Colors based on usage
    let color = '#27ae60'; // Green for healthy
    if (percentage > 80) color = '#e74c3c'; // Red for critical
    else if (percentage > 60) color = '#f39c12'; // Orange for warning
    
    const pathData = percentage === 100 
        ? `M ${center} ${center - radius} A ${radius} ${radius} 0 1 1 ${center - 0.01} ${center - radius}` // Full circle
        : `M ${center} ${center - radius} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x} ${y}`;
    
    return `
        <svg width="140" height="140" viewBox="0 0 140 140">
            <!-- Background circle -->
            <circle cx="${center}" cy="${center}" r="${radius}" 
                    fill="none" stroke="#e9ecef" stroke-width="${strokeWidth}"/>
            
            <!-- Usage arc -->
            <path d="${pathData}" 
                  fill="none" stroke="${color}" stroke-width="${strokeWidth}" 
                  stroke-linecap="round"/>
            
            <!-- Center text -->
            <text x="${center}" y="${center}" text-anchor="middle" 
                  font-size="24" font-weight="bold" fill="${color}">
                ${percentage}%
            </text>
        </svg>
    `;
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
