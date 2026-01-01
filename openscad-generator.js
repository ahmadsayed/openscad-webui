#!/usr/bin/env node

import OpenAI from 'openai';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load modules list
async function loadModulesList() {
    const modulesData = await fs.readFile(path.join(__dirname, 'modules_list.json'), 'utf8');
    return JSON.parse(modulesData);
}

// Initialize DeepSeek client
function initializeDeepSeekClient(apiKey, baseURL = 'https://api.deepseek.com') {
    return new OpenAI({ 
        baseURL, 
        apiKey: apiKey || process.env.DEEPSEEK_API_KEY 
    });
}

// Step 1: Analyze prompt and select relevant modules
async function selectModules(client, userPrompt, modulesList) {
    const systemPrompt = `You are an OpenSCAD module selector. Analyze the user prompt and identify which modules from the available list would be most suitable.

Available modules categories:
${Object.entries(modulesList).map(([category, data]) => 
    `- ${category}: ${data.description}`
).join('\n')}

For each category, available modules:
${Object.entries(modulesList).map(([category, data]) => 
    Object.entries(data.modules || {}).map(([moduleName, moduleData]) => 
        `  - ${moduleName}: ${moduleData.description}`
    ).join('\n')
).filter(Boolean).join('\n')}

Rules:
1. Return ONLY the module names that are relevant to the user's prompt
2. If no modules match, explicitly return "NO_MODULE_MATCH"
3. Be conservative - only select modules that are clearly applicable
4. Return as comma-separated list or "NO_MODULE_MATCH"`;

    const completion = await client.chat.completions.create({
        model: "deepseek-chat",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ],
        max_tokens: 200,
        temperature: 0.1
    });

    const result = completion.choices[0].message.content.trim();
    console.log(`Module selection result: ${result}`);
    
    if (result === "NO_MODULE_MATCH") {
        return { matched: false, modules: [] };
    }
    
    const selectedModules = result.split(',').map(m => m.trim()).filter(m => m);
    return { matched: true, modules: selectedModules };
}

// Step 2: Compute required math for selected modules or existing code
async function computeMath(client, userPrompt, selectedModules, modulesList, existingCode = null) {
    const systemPrompt = `You are a mathematical computation engine for OpenSCAD. Given the user's prompt, selected modules, and optionally existing code, compute the required mathematical relationships and constraints.

Rules:
1. Analyze dimensional requirements from the prompt
2. Calculate mathematical relationships between parameters
3. Determine constraints and limits
4. Output ONLY mathematical equations and constraints
5. Do NOT generate OpenSCAD code
6. Focus on geometric relationships, scaling factors, and dimensional constraints
7. If existing code is provided, analyze it for current parameters and dimensions`;

    let contextInfo = '';
    
    if (existingCode) {
        contextInfo = `Existing OpenSCAD Code:
${existingCode}

Analysis Task: Analyze the existing code to understand current parameters, dimensions, and structure.`;
    }

    const moduleDetails = selectedModules.map(moduleName => {
        for (const [category, data] of Object.entries(modulesList)) {
            if (data.modules && data.modules[moduleName]) {
                return `${moduleName}: ${data.modules[moduleName].description}\nParameters: ${data.modules[moduleName].parameters.join(', ')}`;
            }
        }
        return `${moduleName}: Module details not found`;
    }).join('\n\n');

    const userContent = `User Prompt: ${userPrompt}

${contextInfo}

Selected Modules:
${moduleDetails}

Compute the mathematical relationships, dimensional constraints, and geometric requirements. Output only mathematical equations and constraints.`;

    const completion = await client.chat.completions.create({
        model: "deepseek-chat",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent }
        ],
        max_tokens: 800,
        temperature: 0.1
    });

    return completion.choices[0].message.content.trim();
}

