import { formatModulesForPrompt } from '../../config/modules.js';

export async function verifyTheMath(existing_code, changes, openai, filteredModules = null) {
    const { prompts } = await import('../../config/prompts.js');
    const { modules } = await import('../../config/modules.js');
    
    // Format modules for the prompt
    const modulesContent = filteredModules || formatModulesForPrompt('list');
    const availableModuleNames = filteredModules ? 
        Object.keys(JSON.parse(filteredModules).filtered_modules || {}).join(', ') : 
        Object.keys(modules).join(', ');
    
    const systemPrompt = prompts.verifyTheMath.system
        .replace('{filtered_modules}', modulesContent)
        .replace('{modules}', prompts.modules.content);
    const userPrompt = prompts.verifyTheMath.userTemplate
        .replace('{existing_code}', existing_code)
        .replace('{changes}', changes);
    
    // Log the full JSON payload before sending to LLM
    const requestPayload = {
        model: "deepseek-chat",
        messages: [
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "user",
                content: userPrompt
            }
        ],
        max_tokens: 800,
        temperature: 0.1
    };
    console.log('🔍 verifyTheMath - Sending to LLM:', JSON.stringify(requestPayload, null, 2));

    // Check if openai is available
    if (!openai || !openai.chat || !openai.chat.completions) {
        console.warn('⚠️ OpenAI client not available for math verification, returning empty specs');
        return '[Math verification skipped due to unavailable OpenAI client]';
    }

    const completion = await openai.chat.completions.create(requestPayload);

    const generatedText = completion.choices[0].message.content;
    console.log(generatedText);

    return generatedText;
}