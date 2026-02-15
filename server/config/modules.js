// Available OpenSCAD modules with usage examples in JSON format
const modules = {
  // Basic Rounded Geometry (High Priority)
  "rounded_cube": {
    "signature": "rounded_cube(size, radius, facets=24)",
    "description": "Create a cube with rounded edges using minkowski sum",
    "example": "rounded_cube([20, 15, 10], 2, 24);",
    "category": "basic",
    "priority": "High"
  },
  "rounded_cylinder": {
    "signature": "rounded_cylinder(height, radius, rounding_radius, facets=24)",
    "description": "Create a cylinder with rounded ends",
    "example": "rounded_cylinder(30, 10, 2, 24);",
    "category": "basic",
    "priority": "High"
  },
  "rounded_pyramid": {
    "signature": "rounded_pyramid(base, height, radius, facets=24)",
    "description": "Create a pyramid with rounded edges",
    "example": "rounded_pyramid([20, 15], 25, 2, 24);",
    "category": "basic",
    "priority": "Medium"
  },
  "rounded_cone": {
    "signature": "rounded_cone(base_radius, height, rounding_radius, facets=24)",
    "description": "Create a cone with rounded base",
    "example": "rounded_cone(15, 30, 2, 24);",
    "category": "basic",
    "priority": "Medium"
  },

  // Advanced Geometry (High Priority)
  "torus": {
    "signature": "torus(major_radius, minor_radius, facets=32)",
    "description": "Create a torus (donut shape)",
    "example": "torus(20, 5, 32);",
    "category": "advanced_geometry",
    "priority": "High"
  },
  "tube": {
    "signature": "tube(outer_radius, inner_radius, height, center=false)",
    "description": "Create a hollow cylinder (tube)",
    "example": "tube(10, 8, 30, true);",
    "category": "advanced_geometry",
    "priority": "High"
  },
  "prism": {
    "signature": "prism(sides, radius, height, center=false)",
    "description": "Create an n-sided prism",
    "example": "prism(6, 15, 20); // Hexagonal prism",
    "category": "advanced_geometry",
    "priority": "Medium"
  },
  "slot": {
    "signature": "slot(length, width, height, center=false)",
    "description": "Create a slot with rounded ends",
    "example": "slot(30, 8, 5);",
    "category": "advanced_geometry",
    "priority": "Medium"
  },

  // Mechanical Components (High Priority)
  "gear": {
    "signature": "gear(number_of_teeth, circular_pitch=false, diametral_pitch=false, pressure_angle=20, clearance=0)",
    "description": "Create an involute gear with specified parameters (2D shape - use linear_extrude for 3D)",
    "example": "linear_extrude(height=10, center=true, convexity=10) gear(20, circular_pitch=200, pressure_angle=20);",
    "category": "mechanical",
    "priority": "High"
  },
  "bolt": {
    "signature": "bolt(head_radius, head_height, shaft_radius, shaft_length, thread_pitch=1)",
    "description": "Create a parametric bolt with head and threaded shaft",
    "example": "bolt(8, 4, 3, 25, 1.5);",
    "category": "mechanical",
    "priority": "High"
  },
  "nut": {
    "signature": "nut(outer_radius, inner_radius, height, sides=6, thread_pitch=1)",
    "description": "Create a parametric hex nut",
    "example": "nut(6, 3, 4, 6, 1.5);",
    "category": "mechanical",
    "priority": "High"
  },
  "washer": {
    "signature": "washer(outer_radius, inner_radius, thickness)",
    "description": "Create a simple washer",
    "example": "washer(8, 4, 1);",
    "category": "mechanical",
    "priority": "High"
  },
  "bearing": {
    "signature": "bearing(outer_radius, inner_radius, height, ball_radius=2, num_balls=8)",
    "description": "Create a simple bearing with balls",
    "example": "bearing(15, 8, 6, 2, 8);",
    "category": "mechanical",
    "priority": "Medium"
  },
  "simple_thread": {
    "signature": "simple_thread(radius, pitch, height, thread_depth=0.5, facets=32)",
    "description": "Create simple screw threads",
    "example": "simple_thread(5, 2, 20, 0.5);",
    "category": "mechanical",
    "priority": "Medium"
  },

  // Patterns and Textures (Medium Priority)
  "honeycomb": {
    "signature": "honeycomb(width, depth, cell_size=5)",
    "description": "Create a honeycomb pattern",
    "example": "linear_extrude(5) honeycomb(50, 40, 8);",
    "category": "patterns",
    "priority": "Medium"
  },
  "knurling": {
    "signature": "knurling(radius, height, pitch=2, depth=0.5, facets=64)",
    "description": "Create knurled surface texture",
    "example": "knurling(20, 30, 2, 0.5, 64);",
    "category": "patterns",
    "priority": "Medium"
  },
  "lattice": {
    "signature": "lattice(size, cell_size=5, beam_width=1)",
    "description": "Create a 3D lattice structure",
    "example": "lattice([50, 50, 30], 8, 2);",
    "category": "patterns",
    "priority": "Medium"
  },

  // Joints and Mechanisms (Medium Priority)
  "flexible_hinge": {
    "signature": "flexible_hinge(length, width, thickness, gap=0.5, segments=10)",
    "description": "Create a flexible hinge mechanism",
    "example": "flexible_hinge(40, 10, 2, 0.5, 8);",
    "category": "mechanisms",
    "priority": "Medium"
  },
  "living_hinge": {
    "signature": "living_hinge(length, width, thickness=0.8, cut_width=0.4, cut_spacing=1.2)",
    "description": "Create a living hinge pattern",
    "example": "living_hinge(50, 15, 0.8, 0.4, 1.2);",
    "category": "mechanisms",
    "priority": "Medium"
  },
  "dovetail_male": {
    "signature": "dovetail_male(width, height, depth, angle=15)",
    "description": "Create male dovetail joint",
    "example": "dovetail_male(20, 10, 15, 15);",
    "category": "mechanisms",
    "priority": "Low"
  },
  "dovetail_female": {
    "signature": "dovetail_female(width, height, depth, angle=15, clearance=0.1)",
    "description": "Create female dovetail joint",
    "example": "dovetail_female(20.2, 10.2, 15.1, 15, 0.1);",
    "category": "mechanisms",
    "priority": "Low"
  },

  // 2D Operations (Low Priority)
  "rounded_rectangle": {
    "signature": "rounded_rectangle(size, radius, center=false)",
    "description": "Create a 2D rounded rectangle",
    "example": "rounded_rectangle([30, 20], 3);",
    "category": "2d_operations",
    "priority": "Low"
  },
  "fillet_2d": {
    "signature": "fillet_2d(radius, angle=90)",
    "description": "Create a 2D fillet corner",
    "example": "fillet_2d(5, 90);",
    "category": "2d_operations",
    "priority": "Low"
  },
  "chamfer_2d": {
    "signature": "chamfer_2d(size)",
    "description": "Create a 2D chamfer corner",
    "example": "chamfer_2d(5);",
    "category": "2d_operations",
    "priority": "Low"
  },

  // Complex Shapes (Low Priority)
  "helix": {
    "signature": "helix(radius, pitch, height, thickness=1, facets=32)",
    "description": "Create a helical structure",
    "example": "helix(15, 8, 40, 1, 32);",
    "category": "complex_shapes",
    "priority": "Low"
  },
  "spring": {
    "signature": "spring(radius, wire_radius, pitch, height, facets=16)",
    "description": "Create a spring coil",
    "example": "spring(12, 1, 6, 30, 16);",
    "category": "complex_shapes",
    "priority": "Low"
  },
  "spiral": {
    "signature": "spiral(inner_radius, outer_radius, height, turns=5, facets=64)",
    "description": "Create a spiral structure",
    "example": "spiral(5, 20, 10, 8, 64);",
    "category": "complex_shapes",
    "priority": "Low"
  },
  "text_3d": {
    "signature": "text_3d(text, size=10, height=2, font='Liberation Sans', center=false)",
    "description": "Create 3D text extrusion",
    "example": "text_3d('HELLO', 12, 3, 'Liberation Sans');",
    "category": "complex_shapes",
    "priority": "Low"
  },

  // Gridfinity System (High Priority - Existing)
  "grid_block": {
    "signature": "grid_block(num_x=1, num_y=1, num_z=2, magnet_diameter=6.5, screw_depth=6, center=false, hole_overhang_remedy=false, half_pitch=false, box_corner_attachments_only=false)",
    "description": "Create Gridfinity base block with optional magnet and screw holes",
    "example": "grid_block(3, 2, 4, 6.5, 6);",
    "category": "gridfinity",
    "priority": "Low"
  },
  "base_lid": {
    "signature": "base_lid(num_x, num_y)",
    "description": "Create lid for Gridfinity base with magnet pockets",
    "example": "base_lid(3, 3);",
    "category": "gridfinity",
    "priority": "Low"
  },
  "weighted_baseplate": {
    "signature": "weighted_baseplate(num_x, num_y)",
    "description": "Create weighted baseplate with magnet and screw holes",
    "example": "weighted_baseplate(4, 2);",
    "category": "gridfinity",
    "priority": "Medium"
  },
  "frame_plain": {
    "signature": "frame_plain(num_x, num_y, extra_down=0, trim=0)",
    "description": "Create plain frame for Gridfinity system",
    "example": "frame_plain(3, 3);",
    "category": "gridfinity",
    "priority": "High"
  }
};

