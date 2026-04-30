/**
 * Simplified Modules Configuration
 * Reduced from 70+ modules to 20 essential ones
 */

// Essential OpenSCAD modules only
export const ESSENTIAL_MODULES = {
  // Basic Rounded Geometry
  rounded_cube: {
    signature: "rounded_cube(size, radius, facets=24)",
    description: "Create a cube with rounded edges using minkowski sum",
    example: "rounded_cube([20, 15, 10], 2, 24);",
    category: "basic",
    priority: "High"
  },
  rounded_cylinder: {
    signature: "rounded_cylinder(height, radius, rounding_radius, facets=24)",
    description: "Create a cylinder with rounded ends",
    example: "rounded_cylinder(30, 10, 2, 24);",
    category: "basic", 
    priority: "High"
  },
  tube: {
    signature: "tube(outer_radius, inner_radius, height, center=false)",
    description: "Create a hollow cylinder (tube)",
    example: "tube(10, 8, 30, true);",
    category: "basic",
    priority: "High"
  },

  // Mechanical Components
  gear: {
    signature: "gear(number_of_teeth, circular_pitch=false, diametral_pitch=false, pressure_angle=20, clearance=0)",
    description: "Create a spur gear",
    example: "gear(20, circular_pitch=200);",
    category: "mechanical",
    priority: "High"
  },
  threaded_rod: {
    signature: "threaded_rod(length, diameter, pitch)",
    description: "Create a threaded rod",
    example: "threaded_rod(50, 8, 1.25);",
    category: "mechanical",
    priority: "Medium"
  },
  bearing_housing: {
    signature: "bearing_housing(outer_diameter, inner_diameter, depth, flange_thickness=3)",
    description: "Create bearing housing with flange",
    example: "bearing_housing(30, 15, 10, 3);",
    category: "mechanical",
    priority: "Medium"
  },

  // Structural Elements
  bracket: {
    signature: "bracket(width, height, thickness, hole_diameter=0)",
    description: "Create L-bracket with optional mounting holes",
    example: "bracket(40, 30, 3, 5);",
    category: "structural",
    priority: "High"
  },
  hinge: {
    signature: "hinge(length, width, pin_diameter, leaf_thickness=2)",
    description: "Create a simple hinge",
    example: "hinge(30, 15, 3, 2);",
    category: "structural",
    priority: "Medium"
  },
  joint: {
    signature: "joint(type, size, tolerance=0.2)",
    description: "Create various joint types (pin, ball, universal)",
    example: 'joint("pin", 10, 0.2);',
    category: "structural",
    priority: "Medium"
  },

  // Fasteners & Hardware
  screw_holes: {
    signature: "screw_holes(pattern, screw_size, depth, positions, chamfer=false)",
    description: "Create screw hole patterns. (0,0,0) is the very bottom of the screw; the hole extends upward along +Z from z=0 to z=depth. Set chamfer=true to countersink the top. Use inside difference() with a base object.",
    example: 'difference() { cube([20,20,10], center=true); translate([0, 0, -5]) screw_holes("single", 3, 10, [[0,0]], chamfer=true); }',
    category: "hardware",
    priority: "High"
  },
  nut_trap: {
    signature: "nut_trap(size, depth, type='hex')",
    description: "Create hex nut trap/trap for nuts",
    example: 'nut_trap(6, 3, "hex");',
    category: "hardware",
    priority: "Medium"
  },

  // Shapes & Patterns
  honeycomb: {
    signature: "honeycomb(width, depth, cell_size=5)",
    description: "Create 2D honeycomb pattern. Use linear_extrude(thickness) to make it 3D.",
    example: "linear_extrude(2) honeycomb(50, 40, 5);",
    category: "patterns",
    priority: "Medium"
  },
  lattice: {
    signature: "lattice(size, cell_size=5, beam_width=1)",
    description: "Create 3D lattice structure",
    example: "lattice([30, 30, 20], 5, 1);",
    category: "patterns",
    priority: "Low"
  },

  // Advanced Geometry
  torus: {
    signature: "torus(major_radius, minor_radius, facets=32)",
    description: "Create torus (donut shape)",
    example: "torus(15, 5, 32);",
    category: "advanced",
    priority: "Medium"
  },
  helix: {
    signature: "helix(radius, pitch, height, thickness=1, facets=32)",
    description: "Create helix/spring shape",
    example: "helix(10, 5, 30, 1);",
    category: "advanced",
    priority: "Low"
  },

  // Utility Functions
  text_3d: {
    signature: "text_3d(text, size=10, height=2, font='Liberation Sans', center=false)",
    description: "Create 3D text",
    example: 'text_3d("Hello", 10, 2);',
    category: "utility",
    priority: "Low"
  },
  array_pattern: {
    signature: "array_pattern(spacing, count, direction='x')",
    description: "Create array pattern of objects (uses children())",
    example: 'array_pattern(10, 3, "x") cube(5);',
    category: "utility",
    priority: "Medium"
  }
};

/**
 * Enhanced module formatting with parameter type information
 */
export function formatModulesForDisplay() {
  return Object.entries(ESSENTIAL_MODULES)
    .map(([name, mod]) => {
      const paramTypes = getParameterTypes(mod.signature);
      return `${mod.signature}\n  // ${mod.description}\n  // Example: ${mod.example}\n  // Parameters: ${paramTypes}`;
    })
    .join('\n\n');
}

/**
 * Extract parameter type information from signature
 */
function getParameterTypes(signature) {
  // Identify parameter types based on common patterns
  if (signature.includes('size') && signature.includes('[')) {
    return 'size=[x,y,z] (vector), others=scalars';
  }
  if (signature.includes('height') || signature.includes('radius') || signature.includes('width')) {
    return 'All parameters are scalars';
  }
  return 'Check signature for parameter types';
}

/**
 * Get modules by category
 */
export function getModulesByCategory(category) {
  return Object.entries(ESSENTIAL_MODULES)
    .filter(([_, mod]) => mod.category === category)
    .reduce((acc, [name, mod]) => {
      acc[name] = mod;
      return acc;
    }, {});
}