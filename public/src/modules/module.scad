// Rounded Cube (or Rectangular Prism)
module rounded_cube(size, radius, facets=24) {
    r = radius;
    original_size = size - 2 * r * [1,1,1];
    if (min(original_size) > 0) {
        minkowski() {
            cube(original_size, center=true);
            sphere(r, $fn=facets);
        }
    } else {
        echo("Error: Size too small for rounding radius.");
    }
}

// Rounded Cylinder
module rounded_cylinder(height, radius, rounding_radius, facets=24) {
    r = rounding_radius;
    original_h = height - 2 * r;
    original_r = radius - r;
    if (original_h > 0 && original_r > 0) {
        minkowski() {
            cylinder(h=original_h, r=original_r, center=true);
            sphere(r, $fn=facets);
        }
    } else {
        echo("Error: Dimensions too small for rounding radius.");
    }
}

// Rounded Pyramid
module rounded_pyramid(base, height, radius, facets=24) {
    r = radius;
    original_base = [base[0] - 2 * r, base[1] - 2 * r];
    original_height = height - 2 * r;
    if (original_base[0] > 0 && original_base[1] > 0 && original_height > 0) {
        minkowski() {
            linear_extrude(height=original_height, scale=0) 
                square(original_base, center=true);
            sphere(r, $fn=facets);
        }
    } else {
        echo("Error: Dimensions too small for rounding radius.");
    }
}

// Rounded Cone
module rounded_cone(base_radius, height, rounding_radius, facets=24) {
    r = rounding_radius;
    original_h = height - 2 * r;
    original_r = base_radius - r;
    if (original_h > 0 && original_r > 0) {
        minkowski() {
            cylinder(h=original_h, r1=original_r, r2=0);
            sphere(r, $fn=facets);
        }
    } else {
        echo("Error: Dimensions too small for rounding radius.");
    }
}


// Gears module 

// Copyright 2010 D1plo1d
// LGPL 2.1


//test_involute_curve();
//test_gears();
//demo_3d_gears();

// Geometry Sources:
//	http://www.cartertools.com/involute.html
//	gears.py (inkscape extension: /usr/share/inkscape/extensions/gears.py)
// Usage:
//	Diametral pitch: Number of teeth per unit length.
//	Circular pitch: Length of the arc from one tooth to the next
//	Clearance: Radial distance between top of tooth on one gear to bottom of gap on another.

function pitch_circular2diameter(number_of_teeth,circular_pitch) = number_of_teeth * circular_pitch / 180;
function pitch_diametral2diameter(number_of_teeth,diametral_pitch) = number_of_teeth / diametral_pitch;

module gear(number_of_teeth,
		circular_pitch=false, diametral_pitch=false,
		pressure_angle=20, clearance = 0,
		verbose=false)
{
	if(verbose) {
		echo("gear arguments:");
		echo(str("  number_of_teeth: ", number_of_teeth));
		echo(str("  circular_pitch: ", circular_pitch));
		echo(str("  diametral_pitch: ", diametral_pitch));
		echo(str("  pressure_angle: ", pressure_angle));
		echo(str("  clearance: ", clearance));
	}
	if (circular_pitch==false && diametral_pitch==false) echo("MCAD ERROR: gear module needs either a diametral_pitch or circular_pitch");
	if(verbose) echo("gear calculations:");

	//Convert diametrial pitch to our native circular pitch
	circular_pitch = (circular_pitch!=false?circular_pitch:180/diametral_pitch);

	// Pitch diameter: Diameter of pitch circle.
	pitch_diameter  =  pitch_circular2diameter(number_of_teeth,circular_pitch);
	if(verbose) echo (str("  pitch_diameter: ", pitch_diameter));
	pitch_radius = pitch_diameter/2;

	// Base Circle
	base_diameter = pitch_diameter*cos(pressure_angle);
	if(verbose) echo (str("  base_diameter: ", base_diameter));
	base_radius = base_diameter/2;

	// Diametrial pitch: Number of teeth per unit length.
	pitch_diametrial = number_of_teeth / pitch_diameter;
	if(verbose) echo (str("  pitch_diametrial: ", pitch_diametrial));

	// Addendum: Radial distance from pitch circle to outside circle.
	addendum = 1/pitch_diametrial;
	if(verbose) echo (str("  addendum: ", addendum));

	//Outer Circle
	outer_radius = pitch_radius+addendum;
	outer_diameter = outer_radius*2;
	if(verbose) echo (str("  outer_diameter: ", outer_diameter));

	// Dedendum: Radial distance from pitch circle to root diameter
	dedendum = addendum + clearance;
	if(verbose) echo (str("  dedendum: ", dedendum));

	// Root diameter: Diameter of bottom of tooth spaces.
	root_radius = pitch_radius-dedendum;
	root_diameter = root_radius * 2;
	if(verbose) echo (str("  root_diameter: ", root_diameter));

	half_thick_angle = 360 / (4 * number_of_teeth);
	if(verbose) echo (str("  half_thick_angle: ", half_thick_angle));

	union()
	{
		rotate(half_thick_angle) circle($fn=number_of_teeth*2, r=root_radius*1.001);

		for (i= [1:number_of_teeth])
		//for (i = [0])
		{
			rotate([0,0,i*360/number_of_teeth])
			{
				involute_gear_tooth(
					pitch_radius = pitch_radius,
					root_radius = root_radius,
					base_radius = base_radius,
					outer_radius = outer_radius,
					half_thick_angle = half_thick_angle);
			}
		}
	}
}


