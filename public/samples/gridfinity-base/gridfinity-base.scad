/*
    2x2 Parametrised Gridfinity base
*/

/*
    Modules used: https://github.com/vector76/gridfinity_openscad
*/
include <module.scad>
rows = 2;
columns = 2;
frame_width = columns * 42;
frame_depth = rows * 42;
translate([-rows * 21 + 21, -columns * 21 + 21, 0])
frame_plain(rows, columns);