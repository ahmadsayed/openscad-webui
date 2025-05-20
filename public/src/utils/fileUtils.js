// fileUtils.js - Utilities for file operations

/**
 * Download OpenSCAD code as a .scad file
 * @param {string} code - The OpenSCAD code to download
 */
export function downloadSCAD(code) {
    downloadTextAsFile("code.scad", code);
}

/**
 * Open a design file using the file input
 * @param {Event} event - The triggering event
 */
export function openDesign(event) {
    const fileInput = document.getElementById('fileInput');
    fileInput.click();
}

/**
 * Download text content as a file
 * @param {string} filename - The name for the downloaded file
 * @param {string} text - The text content to download
 */
export function downloadTextAsFile(filename, text) {
    // Create a blob of the text
    const blob = new Blob([text], { type: 'text/plain' });
    
    // Create a download link
    const downloadLink = document.createElement("a");
    downloadLink.download = filename;
    downloadLink.href = window.URL.createObjectURL(blob);
    
    // Trigger the download
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

/**
 * Download binary data as a file
 * @param {string} filename - The name for the downloaded file
 * @param {Uint8Array} binaryData - The binary data to download
 */
export function downloadBinaryAsFile(filename, binaryData) {
    // Create a blob of the binary data
    const blob = new Blob([binaryData], { type: 'application/octet-stream' });
    
    // Create a download link
    const downloadLink = document.createElement("a");
    downloadLink.download = filename;
    downloadLink.href = window.URL.createObjectURL(blob);
    
    // Trigger the download
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}
