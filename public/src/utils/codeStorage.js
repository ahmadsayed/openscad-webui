// codeStorage.js - Manages localStorage for OpenSCAD code persistence

const STORAGE_KEYS = {
    MAIN_CODE: 'openscad_main_code',
    SIMPLE_CODE: 'openscad_simple_code',
    LAST_MODE: 'openscad_last_mode'
};

/**
 * Save code to localStorage for a specific mode
 * @param {string} mode - 'main' or 'simple'
 * @param {string} code - The OpenSCAD code to save
 */
export function saveCode(mode, code) {
    try {
        const key = mode === 'main' ? STORAGE_KEYS.MAIN_CODE : STORAGE_KEYS.SIMPLE_CODE;
        localStorage.setItem(key, code);
        localStorage.setItem(STORAGE_KEYS.LAST_MODE, mode);
        console.log(`Code saved for ${mode} mode`);
    } catch (error) {
        console.warn('Failed to save code to localStorage:', error);
    }
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
 */
export function syncCodeBetweenModes(fromMode, toMode, currentCode) {
    try {
        // Save current code to the source mode
        saveCode(fromMode, currentCode);
        
        // Also save to the target mode to ensure continuity
        saveCode(toMode, currentCode);
        
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
 * @param {number} delay - Debounce delay in milliseconds (default: 1000)
 */
let autoSaveTimeout = null;
export function autoSaveCode(mode, code, delay = 1000) {
    // Clear existing timeout
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
    }
    
    // Set new timeout for auto-save
    autoSaveTimeout = setTimeout(() => {
        saveCode(mode, code);
    }, delay);
}
