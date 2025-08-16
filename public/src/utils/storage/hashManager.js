// storage/hashManager.js - Hash generation and management

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
 * Find hash for given code
 * @param {string} code - The OpenSCAD code to find hash for
 * @returns {Promise<string|null>} The hash if found, null otherwise
 */
export async function findHashForCode(code) {
    try {
        const targetHash = await generateCodeHash(code);
        const { getHashIndex } = await import('./utils.js');
        const index = getHashIndex();
        return index[targetHash] ? targetHash : null;
    } catch (error) {
        console.warn('Failed to find hash for code:', error);
        return null;
    }
}
