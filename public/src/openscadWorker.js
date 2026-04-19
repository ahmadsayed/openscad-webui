// Worker script for OpenSCAD rendering

import OpenSCAD from "../openscad.js";

// Cache for module.scad content
let moduleScadContent = null;

// Fetch module.scad content
async function getModuleScadContent() {
    if (moduleScadContent === null) {
        try {
            console.log('[WORKER] Fetching module.scad...');
            const response = await fetch('../src/modules/module.scad');
            if (!response.ok) {
                throw new Error(`Failed to fetch module.scad: ${response.status}`);
            }
            moduleScadContent = await response.text();
            console.log('[WORKER] module.scad fetched successfully, size:', moduleScadContent.length);
        } catch (error) {
            console.error('[WORKER] Failed to fetch module.scad:', error);
            throw error;
        }
    }
    return moduleScadContent;
}

self.onmessage = async (e) => {
    const { id, command, data } = e.data;

    try {
        switch (command) {
            case 'render':
                console.log('[WORKER] Starting render...');
                
                // Initialize OpenSCAD
                console.log('[WORKER] Initializing OpenSCAD...');
                const instance = await OpenSCAD();
                console.log('[WORKER] OpenSCAD initialized OK');

                // Check if the code includes module.scad and provide it if needed
                if (data.openscadCode.includes('include <module.scad>')) {
                    console.log('[WORKER] Code includes module.scad, providing module file...');
                    const moduleContent = await getModuleScadContent();
                    instance.FS.writeFile("/module.scad", moduleContent);
                    console.log('[WORKER] module.scad written to virtual filesystem');
                }

                // Write main model code
                console.log('[WORKER] Writing code to file...');
                instance.FS.writeFile("/model.scad", data.openscadCode);
                console.log('[WORKER] Code written OK');

                // Generate STL
                console.log('[WORKER] Generating STL...');
                instance.callMain(["/model.scad", "-o", "model.stl", "--render"]);
                console.log('[WORKER] STL generated OK');

                // Read STL file
                console.log('[WORKER] Reading STL file...');
                const stlOutput = instance.FS.readFile("/model.stl");
                console.log('[WORKER] STL read OK, size:', stlOutput.byteLength);

                // Return result
                self.postMessage({ 
                    id, 
                    result: stlOutput.buffer 
                }, [stlOutput.buffer]);
                break;
                
            case 'getSTL':
                // This won't work with fresh instance per render
                self.postMessage({ id, error: "STL export not available in this mode" });
                break;
                
            case 'getOFF':
                // Not supported in STL-only mode
                self.postMessage({ id, error: "OFF export not available in this mode" });
                break;
        }
    } catch (error) {
        console.error('[WORKER] Error:', error);
        self.postMessage({ id: e.data.id, error: error.message || error });
    }
};