module involute_gear_tooth(
					pitch_radius,
					root_radius,
					base_radius,
					outer_radius,
					half_thick_angle
					)
{
	pitch_to_base_angle  = involute_intersect_angle( base_radius, pitch_radius );

	outer_to_base_angle = involute_intersect_angle( base_radius, outer_radius );

	base1 = 0 - pitch_to_base_angle - half_thick_angle;
	pitch1 = 0 - half_thick_angle;
	outer1 = outer_to_base_angle - pitch_to_base_angle - half_thick_angle;

	b1 = polar_to_cartesian([ base1, base_radius ]);
	p1 = polar_to_cartesian([ pitch1, pitch_radius ]);
	o1 = polar_to_cartesian([ outer1, outer_radius ]);

	b2 = polar_to_cartesian([ -base1, base_radius ]);
	p2 = polar_to_cartesian([ -pitch1, pitch_radius ]);
	o2 = polar_to_cartesian([ -outer1, outer_radius ]);

	// ( root_radius > base_radius variables )
		pitch_to_root_angle = pitch_to_base_angle - involute_intersect_angle(base_radius, root_radius );
		root1 = pitch1 - pitch_to_root_angle;
		root2 = -pitch1 + pitch_to_root_angle;
		r1_t =  polar_to_cartesian([ root1, root_radius ]);
		r2_t =  polar_to_cartesian([ -root1, root_radius ]);

	// ( else )
		r1_f =  polar_to_cartesian([ base1, root_radius ]);
		r2_f =  polar_to_cartesian([ -base1, root_radius ]);

	if (root_radius > base_radius)
	{
		//echo("true");
		polygon( points = [
			r1_t,p1,o1,o2,p2,r2_t
		], convexity = 3);
	}
	else
	{
		polygon( points = [
			r1_f, b1,p1,o1,o2,p2,b2,r2_f
		], convexity = 3);
	}

}

// Mathematical Functions
//===============

// Finds the angle of the involute about the base radius at the given distance (radius) from it's center.
//source: http://www.mathhelpforum.com/math-help/geometry/136011-circle-involute-solving-y-any-given-x.html

function involute_intersect_angle(base_radius, radius) = sqrt( pow(radius/base_radius,2) - 1);



// Polar coord [angle, radius] to cartesian coord [x,y]

function polar_to_cartesian(polar) = [
	polar[1]*cos(polar[0]),
	polar[1]*sin(polar[0])
];


// Test Cases
//===============

module test_gears()
{
	gear(number_of_teeth=51,circular_pitch=200);
	translate([0, 50])gear(number_of_teeth=17,circular_pitch=200);
	translate([-50,0]) gear(number_of_teeth=17,diametral_pitch=1);
}


