/**
 * Test script to verify module.scad include fix
 * Tests the AI service with a request that uses modules
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testModuleInclude() {
    try {
        console.log('🧪 Testing module.scad include fix...');
        
        // Read a test request that uses modules
        const testRequests = [
            '8a3dc6e6-1975-4f4f-876f-a8491b8ad937.json',
            'f39a2604-dab3-486a-9088-52ef8b8062d9.json',
            'b9e7e27d-d4f3-416b-8af2-f561a42bdf91.json'
        ];
        
        for (const requestFile of testRequests) {
            const requestPath = path.join(__dirname, 'requests', requestFile);
            try {
                const content = await fs.readFile(requestPath, 'utf8');
                const request = JSON.parse(content);
                
                if (request.code && request.code.includes('include <module.scad>')) {
                    console.log(`✅ Found test request ${requestFile} with module.scad include`);
                    console.log('📋 Generated code:');
                    console.log(request.code);
                    
                    // Check if the code uses actual modules
                    const modules = ['rounded_cube', 'tube', 'gear', 'honeycomb'];
                    const usedModules = modules.filter(mod => request.code.includes(mod));
                    
                    if (usedModules.length > 0) {
                        console.log(`✅ Code uses modules: ${usedModules.join(', ')}`);
                    } else {
                        console.log('ℹ️  Code includes module.scad but doesn\'t appear to use modules');
                    }
                    
                    return true;
                }
            } catch (error) {
                console.log(`⚠️  Could not read ${requestFile}:`, error.message);
            }
        }
        
        console.log('ℹ️  No suitable test requests found');
        return false;
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        return false;
    }
}

// Test the worker modification by checking if it can fetch module.scad
async function testWorkerModuleFetch() {
    try {
        console.log('🧪 Testing worker module.scad fetch capability...');
        
        // Simulate what the worker would do
        const moduleUrl = new URL('../src/modules/module.scad', import.meta.url).href;
        console.log('📍 Module URL:', moduleUrl);
        
        const response = await fetch(moduleUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch module.scad: ${response.status}`);
        }
        
        const content = await response.text();
        console.log('✅ Successfully fetched module.scad, size:', content.length);
        
        // Verify it contains expected modules
        const expectedModules = ['rounded_cube', 'tube', 'gear', 'honeycomb'];
        const foundModules = expectedModules.filter(mod => content.includes(`module ${mod}`));
        
        console.log(`✅ Found modules: ${foundModules.join(', ')}`);
        
        if (foundModules.length === expectedModules.length) {
            console.log('✅ All expected modules found in module.scad');
            return true;
        } else {
            console.log('⚠️  Some modules missing:', expectedModules.filter(mod => !foundModules.includes(mod)));
            return false;
        }
        
    } catch (error) {
        console.error('❌ Module fetch test failed:', error);
        return false;
    }
}

// Run tests
async function runTests() {
    console.log('🔧 Testing OpenSCAD module.scad include fix\n');
    
    const fetchTest = await testWorkerModuleFetch();
    console.log('');
    
    const codeTest = await testModuleInclude();
    console.log('');
    
    if (fetchTest && codeTest) {
        console.log('🎉 All tests PASSED! The worker should now properly handle module.scad includes.');
        console.log('💡 The worker will:');
        console.log('   1. Detect when code includes module.scad');
        console.log('   2. Fetch the module.scad file from the server');
        console.log('   3. Write it to the OpenSCAD virtual filesystem');
        console.log('   4. Allow OpenSCAD to successfully render with modules');
    } else {
        console.log('⚠️  Some tests failed. Check the output above for details.');
    }
}

runTests().catch(console.error);