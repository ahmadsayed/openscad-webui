#!/bin/bash

# OpenSCAD Module Test Generator
# This script creates sample prompts for each module and tests them through the AI

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="${SCRIPT_DIR}/module_test_output"
LOGS_DIR="${OUTPUT_DIR}/logs"
MODULES_LIST="${SCRIPT_DIR}/modules_list.json"

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
echo "OpenSCAD Module Test Run - $(date)" > "${LOGS_DIR}/module_tests.log"
echo "Module Test Summary - $(date)" > "${LOGS_DIR}/module_summary.log"

# Sample prompts for each module category
declare -A MODULE_PROMPTS=(
    # Rounded Shapes
    ["rounded_cube"]="create a rounded cube with 30mm sides and 5mm corner radius"
    ["rounded_cylinder"]="make a rounded cylinder 40mm tall with 15mm radius and 3mm rounded edges"
    ["rounded_pyramid"]="create a rounded pyramid with 25x35mm base, 20mm height, and 2mm rounded edges"
    ["rounded_cone"]="generate a rounded cone with 12mm base radius, 25mm height, and 2mm bottom rounding"
    
    # Gears and Mechanical
    ["gear"]="create a gear with 20 teeth, 5mm thickness, and 20-degree pressure angle"
    ["test_gears"]="generate test gears to demonstrate gear functionality"
    ["demo_3d_gears"]="create 3D demonstration gears with spur gear extrusion"
    ["test_involute_curve"]="visualize involute curve generation for gear teeth"
    
    # Patterns and Textures
    ["honeycomb"]="create a honeycomb pattern 60x50mm with 8mm cell size"
    ["knurling"]="add knurled grip pattern to a cylinder with 18mm radius and 25mm height"
    ["voronoi_cell"]="generate simplified Voronoi cell patterns with random points"
    
    # Basic 3D Primitives
    ["chamfered_cube"]="create a chamfered cube 25x35x45mm with 3mm beveled edges"
    ["tube"]="make a hollow tube with 12mm outer radius, 8mm inner radius, and 40mm height"
    ["torus"]="create a torus with major radius 20mm and minor radius 6mm"
    ["prism"]="generate a hexagonal prism with 18mm radius and 35mm height"
    ["slot"]="create a rounded slot 35mm long, 12mm wide, and 8mm high"
    ["helix"]="make a helical coil with inner radius 12mm, outer radius 18mm, and 60mm height"
    
    # Basic 2D Primitives
    ["fillet_2d"]="create a 2D fillet with 8mm radius for extrusion"
    ["chamfer_2d"]="generate a 2D chamfer 6mm size for corner beveling"
    ["rounded_rectangle"]="make a rounded rectangle 45x35mm with 4mm corner radius"
    ["spiral"]="create a 2D spiral pattern from 8mm to 25mm radius"
    
    # Fasteners and Hardware
    ["simple_thread"]="add simple screw threads to a cylinder with 8mm radius, 2mm pitch, and 30mm height"
    ["bearing"]="create a ball bearing with 18mm outer radius, 10mm inner radius, and 8mm height"
    ["washer"]="generate a flat washer with 12mm outer radius, 6mm inner radius, and 2mm thickness"
    ["countersunk_hole"]="create a countersunk hole for flat-head screws with 4mm hole radius and 8mm head radius"
    ["bolt"]="make a complete bolt with 10mm head radius, 5mm head height, 4mm shaft radius, and 35mm shaft length"
    ["nut"]="create a hexagonal nut with 10mm outer radius, 5mm inner radius, and 6mm height"
    
    # Joints and Mechanisms
    ["dovetail_male"]="create a male dovetail joint 25mm wide, 15mm high, and 20mm deep"
    ["dovetail_female"]="generate a female dovetail joint with 25mm width, 15mm height, and 20mm depth"
    ["flexible_hinge"]="make a flexible hinge 60mm long, 12mm wide, and 3mm thick"
    
    # Structural Elements
    ["lattice"]="create a 3D lattice structure 50x40x30mm with 8mm cell size"
    ["living_hinge"]="generate a living hinge 80mm long, 15mm wide, and 1mm thick"
    
    # Text Utilities
    ["text_3d"]="create 3D text 'SAMPLE' with 20mm size and 4mm height"
    
    # Spring and Coil
    ["spring"]="make a helical spring with 18mm radius, 3mm wire radius, 10mm pitch, and 50mm height"
    
    # Gear Rack
    ["gear_rack"]="create a linear gear rack 80mm long with 16 triangular teeth"
    
    # Gridfinity System
    ["grid_block"]="create a 2x3x4 Gridfinity block with magnet holes"
    ["base_lid"]="generate a lid for 3x2 Gridfinity base"
    ["weighted_baseplate"]="make a weighted 4x3 Gridfinity baseplate"
    ["frame_plain"]="create a plain 2x2 Gridfinity frame with extra depth"
)

