import { formatModulesForPrompt } from '../../config/modules.js';

export async function filterModulesByRequirements(userPrompt, existingCode, openai) {
    const { prompts } = await import('../../config/prompts.js');
    
    const systemPrompt = prompts.filterModules.system;
    const userPromptTemplate = prompts.filterModules.userTemplate
        .replace('{user_prompt}', userPrompt)
        .replace('{existing_code}', existingCode || '// No existing code');
    
    const requestPayload = {
        model: "deepseek-chat",
        messages: [
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "user",
                content: userPromptTemplate
            }
        ],
        temperature: 0.1,
        max_tokens: 1000
    };
    
    console.log('🔍 filterModulesByRequirements - Sending to LLM:', JSON.stringify(requestPayload, null, 2));

    // Check if openai is available
    if (!openai || !openai.chat || !openai.chat.completions) {
        console.warn('⚠️ OpenAI client not available for module filtering, using fallback');
        throw new Error('OpenAI client not available');
    }

    const completion = await openai.chat.completions.create(requestPayload);

    if (!completion.choices || !completion.choices[0] || !completion.choices[0].message || !completion.choices[0].message.content) {
        throw new Error('Invalid response format from OpenAI API');
    }

    const responseText = completion.choices[0].message.content;
    
    console.log('🔍 filterModulesByRequirements - Received response:', responseText);
    
    try {
        // Remove markdown code blocks if present
        let cleanResponse = responseText.trim();
        if (cleanResponse.startsWith('```json')) {
            cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanResponse.startsWith('```')) {
            cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        // Parse the JSON response
        const filteredResult = JSON.parse(cleanResponse);
        
        // Validate the structure
        if (!filteredResult.filtered_modules || !filteredResult.analysis) {
            throw new Error('Invalid response structure from module filtering');
        }
        
        return filteredResult;
    } catch (error) {
        console.error('❌ Module filtering failed:', error);
        // Fallback to empty modules if filtering fails
        return {
            filtered_modules: {},
            analysis: {
                keywords_found: ['error'],
                primary_category: 'unknown',
                confidence: 'Low'
            }
        };
    }
}