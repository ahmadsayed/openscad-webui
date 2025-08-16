// codeStorage.js - Manages localStorage for OpenSCAD code persistence

const STORAGE_KEYS = {
    MAIN_CODE: 'openscad_main_code',
    SIMPLE_CODE: 'openscad_simple_code',
    LAST_MODE: 'openscad_last_mode',
    HASH_INDEX: 'openscad_hash_index'
};

// Storage management constants
const STORAGE_LIMITS = {
    MAX_TOTAL_SIZE: 50 * 1024 * 1024,  // 8MB total limit (leaving buffer for other data)
    MAX_ENTRIES: 20,                   // Keep max 20 cached models
    CLEANUP_THRESHOLD: 0.8             // Cleanup when 80% full
};

/**
 * Calculate estimated storage size for our cached data
 * @returns {number} Estimated size in bytes
 */
function getStorageSize() {
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
 * @returns {boolean} True if cleanup is needed
 */
function needsCleanup() {
    const currentSize = getStorageSize();
    const index = getHashIndex();
    const entryCount = Object.keys(index).length;
    
    return currentSize > (STORAGE_LIMITS.MAX_TOTAL_SIZE * STORAGE_LIMITS.CLEANUP_THRESHOLD) ||
           entryCount > STORAGE_LIMITS.MAX_ENTRIES;
}

/**
 * Aggressive cleanup when storage quota is exceeded
 * @returns {number} Number of entries deleted
 */
function emergencyCleanup() {
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
            const codeKey = `openscad_code_${hash}`;
            const stlKey = `openscad_stl_${hash}`;
            const metaKey = `openscad_meta_${hash}`;
            
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
 * Generate SHA-256 hash of OpenSCAD code
 * @param {string} code - The OpenSCAD code to hash
 * @returns {Promise<string>} The SHA-256 hash as hex string
 */
export async function generateCodeHash(code) {
    const encoder = new TextEncoder();
    const data = encoder.encode(code.trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Save code to localStorage for a specific mode
 * @param {string} mode - 'main' or 'simple'
 * @param {string} code - The OpenSCAD code to save
 * @param {Uint8Array} stlData - Optional STL data to save with the code
 */
export async function saveCode(mode, code, stlData = null) {
    try {
        const key = mode === 'main' ? STORAGE_KEYS.MAIN_CODE : STORAGE_KEYS.SIMPLE_CODE;
        localStorage.setItem(key, code);
        localStorage.setItem(STORAGE_KEYS.LAST_MODE, mode);
        
        // Generate hash and store code/STL with hash-based filename
        const hash = await generateCodeHash(code);
        await saveCodeWithHash(hash, code, stlData);
        
        console.log(`Code saved for ${mode} mode with hash: ${hash.substring(0, 8)}...`);
    } catch (error) {
        console.warn('Failed to save code to localStorage:', error);
    }
}

/**
 * Save code and STL data using hash as filename
 * @param {string} hash - The hash to use as filename
 * @param {string} code - The OpenSCAD code
 * @param {Uint8Array} stlData - Optional STL binary data
 */
export async function saveCodeWithHash(hash, code, stlData = null) {
    try {
        const codeKey = `openscad_code_${hash}`;
        const stlKey = `openscad_stl_${hash}`;
        const metaKey = `openscad_meta_${hash}`;
        
        // Store code
        localStorage.setItem(codeKey, code);
        
        // Check if cleanup is needed before storing large STL data
        if (stlData && needsCleanup()) {
            console.log('🧹 Proactive cleanup before storing STL data');
            cleanupOldEntries(Math.floor(STORAGE_LIMITS.MAX_ENTRIES * 0.6)); // Keep 60% of max entries
        }

        // Store STL data if provided (convert to base64)
        if (stlData) {
            try {
                // Convert Uint8Array to base64 in chunks to avoid "too many arguments" error
                let binaryString = '';
                const chunkSize = 8192; // Process 8KB at a time
                
                for (let i = 0; i < stlData.length; i += chunkSize) {
                    const chunk = stlData.slice(i, i + chunkSize);
                    binaryString += String.fromCharCode(...chunk);
                }
                
                const base64Stl = btoa(binaryString);
                
                // Try to store the STL data
                try {
                    localStorage.setItem(stlKey, base64Stl);
                    console.log(`✅ Stored STL data (${stlData.length} bytes) with hash ${hash.substring(0, 8)}...`);
                } catch (quotaError) {
                    if (quotaError.name === 'QuotaExceededError' || quotaError.code === 22) {
                        console.warn('💾 Storage quota exceeded, attempting emergency cleanup...');
                        emergencyCleanup();
                        
                        // Try once more after cleanup
                        try {
                            localStorage.setItem(stlKey, base64Stl);
                            console.log(`✅ Stored STL data after cleanup (${stlData.length} bytes) with hash ${hash.substring(0, 8)}...`);
                        } catch (secondError) {
                            console.warn('⚠️ Unable to store STL data even after cleanup. Storing code only.');
                            stlData = null; // Don't store STL in metadata
                        }
                    } else {
                        throw quotaError; // Re-throw if it's not a quota error
                    }
                }
            } catch (stlError) {
                console.warn('Failed to process STL data:', stlError);
                stlData = null; // Don't store STL in metadata
            }
        }
        
        // Store metadata
        const metadata = {
            hash,
            timestamp: Date.now(),
            hasStl: !!stlData,
            codeLength: code.length,
            stlSize: stlData ? stlData.length : 0
        };
        localStorage.setItem(metaKey, JSON.stringify(metadata));
        
        // Update hash index
        updateHashIndex(hash, metadata);
        
        console.log(`✅ Successfully stored code and data with hash: ${hash.substring(0, 8)}...`);
    } catch (error) {
        console.error('❌ Failed to save code with hash:', error);
        console.error('Error details:', error.message, error.stack);
    }
}

/**
 * Load code and STL data by hash
 * @param {string} hash - The hash to load
 * @returns {Object|null} Object with code, stlData, and metadata
 */
export function loadCodeByHash(hash) {
    try {
        const codeKey = `openscad_code_${hash}`;
        const stlKey = `openscad_stl_${hash}`;
        const metaKey = `openscad_meta_${hash}`;
        
        const code = localStorage.getItem(codeKey);
        const stlBase64 = localStorage.getItem(stlKey);
        const metaJson = localStorage.getItem(metaKey);
        
        if (!code || !metaJson) return null;
        
        const metadata = JSON.parse(metaJson);
        let stlData = null;
        
        if (stlBase64) {
            // Convert base64 back to Uint8Array
            const binaryString = atob(stlBase64);
            stlData = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                stlData[i] = binaryString.charCodeAt(i);
            }
        }
        
        return {
            hash,
            code,
            stlData,
            metadata
        };
    } catch (error) {
        console.warn('Failed to load code by hash:', error);
        return null;
    }
}

/**
 * Update the hash index with new hash entry
 * @param {string} hash - The hash to add
 * @param {Object} metadata - Metadata for the hash
 */
function updateHashIndex(hash, metadata) {
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
 * Find hash for given code
 * @param {string} code - The OpenSCAD code to find hash for
 * @returns {Promise<string|null>} The hash if found, null otherwise
 */
export async function findHashForCode(code) {
    try {
        const targetHash = await generateCodeHash(code);
        const index = getHashIndex();
        return index[targetHash] ? targetHash : null;
    } catch (error) {
        console.warn('Failed to find hash for code:', error);
        return null;
    }
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
            const codeKey = `openscad_code_${hash}`;
            const stlKey = `openscad_stl_${hash}`;
            const metaKey = `openscad_meta_${hash}`;
            
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

/**
 * Get detailed storage information
 * @returns {Object} Storage statistics and quota info
 */
export function getStorageStats() {
    const index = getHashIndex();
    const totalEntries = Object.keys(index).length;
    const currentSize = getStorageSize();
    
    return {
        totalEntries,
        maxEntries: STORAGE_LIMITS.MAX_ENTRIES,
        currentSize,
        maxSize: STORAGE_LIMITS.MAX_TOTAL_SIZE,
        usagePercent: Math.round((currentSize / STORAGE_LIMITS.MAX_TOTAL_SIZE) * 100),
        needsCleanup: needsCleanup(),
        formattedCurrentSize: `${Math.round(currentSize / 1024)}KB`,
        formattedMaxSize: `${Math.round(STORAGE_LIMITS.MAX_TOTAL_SIZE / 1024 / 1024)}MB`
    };
}

/**
 * Load code from localStorage for a specific mode
 * @param {string} mode - 'main' or 'simple'
 * @returns {string|null} The saved code or null if not found
 */
export function loadCode(mode) {
    try {
        const key = mode === 'main' ? STORAGE_KEYS.MAIN_CODE : STORAGE_KEYS.SIMPLE_CODE;
        const code = localStorage.getItem(key);
        if (code) {
            console.log(`Code loaded for ${mode} mode`);
            return code;
        }
    } catch (error) {
        console.warn('Failed to load code from localStorage:', error);
    }
    return null;
}

/**
 * Get the last used mode
 * @returns {string} 'main' or 'simple', defaults to 'main'
 */
export function getLastMode() {
    try {
        return localStorage.getItem(STORAGE_KEYS.LAST_MODE) || 'main';
    } catch (error) {
        console.warn('Failed to get last mode from localStorage:', error);
        return 'main';
    }
}

/**
 * Clear all stored code
 */
export function clearAllCode() {
    try {
        localStorage.removeItem(STORAGE_KEYS.MAIN_CODE);
        localStorage.removeItem(STORAGE_KEYS.SIMPLE_CODE);
        localStorage.removeItem(STORAGE_KEYS.LAST_MODE);
        console.log('All stored code cleared');
    } catch (error) {
        console.warn('Failed to clear stored code:', error);
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
        const recentCode = loadCode(lastMode);
        
        if (recentCode) {
            return recentCode;
        }
        
        // Fallback: try the other mode
        const otherMode = lastMode === 'main' ? 'simple' : 'main';
        return loadCode(otherMode);
    } catch (error) {
        console.warn('Failed to get most recent code:', error);
        return null;
    }
}

/**
 * Auto-save code with debouncing to prevent excessive localStorage writes
 * @param {string} mode - 'main' or 'simple'
 * @param {string} code - The code to save
 * @param {Uint8Array} stlData - Optional STL data
 * @param {number} delay - Debounce delay in milliseconds (default: 1000)
 */
let autoSaveTimeout = null;
export function autoSaveCode(mode, code, stlData = null, delay = 1000) {
    // Clear existing timeout
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
    }
    
    // Set new timeout for auto-save
    autoSaveTimeout = setTimeout(async () => {
        await saveCode(mode, code, stlData);
    }, delay);
}
