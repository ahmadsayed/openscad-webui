// menu.js - Manages menu functionality

import { openDesign } from '../utils/fileUtils.js';

/**
 * Initialize the menu functionality
 * @param {Object} editor - The code editor instance
 * @param {Object} renderer - The OpenSCAD renderer instance
 */
export function initMenu(editor, renderer) {
    // Initialize mobile menu toggle
    initMobileMenu();
    
    // Setup file input for opening designs
    setupFileInput(editor, renderer);
}

/**
 * Initialize the mobile menu toggle functionality
 */
function initMobileMenu() {
    const mobileMenuButton = document.getElementById("mobile-menu");
    const navList = document.querySelector(".nav-list");

    mobileMenuButton.addEventListener("click", () => {
        navList.classList.toggle("active");
    });
}

/**
 * Setup the file input for opening designs
 * @param {Object} editor - The code editor instance
 * @param {Object} renderer - The OpenSCAD renderer instance
 */
function setupFileInput(editor, renderer) {
    const fileInput = document.getElementById('fileInput');
    
    fileInput.addEventListener('change', function() {
        const file = fileInput.files[0];
        if (!file) {
            alert('No file selected.');
            return;
        }
        
        console.log(`You chose the file: ${file.name}`);
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const contents = e.target.result;
            editor.setValue(contents);
            renderer.renderOpenSCAD(editor.getValue());
        };
        reader.readAsText(file);
    });
    
    // Make openDesign function available globally
    window.openDesign = function(event) {
        fileInput.click();
    };
}