#!/bin/bash

# Sample Module Test Commands
# This script provides example commands for testing individual OpenSCAD modules

echo "🚀 OpenSCAD Module Test Commands"
echo "================================="

# Set API key (replace with your actual key)
export DEEPSEEK_API_KEY="sk-f518d037b68c4d8a8ffc114b5d1b9c4a"

echo ""
echo "Sample commands to test different module categories:"
echo ""

# Rounded Shapes
echo "🔵 ROUNDED SHAPES:"
echo "node openscad-generator.js \"create a rounded cube with 25mm sides and 3mm corner radius\" --output rounded-cube-test.scad"
echo "node openscad-generator.js \"make a rounded cylinder 30mm tall with 12mm radius and 2mm rounded edges\" --output rounded-cylinder-test.scad"
echo ""

# Gears and Mechanical
echo "⚙️  GEARS AND MECHANICAL:"
echo "node openscad-generator.js \"create a gear with 15 teeth and 5mm thickness\" --output gear-test.scad"
echo "node openscad-generator.js \"generate test gears for mechanical demonstration\" --output test-gears.scad"
echo ""

# Patterns and Textures
echo "🍯 PATTERNS AND TEXTURES:"
echo "node openscad-generator.js \"create a honeycomb pattern 40x30mm with 6mm cells\" --output honeycomb-test.scad"
echo "node openscad-generator.js \"add knurled grip to a cylinder with 15mm radius and 20mm height\" --output knurling-test.scad"
echo ""

# Basic 3D Primitives
echo "📦 BASIC 3D PRIMITIVES:"
echo "node openscad-generator.js \"create a torus with major radius 15mm and minor radius 4mm\" --output torus-test.scad"
echo "node openscad-generator.js \"make a hollow tube with 10mm outer radius, 6mm inner radius, and 30mm height\" --output tube-test.scad"
echo "node openscad-generator.js \"generate a hexagonal prism with 12mm radius and 25mm height\" --output prism-test.scad"
echo ""

# Fasteners and Hardware
echo "🔩 FASTENERS AND HARDWARE:"
echo "node openscad-generator.js \"create a ball bearing with 15mm outer radius, 8mm inner radius, and 6mm height\" --output bearing-test.scad"
echo "node openscad-generator.js \"make a complete bolt with 8mm head radius, 4mm head height, 3mm shaft radius, and 25mm shaft length\" --output bolt-test.scad"
echo ""

# Code Modification Examples
echo "🔧 CODE MODIFICATION EXAMPLES:"
echo "echo \"cube([10,10,10]);\" | node openscad-generator.js \"add rounded edges with 2mm radius\" --stdin --output modified-cube.scad"
echo "echo \"cylinder(h=20, r=8);\" | node openscad-generator.js \"add knurling pattern for better grip\" --stdin --output knurled-cylinder.scad"
echo ""

# Gridfinity System
echo "📐 GRIDFINITY SYSTEM:"
echo "node openscad-generator.js \"create a 2x2x3 Gridfinity block with magnet holes\" --output gridfinity-block-test.scad"
echo "node openscad-generator.js \"generate a weighted 3x2 Gridfinity baseplate\" --output gridfinity-baseplate-test.scad"
echo ""

echo "Running sample test commands..."
echo ""

# Run a few sample tests
echo "Testing rounded cube..."
node openscad-generator.js "create a rounded cube with 20mm sides and 2mm corner radius" --output sample-rounded-cube.scad

echo ""
echo "Testing gear..."
node openscad-generator.js "create a gear with 12 teeth and 3mm thickness" --output sample-gear.scad

echo ""
echo "Testing torus..."
node openscad-generator.js "create a torus with major radius 10mm and minor radius 3mm" --output sample-torus.scad

echo ""
echo "Testing code modification..."
echo "cube([15,15,15]);" | node openscad-generator.js "add rounded edges with 1mm radius" --stdin --output sample-modified-cube.scad

echo ""
echo "✅ Sample tests completed!"
echo "Check the generated .scad files to see the results."