# Function to run a single module test
test_module() {
    local module_name="$1"
    local prompt="$2"
    local output_file="${module_name}.scad"
    
    echo -e "\n${BLUE}Testing module: ${module_name}${NC}"
    echo "Prompt: ${prompt}"
    
    # Log the test
    echo "========================================" >> "${LOGS_DIR}/module_tests.log"
    echo "Module: ${module_name}" >> "${LOGS_DIR}/module_tests.log"
    echo "Prompt: ${prompt}" >> "${LOGS_DIR}/module_tests.log"
    echo "Output: ${output_file}" >> "${LOGS_DIR}/module_tests.log"
    echo "Timestamp: $(date)" >> "${LOGS_DIR}/module_tests.log"
    echo "========================================" >> "${LOGS_DIR}/module_tests.log"
    
    # Run the generator
    if node "${SCRIPT_DIR}/openscad-generator.js" "${prompt}" --output "${OUTPUT_DIR}/${output_file}" --api-key "${DEEPSEEK_API_KEY}" 2>&1 | tee -a "${LOGS_DIR}/module_tests.log"; then
        echo -e "${GREEN}✅ Success: ${module_name}${NC}"
        echo "✅ SUCCESS: ${module_name} -> ${output_file}" >> "${LOGS_DIR}/module_summary.log"
        
        # Analyze the generated file
        if [ -f "${OUTPUT_DIR}/${output_file}" ]; then
            local lines=$(wc -l < "${OUTPUT_DIR}/${output_file}")
            local size=$(du -h "${OUTPUT_DIR}/${output_file}" | cut -f1)
            echo "  Lines: ${lines}, Size: ${size}" >> "${LOGS_DIR}/module_summary.log"
            
            # Check if module is actually used
            if grep -q "include <module.scad>" "${OUTPUT_DIR}/${output_file}"; then
                echo "  Uses modules: Yes" >> "${LOGS_DIR}/module_summary.log"
            else
                echo "  Uses modules: No (generated from scratch)" >> "${LOGS_DIR}/module_summary.log"
            fi
        fi
    else
        echo -e "${RED}❌ Failed: ${module_name}${NC}"
        echo "❌ FAILED: ${module_name}" >> "${LOGS_DIR}/module_summary.log"
    fi
    
    echo "" >> "${LOGS_DIR}/module_summary.log"
}

