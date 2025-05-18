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
        this.worker = new Worker('./src/openscadWorker.js', { type: 'module' });
        this.pendingRequests = new Map();
    }



    /**
     * Render OpenSCAD code to the scene
     * @param {string} openscadCode - The OpenSCAD code to render
     * @returns {Promise<void>}
     */
    async renderOpenSCAD(openscadCode) {
        const id = Date.now() + Math.random().toString(36).substr(2, 5);
        
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });

            this.worker.onmessage = (e) => {
                const { id, result, error } = e.data;
                const request = this.pendingRequests.get(id);
                
                if (!request) return;
                this.pendingRequests.delete(id);

                if (error) {
                    request.reject(new Error(error));
                } else {
                    this._handleRenderResult(result).then(request.resolve).catch(request.reject);
                }
            };

            this.worker.postMessage({
                id,
                command: 'render',
                data: { openscadCode }
            });
        });
    }

    async _handleRenderResult(stlBuffer) {
        // Convert buffer to base64
        const buffer = this._arrayBufferToBase64(stlBuffer);
        
        // Clear scene and load STL
        this._clearScene();
        await this._loadSTLToScene(buffer);
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
                const material = new BABYLON.StandardMaterial("stlMaterial", scene);
                material.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0);
                material.alpha = 1;

                // Apply material to all meshes and apply transformation
                scene.meshes.forEach(mesh => {
                    if (mesh !== scene.activeCamera) {
                        // Apply material
                        mesh.material = material;
                    }
                });

                // Create axes viewer with custom colors to match OpenSCAD
                const axisSize = 5;
                // const axesViewer = new BABYLON.AxesViewer(scene, axisSize);

                // OpenSCAD uses red for X, green for Y, blue for Z
                // We'll manually create our rotated axes to match OpenSCAD orientation

                // X axis (red) - points right in both systems
                const xAxis = BABYLON.MeshBuilder.CreateLines("xAxis", {
                    points: [
                        new BABYLON.Vector3(0, 0, 0),
                        new BABYLON.Vector3(axisSize, 0, 0)
                    ]
                }, scene);
                xAxis.color = new BABYLON.Color3(1, 0, 0);

                // Y axis (green) - points back in OpenSCAD
                const yAxis = BABYLON.MeshBuilder.CreateLines("yAxis", {
                    points: [
                        new BABYLON.Vector3(0, 0, 0),
                        new BABYLON.Vector3(0, 0, axisSize)
                    ]
                }, scene);
                yAxis.color = new BABYLON.Color3(0, 1, 0);

                // Z axis (blue) - points up in OpenSCAD
                const zAxis = BABYLON.MeshBuilder.CreateLines("zAxis", {
                    points: [
                        new BABYLON.Vector3(0, 0, 0),
                        new BABYLON.Vector3(0, axisSize, 0)
                    ]
                }, scene);
                zAxis.color = new BABYLON.Color3(0, 0, 1);

                // Create axis labels
                const labelX = this._createAxisLabel("X", new BABYLON.Vector3(axisSize + 0.5, 0, 0), scene, new BABYLON.Color3(1, 0, 0));
                const labelY = this._createAxisLabel("Y", new BABYLON.Vector3(0, 0, axisSize + 0.5), scene, new BABYLON.Color3(0, 1, 0));
                const labelZ = this._createAxisLabel("Z", new BABYLON.Vector3(0, axisSize + 0.5, 0), scene, new BABYLON.Color3(0, 0, 1));

                // Group the axes and labels for positioning
                const axesGroup = new BABYLON.TransformNode("axesGroup", scene);
                xAxis.parent = axesGroup;
                yAxis.parent = axesGroup;
                zAxis.parent = axesGroup;
                labelX.parent = axesGroup;
                labelY.parent = axesGroup;
                labelZ.parent = axesGroup;

                // Position the axes group in a fixed position in the viewport
                scene.onBeforeRenderObservable.add(() => {
                    // Update position to keep axes in bottom left corner
                    const bottomLeft = new BABYLON.Vector3(-0.8, -0.8, 0);
                    const screenPos = BABYLON.Vector3.Project(
                        bottomLeft,
                        BABYLON.Matrix.Identity(),
                        scene.getTransformMatrix(),
                        scene.activeCamera.viewport.toGlobal(
                            scene.getEngine().getRenderWidth(),
                            scene.getEngine().getRenderHeight()
                        )
                    );

                    axesGroup.position = scene.activeCamera.position.add(
                        scene.activeCamera.getDirection(BABYLON.Vector3.Forward()).scale(10)
                    );

                    // Make sure the axis is properly sized relative to camera distance
                    const distanceFromCamera = scene.activeCamera.position.length();
                    const scaleFactor = distanceFromCamera * 0.02;
                    axesGroup.scaling = new BABYLON.Vector3(scaleFactor, scaleFactor, scaleFactor);
                });

                resolve();
            }, null, null, ".stl");
        });
    }

    // Helper method to create axis labels
    _createAxisLabel(text, position, scene, color) {
        const plane = BABYLON.MeshBuilder.CreatePlane("label-" + text, {
            width: 1,
            height: 0.5
        }, scene);
        plane.position = position;

        // Always face the camera
        plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

        const dynamicTexture = new BABYLON.DynamicTexture("labelTexture-" + text,
            { width: 128, height: 64 }, scene, true);
        dynamicTexture.hasAlpha = true;

        const context = dynamicTexture.getContext();
        context.clearRect(0, 0, 128, 64);
        context.font = "bold 58px Arial";
        context.fillStyle = `rgb(${color.r * 255}, ${color.g * 255}, ${color.b * 255})`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(text, 64, 32);
        dynamicTexture.update();

        const material = new BABYLON.StandardMaterial("textMaterial-" + text, scene);
        material.diffuseTexture = dynamicTexture;
        material.emissiveColor = color;
        material.disableLighting = true;
        material.useAlphaFromDiffuseTexture = true;
        plane.material = material;

        return plane;
    }
}