module demo_3d_gears()
{
	// //double helical gear
	// translate([50,0])
	// {
	// linear_extrude(height = 10, center = true, convexity = 10, twist = -45)
	//  gear(number_of_teeth=17,diametral_pitch=1);
	// translate([0,0,10])
    //     rotate([0,180,180/17])
    //     linear_extrude(height = 10, center = true, convexity = 10, twist = 45)
	//  gear(number_of_teeth=17,diametral_pitch=1);
	// }

	//spur gear
	translate([0,-50]) linear_extrude(height = 10, center = true, convexity = 10, twist = 0)
	 gear(number_of_teeth=17,diametral_pitch=1);

}

module test_involute_curve()
{
	for (i=[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15])
	{
		translate(polar_to_cartesian([involute_intersect_angle( 0.1,i) , i ])) circle($fn=15, r=0.5);
	}
}



// 5. Honeycomb Pattern
// ---------------------------------------------
module honeycomb(width, depth, cell_size=5) {
  // Example: linear_extrude(5) honeycomb(width=50, depth=40, cell_size=8);
  for (x = [0:cell_size:width], y = [0:cell_size*1.5:depth]) {
    translate([x + (y%2)*cell_size/2, y, 0])
      circle(d=cell_size, $fn=6);
  }
}

// 6. Chamfered Cube
// ---------------------------------------------
module chamfered_cube(size, chamfer=1) {
    // Creates a cube with chamfered edges
    hull() {
        translate([chamfer, chamfer, chamfer])
            cube([size[0]-2*chamfer, size[1]-2*chamfer, size[2]-2*chamfer]);
        translate([0, chamfer, chamfer])
            cube([size[0], size[1]-2*chamfer, size[2]-2*chamfer]);
        translate([chamfer, 0, chamfer])
            cube([size[0]-2*chamfer, size[1], size[2]-2*chamfer]);
        translate([chamfer, chamfer, 0])
            cube([size[0]-2*chamfer, size[1]-2*chamfer, size[2]]);
    }
}

// 7. Hollow Cylinder (Tube)
// ---------------------------------------------
module tube(outer_radius, inner_radius, height, center=false) {
    difference() {
        cylinder(r=outer_radius, h=height, center=center);
        cylinder(r=inner_radius, h=height+0.1, center=center);
    }
}

// 8. Torus
// ---------------------------------------------
module torus(major_radius, minor_radius, facets=32) {
    rotate_extrude($fn=facets)
        translate([major_radius, 0, 0])
            circle(r=minor_radius, $fn=facets/2);
}

// 9. Prism (N-sided)
// ---------------------------------------------
module prism(sides, radius, height, center=false) {
    linear_extrude(height=height, center=center)
        circle(r=radius, $fn=sides);
}

// 10. Slot (Rounded Rectangle)
// ---------------------------------------------
module slot(length, width, height, center=false) {
    r = width/2;
    linear_extrude(height=height, center=center) {
        hull() {
            translate([-length/2+r, 0, 0]) circle(r=r);
            translate([length/2-r, 0, 0]) circle(r=r);
        }
    }
}

// 11. Fillet (2D)
// ---------------------------------------------
module fillet_2d(radius, angle=90) {
    difference() {
        square([radius, radius]);
        translate([radius, radius])
            circle(r=radius);
    }
}

// 12. Chamfer (2D)
// ---------------------------------------------
module chamfer_2d(size) {
    polygon(points=[[0,0], [size,0], [0,size]]);
}

// 13. Rounded Rectangle (2D)
// ---------------------------------------------
module rounded_rectangle(size, radius, center=false) {
    x = size[0];
    y = size[1];
    r = radius;
    
    translate(center ? [-x/2, -y/2] : [0, 0]) {
        hull() {
            translate([r, r]) circle(r=r);
            translate([x-r, r]) circle(r=r);
            translate([x-r, y-r]) circle(r=r);
            translate([r, y-r]) circle(r=r);
        }
    }
}

// 14. Helix
// ---------------------------------------------
module helix(radius, pitch, height, thickness=1, facets=32) {
    turns = height / pitch;
    step = 360 / facets;
    
    for (i = [0:step:turns*360-step]) {
        hull() {
            translate([radius*cos(i), radius*sin(i), i*pitch/360])
                sphere(r=thickness/2);
            translate([radius*cos(i+step), radius*sin(i+step), (i+step)*pitch/360])
                sphere(r=thickness/2);
        }
    }
}

