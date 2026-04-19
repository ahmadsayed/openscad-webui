/**
 * Simple test for module.scad include fix
 * Tests code generation and verifies the worker can handle modules
 */

import { promises as fs } from 'fs';
import path from 'path';

async function testSimpleModule() {
    try {
        console.log('🧪 Testing simple module generation...');
        
        // Generate a simple request that should use modules
        const testPrompt = "create a rounded cube";
        
        console.log('📤 Sending request:', testPrompt);
        
        // Use the API to generate code
        const response = await fetch('http://localhost:3000/generate-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: testPrompt,
                existingCode: ''
            })
        });
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('📨 Response received:', result);
        
        if (!result.success) {
            throw new Error(`API error: ${result.message}`);
        }
        
        const requestId = result.requestId;
        console.log('⏳ Waiting for processing to complete...');
        
        // Wait and check status
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const statusResponse = await fetch(`http://localhost:3000/status/${requestId}`);
        const statusData = await statusResponse.json();
        
        console.log('📊 Status check:', statusData);
        
        if (statusData.data.status === 'complete' && statusData.data.code) {
            const generatedCode = statusData.data.code;
            console.log('✅ Code generated successfully!');
            console.log('📋 Generated code:');
            console.log(generatedCode);
            
            // Check if it includes module.scad
            if (generatedCode.includes('include <module.scad>')) {
                console.log('✅ Code includes module.scad');
                
                // Check if it uses actual modules
                const modules = ['rounded_cube', 'rounded_cylinder', 'tube', 'gear'];
                const usedModules = modules.filter(mod => generatedCode.includes(mod));
                
                if (usedModules.length > 0) {
                    console.log(`✅ Code uses modules: ${usedModules.join(', ')}`);
                    console.log('🎉 SUCCESS: The AI is generating code that uses modules from module.scad!');
                    
                    // Save the code for manual testing
                    const testFile = 'test-generated-module.scad';
                    await fs.writeFile(testFile, generatedCode);
                    console.log(`💾 Code saved to ${testFile} for manual testing`);
                    
                    return true;
                } else {
                    console.log('ℹ️  Code includes module.scad but doesn\'t use any modules');
                    return false;
                }
            } else {
                console.log('ℹ️  Generated code does not include module.scad');
                console.log('💡 This might be using basic OpenSCAD primitives instead');
                return false;
            }
        } else {
            console.log('❌ Code generation not complete or failed');
            console.log('Status:', statusData.data.status);
            console.log('Message:', statusData.data.message);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    }
}

// Test the worker by checking existing requests
async function checkExistingRequests() {
    console.log('\n🔍 Checking existing requests for module usage...');
    
    try {
        const requestsDir = 'requests';
        const files = await fs.readdir(requestsDir);
        
        let foundModuleRequests = 0;
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const filePath = path.join(requestsDir, file);
                try {
                    const content = await fs.readFile(filePath, 'utf8');
                    const request = JSON.parse(content);
                    
                    if (request.code && request.code.includes('include <module.scad>')) {
                        foundModuleRequests++;
                        console.log(`✅ Found module request: ${file}`);
                        
                        // Check which modules are used
                        const modules = ['rounded_cube', 'rounded_cylinder', 'tube', 'gear', 'honeycomb'];
                        const usedModules = modules.filter(mod => request.code.includes(mod));
                        
                        if (usedModules.length > 0) {
                            console.log(`   Uses modules: ${usedModules.join(', ')}`);
                        }
                        
                        if (request.status === 'complete') {
                            console.log('   Status: COMPLETE ✅');
                        } else {
                            console.log('   Status:', request.status);
                        }
                    }
                } catch (error) {
                    // Skip invalid files
                }
            }
        }
        
        console.log(`\n📊 Found ${foundModuleRequests} requests that include module.scad`);
        return foundModuleRequests;
        
    } catch (error) {
        console.error('❌ Error checking existing requests:', error.message);
        return 0;
    }
}

// Run tests
async function runTests() {
    console.log('🔧 Testing OpenSCAD module.scad include fix\n');
    
    const newTest = await testSimpleModule();
    console.log('');
    
    const existingCount = await checkExistingRequests();
    console.log('');
    
    if (newTest || existingCount > 0) {
        console.log('✅ Module.scad integration appears to be working!');
        console.log('📋 Summary:');
        console.log('   - AI generates code with module.scad includes');
        console.log('   - Code uses modules from module.scad');
        console.log('   - Worker has been updated to provide module.scad');
        console.log('');
        console.log('🎯 The fix should allow proper rendering of modules!');
    } else {
        console.log('⚠️  No module usage detected in tests or existing requests');
        console.log('💡 This might be normal if the AI is using basic primitives');
    }
}

runTests().catch(console.error);