// Step 3: Generate OpenSCAD code with parameterized values
async function generateOpenSCADCode(client, userPrompt, selectedModules, mathComputations, modulesList, existingCode = null) {
    const systemPrompt = `You are an OpenSCAD code generator. Create parameterized OpenSCAD code based on the user's prompt, selected modules, mathematical computations, and optionally existing code.

Rules:
1. Use facets=16 as default for rounded features (user can increase if needed)
2. Parameterize the most significant values with meaningful variable names
3. Include proper module includes when using modules
4. Ensure code is valid OpenSCAD syntax
5. Add comments explaining key parameters
6. Make dimensions easily adjustable through parameters
7. Center objects by default unless specified otherwise
8. If existing code is provided, decide whether to modify it or replace it entirely based on the user's prompt
9. Preserve useful existing parameters and structure when modifying
10. Clearly indicate what changes were made from the original code`;

    let moduleIncludes = '';
    let moduleUsage = '';
    let existingCodeContext = '';
    
    if (selectedModules.length > 0) {
        moduleIncludes = 'include <module.scad>;\n\n';
        
        // Add module usage examples
        moduleUsage = '\n// Selected modules available:\n';
        selectedModules.forEach(moduleName => {
            for (const [category, data] of Object.entries(modulesList)) {
                if (data.modules && data.modules[moduleName]) {
                    const module = data.modules[moduleName];
                    moduleUsage += `// ${moduleName}: ${module.description}\n`;
                    moduleUsage += `// Usage: ${module.usage}\n\n`;
                    break;
                }
            }
        });
    }

    if (existingCode) {
        existingCodeContext = `\nExisting OpenSCAD Code to Modify:
${existingCode}

Modification Strategy: Analyze the existing code and determine whether to:
1. Modify/update the existing code to meet new requirements
2. Replace the existing code entirely with new implementation
3. Preserve useful parts while adding new functionality

Decision: Based on the user's prompt, decide the best approach and implement accordingly.`;
    }

    const userContent = `User Prompt: ${userPrompt}

Mathematical Computations:
${mathComputations}

${moduleUsage}
${existingCodeContext}

Generate parameterized OpenSCAD code that fulfills the user's requirements. Use facets=16 as default and parameterize key dimensions.`;

    const completion = await client.chat.completions.create({
        model: "deepseek-chat",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent }
        ],
        max_tokens: 1500,
        temperature: 0.1
    });

    let generatedCode = completion.choices[0].message.content.trim();
    
    // Clean up the generated code
    const codeMatch = generatedCode.match(/```(?:openscad)?([\s\S]*?)```/i);
    if (codeMatch) {
        generatedCode = codeMatch[1];
    }
    
    // Ensure proper formatting
    generatedCode = generatedCode
        .replace(/^[\s\S]*?(include|module|function|cube|cylinder|sphere|rotate|translate|scale|union|difference|intersection)/i, '$1')
        .replace(/^scad\s*\n?/i, '')
        .replace(/^[\n\r]+|[\n\r]+$/g, '')
        .replace(/\n{2,}/g, '\n');

    return `${moduleIncludes}${generatedCode}`;
}

