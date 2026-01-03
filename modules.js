// Available OpenSCAD modules with usage examples in JSON format
const modules = {
  "rounded_cube": {
    "signature": "rounded_cube([width,depth,height], radius, facets)",
    "description": "Create a cube with rounded edges",
    "example": "facets=16; rounded_cube([8,8,8],1,facets);",
    "category": "basic"
  },
  "base_lid": {
    "signature": "base_lid(num_x, num_y)",
    "description": "Create lid for Gridfinity base with magnet pockets",
    "example": "base_lid(3, 3);",
    "category": "gridfinity"
  },
  "weighted_baseplate": {
    "signature": "weighted_baseplate(num_x, num_y)",
    "description": "Create weighted baseplate with magnet and screw holes",
    "example": "weighted_baseplate(4, 2);",
    "category": "gridfinity"
  },
  "frame_plain": {
    "signature": "frame_plain(num_x, num_y, extra_down=0, trim=0)",
    "description": "Create plain frame for Gridfinity system",
    "example": "frame_plain(3, 3);",
    "category": "gridfinity"
  }
};

// Helper function to format modules for different prompt contexts
function formatModulesForPrompt(context = 'default') {
  const moduleList = Object.values(modules);
  
  switch (context) {
    case 'detailed':
      // Full detailed format for main prompts
      return moduleList.map(mod => 
        `${mod.signature}\n   // ${mod.example}`
      ).join('\n\n');
      
    case 'gridfinity':
      // Gridfinity-specific modules only
      return moduleList
        .filter(mod => mod.category === 'gridfinity')
        .map(mod => `${mod.signature} - ${mod.description}`)
        .join('\n');
        
    case 'basic':
      // Basic modules only
      return moduleList
        .filter(mod => mod.category === 'basic')
        .map(mod => `${mod.signature}\n   // ${mod.example}`)
        .join('\n\n');
        
    case 'list':
      // Simple list format
      return moduleList.map(mod => mod.signature).join(', ');
      
    default:
      // Default format with categories
      let output = '';
      const categories = [...new Set(moduleList.map(mod => mod.category))];
      
      categories.forEach(category => {
        const categoryModules = moduleList.filter(mod => mod.category === category);
        if (categoryModules.length > 0) {
          output += `${category.charAt(0).toUpperCase() + category.slice(1)} Modules:\n`;
          categoryModules.forEach(mod => {
            output += `${mod.signature} - ${mod.description}\n   // ${mod.example}\n\n`;
          });
        }
      });
      
      return output.trim();
  }
}

export { modules, formatModulesForPrompt };