// 15. Spring
// ---------------------------------------------
module spring(radius, wire_radius, pitch, height, facets=16) {
    turns = height / pitch;
    step = 360 / facets;
    
    for (i = [0:step:turns*360-step]) {
        hull() {
            translate([radius*cos(i), radius*sin(i), i*pitch/360])
                sphere(r=wire_radius);
            translate([radius*cos(i+step), radius*sin(i+step), (i+step)*pitch/360])
                sphere(r=wire_radius);
        }
    }
}

// 16. Knurling Pattern
// ---------------------------------------------
module knurling(radius, height, pitch=2, depth=0.5, facets=64) {
    difference() {
        cylinder(r=radius, h=height, $fn=facets);
        for (i = [0:360/facets:359]) {
            for (z = [0:pitch:height]) {
                rotate([0, 0, i + (z % (2*pitch) == 0 ? 0 : 180/facets)])
                    translate([radius-depth/2, 0, z])
                        rotate([0, 45, 0])
                            cube([depth*2, 0.5, depth*2], center=true);
            }
        }
    }
}

// 17. Text Extrusion Helper
// ---------------------------------------------
module text_3d(text, size=10, height=2, font="Liberation Sans", center=false) {
    linear_extrude(height=height, center=center)
        text(text, size=size, font=font, halign="center", valign="center");
}

// 18. Screw Thread (Simple)
// ---------------------------------------------
module simple_thread(radius, pitch, height, thread_depth=0.5, facets=32) {
    turns = height / pitch;
    
    difference() {
        cylinder(r=radius, h=height, $fn=facets);
        
        for (i = [0:360/facets:turns*360]) {
            rotate([0, 0, i])
                translate([radius-thread_depth/2, 0, i*pitch/360])
                    rotate([0, 45, 0])
                        cube([thread_depth*2, thread_depth, thread_depth*2], center=true);
        }
    }
}

// 19. Bearing (Simple)
// ---------------------------------------------
module bearing(outer_radius, inner_radius, height, ball_radius=2, num_balls=8) {
    difference() {
        cylinder(r=outer_radius, h=height);
        cylinder(r=inner_radius, h=height+0.1);
        
        // Ball groove
        ball_center_radius = (outer_radius + inner_radius) / 2;
        translate([0, 0, height/2])
            rotate_extrude()
                translate([ball_center_radius, 0, 0])
                    circle(r=ball_radius*1.1);
    }
    
    // Balls
    ball_center_radius = (outer_radius + inner_radius) / 2;
    for (i = [0:360/num_balls:359]) {
        rotate([0, 0, i])
            translate([ball_center_radius, 0, height/2])
                sphere(r=ball_radius);
    }
}

// 20. Washer
// ---------------------------------------------
module washer(outer_radius, inner_radius, thickness) {
    difference() {
        cylinder(r=outer_radius, h=thickness);
        cylinder(r=inner_radius, h=thickness+0.1);
    }
}

// 21. Countersunk Hole
// ---------------------------------------------
module countersunk_hole(hole_radius, head_radius, head_depth, total_depth) {
    union() {
        cylinder(r=hole_radius, h=total_depth);
        translate([0, 0, total_depth-head_depth])
            cylinder(r1=hole_radius, r2=head_radius, h=head_depth);
    }
}

// 22. Dovetail Joint
// ---------------------------------------------
module dovetail_male(width, height, depth, angle=15) {
    linear_extrude(height=depth) {
        polygon(points=[
            [0, 0],
            [width, 0],
            [width + height*tan(angle), height],
            [-height*tan(angle), height]
        ]);
    }
}

module dovetail_female(width, height, depth, angle=15, clearance=0.1) {
    linear_extrude(height=depth+0.1) {
        polygon(points=[
            [-clearance, -clearance],
            [width+clearance, -clearance],
            [width + height*tan(angle)+clearance, height+clearance],
            [-height*tan(angle)-clearance, height+clearance]
        ]);
    }
}

