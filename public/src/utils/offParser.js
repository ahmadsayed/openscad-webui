// offParser.js - Utility for parsing OFF (Object File Format) files

/**
 * Parses OFF format and creates Babylon.js mesh data
 * Supports standard OFF format and COFF (with colors)
 */
export class OFFParser {
    constructor() {
        this.vertices = [];
        this.faces = [];
        this.colors = [];
        this.hasColors = false;
    }

    /**
     * Parse OFF format data and create Babylon VertexData
     * @param {string} offData - The OFF format data as string
     * @returns {BABYLON.VertexData} The vertex data for mesh creation
     */
    parse(offData) {
        const lines = offData.trim().split('\n');

        // Skip empty lines at start
        let lineIndex = 0;
        while (lineIndex < lines.length && lines[lineIndex].trim() === '') {
            lineIndex++;
        }

        // Check header - handle both "OFF" on its own line and "OFF 8 6 0" format
        const firstLine = lines[lineIndex].trim();
        let header, counts;
        
        if (firstLine.startsWith('OFF ') || firstLine === 'OFF') {
            header = 'OFF';
            // Check if counts are on the same line
            const parts = firstLine.split(/\s+/);
            if (parts.length >= 4) {
                // Format: "OFF 8 6 0" - counts are on same line
                counts = parts.slice(1, 4).map(Number);
            }
        } else if (firstLine.startsWith('COFF ') || firstLine === 'COFF') {
            header = 'COFF';
            // Check if counts are on the same line
            const parts = firstLine.split(/\s+/);
            if (parts.length >= 4) {
                // Format: "COFF 8 6 0" - counts are on same line
                counts = parts.slice(1, 4).map(Number);
            }
        } else {
            throw new Error('Invalid OFF format: missing OFF header');
        }

        this.hasColors = (header === 'COFF');
        lineIndex++;

        // Skip comments
        while (lineIndex < lines.length && lines[lineIndex].trim().startsWith('#')) {
            lineIndex++;
        }

        // Read counts if not already read from header line
        if (!counts) {
            const countsLine = lines[lineIndex].trim();
            counts = countsLine.split(/\s+/).map(Number);
            lineIndex++;
        }

        if (counts.length < 3) {
            throw new Error('Invalid OFF format: missing vertex/face/edge counts');
        }

        const [numVertices, numFaces, numEdges] = counts;

        // Read vertices
        for (let i = 0; i < numVertices; i++) {
            if (lineIndex >= lines.length) {
                throw new Error('Invalid OFF format: missing vertex data');
            }

            const vertexLine = lines[lineIndex].trim();
            if (vertexLine === '' || vertexLine.startsWith('#')) {
                i--; // Skip empty/comment lines
                lineIndex++;
                continue;
            }

            const coords = vertexLine.split(/\s+/).map(Number);
            if (coords.length < 3) {
                throw new Error(`Invalid OFF format: vertex ${i} has insufficient coordinates`);
            }

            this.vertices.push(new BABYLON.Vector3(coords[0], coords[1], coords[2]));

            // Read colors if COFF format
            if (this.hasColors && coords.length >= 6) {
                // Support both 0-1 and 0-255 color ranges
                const r = coords[3] > 1 ? coords[3] / 255 : coords[3];
                const g = coords[4] > 1 ? coords[4] / 255 : coords[4];
                const b = coords[5] > 1 ? coords[5] / 255 : coords[5];
                this.colors.push(new BABYLON.Color3(r, g, b));
            } else if (this.hasColors) {
                this.colors.push(new BABYLON.Color3(1, 1, 1)); // Default white
            }

            lineIndex++;
        }

        // Read faces
        for (let i = 0; i < numFaces; i++) {
            if (lineIndex >= lines.length) {
                throw new Error('Invalid OFF format: missing face data');
            }

            const faceLine = lines[lineIndex].trim();
            if (faceLine === '' || faceLine.startsWith('#')) {
                i--; // Skip empty/comment lines
                lineIndex++;
                continue;
            }

            const indices = faceLine.split(/\s+/).map(Number);
            const vertexCount = indices[0];

            if (vertexCount < 3) {
                throw new Error(`Invalid OFF format: face ${i} has insufficient vertices`);
            }

            // Extract vertex indices
            const face = [];
            for (let j = 0; j < vertexCount; j++) {
                const vertexIndex = indices[j + 1];
                if (vertexIndex >= this.vertices.length) {
                    throw new Error(`Invalid OFF format: face ${i} references invalid vertex ${vertexIndex}`);
                }
                face.push(vertexIndex);
            }

            this.faces.push(face);
            lineIndex++;
        }

        return this._createVertexData();
    }

    /**
     * Create Babylon VertexData from parsed OFF data
     * @private
     * @returns {BABYLON.VertexData} The vertex data
     */
    _createVertexData() {
        const vertexData = new BABYLON.VertexData();

        // Flatten vertices
        const positions = [];
        for (const vertex of this.vertices) {
            positions.push(vertex.x, vertex.y, vertex.z);
        }
        vertexData.positions = positions;

        // Create indices for triangles
        const indices = [];
        for (const face of this.faces) {
            if (face.length === 3) {
                // Triangle - add directly
                indices.push(face[0], face[1], face[2]);
            } else if (face.length > 3) {
                // Polygon - triangulate using fan triangulation
                for (let i = 1; i < face.length - 1; i++) {
                    indices.push(face[0], face[i], face[i + 1]);
                }
            }
        }
        vertexData.indices = indices;

        // Add colors if available
        if (this.hasColors && this.colors.length > 0) {
            const colors = [];
            for (const color of this.colors) {
                colors.push(color.r, color.g, color.b, 1.0);
            }
            vertexData.colors = colors;
        }

        // Calculate normals - always initialize the normals array first
        vertexData.normals = [];
        BABYLON.VertexData.ComputeNormals(positions, indices, vertexData.normals);

        return vertexData;
    }

    /**
     * Check if the data appears to be valid OFF format
     * @param {string} data - The data to check
     * @returns {boolean} True if data appears to be OFF format
     */
    static isOFFFormat(data) {
        if (!data || typeof data !== 'string') return false;

        const lines = data.trim().split('\n');
        if (lines.length === 0) return false;

        const firstLine = lines[0].trim();
        return firstLine === 'OFF' || firstLine === 'COFF';
    }
}

/**
 * Utility function to create mesh from OFF data
 * @param {string} offData - The OFF format data
 * @param {BABYLON.Scene} scene - The Babylon scene
 * @param {string} meshName - Name for the mesh
 * @returns {BABYLON.Mesh} The created mesh
 */
export function createOFFMesh(offData, scene, meshName = 'offMesh') {
    const parser = new OFFParser();
    const vertexData = parser.parse(offData);

    const mesh = new BABYLON.Mesh(meshName, scene);
    vertexData.applyToMesh(mesh);

    // Calculate mesh bounds for proper camera framing
    mesh.refreshBoundingInfo();

    return mesh;
}