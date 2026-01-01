#!/bin/bash

# OpenSCAD Generator Test Script
# This script runs sample prompts through the generator and creates detailed logs

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="${SCRIPT_DIR}/test_output"
LOGS_DIR="${OUTPUT_DIR}/logs"
AI_INTERACTIONS_LOG="${LOGS_DIR}/ai_interactions.log"
SUMMARY_LOG="${LOGS_DIR}/summary.log"
MODULES_LOG="${LOGS_DIR}/modules_selection.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if DeepSeek API key is set
if [ -z "$DEEPSEEK_API_KEY" ]; then
    echo -e "${RED}Error: DEEPSEEK_API_KEY environment variable is not set${NC}"
    echo -e "${YELLOW}Please set it with: export DEEPSEEK_API_KEY=your-api-key${NC}"
    exit 1
fi

# Check if openscad-generator.js exists
if [ ! -f "${SCRIPT_DIR}/openscad-generator.js" ]; then
    echo -e "${RED}Error: openscad-generator.js not found in ${SCRIPT_DIR}${NC}"
    exit 1
fi

# Create output directories
echo -e "${BLUE}Creating output directories...${NC}"
mkdir -p "${OUTPUT_DIR}"
mkdir -p "${LOGS_DIR}"

# Initialize log files
echo "OpenSCAD Generator Test Run - $(date)" > "${AI_INTERACTIONS_LOG}"
echo "Test Summary - $(date)" > "${SUMMARY_LOG}"
echo "Module Selection Analysis - $(date)" > "${MODULES_LOG}"

# Test cases array
declare -a TEST_CASES=(
    "create a rounded cube with 25mm sides|rounded-cube-25.scad"
    "make a gear with 15 teeth and 5mm thickness|gear-15-teeth.scad"
    "create a spring with 20mm diameter and 8 coils|spring-20mm-8coils.scad"
    "generate a honeycomb pattern 50x40mm|honeycomb-pattern.scad"
    "create a torus with major radius 15 and minor radius 5|torus-15-5.scad"
    "make a hexagonal prism 30mm tall|hexagonal-prism.scad"
)

# Test cases with existing code modification
declare -a MODIFICATION_TEST_CASES=(
    "cube([15,15,15]);|add rounded edges with 2mm radius|cube-rounded-15.scad"
    "cylinder(h=20, r=8);|add knurling pattern for grip|cylinder-knurled.scad"
    "sphere(r=12);|make it a hollow shell with 2mm thickness|hollow-sphere.scad"
)

# Function to run a test case
run_test_case() {
    local prompt="$1"
    local output_file="$2"
    local existing_code="$3"
    local test_type="$4"
    
    echo -e "\n${BLUE}Running test: ${prompt}${NC}"
    echo "========================================" >> "${AI_INTERACTIONS_LOG}"
    echo "Test: ${prompt}" >> "${AI_INTERACTIONS_LOG}"
    echo "Output: ${output_file}" >> "${AI_INTERACTIONS_LOG}"
    echo "Type: ${test_type}" >> "${AI_INTERACTIONS_LOG}"
    echo "Timestamp: $(date)" >> "${AI_INTERACTIONS_LOG}"
    echo "========================================" >> "${AI_INTERACTIONS_LOG}"
    
    local cmd="node ${SCRIPT_DIR}/openscad-generator.js \"${prompt}\" --output \"${OUTPUT_DIR}/${output_file}\" --api-key \"${DEEPSEEK_API_KEY}\""
    
    if [ -n "$existing_code" ]; then
        echo "Existing code: ${existing_code}" >> "${AI_INTERACTIONS_LOG}"
        echo -e "${YELLOW}Existing code: ${existing_code}${NC}"
        echo "$existing_code" | $cmd --stdin 2>&1 | tee -a "${AI_INTERACTIONS_LOG}"
    else
        $cmd 2>&1 | tee -a "${AI_INTERACTIONS_LOG}"
    fi
    
    local exit_code=${PIPESTATUS[0]}
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ Success: ${output_file}${NC}"
        echo "✅ SUCCESS: ${prompt} -> ${output_file}" >> "${SUMMARY_LOG}"
        
        # Extract module information from the log
        if grep -q "Module selection result:" "${AI_INTERACTIONS_LOG}"; then
            local modules=$(grep "Module selection result:" "${AI_INTERACTIONS_LOG}" | tail -1 | cut -d':' -f2 | xargs)
            echo "Modules used: ${modules}" >> "${SUMMARY_LOG}"
            echo "Modules: ${modules}" >> "${MODULES_LOG}"
        fi
        
        # Count lines in generated file
        if [ -f "${OUTPUT_DIR}/${output_file}" ]; then
            local lines=$(wc -l < "${OUTPUT_DIR}/${output_file}")
            echo "Generated lines: ${lines}" >> "${SUMMARY_LOG}"
            echo "Lines: ${lines}" >> "${MODULES_LOG}"
        fi
    else
        echo -e "${RED}❌ Failed: ${output_file}${NC}"
        echo "❌ FAILED: ${prompt}" >> "${SUMMARY_LOG}"
        echo "ERROR: ${prompt}" >> "${MODULES_LOG}"
    fi
    
    echo "" >> "${SUMMARY_LOG}"
    echo "" >> "${MODULES_LOG}"
}