// 23. Parametric Bolt
// ---------------------------------------------
module bolt(head_radius, head_height, shaft_radius, shaft_length, thread_pitch=1) {
    // Head
    cylinder(r=head_radius, h=head_height);
    
    // Shaft with simple threading
    translate([0, 0, -shaft_length])
        simple_thread(shaft_radius, thread_pitch, shaft_length);
}

// 24. Parametric Nut
// ---------------------------------------------
module nut(outer_radius, inner_radius, height, sides=6, thread_pitch=1) {
    difference() {
        cylinder(r=outer_radius, h=height, $fn=sides);
        simple_thread(inner_radius, thread_pitch, height+0.1);
    }
}

// 25. Flexible Hinge
// ---------------------------------------------
module flexible_hinge(length, width, thickness, gap=0.5, segments=10) {
    segment_length = length / segments;
    
    for (i = [0:segments-1]) {
        translate([i * segment_length, 0, 0]) {
            if (i % 2 == 0) {
                cube([segment_length - gap, width, thickness]);
            } else {
                translate([0, 0, thickness])
                    cube([segment_length - gap, width, thickness]);
            }
        }
    }
}

// 26. Lattice Structure
// ---------------------------------------------
module lattice(size, cell_size=5, beam_width=1) {
    for (x = [0:cell_size:size[0]]) {
        translate([x, 0, 0])
            cube([beam_width, size[1], size[2]]);
    }
    for (y = [0:cell_size:size[1]]) {
        translate([0, y, 0])
            cube([size[0], beam_width, size[2]]);
    }
    for (z = [0:cell_size:size[2]]) {
        translate([0, 0, z])
            cube([size[0], size[1], beam_width]);
    }
}

// 27. Voronoi Pattern (Simple)
// ---------------------------------------------
module voronoi_cell(points, bounds) {
    // Simple implementation - creates polygonal cells
    // This is a simplified version; full Voronoi requires more complex algorithms
    intersection() {
        square(bounds);
        for (i = [0:len(points)-1]) {
            for (j = [i+1:len(points)-1]) {
                // Create bisector line between points i and j
                mid = (points[i] + points[j]) / 2;
                dir = points[j] - points[i];
                normal = [-dir[1], dir[0]];
                
                // Half-plane cut
                translate(mid)
                    rotate(atan2(normal[1], normal[0]))
                        translate([-bounds[0], 0])
                            square([bounds[0]*2, bounds[1]]);
            }
        }
    }
}

// 28. Spiral
// ---------------------------------------------
module spiral(inner_radius, outer_radius, height, turns=5, facets=64) {
    step = 360 / facets;
    radius_step = (outer_radius - inner_radius) / (turns * 360 / step);
    
    for (i = [0:step:turns*360-step]) {
        current_radius = inner_radius + i * radius_step;
        hull() {
            translate([current_radius*cos(i), current_radius*sin(i), 0])
                cylinder(r=0.5, h=height);
            translate([(current_radius+radius_step)*cos(i+step), (current_radius+radius_step)*sin(i+step), 0])
                cylinder(r=0.5, h=height);
        }
    }
}

// 29. Parametric Gear Rack
// ---------------------------------------------
module gear_rack(length, tooth_count, tooth_height=2, tooth_width=3) {
    tooth_spacing = length / tooth_count;
    
    for (i = [0:tooth_count-1]) {
        translate([i * tooth_spacing, 0, 0]) {
            linear_extrude(height=tooth_height) {
                polygon(points=[
                    [0, 0],
                    [tooth_width/2, tooth_height],
                    [tooth_spacing - tooth_width/2, tooth_height],
                    [tooth_spacing, 0]
                ]);
            }
        }
    }
}

// 30. Living Hinge
// ---------------------------------------------
module living_hinge(length, width, thickness=0.8, cut_width=0.4, cut_spacing=1.2) {
    difference() {
        cube([length, width, thickness]);
        
        for (x = [cut_spacing:cut_spacing*2:length-cut_spacing]) {
            translate([x, 0, thickness/4])
                cube([cut_width, width+0.1, thickness/2]);
        }
        
        for (x = [cut_spacing*2:cut_spacing*2:length-cut_spacing]) {
            translate([x, 0, thickness/4])
                cube([cut_width, width+0.1, thickness/2]);
        }
    }
}



