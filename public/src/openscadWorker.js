// Worker script for OpenSCAD rendering

import OpenSCAD from "../openscad.js";


class OpenSCADWorker {
    constructor() {
        this.instance = null;
    }

    async render(openscadCode) {
        try {
            // Send a progress update - use setTimeout to ensure Firefox doesn't hang
            setTimeout(() => {
                self.postMessage({ 
                    type: 'progress', 
                    status: 'initializing', 
                    message: 'Initializing OpenSCAD...' 
                });
            }, 0);
            
            this.instance = await OpenSCAD();

            // Send a progress update
            setTimeout(() => {
                self.postMessage({ 
                    type: 'progress', 
                    status: 'loading', 
                    message: 'Loading modules...' 
                });
            }, 0);

            // Load the module.scad file
            let response = await fetch('./modules/module.scad');
            let module = await response.text();
            this.instance.FS.writeFile("/module.scad", module);

            // Send a progress update
            setTimeout(() => {
                self.postMessage({ 
                    type: 'progress', 
                    status: 'processing', 
                    message: 'Processing OpenSCAD code...' 
                });
            }, 0);

            // Write input and generate STL
            this.instance.FS.writeFile("/input.scad", openscadCode);
            this.instance.callMain(["/input.scad", 
                "--enable=manifold",           // Enable manifold geometry engine (faster)
                "--enable=fast-csg",          // Enable fast CSG operations
                "--enable=lazy-union",        // Enable lazy union optimization               
                "-o", "cube.stl",
                 "--render"                   // Force render mode
            ]
            );

            // Send a progress update
            setTimeout(() => {
                self.postMessage({ 
                    type: 'progress', 
                    status: 'finalizing', 
                    message: 'Finalizing model...' 
                });
            }, 0);

            const output = this.instance.FS.readFile("/cube.stl");
            return output.buffer;
        } catch (error) {
            // Send error progress update
            setTimeout(() => {
                self.postMessage({ 
                    type: 'progress', 
                    status: 'error', 
                    message: 'Error: ' + error.message 
                });
            }, 0);
            throw error;
        }
    }
}

export const worker = new OpenSCADWorker();

self.onmessage = async (e) => {
    const { id, command, data } = e.data;

    try {
        switch (command) {
            case 'render':
                // Send initial progress update with setTimeout for Firefox compatibility
                setTimeout(() => {
                    self.postMessage({ 
                        type: 'progress', 
                        status: 'started', 
                        message: 'Starting OpenSCAD rendering...' 
                    });
                }, 0);
                
                const stlBuffer = await worker.render(data.openscadCode);
                
                // Send completion progress update
                setTimeout(() => {
                    self.postMessage({ 
                        type: 'progress', 
                        status: 'completed', 
                        message: 'Rendering completed' 
                    });
                }, 0);
                
                // Use setTimeout to ensure Firefox doesn't hang on transferable objects
                setTimeout(() => {
                    self.postMessage({ id, result: stlBuffer }, [stlBuffer]);
                }, 10);
                break;
                
            case 'getSTL':
                // Send progress update
                setTimeout(() => {
                    self.postMessage({ 
                        type: 'progress', 
                        status: 'exporting', 
                        message: 'Exporting STL file...' 
                    });
                }, 0);
                
                if (!worker.instance) {
                    throw new Error("OpenSCAD instance not initialized");
                }
                try {
                    const output = worker.instance.FS.readFile("/cube.stl");
                    
                    // Send completion progress update
                    setTimeout(() => {
                        self.postMessage({ 
                            type: 'progress', 
                            status: 'completed', 
                            message: 'Export completed' 
                        });
                    }, 0);
                    
                    // Use setTimeout to ensure Firefox doesn't hang on transferable objects
                    setTimeout(() => {
                        self.postMessage({ id, result: output.buffer }, [output.buffer]);
                    }, 10);
                } catch (error) {
                    throw new Error("Error reading STL file: " + error.message);
                }
                break;
                
            default:
                throw new Error(`Unknown command: ${command}`);
        }
    } catch (error) {
        // Send error progress update
        setTimeout(() => {
            self.postMessage({ 
                type: 'progress', 
                status: 'error', 
                message: 'Error: ' + error.message 
            });
        }, 0);
        
        setTimeout(() => {
            self.postMessage({ id, error: error.message });
        }, 10);
    }
};