# Function to analyze generated files
analyze_generated_files() {
    echo -e "\n${BLUE}Analyzing generated files...${NC}"
    echo "" >> "${SUMMARY_LOG}"
    echo "File Analysis:" >> "${SUMMARY_LOG}"
    
    for file in "${OUTPUT_DIR}"/*.scad; do
        if [ -f "$file" ]; then
            local filename=$(basename "$file")
            local lines=$(wc -l < "$file")
            local size=$(du -h "$file" | cut -f1)
            local has_modules=$(grep -c "include <module.scad>" "$file" 2>/dev/null || echo "0")
            local has_parameters=$(grep -c "^[[:space:]]*[a-zA-Z_][a-zA-Z0-9_]*[[:space:]]*=" "$file" 2>/dev/null || echo "0")
            
            echo "File: ${filename}" >> "${SUMMARY_LOG}"
            echo "  Lines: ${lines}" >> "${SUMMARY_LOG}"
            echo "  Size: ${size}" >> "${SUMMARY_LOG}"
            echo "  Uses modules: $([ $has_modules -gt 0 ] && echo "Yes" || echo "No")" >> "${SUMMARY_LOG}"
            echo "  Parameters: ${has_parameters}" >> "${SUMMARY_LOG}"
            echo "" >> "${SUMMARY_LOG}"
            
            echo -e "${GREEN}📄 ${filename}: ${lines} lines, ${size}, ${has_parameters} parameters${NC}"
        fi
    done
}

# Function to create a visual summary
create_visual_summary() {
    echo -e "\n${BLUE}Creating visual summary...${NC}"
    
    local total_tests=$((${#TEST_CASES[@]} + ${#MODIFICATION_TEST_CASES[@]}))
    local successful_tests=$(grep -c "✅ SUCCESS" "${SUMMARY_LOG}" 2>/dev/null || echo "0")
    local failed_tests=$(grep -c "❌ FAILED" "${SUMMARY_LOG}" 2>/dev/null || echo "0")
    
    cat > "${LOGS_DIR}/visual_summary.txt" << EOF
╔══════════════════════════════════════════════════════════════════════╗
║                    OpenSCAD Generator Test Summary                    ║
╠══════════════════════════════════════════════════════════════════════╣
║ Total Tests: ${total_tests}                                                  ║
║ Successful: ${successful_tests}                                                  ║
║ Failed: ${failed_tests}                                                    ║
║ Success Rate: $(echo "scale=1; ${successful_tests}*100/${total_tests}" | bc -l 2>/dev/null || echo "N/A")%                                    ║
╚══════════════════════════════════════════════════════════════════════╝

Test Execution Time: $(date)
Output Directory: ${OUTPUT_DIR}
Logs Directory: ${LOGS_DIR}

Generated Files:
$(ls -1 "${OUTPUT_DIR}"/*.scad 2>/dev/null | wc -l) OpenSCAD files created
$(du -sh "${OUTPUT_DIR}" 2>/dev/null | cut -f1) total size

Module Usage Summary:
$(grep "Modules:" "${MODULES_LOG}" | sort | uniq -c | sort -nr)

For detailed analysis, see:
- ${SUMMARY_LOG}
- ${MODULES_LOG}
- ${AI_INTERACTIONS_LOG}
EOF

    echo -e "${GREEN}Visual summary created: ${LOGS_DIR}/visual_summary.txt${NC}"
}

# Main execution
echo -e "${BLUE}🚀 Starting OpenSCAD Generator Test Suite${NC}"
echo -e "${BLUE}=====================================${NC}"

# Run new generation tests
echo -e "\n${YELLOW}Running new generation tests...${NC}"
for test_case in "${TEST_CASES[@]}"; do
    IFS='|' read -r prompt output_file <<< "$test_case"
    run_test_case "$prompt" "$output_file" "" "New Generation"
done

# Run modification tests
echo -e "\n${YELLOW}Running modification tests...${NC}"
for test_case in "${MODIFICATION_TEST_CASES[@]}"; do
    IFS='|' read -r existing_code prompt output_file <<< "$test_case"
    run_test_case "$prompt" "$output_file" "$existing_code" "Code Modification"
done

# Analyze results
analyze_generated_files
create_visual_summary

# Display final summary
echo -e "\n${BLUE}📊 Test Execution Complete!${NC}"
echo -e "${GREEN}Generated files location: ${OUTPUT_DIR}${NC}"
echo -e "${GREEN}Detailed logs location: ${LOGS_DIR}${NC}"
echo -e "${YELLOW}Visual summary: ${LOGS_DIR}/visual_summary.txt${NC}"

# Display visual summary
if [ -f "${LOGS_DIR}/visual_summary.txt" ]; then
    echo -e "\n${BLUE}Quick Summary:${NC}"
    cat "${LOGS_DIR}/visual_summary.txt"
fi

echo -e "\n${GREEN}✨ All tests completed! Check the logs directory for detailed analysis.${NC}"