gridfinity_pitch = 42;
gridfinity_zpitch = 7;
gridfinity_clearance = 0.5;  // each bin is undersize by this much

// set this to produce sharp corners on baseplates and bins
// not for general use (breaks compatibility) but may be useful for special cases
sharp_corners = 0;


// basic block with cutout in top to be stackable, optional holes in bottom
// start with this and begin 'carving'
module grid_block(num_x=1, num_y=1, num_z=2, magnet_diameter=6.5, screw_depth=6, center=false, hole_overhang_remedy=false, half_pitch=false, box_corner_attachments_only = false) {
  corner_radius = 3.75;
  outer_size = gridfinity_pitch - gridfinity_clearance;  // typically 41.5
  block_corner_position = outer_size/2 - corner_radius;  // need not match center of pad corners
  magnet_thickness = 2.4;
  magnet_position = min(gridfinity_pitch/2-8, gridfinity_pitch/2-4-magnet_diameter/2);
  screw_hole_diam = 3;
  gp = gridfinity_pitch;
  
  suppress_holes = num_x < 1 || num_y < 1;
  
  emd = suppress_holes ? 0 : magnet_diameter; // effective magnet diameter after override
  esd = suppress_holes ? 0 : screw_depth;     // effective screw depth after override
  
  overhang_fix = hole_overhang_remedy && emd > 0 && esd > 0;
  overhang_fix_depth = 0.3;  // assume this is enough
  
  totalht=gridfinity_zpitch*num_z+3.75;
  translate( center ? [-(num_x-1)*gridfinity_pitch/2, -(num_y-1)*gridfinity_pitch/2, 0] : [0, 0, 0] )
  difference() {
    intersection() {
      union() {
        // logic for constructing odd-size grids of possibly half-pitch pads
        pad_grid(num_x, num_y, half_pitch);
        // main body will be cut down afterward
        translate([-gridfinity_pitch/2, -gridfinity_pitch/2, 5]) 
        cube([gridfinity_pitch*num_x, gridfinity_pitch*num_y, totalht-5]);
      }
      
      // crop with outer cylinders
      translate([0, 0, -0.1])
      hull() 
      cornercopy(block_corner_position, num_x, num_y) 
      cylinder(r=corner_radius, h=totalht+0.2);
    }
    
    // remove top so XxY can fit on top
      color("blue") 
      translate([0, 0, gridfinity_zpitch*num_z]) 
      pad_oversize(num_x, num_y, 1);
    
    if (esd > 0) {  // add pockets for screws if requested
      gridcopycorners(ceil(num_x), ceil(num_y), magnet_position, box_corner_attachments_only)
      translate([0, 0, -0.1]) cylinder(d=screw_hole_diam, h=esd+0.1);
    }
    
    if (emd > 0) {  // add pockets for magnets if requested
      gridcopycorners(ceil(num_x), ceil(num_y), magnet_position, box_corner_attachments_only)
      translate([0, 0, -0.1]) cylinder(d=emd, h=magnet_thickness+0.1);
    }
    
    if (overhang_fix) {  // people seem to really like this overhang fix
      gridcopycorners(ceil(num_x), ceil(num_y), magnet_position, box_corner_attachments_only)
      translate([0, 0, magnet_thickness-0.1]) 
      render() intersection() {  // for some reason OpenSCAD blows up if I don't render here
        translate([-emd/2, -screw_hole_diam/2, 0]) cube([emd, screw_hole_diam, overhang_fix_depth+0.1]);
        cylinder(d=emd, h=1);
      }
    }
  }
}


module pad_grid(num_x, num_y, half_pitch=false) {
  // if num_x (or num_y) is less than 1 (or less than 0.5 if half_pitch is enabled) then round over the far side
  cut_far_x = (num_x < 1 && !half_pitch) || (num_x < 0.5);
  cut_far_y = (num_y < 1 && !half_pitch) || (num_y < 0.5);
  
