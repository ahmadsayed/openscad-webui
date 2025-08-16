// storage/cleanupManager.js - Storage cleanup and quota management

import { STORAGE_KEYS, STORAGE_PREFIXES, STORAGE_LIMITS } from './constants.js';
import { getStorageSize, getHashIndex } from './utils.js';

/**
 * Aggressive cleanup when storage quota is exceeded
 * @returns {number} Number of entries deleted
 */
export function emergencyCleanup() {
    console.warn('🚨 Emergency cleanup: Storage quota exceeded');
    const index = getHashIndex();
    const entries = Object.entries(index)
        .sort((a, b) => (a[1].lastAccessed || 0) - (b[1].lastAccessed || 0)); // Oldest first
    
    // Delete oldest 75% of entries to free up significant space
    const toDelete = entries.slice(0, Math.floor(entries.length * 0.75));
    let deletedCount = 0;
    let freedSpace = 0;
    
    toDelete.forEach(([hash, metadata]) => {
        try {
            const codeKey = `${STORAGE_PREFIXES.CODE}${hash}`;
            const stlKey = `${STORAGE_PREFIXES.STL}${hash}`;
            const metaKey = `${STORAGE_PREFIXES.META}${hash}`;
            
            // Estimate freed space
            freedSpace += metadata.codeLength || 0;
            if (metadata.hasStl && metadata.stlSize) {
                freedSpace += Math.ceil(metadata.stlSize * 4 / 3);
            }
            
            localStorage.removeItem(codeKey);
            localStorage.removeItem(stlKey);
            localStorage.removeItem(metaKey);
            
            delete index[hash];
            deletedCount++;
        } catch (error) {
            console.warn(`Failed to delete cached entry ${hash}:`, error);
        }
    });
    
    if (deletedCount > 0) {
        try {
            localStorage.setItem(STORAGE_KEYS.HASH_INDEX, JSON.stringify(index));
            console.log(`🧹 Emergency cleanup: Deleted ${deletedCount} entries, freed ~${Math.round(freedSpace/1024)}KB`);
        } catch (error) {
            console.error('Failed to update index after emergency cleanup:', error);
        }
    }
    
    return deletedCount;
}

/**
 * Clean up old stored entries (keep last N)
 * @param {number} keepCount - Number of entries to keep (default: 50)
 * @returns {number} Number of entries removed
 */
export function cleanupOldEntries(keepCount = 50) {
    try {
        const index = getHashIndex();
        const entries = Object.entries(index)
            .sort((a, b) => b[1].lastAccessed - a[1].lastAccessed);
        
        const toDelete = entries.slice(keepCount); // Keep latest N
        let deletedCount = 0;
        let freedSpace = 0;
        
        toDelete.forEach(([hash, metadata]) => {
            const codeKey = `${STORAGE_PREFIXES.CODE}${hash}`;
            const stlKey = `${STORAGE_PREFIXES.STL}${hash}`;
            const metaKey = `${STORAGE_PREFIXES.META}${hash}`;
            
            // Estimate freed space
            freedSpace += metadata.codeLength || 0;
            if (metadata.hasStl && metadata.stlSize) {
                freedSpace += Math.ceil(metadata.stlSize * 4 / 3); // base64 overhead
            }
            
            localStorage.removeItem(codeKey);
            localStorage.removeItem(stlKey);
            localStorage.removeItem(metaKey);
            
            delete index[hash];
            deletedCount++;
        });
        
        if (deletedCount > 0) {
            localStorage.setItem(STORAGE_KEYS.HASH_INDEX, JSON.stringify(index));
            console.log(`🧹 Cleaned up ${deletedCount} old entries, freed ~${Math.round(freedSpace/1024)}KB`);
        }
        
        return deletedCount;
    } catch (error) {
        console.warn('Failed to cleanup old entries:', error);
        return 0;
    }
}
