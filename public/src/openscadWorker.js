// Worker script for OpenSCAD rendering

import OpenSCAD from "../openscad.js";


class OpenSCADWorker {
    constructor() {
        this.instance = null;
    }

    async render(openscadCode) {
        try {
            // Send a progress update
            self.postMessage({ 
                type: 'progress', 
                status: 'initializing', 
                message: 'Initializing OpenSCAD...' 
            });
            
            this.instance = await OpenSCAD();

            // Send a progress update
            self.postMessage({ 
                type: 'progress', 
                status: 'loading', 
                message: 'Loading modules...' 
            });

            // Load the module.scad file
            let response = await fetch('./modules/module.scad');
            let module = await response.text();
            this.instance.FS.writeFile("/module.scad", module);

            // Send a progress update
            self.postMessage({ 
                type: 'progress', 
                status: 'processing', 
                message: 'Processing OpenSCAD code...' 
            });

            // Write input and generate STL
            this.instance.FS.writeFile("/input.scad", openscadCode);
            this.instance.callMain(["/input.scad", "--enable=manifold", "-o", "cube.stl"]);

            // Send a progress update
            self.postMessage({ 
                type: 'progress', 
                status: 'finalizing', 
                message: 'Finalizing model...' 
            });

            const output = this.instance.FS.readFile("/cube.stl");
            return output.buffer;
        } catch (error) {
            // Send error progress update
            self.postMessage({ 
                type: 'progress', 
                status: 'error', 
                message: 'Error: ' + error.message 
            });
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
                // Send initial progress update
                self.postMessage({ 
                    type: 'progress', 
                    status: 'started', 
                    message: 'Starting OpenSCAD rendering...' 
                });
                
                const stlBuffer = await worker.render(data.openscadCode);
                
                // Send completion progress update
                self.postMessage({ 
                    type: 'progress', 
                    status: 'completed', 
                    message: 'Rendering completed' 
                });
                
                self.postMessage({ id, result: stlBuffer }, [stlBuffer]);
                break;
                
            case 'getSTL':
                // Send progress update
                self.postMessage({ 
                    type: 'progress', 
                    status: 'exporting', 
                    message: 'Exporting STL file...' 
                });
                
                if (!worker.instance) {
                    throw new Error("OpenSCAD instance not initialized");
                }
                try {
                    const output = worker.instance.FS.readFile("/cube.stl");
                    
                    // Send completion progress update
                    self.postMessage({ 
                        type: 'progress', 
                        status: 'completed', 
                        message: 'Export completed' 
                    });
                    
                    self.postMessage({ id, result: output.buffer }, [output.buffer]);
                } catch (error) {
                    throw new Error("Error reading STL file: " + error.message);
                }
                break;
                
            default:
                throw new Error(`Unknown command: ${command}`);
        }
    } catch (error) {
        // Send error progress update
        self.postMessage({ 
            type: 'progress', 
            status: 'error', 
            message: 'Error: ' + error.message 
        });
        
        self.postMessage({ id, error: error.message });
    }
};
