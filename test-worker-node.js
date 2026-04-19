/**
 * Test script for OpenSCAD worker with module.scad support
 * Run with: node test-worker-node.js
 */

import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function testWorker() {
    return new Promise((resolve, reject) => {
        console.log('🧪 Testing OpenSCAD worker with module.scad...');
        
        const worker = new Worker(join(__dirname, 'public/src/openscadWorker.js'), {
            type: 'module'
        });

        // Test code that uses module.scad
        const testCode = `include <module.scad>

// Test rounded cube using module
rounded_cube([20, 15, 10], 2, facets=16);

// Test tube module  
translate([30, 0, 0]) {
    tube(outer_radius=8, inner_radius=6, height=15, center=true);
}`;

        const testRequest = {
            id: 'test-' + Date.now(),
            command: 'render',
            data: { openscadCode: testCode }
        };

        worker.on('message', (message) => {
            console.log('📨 Worker message received:', message.id);
            
            if (message.error) {
                console.error('❌ Worker error:', message.error);
                reject(new Error(message.error));
            } else if (message.result) {
                console.log('✅ Worker success! STL size:', message.result.byteLength, 'bytes');
                
                // Verify it's a valid STL file (check header)
                const view = new Uint8Array(message.result);
                const header = String.fromCharCode.apply(null, view.slice(0, 5));
                if (header === 'solid') {
                    console.log('✅ STL header verified - appears to be valid STL file');
                } else {
                    console.log('ℹ️  STL header check inconclusive');
                }
                
                resolve(message.result);
            }
            
            worker.terminate();
        });

        worker.on('error', (error) => {
            console.error('❌ Worker error:', error);
            reject(error);
            worker.terminate();
        });

        worker.on('exit', (code) => {
            if (code !== 0) {
                console.error(`❌ Worker stopped with exit code ${code}`);
                reject(new Error(`Worker exited with code ${code}`));
            }
        });

        console.log('📤 Sending test request to worker...');
        worker.postMessage(testRequest);
    });
}

// Run the test
testWorker()
    .then((result) => {
        console.log('🎉 Test PASSED! Generated STL with', result.byteLength, 'bytes');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Test FAILED:', error.message);
        process.exit(1);
    });