  if (half_pitch) {
    gridcopy(ceil(num_x), ceil(num_y)) intersection() {
      pad_halfsize();
      if (cut_far_x) {
        translate([gridfinity_pitch*(-0.5+num_x), 0, 0]) pad_halfsize();
      }
      if (cut_far_y) {
        translate([0, gridfinity_pitch*(-0.5+num_y), 0]) pad_halfsize();
      }
      if (cut_far_x && cut_far_y) {
        // without this the far corner would be rectangular
        translate([gridfinity_pitch*(-0.5+num_x), gridfinity_pitch*(-0.5+num_y), 0]) pad_halfsize();
      }
    }
  }
  else {
    gridcopy(ceil(num_x), ceil(num_y)) intersection() {
      pad_oversize();
      if (cut_far_x) {
        translate([gridfinity_pitch*(-1+num_x), 0, 0]) pad_oversize();
      }
      if (cut_far_y) {
        translate([0, gridfinity_pitch*(-1+num_y), 0]) pad_oversize();
      }
      if (cut_far_x && cut_far_y) {
        // without this the far corner would be rectangular
        translate([gridfinity_pitch*(-1+num_x), gridfinity_pitch*(-1+num_y), 0]) pad_oversize();
      }
    }
  }
}


module pad_halfsize() {
  render()  // render here to keep tree from blowing up
  for (xi=[0:1]) for (yi=[0:1]) translate([xi*gridfinity_pitch/2, yi*gridfinity_pitch/2, 0])
  intersection() {
    pad_oversize();
    translate([-gridfinity_pitch/2, 0, 0]) pad_oversize();
    translate([0, -gridfinity_pitch/2, 0]) pad_oversize();
    translate([-gridfinity_pitch/2, -gridfinity_pitch/2, 0]) pad_oversize();
  }
}

// like a cylinder but produces a square solid instead of a round one
// specified 'diameter' is the side length of the square, not the diagonal diameter
module cylsq(d, h) {
  translate([-d/2, -d/2, 0]) cube([d, d, h]);
}

// like a tapered cylinder with two diameters, but square instead of round
module cylsq2(d1, d2, h) {
  linear_extrude(height=h, scale=d2/d1)
  square([d1, d1], center=true);
}

// unit pad slightly oversize at the top to be trimmed or joined with other feet or the rest of the model
// also useful as cutouts for stacking
module pad_oversize(num_x=1, num_y=1, margins=0) {
  pad_corner_position = gridfinity_pitch/2 - 4; // must be 17 to be compatible
  bevel1_top = 0.8;     // z of top of bottom-most bevel (bottom of bevel is at z=0)
  bevel2_bottom = 2.6;  // z of bottom of second bevel
  bevel2_top = 5;       // z of top of second bevel
  bonus_ht = 0.2;       // extra height (and radius) on second bevel
  
  // female parts are a bit oversize for a nicer fit
  radialgap = margins ? 0.25 : 0;  // oversize cylinders for a bit of clearance
  axialdown = margins ? 0.1 : 0;   // a tiny bit of axial clearance present in Zack's design
  
  translate([0, 0, -axialdown])
  difference() {
    union() {
      hull() cornercopy(pad_corner_position, num_x, num_y) {
        if (sharp_corners) {
          cylsq(d=1.6+2*radialgap, h=0.1);
          translate([0, 0, bevel1_top]) cylsq(d=3.2+2*radialgap, h=1.9);
        }
        else {
          cylinder(d=1.6+2*radialgap, h=0.1);
          translate([0, 0, bevel1_top]) cylinder(d=3.2+2*radialgap, h=1.9);
        }
      }
      
      hull() cornercopy(pad_corner_position, num_x, num_y) {
        if (sharp_corners) {
          translate([0, 0, bevel2_bottom]) 
          cylsq2(d1=3.2+2*radialgap, d2=7.5+0.5+2*radialgap+2*bonus_ht, h=bevel2_top-bevel2_bottom+bonus_ht);
        }
        else {
          translate([0, 0, bevel2_bottom]) 
          cylinder(d1=3.2+2*radialgap, d2=7.5+0.5+2*radialgap+2*bonus_ht, h=bevel2_top-bevel2_bottom+bonus_ht);
        }
      }
    }
    
    // cut off bottom if we're going to go negative
    if (margins) {
      translate([-gridfinity_pitch/2, -gridfinity_pitch/2, 0])
      cube([gridfinity_pitch*num_x, gridfinity_pitch*num_y, axialdown]);
    }
  }
}

