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
    const navItems = document.querySelectorAll(".nav-item");
    
    // Toggle mobile menu
    mobileMenuButton.addEventListener("click", () => {
        navList.classList.toggle("active");
    });
    
    // Handle dropdown menus on mobile
    navItems.forEach(item => {
        // For desktop: Add a small delay before hiding dropdown
        let dropdownTimeout;
        
        item.addEventListener("mouseenter", () => {
            clearTimeout(dropdownTimeout);
        });
        
        item.addEventListener("mouseleave", () => {
            dropdownTimeout = setTimeout(() => {
                // This timeout allows users to move cursor to dropdown
            }, 300);
        });
        
        // For mobile: Toggle dropdown on tap
        const itemLink = item.querySelector("a");
        if (itemLink && item.querySelector(".dropdown")) {
            itemLink.addEventListener("click", (e) => {
                // Only handle dropdown toggle on mobile
                if (window.innerWidth <= 768) {
                    e.preventDefault();
                    
                    // Close other open dropdowns
                    navItems.forEach(otherItem => {
                        if (otherItem !== item) {
                            otherItem.classList.remove("active");
                        }
                    });
                    
                    // Toggle this dropdown
                    item.classList.toggle("active");
                }
            });
        }
    });
    
    // Close mobile menu when clicking outside
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".nav-list") && !e.target.closest(".menu-toggle")) {
            navList.classList.remove("active");
            navItems.forEach(item => item.classList.remove("active"));
        }
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
