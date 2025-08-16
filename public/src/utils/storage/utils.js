// storage/utils.js - Utility functions for storage operations

import { STORAGE_KEYS, STORAGE_PREFIXES } from './constants.js';

/**
 * Calculate estimated storage size for cached data
 * @returns {number} Estimated size in bytes
 */
export function getStorageSize() {
    let totalSize = 0;
    const index = getHashIndex();
    
    // Estimate size based on index metadata
    Object.values(index).forEach(entry => {
        totalSize += entry.codeLength || 0;
        // STL data is stored as base64, so roughly 4/3 of original size
        if (entry.hasStl && entry.stlSize) {
            totalSize += Math.ceil(entry.stlSize * 4 / 3);
        }
        totalSize += 200; // Overhead for keys and metadata
    });
    
    return totalSize;
}

/**
 * Check if we're approaching storage limits
 * @param {Object} storageLimits - Storage limits configuration
 * @returns {boolean} True if cleanup is needed
 */
export function needsCleanup(storageLimits) {
    const currentSize = getStorageSize();
    const index = getHashIndex();
    const entryCount = Object.keys(index).length;
    
    return currentSize > (storageLimits.MAX_TOTAL_SIZE * storageLimits.CLEANUP_THRESHOLD) ||
           entryCount > storageLimits.MAX_ENTRIES;
}

/**
 * Get all stored hashes with metadata
 * @returns {Object} Hash index object
 */
export function getHashIndex() {
    try {
        const indexJson = localStorage.getItem(STORAGE_KEYS.HASH_INDEX) || '{}';
        return JSON.parse(indexJson);
    } catch (error) {
        console.warn('Failed to get hash index:', error);
        return {};
    }
}

/**
 * Update the hash index with new hash entry
 * @param {string} hash - The hash to add
 * @param {Object} metadata - Metadata for the hash
 */
export function updateHashIndex(hash, metadata) {
    try {
        const indexJson = localStorage.getItem(STORAGE_KEYS.HASH_INDEX) || '{}';
        const index = JSON.parse(indexJson);
        
        index[hash] = {
            ...metadata,
            lastAccessed: Date.now()
        };
        
        localStorage.setItem(STORAGE_KEYS.HASH_INDEX, JSON.stringify(index));
    } catch (error) {
        console.warn('Failed to update hash index:', error);
    }
}

/**
 * Get detailed storage information
 * @param {Object} storageLimits - Storage limits configuration
 * @returns {Object} Storage statistics and quota info
 */
export function getStorageStats(storageLimits) {
    const index = getHashIndex();
    const totalEntries = Object.keys(index).length;
    const currentSize = getStorageSize();
    
    return {
        totalEntries,
        maxEntries: storageLimits.MAX_ENTRIES,
        currentSize,
        maxSize: storageLimits.MAX_TOTAL_SIZE,
        usagePercent: Math.round((currentSize / storageLimits.MAX_TOTAL_SIZE) * 100),
        needsCleanup: needsCleanup(storageLimits),
        formattedCurrentSize: `${Math.round(currentSize / 1024)}KB`,
        formattedMaxSize: `${Math.round(storageLimits.MAX_TOTAL_SIZE / 1024 / 1024)}MB`
    };
}