// similar to cornercopy, can only copy to box corners
module gridcopycorners(num_x, num_y, r, onlyBoxCorners = false) {
  for (xi=[1:num_x]) for (yi=[1:num_y]) 
    for (xx=[-1, 1]) for (yy=[-1, 1]) 
      if(!onlyBoxCorners || 
        (xi == 1 && yi == 1 && xx == -1 && yy == -1) ||
        (xi == num_x && yi == num_y && xx == 1 && yy == 1) ||
        (xi == 1 && yi == num_y && xx == -1 && yy == 1) ||
        (xi == num_x && yi == 1 && xx == 1 && yy == -1))  
        translate([gridfinity_pitch*(xi-1), gridfinity_pitch*(yi-1), 0]) 
        translate([xx*r, yy*r, 0]) children();
}

// similar to quadtranslate but expands to extremities of a block
module cornercopy(r, num_x=1, num_y=1) {
  for (xx=[-r, gridfinity_pitch*(num_x-1)+r]) for (yy=[-r, gridfinity_pitch*(num_y-1)+r]) 
    translate([xx, yy, 0]) children();
}


// make repeated copies of something(s) at the gridfinity spacing of 42mm
module gridcopy(num_x, num_y) {
  for (xi=[1:num_x]) for (yi=[1:num_y]) translate([gridfinity_pitch*(xi-1), gridfinity_pitch*(yi-1), 0]) children();
}




// Create a lid for Gridfinity system - use: base_lid(num_x, num_y);
module base_lid(num_x, num_y) {
  magnet_od = 6.5;
  magnet_position = min(gridfinity_pitch/2-8, gridfinity_pitch/2-4-magnet_od/2);
  magnet_thickness = 2.4;
  eps = 0.1;
  
  translate([0, 0, 7]) frame_plain(xsize, ysize, trim=0.25);
  difference() {
    grid_block(xsize, ysize, 1, magnet_diameter=0, screw_depth=0);
    gridcopy(num_x, num_y) {
      cornercopy(magnet_position) {
        translate([0, 0, 7-magnet_thickness])
        cylinder(d=magnet_od, h=magnet_thickness+eps);
      }
    }
  }
}


// Create a weighted baseplate with magnet and screw holes - use: weighted_baseplate(num_x, num_y);
module weighted_baseplate(num_x, num_y) {
  magnet_od = 6.5;
  magnet_position = min(gridfinity_pitch/2-8, gridfinity_pitch/2-4-magnet_od/2);
  magnet_thickness = 2.4;
  eps = 0.1;
  
  difference() {
    frame_plain(num_x, num_y, 6.4);
    
    gridcopy(num_x, num_y) {
      cornercopy(magnet_position) {
        translate([0, 0, -magnet_thickness])
        cylinder(d=magnet_od, h=magnet_thickness+eps);
        
        translate([0, 0, -6.4]) cylinder(d=3.5, h=6.4);
        
        // counter-sunk holes in the bottom
        translate([0, 0, -6.41]) cylinder(d1=8.5, d2=3.5, h=2.5);
      }
      
      translate([-10.7, -10.7, -6.41]) cube([21.4, 21.4, 4.01]);
      
      for (a2=[0,90]) rotate([0, 0, a2])
      hull() for (a=[0, 180]) rotate([0, 0, a])
      translate([-14.9519, 0, -6.41]) cylinder(d=8.5, h=2.01);
    }
  }
}


// Create a plain frame for Gridfinity system - use: frame_plain(num_x, num_y, extra_down=0, trim=0);
module frame_plain(num_x, num_y, extra_down=0, trim=0) {
  ht = extra_down > 0 ? 4.4 : 5;
  corner_radius = 3.75;
  corner_position = gridfinity_pitch/2-corner_radius-trim;
  difference() {
    hull() cornercopy(corner_position, num_x, num_y) 
    translate([0, 0, -extra_down]) cylinder(r=corner_radius, h=ht+extra_down);
    translate([0, 0, trim ? 0 : -0.01]) 
    render() gridcopy(num_x, num_y) pad_oversize(margins=1);
  }
}
