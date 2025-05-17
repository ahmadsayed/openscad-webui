// openscadRenderer.js - Handles OpenSCAD rendering and STL generation

import OpenSCAD from "../openscad.js";
import { downloadBinaryAsFile } from './utils/fileUtils.js';

/**
 * Class responsible for rendering OpenSCAD code and managing the generated STL
 */
export class OpenSCADRenderer {
    /**
     * @param {BABYLON.Scene} scene - The Babylon scene to render into
     */
    constructor(scene) {
        this.scene = scene;
        this.instance = null;
    }



    /**
     * Render OpenSCAD code to the scene
     * @param {string} openscadCode - The OpenSCAD code to render
     * @returns {Promise<void>}
     */
    async renderOpenSCAD(openscadCode) {
        try {
            // Load the OpenSCAD WASM module
            this.instance = await OpenSCAD();
            
            // Load the module.scad file
            let response = await fetch('./modules/module.scad');
            let module = await response.text();
            this.instance.FS.writeFile("/module.scad", module);
            
            console.log("OpenSCAD renderer initialized");

            // Write the input code to the virtual filesystem
            this.instance.FS.writeFile("/input.scad", openscadCode);
            
            // Run OpenSCAD to generate the STL
            this.instance.callMain(["/input.scad", "--enable=manifold", "-o", "cube.stl"]);
            
            // Read the generated STL
            const output = this.instance.FS.readFile("/cube.stl");
            const buffer = this._arrayBufferToBase64(output);
            
            // Clear existing meshes
            this._clearScene();
            
            // Load the STL into the scene
            await this._loadSTLToScene(buffer);
            
            console.log("OpenSCAD rendering complete");
        } catch (error) {
            console.error("Error rendering OpenSCAD:", error);
        }
    }

    /**
     * Download the generated STL file
     */
    downloadSTL() {
        if (!this.instance) {
            console.error("OpenSCAD instance not initialized");
            return;
        }

        try {
            const output = this.instance.FS.readFile("/cube.stl");
            const bytes = new Uint8Array(output);
            downloadBinaryAsFile("model.stl", bytes);
        } catch (error) {
            console.error("Error downloading STL:", error);
        }
    }

    /**
     * Convert array buffer to base64 data URL
     * @private
     * @param {ArrayBuffer} buffer - The buffer to convert
     * @returns {string} The base64 data URL
     */
    _arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        
        return "data:;base64," + window.btoa(binary);
    }

    /**
     * Clear all meshes from the scene
     * @private
     */
    _clearScene() {
        for (let i = 0; i < this.scene.meshes.length; i++) {
            this.scene.meshes[i].dispose();
        }
        this.scene.meshes = [];
    }

    /**
     * Load an STL buffer into the scene
     * @private
     * @param {string} buffer - The base64 STL data
     * @returns {Promise<void>}
     */
    _loadSTLToScene(buffer) {
        return new Promise((resolve) => {
            BABYLON.SceneLoader.Append("", buffer, this.scene, (scene) => {
                // Create material for the model
                const material = new BABYLON.StandardMaterial(scene);
                material.diffuseColor = new BABYLON.Color3(1.0, 1.0, 0);
                material.alpha = 1;
                
                // Apply material to all meshes
                scene.meshes.forEach(mesh => {
                    mesh.material = material;
                });
                
                // Create axes viewer
                const axis = new BABYLON.AxesViewer(scene, 10);
                
                resolve();
            }, null, null, ".stl");
        });
    }
}