// Helper function to format modules for different prompt contexts
function formatModulesForPrompt(context = 'default') {
  const moduleList = Object.values(modules);
  
  switch (context) {
    case 'detailed':
      // Full detailed format for main prompts
      return moduleList.map(mod => 
        `${mod.signature}\n   // ${mod.example}\n   // Priority: ${mod.priority}`
      ).join('\n\n');
      
    case 'gridfinity':
      // Gridfinity-specific modules only
      return moduleList
        .filter(mod => mod.category === 'gridfinity')
        .map(mod => `${mod.signature} - ${mod.description} (Priority: ${mod.priority})`)
        .join('\n');
        
    case 'mechanical':
      // Mechanical modules only
      return moduleList
        .filter(mod => mod.category === 'mechanical')
        .map(mod => `${mod.signature} - ${mod.description} (Priority: ${mod.priority})`)
        .join('\n');
        
    case 'basic':
      // Basic modules only
      return moduleList
        .filter(mod => mod.category === 'basic')
        .map(mod => `${mod.signature}\n   // ${mod.example}\n   // Priority: ${mod.priority}`)
        .join('\n\n');
        
    case 'list':
      // Simple list format with priorities
      return moduleList.map(mod => `${mod.signature} (P${mod.priority})`).join(', ');
      
    default:
      // Default format with categories and priorities
      let output = '';
      const categories = [...new Set(moduleList.map(mod => mod.category))].sort();
      
      categories.forEach(category => {
        const categoryModules = moduleList.filter(mod => mod.category === category);
        if (categoryModules.length > 0) {
          output += `${category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')} Modules:\n`;
          categoryModules.forEach(mod => {
            output += `${mod.signature}\n   // ${mod.example}\n   // ${mod.description} (Priority: ${mod.priority})\n\n`;
          });
        }
      });
      
      return output.trim();
  }
}