// Main execution function
async function generateOpenSCADFromPrompt(userPrompt, options = {}) {
    try {
        console.log(`🔄 Starting OpenSCAD generation for prompt: "${userPrompt}"`);
        
        // Initialize DeepSeek client
        const client = initializeDeepSeekClient(options.apiKey);
        
        // Load modules list
        const modulesList = await loadModulesList();
        
        console.log('📋 Step 1: Selecting relevant modules...');
        const moduleSelection = await selectModules(client, userPrompt, modulesList);
        
        let mathComputations = '';
        
        if (moduleSelection.matched) {
            console.log(`✅ Selected modules: ${moduleSelection.modules.join(', ')}`);
            console.log('🔢 Step 2: Computing mathematical relationships...');
            mathComputations = await computeMath(client, userPrompt, moduleSelection.modules, modulesList, options.existingCode);
            console.log('📐 Mathematical computations completed');
        } else {
            console.log('⚠️ No matching modules found - will generate from scratch');
            if (options.existingCode) {
                console.log('🔄 Analyzing existing code for modification...');
            }
        }
        
        console.log('💻 Step 3: Generating OpenSCAD code...');
        const openscadCode = await generateOpenSCADCode(
            client, 
            userPrompt, 
            moduleSelection.modules, 
            mathComputations, 
            modulesList,
            options.existingCode
        );
        
        console.log('✅ OpenSCAD generation completed successfully');
        
        return {
            success: true,
            modulesUsed: moduleSelection.modules,
            generatedCode: openscadCode,
            mathComputations: mathComputations,
            moduleMatch: moduleSelection.matched,
            modificationType: options.existingCode ? (moduleSelection.matched ? 'module_update' : 'code_modification') : 'new_generation'
        };
        
    } catch (error) {
        console.error('❌ OpenSCAD generation failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        console.log(`
OpenSCAD Generator - Static Execution Plan

Usage: node openscad-generator.js "<prompt>" [options]

Options:
  --api-key <key>     DeepSeek API key (or set DEEPSEEK_API_KEY environment variable)
  --output <file>     Output file path (default: stdout)
  --facets <number>   Override default facets value (default: 16)
  --existing-code <file>  Path to existing OpenSCAD code file to modify (optional)
  --stdin             Read existing code from stdin instead of file

Examples:
  node openscad-generator.js "create a rounded cube with 20mm sides"
  node openscad-generator.js "make a gear with 20 teeth" --output gear.scad
  node openscad-generator.js "add rounded edges to this cube" --existing-code current.scad
  echo "cube([10,10,10]);" | node openscad-generator.js "make it rounded" --stdin
  DEEPSEEK_API_KEY=your-key node openscad-generator.js "create a spring"
        `);
        process.exit(0);
    }
    
    const prompt = args[0];
    const options = {};
    
    // Parse command line options
    for (let i = 1; i < args.length; i++) {
        switch (args[i]) {
            case '--api-key':
                options.apiKey = args[++i];
                break;
            case '--output':
                options.outputFile = args[++i];
                break;
            case '--facets':
                options.facets = parseInt(args[++i]);
                break;
            case '--existing-code':
                options.existingCodeFile = args[++i];
                break;
            case '--stdin':
                options.useStdin = true;
                break;
        }
    }
    
    // Handle existing code input
    if (options.useStdin || options.existingCodeFile) {
        try {
            if (options.useStdin) {
                console.log('📖 Reading existing code from stdin...');
                options.existingCode = await readStdin();
            } else if (options.existingCodeFile) {
                console.log(`📖 Reading existing code from file: ${options.existingCodeFile}`);
                options.existingCode = await fs.readFile(options.existingCodeFile, 'utf8');
            }
            
            if (options.existingCode) {
                console.log(`✅ Loaded existing code (${options.existingCode.split('\n').length} lines)`);
            }
        } catch (error) {
            console.error(`❌ Error reading existing code: ${error.message}`);
            process.exit(1);
        }
    }
    
    console.log(`🎯 Processing prompt: "${prompt}"`);
    const result = await generateOpenSCADFromPrompt(prompt, options);
    
    if (result.success) {
        let output = '';
        
        // Add header information
        output += `// Generated by OpenSCAD Generator\n`;
        output += `// Prompt: ${prompt}\n`;
        output += `// Modules used: ${result.modulesUsed.length > 0 ? result.modulesUsed.join(', ') : 'None (generated from scratch)'}\n`;
        output += `// Default facets: ${options.facets || 16}\n\n`;
        
        // Add the generated code
        output += result.generatedCode;
        
        // Handle facets override if specified
        if (options.facets && options.facets !== 16) {
            output = output.replace(/facets\s*=\s*16/g, `facets = ${options.facets}`);
        }
        
        if (options.outputFile) {
            await fs.writeFile(options.outputFile, output);
            console.log(`💾 OpenSCAD code saved to: ${options.outputFile}`);
        } else {
            console.log('\n📝 Generated OpenSCAD code:');
            console.log('═'.repeat(50));
            console.log(output);
            console.log('═'.repeat(50));
        }
        
        if (!result.moduleMatch) {
            console.log('\n⚠️  Note: No matching modules found in the modules list.');
            console.log('   The code was generated from scratch using basic OpenSCAD primitives.');
        }
        
    } else {
        console.error('❌ Generation failed:', result.error);
        process.exit(1);
    }
}

// Helper function to read from stdin
async function readStdin() {
    return new Promise((resolve, reject) => {
        let data = '';
        
        process.stdin.setEncoding('utf8');
        
        process.stdin.on('readable', () => {
            let chunk;
            while (null !== (chunk = process.stdin.read())) {
                data += chunk;
            }
        });
        
        process.stdin.on('end', () => {
            resolve(data);
        });
        
        process.stdin.on('error', (error) => {
            reject(error);
        });
        
        // Set a timeout for stdin reading (10 seconds)
        setTimeout(() => {
            if (data.length === 0) {
                reject(new Error('No data received from stdin within timeout period'));
            } else {
                resolve(data);
            }
        }, 10000);
    });
}

// Export functions for use as module
export {
    generateOpenSCADFromPrompt,
    selectModules,
    computeMath,
    generateOpenSCADCode,
    initializeDeepSeekClient
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}
