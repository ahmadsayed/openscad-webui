include <module.scad>

// Test 1: Correct syntax
echo("Test 1: Correct rounded cube");
rounded_cube([20, 20, 20], 2, facets=16);

translate([30, 0, 0]) {
    // Test 2: Your original code (will likely fail or produce unexpected results)
    echo("Test 2: Original code - may have issues");
    rounded_cube(20, 20, facets=16);
}

translate([60, 0, 0]) {
    // Test 3: Simple cube for comparison
    echo("Test 3: Regular cube for comparison");
    cube(20, center=true);
}