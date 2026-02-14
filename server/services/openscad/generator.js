import { validateOpenSCADSyntax } from './validator.js';
import { filterModulesByRequirements } from './modules.js';
import { verifyTheMath } from './math.js';
import { formatModulesForPrompt } from '../../config/modules.js';

export async function generateOpenscad(message, code, specs_and_math, openai) {
    const { prompts } = await import('../../config/prompts.js');
    const { modules } = await import('../../config/modules.js');
    
    // First, filter modules based on requirements
    let filteredModulesContent = prompts.modules.content;
    let filteredModulesJson = null;
    let availableModuleNames = Object.keys(modules).join(', ');
    
    try {
        const filterResult = await filterModulesByRequirements(message, code, openai);
        if (filterResult.filtered_modules && Object.keys(filterResult.filtered_modules).length > 0) {
            // Format filtered modules for the prompt
            const moduleList = Object.values(filterResult.filtered_modules);
            filteredModulesContent = moduleList.map(mod => 
                `${mod.signature}\n   // ${mod.example}\n   // Priority: ${mod.priority} (Relevance: ${mod.relevance_score}%)`
            ).join('\n\n');
            filteredModulesJson = JSON.stringify(filterResult);
            availableModuleNames = Object.keys(filterResult.filtered_modules).join(', ');
            console.log(`✅ Using ${Object.keys(filterResult.filtered_modules).length} filtered modules`);
        }
    } catch (error) {
        console.warn('⚠️ Module filtering failed, using all modules:', error);
    }
    
    const systemRoleContent = prompts.generateOpenscad.systemRole
        .replace('{filtered_modules}', filteredModulesContent)
        .replace('{available_module_names}', availableModuleNames)
        .replace('{modules}', filteredModulesContent);
    const systemRole = {
        role: "system",
        content: systemRoleContent
    };
    if (!validateOpenSCADSyntax(code).valid) {
        code = "facets = 16; $fn = facets; cube_size = 20; cube(cube_size, center=true);"
    }
    const prompt = prompts.generateOpenscad.userTemplate
        .replace('{code}', code)
        .replace('{message}', message);
    
    // Log the full JSON payload before sending to LLM
    const requestPayload = {
        model: "deepseek-chat",
        messages: [
            {
                role: "assistant",
                content: `Reference these specs: ${specs_and_math}`
            },
            systemRole,
            {
                role: "user",
                content: prompt
            }
        ],
        temperature: 0.1,
        max_tokens: 1500
    };
    console.log('🔍 generateOpenscad - Sending to LLM:', JSON.stringify(requestPayload, null, 2));

    // Check if openai is available
    if (!openai || !openai.chat || !openai.chat.completions) {
        throw new Error('OpenAI client not available');
    }

    const completion = await openai.chat.completions.create(requestPayload);

    const generatedText = completion.choices[0].message.content;
    console.log(generatedText);

    // Strict extraction and sanitization
    let sanitizedText = generatedText;
    
    // Remove all markdown code blocks if present
    const codeMatch = sanitizedText.match(/```(?:openscad)?([\s\S]*?)```/i);
    if (codeMatch) {
        sanitizedText = codeMatch[1];
    }
    
    // Remove any non-code explanations and artifacts
    sanitizedText = sanitizedText
        .replace(/^[\s\S]*?include <module\.scad>/i, 'include <module.scad>') // Keep only first include
        .replace(/^scad\s*\n?/i, '') // Remove "scad" prefix
        .replace(/\n\/\/[^\n]*/g, '') // Remove all comments
        .replace(/^[\n\r]+|[\n\r]+$/g, '') // Trim whitespace
        .replace(/\n{2,}/g, '\n'); // Collapse multiple newlines

    // Validate we have actual OpenSCAD code
    if (!sanitizedText.match(/include|module|function|cube|cylinder|sphere|rotate|translate|scale|union|difference|intersection/i)) {
        throw new Error('No valid OpenSCAD code found in response');
    }

    return sanitizedText;
}