// Priority order mapping for descriptive priorities
const PRIORITY_ORDER = {
  "High": 1,
  "Medium": 2,
  "Low": 3
};

// Helper function to get modules sorted by priority (High -> Medium -> Low)
function getModulesByPriority(category = null) {
  const moduleList = Object.values(modules);
  let filteredModules = category ? moduleList.filter(mod => mod.category === category) : moduleList;
  
  return filteredModules.sort((a, b) => {
    const priorityA = PRIORITY_ORDER[a.priority] || 999;
    const priorityB = PRIORITY_ORDER[b.priority] || 999;
    return priorityA - priorityB;
  });
}

// Helper function to get the highest priority module for a given category
function getHighestPriorityModule(category = null) {
  const sortedModules = getModulesByPriority(category);
  return sortedModules.length > 0 ? sortedModules[0] : null;
}

// Helper function to get modules by multiple categories
function getModulesByCategories(categories = []) {
  const moduleList = Object.values(modules);
  return moduleList.filter(mod => categories.includes(mod.category));
}

// Helper function to search modules by keyword
function searchModules(keyword) {
  const moduleList = Object.values(modules);
  const lowerKeyword = keyword.toLowerCase();
  
  return moduleList.filter(mod => 
    mod.signature.toLowerCase().includes(lowerKeyword) ||
    mod.description.toLowerCase().includes(lowerKeyword) ||
    mod.category.toLowerCase().includes(lowerKeyword)
  );
}

export { 
  modules, 
  formatModulesForPrompt, 
  getModulesByPriority, 
  getHighestPriorityModule,
  getModulesByCategories,
  searchModules
};
