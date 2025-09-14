// storage/index.js - Main storage API module (replaces codeStorage.js)

import { STORAGE_LIMITS } from './constants.js';
import { getStorageStats, needsCleanup, getHashIndex } from './utils.js';
import { generateCodeHash, findHashForCode } from './hashManager.js';
import { emergencyCleanup, cleanupOldEntries } from './cleanupManager.js';
import { 
    saveCodeWithHash, 
    loadCodeByHash, 
    saveCode as saveCodeData, 
    loadCode as loadCodeData, 
    getLastMode, 
    clearAllCode 
} from './dataManager.js';

/**
 * Save code to localStorage for a specific mode with optional STL data
 * @param {string} mode - 'main' or 'simple'
 * @param {string} code - The OpenSCAD code to save
 * @param {Uint8Array} stlData - Optional STL data to save with the code
 */
export async function saveCode(mode, code, stlData = null) {
    try {
        // Save to mode-specific storage
        saveCodeData(mode, code);
        
        // Generate hash and store code/STL with hash-based filename
        const hash = await generateCodeHash(code);
        await saveCodeWithHash(hash, code, stlData);
        
        console.log(`Code saved for ${mode} mode with hash: ${hash.substring(0, 8)}...`);
    } catch (error) {
        console.warn('Failed to save code to localStorage:', error);
    }
}

/**
 * Sync code between modes - when switching modes, copy current code to the target mode
 * @param {string} fromMode - Source mode ('main' or 'simple')
 * @param {string} toMode - Target mode ('main' or 'simple')
 * @param {string} currentCode - The current code to sync
 * @param {Uint8Array} stlData - Optional STL data to sync
 */
export async function syncCodeBetweenModes(fromMode, toMode, currentCode, stlData = null) {
    try {
        // Save current code to the source mode
        await saveCode(fromMode, currentCode, stlData);
        
        // Also save to the target mode to ensure continuity
        await saveCode(toMode, currentCode, stlData);
        
        console.log(`Code synced from ${fromMode} to ${toMode} mode`);
    } catch (error) {
        console.warn('Failed to sync code between modes:', error);
    }
}

/**
 * Get the most recent code regardless of mode
 * @returns {string|null} The most recently saved code
 */
export function getMostRecentCode() {
    try {
        const lastMode = getLastMode();
        const recentCode = loadCodeData(lastMode);
        
        if (recentCode) {
            return recentCode;
        }
        
        // Fallback: try the other mode
        const otherMode = lastMode === 'main' ? 'simple' : 'main';
        return loadCodeData(otherMode);
    } catch (error) {
        console.warn('Failed to get most recent code:', error);
        return null;
    }
}

// Backward compatibility - loadCode is now loadCodeData
export function loadCode(mode) {
    return loadCodeData(mode);
}

// Re-export all functions for backward compatibility
export {
    // Constants
    STORAGE_LIMITS,
    
    // Utilities
    getStorageStats,
    needsCleanup,
    getHashIndex,
    
    // Hash management
    generateCodeHash,
    findHashForCode,
    
    // Data management
    loadCodeByHash,
    
    // Cleanup
    emergencyCleanup,
    cleanupOldEntries
};
