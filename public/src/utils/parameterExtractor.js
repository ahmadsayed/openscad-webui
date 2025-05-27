/**
 * Parameter extraction utility for OpenSCAD code
 * Extracts parameters defined as variables at the top of the file
 */

/**
 * Extract parameters from OpenSCAD variable definitions at the top of the file
 * @param {string} code - The OpenSCAD code to analyze
 * @returns {Array} Array of parameter objects
 */
export function extractParameters(code) {
    const parameters = [];
    const lines = code.split('\n');
    
    // Look for variable definitions at the top of the file
    // Stop when we encounter non-variable, non-comment, non-empty lines
    let paramIndex = 0;
    let inParameterSection = true;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines and comments
        if (line === '' || line.startsWith('//') || line.startsWith('/*')) {
            continue;
        }
        
        // Skip include and use statements - these are allowed at the top
        if (line.startsWith('include') || line.startsWith('use')) {
            continue;
        }
        
        // Check if this line is a variable definition
        const variableMatch = line.match(/^(\w+)\s*=\s*([^;]+);?\s*(?:\/\/.*)?$/);
        
        if (variableMatch && inParameterSection) {
            const [, varName, varValue] = variableMatch;
            const cleanValue = varValue.trim().replace(/;$/, '');
            
            // Try to parse the value as a number
            const numericValue = parseFloat(cleanValue);
            
            if (!isNaN(numericValue)) {
                // Determine parameter constraints based on variable name
                const paramConfig = getParameterConfig(varName, numericValue);
                
                parameters.push({
                    id: `param_${paramIndex++}`,
                    name: varName,
                    displayName: formatDisplayName(varName),
                    value: numericValue,
                    min: paramConfig.min,
                    max: paramConfig.max,
                    step: paramConfig.step,
                    lineIndex: i,
                    originalLine: lines[i],
                    variableName: varName
                });
            }
        } else if (line !== '' && !line.startsWith('//') && !line.startsWith('/*') && 
                   !line.startsWith('include') && !line.startsWith('use')) {
            // We've reached the actual OpenSCAD code, stop looking for parameters
            inParameterSection = false;
            break;
        }
    }
    
    return parameters;
}

/**
 * Get parameter configuration based on variable name and value
 * @param {string} varName - Variable name
 * @param {number} value - Current value
 * @returns {Object} Configuration with min, max, step
 */
function getParameterConfig(varName, value) {
    const lowerName = varName.toLowerCase();
    
    // Size-related parameters
    if (lowerName.includes('width') || lowerName.includes('height') || 
        lowerName.includes('depth') || lowerName.includes('length') || 
        lowerName.includes('size') || lowerName.includes('diameter')) {
        return { min: 0.1, max: 500, step: 0.1 };
    }
    
    // Radius parameters
    if (lowerName.includes('radius') || lowerName.includes('rad')) {
        return { min: 0.1, max: 250, step: 0.1 };
    }
    
    // Thickness parameters
    if (lowerName.includes('thick') || lowerName.includes('wall')) {
        return { min: 0.1, max: 50, step: 0.1 };
    }
    
    // Angle/rotation parameters
    if (lowerName.includes('angle') || lowerName.includes('rotation') || 
        lowerName.includes('rotate') || lowerName.includes('deg')) {
        return { min: -360, max: 360, step: 1 };
    }
    
    // Position/offset parameters
    if (lowerName.includes('offset') || lowerName.includes('pos') || 
        lowerName.includes('translate') || lowerName.includes('move')) {
        return { min: -200, max: 200, step: 0.1 };
    }
    
    // Scale parameters
    if (lowerName.includes('scale') || lowerName.includes('factor')) {
        return { min: 0.1, max: 10, step: 0.1 };
    }
    
    // Count/number parameters
    if (lowerName.includes('count') || lowerName.includes('num') || 
        lowerName.includes('steps') || lowerName.includes('segments')) {
        return { min: 1, max: 100, step: 1 };
    }
    
    // Default configuration based on current value
    if (value < 1) {
        return { min: 0.01, max: 10, step: 0.01 };
    } else if (value < 10) {
        return { min: 0.1, max: 100, step: 0.1 };
    } else if (value < 100) {
        return { min: 0.1, max: 500, step: 0.1 };
    } else {
        return { min: 1, max: 1000, step: 1 };
    }
}

/**
 * Format variable name for display
 * @param {string} varName - Variable name
 * @returns {string} Formatted display name
 */
function formatDisplayName(varName) {
    return varName
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .replace(/_/g, ' ') // Replace underscores with spaces
        .replace(/\b\w/g, l => l.toUpperCase()) // Capitalize first letter of each word
        .trim();
}

/**
 * Update OpenSCAD code with new parameter values
 * @param {string} code - Original OpenSCAD code
 * @param {Array} parameters - Array of parameter objects with updated values
 * @returns {string} Updated OpenSCAD code
 */
export function updateCodeWithParameters(code, parameters) {
    const lines = code.split('\n');
    
    // Update each parameter line
    parameters.forEach(param => {
        if (param.lineIndex < lines.length) {
            // Replace the variable assignment with the new value
            const originalLine = lines[param.lineIndex];
            const commentMatch = originalLine.match(/(\/\/.*)?$/);
            const comment = commentMatch ? commentMatch[1] || '' : '';
            
            // Create new line with updated value
            lines[param.lineIndex] = `${param.variableName} = ${param.value};${comment ? ' ' + comment : ''}`;
        }
    });
    
    return lines.join('\n');
}

/**
 * Create HTML form elements for parameters
 * @param {Array} parameters - Array of parameter objects
 * @param {Function} onParameterChange - Callback when parameter changes
 * @returns {HTMLElement} Form container element
 */
export function createParameterForm(parameters, onParameterChange) {
    const container = document.createElement('div');
    container.className = 'parameter-form';
    
    if (parameters.length === 0) {
        container.innerHTML = '<p class="no-parameters">No editable parameters found in the generated code.</p>';
        return container;
    }

    const title = document.createElement('h3');
    title.textContent = 'Edit Parameters';
    title.className = 'parameter-form-title';
    container.appendChild(title);

    // Create form fields for each parameter
    parameters.forEach(param => {
        const field = document.createElement('div');
        field.className = 'parameter-field';

        const label = document.createElement('label');
        label.textContent = param.displayName;
        label.className = 'parameter-label';
        label.setAttribute('for', param.id);
        field.appendChild(label);

        const input = document.createElement('input');
        input.type = 'number';
        input.value = param.value;
        input.min = param.min;
        input.max = param.max;
        input.step = param.step;
        input.className = 'parameter-input';
        input.id = param.id;

        // Handle parameter change on blur (when user leaves the field)
        input.addEventListener('blur', () => {
            const newValue = parseFloat(input.value);
            if (!isNaN(newValue) && newValue >= param.min && newValue <= param.max) {
                param.value = newValue;
                onParameterChange(parameters);
            } else {
                // Reset to previous valid value if invalid
                input.value = param.value;
            }
        });

        // Also handle Enter key
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                input.blur();
            }
        });

        field.appendChild(input);
        container.appendChild(field);
    });

    return container;
}
