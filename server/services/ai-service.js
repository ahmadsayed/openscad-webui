/**
 * Unified AI Service for OpenSCAD Code Generation
 * Consolidates all AI operations into a single service with sophisticated prompts
 */

import { formatModulesForDisplay } from '../config/modules.js';
import { prompts } from '../config/prompts.js';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Main AI processing function - uses sophisticated prompts for better quality
 * OPTIMIZED: Advanced parallel processing for maximum performance
 */
export async function processAIRequest(userPrompt, existingCode, openai, requestId) {
  try {
    console.log(`🔄 Processing AI request: ${requestId} (PARALLEL MODE)`);
    const startTime = Date.now();
    
    // Phase 1: Module filtering (independent operation)
    const relevantModules = await filterModulesIntelligently(userPrompt, existingCode, openai);
    const modulesTime = Date.now() - startTime;
    console.log(`✅ Module filtering completed in ${modulesTime}ms`);
    
    // Phase 2: Parallel execution of math specs and early code generation prep
    const phase2Start = Date.now();
    
    // Math specs generation (can run in parallel with module post-processing)
    const mathSpecsPromise = generateMathSpecs(existingCode, userPrompt, relevantModules, openai);
    
    // Prepare code generation inputs while math specs are running
    const modulesText = Object.entries(relevantModules)
      .map(([name, mod]) => `${mod.signature}\n  // ${mod.description}\n  // Example: ${mod.example}`)
      .join('\n\n');
    
    // Wait for math specs to complete
    const mathSpecs = await mathSpecsPromise;
    const mathTime = Date.now() - phase2Start;
    console.log(`✅ Math specs completed in ${mathTime}ms`);
    
    // Phase 3: Final code generation
    const codeStart = Date.now();
    const openscadCode = await generateOpenscadCodeOptimized(
      userPrompt, 
      existingCode, 
      mathSpecs, 
      relevantModules, 
      modulesText,
      openai
    );
    const codeTime = Date.now() - codeStart;
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ Code generation completed in ${codeTime}ms`);
    console.log(`🚀 Total request time: ${totalTime}ms (${((totalTime)/1000).toFixed(1)}s)`);
    
    return {
      success: true,
      code: openscadCode,
      modulesUsed: Object.keys(relevantModules),
      performance: {
        moduleFiltering: modulesTime,
        mathSpecs: mathTime,
        codeGeneration: codeTime,
        total: totalTime
      }
    };
    
  } catch (error) {
    console.error(`❌ AI request failed: ${requestId}`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Intelligent module filtering with relevance scoring (restored from original)
 * OPTIMIZED: Fast-path for simple requests
 */
async function filterModulesIntelligently(userPrompt, existingCode, openai) {
  // Fast-path: Use keyword matching for simple, common requests
  const fastPathResult = filterModulesByKeywords(userPrompt);
  const hasMeaningfulModules = Object.keys(fastPathResult).length > 0;
  
  // If we have good keyword matches and it's a simple request, use fast path
  const isSimpleRequest = userPrompt.split(/\s+/).length < 15 && hasMeaningfulModules;
  
  if (isSimpleRequest && !existingCode) {
    console.log('🚀 Using fast-path module filtering for simple request');
    return fastPathResult;
  }
  
  if (!openai?.chat?.completions) {
    // Fallback to simple keyword matching if OpenAI not available
    return fastPathResult;
  }
  
  try {
    const systemPrompt = prompts.filterModules.system;
    const userContent = prompts.filterModules.userTemplate
      .replace('{user_prompt}', userPrompt)
      .replace('{existing_code}', existingCode);
    
    const response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ],
      max_tokens: 500, // Reduced from 1000 for faster response
      temperature: 0.1
    });
    
    const result = response.choices[0].message.content;
    
    // Debug: Log the actual response for troubleshooting
    console.log('🐛 Module filtering AI response:', JSON.stringify(result));
    
    // Parse the JSON response with enhanced robustness
    try {
      const parsed = extractJSONFromText(result);
      return parsed.filtered_modules || fastPathResult;
    } catch (parseError) {
      console.warn('❌ Failed to parse module filtering response:', parseError.message);
      console.warn('📄 Raw response content:', result);
      return fastPathResult;
    }
    
  } catch (error) {
    console.warn('Module filtering failed:', error.message);
    return fastPathResult;
  }
}

/**
 * Generate mathematical specifications with sophisticated analysis
 * OPTIMIZED: Skip for simple cases to reduce API calls
 */
async function generateMathSpecs(existingCode, changes, relevantModules, openai) {
  if (!openai?.chat?.completions) {
    return '[Math analysis skipped - OpenAI not available]';
  }
  
  // Quick heuristic: Skip math analysis for simple geometric requests
  const simplePatterns = [
    /\b(cube|sphere|cylinder)\s*\(/,
    /\b(size|radius|height|width|length)\s*\d+/,
    /^\s*(create|make|build)\s+(a|an)?\s*(simple|basic)?\s*(cube|sphere|cylinder|box|ball)/i
  ];
  
  const isSimpleRequest = simplePatterns.some(pattern => pattern.test(changes)) && 
                         changes.split(/\s+/).length < 20;
  
  if (isSimpleRequest && !existingCode) {
    console.log('🚀 Skipping math analysis for simple request');
    return '[Basic geometric shapes - math analysis skipped for performance]';  }
  
  try {
    const systemPrompt = prompts.verifyTheMath.system.replace('{filtered_modules}', JSON.stringify(relevantModules));
    const userContent = prompts.verifyTheMath.userTemplate
      .replace('{existing_code}', existingCode)
      .replace('{changes}', changes);
    
    const response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ],
      max_tokens: 400, // Reduced from 600 for faster response
      temperature: 0.1
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.warn('Math analysis failed:', error.message);
    return '[Math analysis failed]';
  }
}

/**
 * Optimized OpenSCAD code generation with pre-computed inputs
 * Reduces redundant processing by using pre-formatted module text
 */
async function generateOpenscadCodeOptimized(userPrompt, existingCode, mathSpecs, relevantModules, modulesText, openai) {
  if (!openai?.chat?.completions) {
    throw new Error('OpenAI service not available for code generation');
  }
  
  const systemPrompt = prompts.generateOpenscad.systemRole
    .replace('{filtered_modules}', modulesText)
    .replace('{available_module_names}', Object.keys(relevantModules).join(', '));
  
  const userContent = prompts.generateOpenscad.userTemplate
    .replace('{code}', existingCode)
    .replace('{message}', userPrompt);
  
  const response = await openai.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Math specifications: ${mathSpecs}\n\n${userContent}` }
    ],
    max_tokens: 1500,
    temperature: 0.1
  });
  
  let code = response.choices[0].message.content;
  
  // Extract code from markdown if present
  const codeMatch = code.match(/```(?:openscad)?([\s\S]*?)```/i);
  if (codeMatch) {
    code = codeMatch[1].trim();
  }
  
  // Enhanced validation
  const validation = validateOpenSCADSyntax(code);
  if (!validation.valid) {
    throw new Error(`Generated code failed validation: ${validation.error}`);
  }
  
  // Check for basic OpenSCAD constructs
  if (!code.includes('cube') && !code.includes('cylinder') && !code.includes('sphere') && !code.includes('module')) {
    throw new Error('Generated code does not contain valid OpenSCAD constructs');
  }
  
  return code;
}

