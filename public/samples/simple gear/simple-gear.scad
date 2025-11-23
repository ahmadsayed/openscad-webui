/*
    Simple Gear
*/
include <module.scad>
gear_teeth = 17;
gear_pitch = 1;
gear_height = 1.5;
linear_extrude(height = gear_height, center = true)
    gear(number_of_teeth = gear_teeth, diametral_pitch = gear_pitch);