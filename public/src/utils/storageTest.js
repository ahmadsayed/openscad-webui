// storageTest.js - Test script to verify hash-based storage functionality

import { generateCodeHash, saveCodeWithHash, loadCodeByHash, getHashIndex, cleanupOldEntries } from './codeStorage.js';

/**
 * Test the hash-based storage system
 */
export async function testHashStorage() {
    console.log('🧪 Testing hash-based storage system...\n');
    
    // Test 1: Hash generation consistency
    console.log('Test 1: Hash generation consistency');
    const testCode1 = 'cube(20, center=true);';
    const testCode2 = 'cube(20, center=true);'; // Same code
    const testCode3 = 'sphere(r=10);'; // Different code
    
    const hash1a = await generateCodeHash(testCode1);
    const hash1b = await generateCodeHash(testCode2);
    const hash3 = await generateCodeHash(testCode3);
    
    console.log(`Code: "${testCode1}"`);
    console.log(`Hash 1a: ${hash1a.substring(0, 16)}...`);
    console.log(`Hash 1b: ${hash1b.substring(0, 16)}...`);
    console.log(`Same hash: ${hash1a === hash1b ? '✅' : '❌'}`);
    console.log(`Different from hash3: ${hash1a !== hash3 ? '✅' : '❌'}\n`);
    
    // Test 2: Storage and retrieval
    console.log('Test 2: Storage and retrieval');
    const mockStlData = new Uint8Array([1, 2, 3, 4, 5]); // Mock STL data
    
    await saveCodeWithHash(hash1a, testCode1, mockStlData);
    const retrieved = loadCodeByHash(hash1a);
    
    console.log(`Stored code: "${testCode1}"`);
    console.log(`Retrieved code: "${retrieved?.code}"`);
    console.log(`Code matches: ${retrieved?.code === testCode1 ? '✅' : '❌'}`);
    console.log(`STL data matches: ${retrieved?.stlData?.length === mockStlData.length ? '✅' : '❌'}`);
    console.log(`Hash matches: ${retrieved?.hash === hash1a ? '✅' : '❌'}\n`);
    
    // Test 3: Index functionality
    console.log('Test 3: Index functionality');
    const index = getHashIndex();
    console.log(`Index contains our hash: ${index.hasOwnProperty(hash1a) ? '✅' : '❌'}`);
    console.log(`Metadata timestamp exists: ${index[hash1a]?.timestamp ? '✅' : '❌'}`);
    console.log(`Metadata hasStl flag: ${index[hash1a]?.hasStl ? '✅' : '❌'}\n`);
    
    // Test 4: File naming
    console.log('Test 4: Hash-based filenames');
    console.log(`STL filename would be: ${hash1a.substring(0, 16)}.stl`);
    console.log(`Storage key format: openscad_code_${hash1a}`);
    console.log(`Hash prefix (8 chars): ${hash1a.substring(0, 8)}...\n`);
    
    // Test 5: Cleanup functionality
    console.log('Test 5: Storage cleanup');
    const initialCount = Object.keys(index).length;
    console.log(`Initial stored entries: ${initialCount}`);
    
    // Add a few more test entries
    for (let i = 0; i < 3; i++) {
        const code = `cube(${i + 10}, center=true);`;
        const hash = await generateCodeHash(code);
        await saveCodeWithHash(hash, code);
    }
    
    const newCount = Object.keys(getHashIndex()).length;
    console.log(`After adding 3 more: ${newCount}`);
    
    const deletedCount = cleanupOldEntries(2); // Keep only 2 latest
    const finalCount = Object.keys(getHashIndex()).length;
    console.log(`After cleanup (keep 2): ${finalCount}`);
    console.log(`Deleted entries: ${deletedCount}`);
    
    console.log('\n✅ Hash-based storage system test complete!');
    
    return {
        hashConsistency: hash1a === hash1b,
        storageWorks: retrieved?.code === testCode1,
        stlDataWorks: retrieved?.stlData?.length === mockStlData.length,
        indexWorks: index.hasOwnProperty(hash1a),
        cleanupWorks: deletedCount > 0
    };
}

