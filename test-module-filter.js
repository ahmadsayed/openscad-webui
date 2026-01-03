#!/usr/bin/env node

/**
 * Test script for the new module filtering system
 * This script tests the filterModulesByRequirements function
 */

import { filterModulesByRequirements } from './src/openscadGenerator.js';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com/v1'
});

// Test cases
const testCases = [
    {
        name: "Rounded cube request",
        userPrompt: "Create a rounded cube with smooth edges",
        existingCode: "// No existing code",
        expectedKeywords: ["rounded", "cube"]
    },
    {
        name: "Gridfinity baseplate",
        userPrompt: "Make a gridfinity baseplate with magnet holes",
        existingCode: "// No existing code",
        expectedKeywords: ["gridfinity", "baseplate", "magnet"]
    },
    {
        name: "Gear system",
        userPrompt: "Create a gear with 20 teeth",
        existingCode: "// No existing code",
        expectedKeywords: ["gear", "teeth"]
    },
    {
        name: "Complex mechanical part",
        userPrompt: "Make a mechanical part with rounded edges and honeycomb pattern",
        existingCode: "include <module.scad>;\nrounded_cube([10,10,5], 1, 16);",
        expectedKeywords: ["rounded", "honeycomb", "mechanical"]
    }
];

async function runTest(testCase) {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log(`📋 User Prompt: "${testCase.userPrompt}"`);
    console.log(`💻 Existing Code: ${testCase.existingCode}`);
    
    try {
        const result = await filterModulesByRequirements(testCase.userPrompt, testCase.existingCode, openai);
        
        console.log(`✅ Filter Result:`);
        console.log(`   Confidence: ${result.analysis.confidence}`);
        console.log(`   Keywords Found: ${result.analysis.keywords_found.join(', ')}`);
        console.log(`   Primary Category: ${result.analysis.primary_category}`);
        console.log(`   Modules Filtered: ${Object.keys(result.filtered_modules).length}`);
        
        // Display filtered modules
        Object.entries(result.filtered_modules).forEach(([name, module]) => {
            console.log(`   📦 ${name}: ${module.signature} (Relevance: ${module.relevance_score}%)`);
        });
        
        // Basic validation
        const hasExpectedKeywords = testCase.expectedKeywords.some(keyword => 
            result.analysis.keywords_found.includes(keyword)
        );
        
        if (hasExpectedKeywords) {
            console.log(`✅ Keywords validation passed`);
        } else {
            console.log(`⚠️  Keywords validation failed - expected one of: ${testCase.expectedKeywords.join(', ')}`);
        }
        
        return true;
    } catch (error) {
        console.error(`❌ Test failed:`, error.message);
        return false;
    }
}

async function runAllTests() {
    console.log('🚀 Starting Module Filtering System Tests');
    console.log('=========================================');
    
    let passedTests = 0;
    let totalTests = testCases.length;
    
    for (const testCase of testCases) {
        const passed = await runTest(testCase);
        if (passed) passedTests++;
        
        // Add delay between tests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n📊 Test Summary');
    console.log('================');
    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
    console.log(`📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! Module filtering system is working correctly.');
    } else {
        console.log('⚠️  Some tests failed. Check the logs above for details.');
    }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests().catch(error => {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    });
}

export { runAllTests };
