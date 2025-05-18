// Worker script for OpenSCAD rendering

import OpenSCAD from "../openscad.js";
import { downloadBinaryAsFile } from './utils/fileUtils.js';


class OpenSCADWorker {
    constructor() {
        this.instance = null;
    }

    async render(openscadCode) {
        try {
            this.instance = await OpenSCAD();

            // Load the module.scad file
            let response = await fetch('./modules/module.scad');
            let module = await response.text();
            this.instance.FS.writeFile("/module.scad", module);

            // Write input and generate STL
            this.instance.FS.writeFile("/input.scad", openscadCode);
            this.instance.callMain(["/input.scad", "--enable=manifold", "-o", "cube.stl"]);

            const output = this.instance.FS.readFile("/cube.stl");
            return output.buffer;
        } catch (error) {
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
                const stlBuffer = await worker.render(data.openscadCode);
                self.postMessage({ id, result: stlBuffer }, [stlBuffer]);
                break;
            default:
                throw new Error(`Unknown command: ${command}`);
        }
    } catch (error) {
        self.postMessage({ id, error: error.message });
    }
};