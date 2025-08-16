// storage/dataManager.js - Data storage and retrieval operations

import { STORAGE_KEYS, STORAGE_PREFIXES } from './constants.js';
import { updateHashIndex } from './utils.js';

/**
 * Save code and STL data using hash as filename
 * @param {string} hash - The hash to use as filename
 * @param {string} code - The OpenSCAD code
 * @param {Uint8Array} stlData - Optional STL binary data
 */
export async function saveCodeWithHash(hash, code, stlData = null) {
    try {
        const codeKey = `${STORAGE_PREFIXES.CODE}${hash}`;
        const stlKey = `${STORAGE_PREFIXES.STL}${hash}`;
        const metaKey = `${STORAGE_PREFIXES.META}${hash}`;
        
        // Store code
        localStorage.setItem(codeKey, code);
        
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
                localStorage.setItem(stlKey, base64Stl);
                console.log(`✅ Stored STL data (${stlData.length} bytes) with hash ${hash.substring(0, 8)}...`);
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
        const codeKey = `${STORAGE_PREFIXES.CODE}${hash}`;
        const stlKey = `${STORAGE_PREFIXES.STL}${hash}`;
        const metaKey = `${STORAGE_PREFIXES.META}${hash}`;
        
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
