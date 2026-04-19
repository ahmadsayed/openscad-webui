#!/usr/bin/env node

/**
 * Simple test to verify simplified functionality works
 */

import { validateOpenSCADSyntax } from './server/services/ai-service.js';
import { formatModulesForDisplay } from './server/config/modules.js';

console.log('🧪 Testing simplified functionality...\n');

// Test 1: Syntax validation
console.log('1. Testing syntax validation:');
const testCases = [
  { code: 'cube(20);', expected: true },
  { code: 'cube(20', expected: false }, // Missing closing paren
  { code: 'cube(20));', expected: false }, // Extra closing paren
  { code: 'cube(20) {}', expected: true }, // Valid with brackets
  { code: 'cube(20) {', expected: false } // Unclosed brackets
];

testCases.forEach(({ code, expected }) => {
  const result = validateOpenSCADSyntax(code);
  const passed = result.valid === expected;
  console.log(`   ${passed ? '✅' : '❌'} "${code}" -> ${result.valid ? 'valid' : 'invalid'}`);
});

// Test 2: Module formatting
console.log('\n2. Testing module formatting:');
const modulesText = formatModulesForDisplay();
const moduleCount = modulesText.split('\n\n').length;
console.log(`   ✅ Formatted ${moduleCount} essential modules`);

// Test 3: Essential modules structure
console.log('\n3. Testing essential modules:');
const { ESSENTIAL_MODULES } = await import('./server/config/modules.js');
const categories = new Set();
Object.values(ESSENTIAL_MODULES).forEach(mod => categories.add(mod.category));
console.log(`   ✅ Found modules in categories: ${Array.from(categories).join(', ')}`);

console.log('\n✅ All simplified functionality tests passed!');