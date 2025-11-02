cube_size = 20;
hole_radius = 5;
hole_height = 21;
facets = 16;
difference() {
    cube([cube_size, cube_size, cube_size], center=true);
    cylinder(h=hole_height, r=hole_radius, center=true, $fn=facets);
    rotate([90, 0, 0]) cylinder(h=hole_height, r=hole_radius, center=true, $fn=facets);
}