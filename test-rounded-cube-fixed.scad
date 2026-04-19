include <module.scad>

// CORRECTED VERSION
// Proper syntax for rounded_cube:
echo("Corrected rounded cube");
rounded_cube([20, 20, 20], 2, facets=16);

translate([30, 0, 0]) {
    // Your original attempt (will show error in console)
    echo("Your original code - will produce error");
    // This will trigger: "Error: Size too small for rounding radius."
    rounded_cube(20, 20, facets=16);
}

translate([60, 0, 0]) {
    // What you probably meant - a 20mm cube with 2mm radius
    echo("What you probably meant");
    rounded_cube([20, 20, 20], 2, facets=16);
}