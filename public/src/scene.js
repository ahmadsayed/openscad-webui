// scene.js - Manages the Babylon.js 3D scene

// Canvas and engine setup
const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

/**
 * Creates and configures the 3D scene with camera and lighting
 * @returns {Promise<BABYLON.Scene>} The configured Babylon scene
 */
export const createScene = async () => {
    // Create the scene
    const scene = new BABYLON.Scene(engine);
    
    // Configure scene background
    scene.clearColor = new BABYLON.Color3(0.95, 0.95, 0.8);
    
    // Setup camera
    const camera = new BABYLON.ArcRotateCamera(
        "camera", 
        -Math.PI / 2, 
        Math.PI / 2.5, 
        100, 
        new BABYLON.Vector3(0, 0, 0)
    );
    camera.attachControl(canvas, false);
    
    // Setup lighting
    const light1 = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0));
    const light2 = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(1, 0, 0));
    light1.intensity = 0.9;
    light2.intensity = 0.4;
    
    // Setup loading screen
    setupLoadingScreen();
    
    // Start the render loop
    startRenderLoop(scene);
    
    // Setup window resize event
    setupResizeListener();
    
    return scene;
};

/**
 * Configure the loading screen
 */
function setupLoadingScreen() {
    const loadingScreenDiv = window.document.getElementById("loadingScreen");
    
    function customLoadingScreen() {}
    
    customLoadingScreen.prototype.displayLoadingUI = function() {
        loadingScreenDiv.innerHTML = "loading";
    };
    
    customLoadingScreen.prototype.hideLoadingUI = function() {
        loadingScreenDiv.style.display = "none";
    };
    
    const loadingScreen = new customLoadingScreen();
    engine.loadingScreen = loadingScreen;
    engine.displayLoadingUI();
}

/**
 * Start the render loop for continuous scene rendering
 * @param {BABYLON.Scene} scene - The scene to render
 */
function startRenderLoop(scene) {
    engine.runRenderLoop(function() {
        scene.render();
    });
}

/**
 * Setup window resize event listener
 */
function setupResizeListener() {
    window.addEventListener("resize", function() {
        engine.resize();
    });
}