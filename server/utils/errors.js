/**
 * Centralized error handling utilities
 */

/**
 * Standardized error response for API endpoints
 */
export function sendError(res, statusCode, message, details = null) {
    const errorResponse = {
        success: false,
        error: message
    };
    
    if (details) {
        errorResponse.details = details;
    }
    
    return res.status(statusCode).json(errorResponse);
}

/**
 * Handle common async operation errors
 */
export function handleAsyncError(error, context) {
    console.error(`❌ ${context}:`, error);
    
    // Return standardized error message
    if (error.code === 'ENOENT') {
        return 'File not found';
    } else if (error.message) {
        return error.message;
    } else {
        return 'An unexpected error occurred';
    }
}

/**
 * Validate required environment variables
 */
export function validateEnvVars(requiredVars) {
    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}

/**
 * Check if ads should be disabled
 */
export function shouldDisableAds() {
    return true;
}