/**
 * Demo the storage system working with actual OpenSCAD code examples
 */
export async function demoHashStorage() {
    console.log('🎬 Demo: Hash-based storage with OpenSCAD examples\n');
    
    const examples = [
        'cube(20, center=true);',
        'sphere(r=10);',
        'cylinder(h=30, r=8, center=true);',
        'union() { cube(15); translate([10, 0, 0]) sphere(r=8); }',
        'difference() { cube(20, center=true); cylinder(h=25, r=5, center=true); }'
    ];
    
    for (const [index, code] of examples.entries()) {
        const hash = await generateCodeHash(code);
        const shortHash = hash.substring(0, 12);
        
        console.log(`Example ${index + 1}:`);
        console.log(`  Code: ${code}`);
        console.log(`  Hash: ${shortHash}...`);
        console.log(`  STL filename: ${shortHash}.stl`);
        
        // Simulate storing with mock STL data
        const mockStl = new Uint8Array(1000 + index * 100); // Different sizes
        await saveCodeWithHash(hash, code, mockStl);
        
        console.log(`  Stored: ✅\n`);
    }
    
    const finalIndex = getHashIndex();
    console.log(`Total stored models: ${Object.keys(finalIndex).length}`);
    console.log('All models are cached and ready for instant loading! 🚀');
}

/**
 * Test that code editing triggers proper hash recalculation
 */
export async function testCodeEditingHash() {
    console.log('🧪 Testing code editing hash recalculation...\n');
    
    // Test different variations of code
    const codeVariations = [
        'cube(10, center=true);',
        'cube(20, center=true);', // Different size
        'cube(10, center=true);', // Back to original
        'sphere(r=10);',          // Completely different
        'cube(10, center=true);'  // Back to original again
    ];
    
    console.log('Testing hash generation for code variations:');
    const hashes = [];
    
    for (const [index, code] of codeVariations.entries()) {
        const hash = await generateCodeHash(code);
        const shortHash = hash.substring(0, 12);
        hashes.push(hash);
        
        console.log(`${index + 1}. "${code}"`);
        console.log(`   Hash: ${shortHash}...`);
        
        // Check if this hash matches any previous ones
        const matchIndex = hashes.slice(0, -1).findIndex(h => h === hash);
        if (matchIndex >= 0) {
            console.log(`   ✅ Matches variation ${matchIndex + 1} (same code = same hash)`);
        } else {
            console.log(`   🆕 New unique hash (different code)`);
        }
        console.log();
    }
    
    // Verify that same code produces same hash
    const sameCodeHashes = [
        await generateCodeHash('cube(10, center=true);'),
        await generateCodeHash('cube(10, center=true);'),
        await generateCodeHash('cube(10, center=true);')
    ];
    
    const allSame = sameCodeHashes.every(h => h === sameCodeHashes[0]);
    console.log(`Same code produces same hash: ${allSame ? '✅' : '❌'}`);
    
    // Verify that different code produces different hash
    const hash1 = await generateCodeHash('cube(10);');
    const hash2 = await generateCodeHash('cube(20);');
    const different = hash1 !== hash2;
    console.log(`Different code produces different hash: ${different ? '✅' : '❌'}`);
    
    console.log('\n✅ Code editing hash test complete!');
    
    return {
        consistentHashing: allSame,
        differentHashesForDifferentCode: different,
        originalCodeMatchesExpected: hashes[0] === hashes[2] && hashes[2] === hashes[4]
    };
}

// Make functions available globally for browser console testing
if (typeof window !== 'undefined') {
    window.testHashStorage = testHashStorage;
    window.demoHashStorage = demoHashStorage;
    window.testCodeEditingHash = testCodeEditingHash;
}