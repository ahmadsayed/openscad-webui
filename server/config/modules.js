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
    signature: "gear(number_of_teeth, circular_pitch, pressure_angle=20, thickness=5)",
    description: "Create a spur gear",
    example: "gear(20, 200, 20, 5);",
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
    example: "joint('pin', 10, 0.2);",
    category: "structural",
    priority: "Medium"
  },

  // Fasteners & Hardware
  screw_holes: {
    signature: "screw_holes(pattern, screw_size, depth, positions)",
    description: "Create screw hole patterns",
    example: "screw_holes('grid', 3, 5, [[0,0], [20,0], [0,20], [20,20]]);",
    category: "hardware",
    priority: "High"
  },
  nut_trap: {
    signature: "nut_trap(size, depth, type='hex')",
    description: "Create hex nut trap/trap for nuts",
    example: "nut_trap(6, 3, 'hex');",
    category: "hardware",
    priority: "Medium"
  },

  // Shapes & Patterns
  honeycomb: {
    signature: "honeycomb(size, cell_size, thickness)",
    description: "Create honeycomb pattern",
    example: "honeycomb([50, 50], 5, 2);",
    category: "patterns",
    priority: "Medium"
  },
  lattice: {
    signature: "lattice(size, strut_width, pattern='grid')",
    description: "Create lattice structure",
    example: "lattice([30, 30, 20], 2, 'grid');",
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
    signature: "helix(radius, pitch, turns, thickness=1)",
    description: "Create helix/spring shape",
    example: "helix(10, 5, 5, 1);",
    category: "advanced",
    priority: "Low"
  },

  // Utility Functions
  extrude_text: {
    signature: "extrude_text(text, size, height, font='Arial')",
    description: "Create 3D text",
    example: "extrude_text('Hello', 10, 2, 'Arial');",
    category: "utility",
    priority: "Low"
  },
  array_pattern: {
    signature: "array_pattern(object, spacing, count, direction='x')",
    description: "Create array pattern of objects",
    example: "array_pattern(cube(5), 10, 3, 'x');",
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