/**
 * Generate OpenSCAD code with sophisticated prompts and validation
 */
async function generateOpenscadCode(userPrompt, existingCode, mathSpecs, relevantModules, openai) {
  if (!openai?.chat?.completions) {
    throw new Error('OpenAI service not available for code generation');
  }
  
  // Format modules for prompt
  const modulesText = Object.entries(relevantModules)
    .map(([name, mod]) => `${mod.signature}\n  // ${mod.description}\n  // Example: ${mod.example}`)
    .join('\n\n');
  
  const systemPrompt = prompts.generateOpenscad.systemRole
    .replace('{filtered_modules}', modulesText)
    .replace('{available_module_names}', Object.keys(relevantModules).join(', '));
  
  const userContent = prompts.generateOpenscad.userTemplate
    .replace('{code}', existingCode)
    .replace('{message}', userPrompt);
  
  const response = await openai.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Math specifications: ${mathSpecs}\n\n${userContent}` }
    ],
    max_tokens: 1500,
    temperature: 0.1
  });
  
  let code = response.choices[0].message.content;
  
  // Extract code from markdown if present
  const codeMatch = code.match(/```(?:openscad)?([\s\S]*?)```/i);
  if (codeMatch) {
    code = codeMatch[1].trim();
  }
  
  // Enhanced validation
  const validation = validateOpenSCADSyntax(code);
  if (!validation.valid) {
    throw new Error(`Generated code failed validation: ${validation.error}`);
  }
  
  // Check for basic OpenSCAD constructs
  if (!code.includes('cube') && !code.includes('cylinder') && !code.includes('sphere') && !code.includes('module')) {
    throw new Error('Generated code does not contain valid OpenSCAD constructs');
  }
  
  return code;
}

/**
 * Simple keyword-based module filtering (fallback)
 */
function filterModulesByKeywords(userPrompt) {
  const keywords = userPrompt.toLowerCase();
  const relevant = {};
  
  // Simple keyword matching
  if (keywords.includes('rounded') || keywords.includes('round')) {
    Object.assign(relevant, { rounded_cube: ESSENTIAL_MODULES.rounded_cube });
  }
  if (keywords.includes('cylinder') || keywords.includes('tube') || keywords.includes('hole')) {
    Object.assign(relevant, { rounded_cylinder: ESSENTIAL_MODULES.rounded_cylinder });
    Object.assign(relevant, { tube: ESSENTIAL_MODULES.tube });
  }
  if (keywords.includes('gear') || keywords.includes('teeth')) {
    Object.assign(relevant, { gear: ESSENTIAL_MODULES.gear });
  }
  if (keywords.includes('thread') || keywords.includes('screw')) {
    Object.assign(relevant, { threaded_rod: ESSENTIAL_MODULES.threaded_rod });
  }
  if (keywords.includes('bracket') || keywords.includes('support')) {
    Object.assign(relevant, { bracket: ESSENTIAL_MODULES.bracket });
  }
  if (keywords.includes('hinge') || keywords.includes('pivot')) {
    Object.assign(relevant, { hinge: ESSENTIAL_MODULES.hinge });
  }
  
  // Default to basic modules if none matched
  return Object.keys(relevant).length > 0 ? relevant : {
    rounded_cube: ESSENTIAL_MODULES.rounded_cube,
    rounded_cylinder: ESSENTIAL_MODULES.rounded_cylinder
  };
}

/**
 * Essential modules for fallback
 */
const ESSENTIAL_MODULES = {
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
  bracket: {
    signature: "bracket(width, height, thickness, hole_diameter)",
    description: "Create L-bracket with holes",
    example: "bracket(40, 30, 3, 5);",
    category: "structural",
    priority: "High"
  },
  hinge: {
    signature: "hinge(length, width, pin_diameter)",
    description: "Create a simple hinge",
    example: "hinge(30, 15, 3);",
    category: "structural",
    priority: "Medium"
  }
};

/**
 * Enhanced OpenSCAD syntax validation with signature checking
 */
export function validateOpenSCADSyntax(code) {
  if (!code || code.length < 5) {
    return { valid: false, error: "Code too short" };
  }
  
  // Check for balanced brackets (simple check)
  const openBrackets = (code.match(/\{/g) || []).length;
  const closeBrackets = (code.match(/\}/g) || []).length;
  const openParens = (code.match(/\(/g) || []).length;
  const closeParens = (code.match(/\)/g) || []).length;
  
  if (openBrackets !== closeBrackets) {
    return { valid: false, error: "Unmatched brackets" };
  }
  if (openParens !== closeParens) {
    return { valid: false, error: "Unmatched parentheses" };
  }
  
  // Check for common signature errors
  const signatureErrors = checkModuleSignatures(code);
  if (signatureErrors.length > 0) {
    return { valid: false, error: `Signature errors: ${signatureErrors.join(', ')}` };
  }
  
  return { valid: true };
}

/**
 * Check for common module signature errors
 */
function checkModuleSignatures(code) {
  const errors = [];
  
  // Check for rounded_cube with scalar size parameter (should be vector)
  // More specific regex to catch rounded_cube calls
  const roundedCubeRegex = /rounded_cube\s*\(\s*([^,\[\]]+)\s*,\s*([^,)]+)/g;
  let match;
  while ((match = roundedCubeRegex.exec(code)) !== null) {
    const firstParam = match[1].trim();
    // If first parameter is a number or variable (not a vector), it's likely wrong
    if (!firstParam.includes('[') && !firstParam.includes(']') && /^\d+(\.\d+)?$/.test(firstParam)) {
      errors.push("rounded_cube first parameter (size) should be vector [x,y,z], not scalar");
    }
  }
  
  // Check for basic parameter count mismatches in common modules
  const modulePatterns = [
    { name: 'rounded_cube', expectedParams: 3, minParams: 2 },
    { name: 'rounded_cylinder', expectedParams: 4, minParams: 3 },
    { name: 'tube', expectedParams: 4, minParams: 3 }
  ];
  
  modulePatterns.forEach(pattern => {
    const regex = new RegExp(`${pattern.name}\\s*\\([^)]*\\)`, 'g');
    const matches = code.match(regex);
    if (matches) {
      matches.forEach(match => {
        // Extract just the parameters part
        const paramsPart = match.replace(`${pattern.name}(`, '').replace(')', '');
        const paramCount = paramsPart ? (paramsPart.match(/,/g) || []).length + 1 : 0;
        if (paramCount < pattern.minParams) {
          errors.push(`${pattern.name} has insufficient parameters (found ${paramCount}, expected ≥${pattern.minParams})`);
        }
      });
    }
  });
  
  return errors;
}

/**
 * Enhanced JSON extraction from text with multiple fallback strategies
 * Handles various formats: markdown, mixed content, nested JSON, etc.
 */
function extractJSONFromText(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid input: expected string');
  }

  // Strategy 1: Direct JSON parsing (fastest path)
  try {
    return JSON.parse(text.trim());
  } catch (e) {
    // Continue to next strategies
  }

  // Strategy 2: Remove markdown code blocks and parse
  const cleanedText = cleanMarkdownCodeBlocks(text);
  try {
    return JSON.parse(cleanedText);
  } catch (e) {
    // Continue to next strategies
  }

  // Strategy 3: Extract JSON object/array from mixed content
  const extractedJSON = extractJSONObjectsFromText(text);
  if (extractedJSON.length > 0) {
    // Return the first valid JSON object that contains filtered_modules
    for (const jsonObj of extractedJSON) {
      if (jsonObj && typeof jsonObj === 'object' && jsonObj.filtered_modules) {
        return jsonObj;
      }
    }
    // If no filtered_modules found, return the first valid JSON
    return extractedJSON[0];
  }

  // Strategy 4: Try to fix common JSON syntax errors
  const fixedJSON = attemptJSONRepair(text);
  if (fixedJSON) {
    return fixedJSON;
  }

  throw new Error('No valid JSON found in text after all extraction strategies');
}

/**
 * Clean markdown code blocks from text
 */
function cleanMarkdownCodeBlocks(text) {
  let cleaned = text.trim();
  
  // Remove ```json blocks
  cleaned = cleaned.replace(/```json\s*/g, '');
  // Remove ``` blocks (any language)
  cleaned = cleaned.replace(/```[\w]*\s*/g, '');
  // Remove closing ```
  cleaned = cleaned.replace(/\s*```/g, '');
  
  return cleaned.trim();
}

/**
 * Extract JSON objects/arrays from mixed text content
 * Handles nested JSON and multiple JSON blocks
 */
function extractJSONObjectsFromText(text) {
  const jsonObjects = [];
  
  // Pattern to match JSON objects and arrays
  const jsonPatterns = [
    /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g,  // Nested objects
    /\[[^\[\]]*(?:\[[^\[\]]*\][^\[\]]*)*\]/g,  // Nested arrays
    /\{.*\}/s,  // Object with any content (dotall mode)
    /\[.*\]/s   // Array with any content (dotall mode)
  ];

  for (const pattern of jsonPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        try {
          const parsed = JSON.parse(match);
          jsonObjects.push(parsed);
        } catch (e) {
          // Try with markdown cleaning
          try {
            const cleaned = cleanMarkdownCodeBlocks(match);
            const parsed = JSON.parse(cleaned);
            jsonObjects.push(parsed);
          } catch (e2) {
            // Continue to next match
          }
        }
      }
    }
  }

  return jsonObjects;
}

/**
 * Attempt to repair common JSON syntax errors
 */
function attemptJSONRepair(text) {
  const repairs = [
    // Remove trailing commas
    (str) => str.replace(/,(\s*[}\]])/g, '$1'),
    // Fix single quotes to double quotes (simpler approach)
    (str) => str.replace(/'/g, '"'),
    // Fix unquoted keys
    (str) => str.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":'),
    // Remove comments
    (str) => str.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''),
    // Fix common escape issues
    (str) => str.replace(/\\(?!['"\\\/bfnrtu])/g, '\\\\'),
    // Fix missing closing braces/brackets
    (str) => {
      let fixed = str;
      const openBraces = (fixed.match(/\{/g) || []).length;
      const closeBraces = (fixed.match(/\}/g) || []).length;
      const openBrackets = (fixed.match(/\[/g) || []).length;
      const closeBrackets = (fixed.match(/\]/g) || []).length;
      
      // Add missing closing braces
      for (let i = 0; i < openBraces - closeBraces; i++) {
        fixed += '}';
      }
      // Add missing closing brackets
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        fixed += ']';
      }
      return fixed;
    }
  ];

  let currentText = text;
  
  for (const repair of repairs) {
    try {
      currentText = repair(currentText);
      const parsed = JSON.parse(currentText);
      return parsed;
    } catch (e) {
      // Continue to next repair
    }
  }

  return null;
}