# Function to create a comprehensive test report
create_test_report() {
    echo -e "\n${BLUE}Creating comprehensive test report...${NC}"
    
    local total_modules=${#MODULE_PROMPTS[@]}
    local successful_tests=$(grep -c "✅ SUCCESS" "${LOGS_DIR}/module_summary.log" 2>/dev/null || echo "0")
    local failed_tests=$(grep -c "❌ FAILED" "${LOGS_DIR}/module_summary.log" 2>/dev/null || echo "0")
    
    cat > "${LOGS_DIR}/module_test_report.txt" << EOF
╔══════════════════════════════════════════════════════════════════════╗
║              OpenSCAD Module Test Report                              ║
╠══════════════════════════════════════════════════════════════════════╣
║ Total Modules Tested: ${total_modules}                                            ║
║ Successful: ${successful_tests}                                            ║
║ Failed: ${failed_tests}                                              ║
║ Success Rate: $(echo "scale=1; ${successful_tests}*100/${total_modules}" | bc -l 2>/dev/null || echo "N/A")%                                    ║
╚══════════════════════════════════════════════════════════════════════╝

Test Execution Time: $(date)
Output Directory: ${OUTPUT_DIR}
Logs Directory: ${LOGS_DIR}

Module Categories Tested:
EOF

    # Add category breakdown
    echo "Rounded Shapes:" >> "${LOGS_DIR}/module_test_report.txt"
    grep "rounded_cube\|rounded_cylinder\|rounded_pyramid\|rounded_cone" "${LOGS_DIR}/module_summary.log" | wc -l | xargs -I {} echo "  - {} modules" >> "${LOGS_DIR}/module_test_report.txt"
    
    echo "Gears and Mechanical:" >> "${LOGS_DIR}/module_test_report.txt"
    grep "gear\|involute\|test_gears\|demo_3d_gears" "${LOGS_DIR}/module_summary.log" | wc -l | xargs -I {} echo "  - {} modules" >> "${LOGS_DIR}/module_test_report.txt"
    
    echo "Patterns and Textures:" >> "${LOGS_DIR}/module_test_report.txt"
    grep "honeycomb\|knurling\|voronoi" "${LOGS_DIR}/module_summary.log" | wc -l | xargs -I {} echo "  - {} modules" >> "${LOGS_DIR}/module_test_report.txt"
    
    echo "Basic 3D Primitives:" >> "${LOGS_DIR}/module_test_report.txt"
    grep "chamfered_cube\|tube\|torus\|prism\|slot\|helix" "${LOGS_DIR}/module_summary.log" | wc -l | xargs -I {} echo "  - {} modules" >> "${LOGS_DIR}/module_test_report.txt"
    
    echo "Fasteners and Hardware:" >> "${LOGS_DIR}/module_test_report.txt"
    grep "simple_thread\|bearing\|washer\|countersunk_hole\|bolt\|nut" "${LOGS_DIR}/module_summary.log" | wc -l | xargs -I {} echo "  - {} modules" >> "${LOGS_DIR}/module_test_report.txt"
    
    echo "" >> "${LOGS_DIR}/module_test_report.txt"
    echo "Generated Files:" >> "${LOGS_DIR}/module_test_report.txt"
    ls -1 "${OUTPUT_DIR}"/*.scad 2>/dev/null | wc -l | xargs -I {} echo "{} OpenSCAD files created" >> "${LOGS_DIR}/module_test_report.txt"
    du -sh "${OUTPUT_DIR}" 2>/dev/null | cut -f1 | xargs -I {} echo "Total size: {}" >> "${LOGS_DIR}/module_test_report.txt"
    
    echo "" >> "${LOGS_DIR}/module_test_report.txt"
    echo "For detailed analysis, see:" >> "${LOGS_DIR}/module_test_report.txt"
    echo "- ${LOGS_DIR}/module_summary.log" >> "${LOGS_DIR}/module_test_report.txt"
    echo "- ${LOGS_DIR}/module_tests.log" >> "${LOGS_DIR}/module_test_report.txt"
    
    echo -e "${GREEN}Test report created: ${LOGS_DIR}/module_test_report.txt${NC}"
}

# Main execution
echo -e "${BLUE}🚀 Starting OpenSCAD Module Test Suite${NC}"
echo -e "${BLUE}=====================================${NC}"
echo -e "${YELLOW}Testing ${#MODULE_PROMPTS[@]} modules across all categories${NC}"

# Test each module
for module_name in "${!MODULE_PROMPTS[@]}"; do
    test_module "${module_name}" "${MODULE_PROMPTS[${module_name}]}"
done

# Create comprehensive report
create_test_report

# Display final summary
echo -e "\n${BLUE}📊 Module Test Execution Complete!${NC}"
echo -e "${GREEN}Generated files location: ${OUTPUT_DIR}${NC}"
echo -e "${GREEN}Detailed logs location: ${LOGS_DIR}${NC}"
echo -e "${YELLOW}Test report: ${LOGS_DIR}/module_test_report.txt${NC}"

# Display visual summary
if [ -f "${LOGS_DIR}/module_test_report.txt" ]; then
    echo -e "\n${BLUE}Quick Summary:${NC}"
    cat "${LOGS_DIR}/module_test_report.txt"
fi

echo -e "\n${GREEN}✨ All module tests completed! Check the logs directory for detailed analysis.${NC}"
