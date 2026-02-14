export function validateOpenSCADSyntax(code) {
    const errors = [];
    
    // Basic validation checks
    if (code.length < 5) {
        errors.push("Code too short");
        return { valid: false, errors: errors.join(", ") };
    }
    
    // Check for balanced brackets and parentheses
    const bracketStack = [];
    const parenStack = [];
    
    for (let i = 0; i < code.length; i++) {
        const char = code[i];
        if (char === '{') bracketStack.push('{');
        if (char === '}') {
            if (bracketStack.length === 0) errors.push("Unmatched closing brace");
            else bracketStack.pop();
        }
        if (char === '(') parenStack.push('(');
        if (char === ')') {
            if (parenStack.length === 0) errors.push("Unmatched closing parenthesis");
            else parenStack.pop();
        }
    }
    
    if (bracketStack.length > 0) errors.push("Unmatched opening brace");
    if (parenStack.length > 0) errors.push("Unmatched opening parenthesis");
    
    // Check for common OpenSCAD syntax patterns
    const validPatterns = [
        /include|module|function|cube|cylinder|sphere|rotate|translate|scale|union|difference|intersection/i,
        /;[\s]*$/m, // Ends with semicolon
        /^[\s]*[a-zA-Z_]/m // Starts with valid identifier
    ];
    
    validPatterns.forEach(pattern => {
        if (!pattern.test(code)) {
            errors.push("Invalid OpenSCAD syntax pattern");
        }
    });
    
    return {
        valid: errors.length === 0,
        errors: errors.join(", ")
    };
}