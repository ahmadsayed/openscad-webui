#!/bin/bash

# OpenSCAD Syntax Validation Script
# This script validates the syntax of generated OpenSCAD files

echo "🔍 OpenSCAD Syntax Validation"
echo "=============================="

# Copy the module file to current directory for validation
cp public/src/modules/module.scad . 2>/dev/null || echo "⚠️  module.scad not found in expected location"

# Files to test
TEST_FILES=(
    "sample-rounded-cube-fixed.scad:Fixed rounded cube"
    "sample-gear-fixed.scad:Fixed gear"
    "sample-torus.scad:Original torus (likely has syntax errors)"
    "sample-modified-cube.scad:Modified cube (likely has syntax errors)"
)

# Validation results
PASSED=0
FAILED=0

echo ""
echo "Testing generated OpenSCAD files for syntax validity:"
echo ""

for test_file in "${TEST_FILES[@]}"; do
    IFS=':' read -r filename description <<< "$test_file"
    
    echo "Testing: $description ($filename)"
    
    if [ -f "$filename" ]; then
        # Test with OpenSCAD (suppress output, just check exit code)
        if openscad -o /tmp/validation.png --imgsize=100,100 "$filename" >/dev/null 2>&1; then
            echo "✅ PASSED - Valid OpenSCAD syntax"
            ((PASSED++))
        else
            echo "❌ FAILED - Syntax error detected"
            # Show the first few lines to help identify the issue
            echo "   First 10 lines:"
            head -10 "$filename" | sed 's/^/   /'
            ((FAILED++))
        fi
    else
        echo "⚠️  FILE NOT FOUND - $filename"
        ((FAILED++))
    fi
    echo ""
done

echo "==================================="
echo "Validation Summary:"
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
echo "==================================="

if [ $FAILED -gt 0 ]; then
    echo ""
    echo "🔧 Common issues found in generated files:"
    echo "1. Missing comment syntax (//) for descriptive text"
    echo "2. Duplicate module declarations"
    echo "3. Missing parameter definitions"
    echo "4. Improper module structure"
    echo ""
    echo "💡 Recommendations:"
    echo "- The AI generator needs better syntax validation"
    echo "- Generated code should be tested before saving"
    echo "- Module definitions should follow OpenSCAD standards"
fi

# Clean up
rm -f /tmp/validation.png module.scad 2>/dev/null

echo ""
echo "🔍 Validation complete!"
