// Assume the following bindings:
@group(0) @binding(0) var uTexture: texture_2d<f32>; // the input texture with initial seed pixels colored
@group(0) @binding(1) var uOutput: texture_storage_2d<rgba8unorm, write>; // output texture to store results
@group(0) @binding(2) var<uniform> uResolution: vec2<f32>; //resolution of the grid (e.g., vec2(N, N))
@group(0) @binding(3) var<uniform> uStepSize: i32; //current step size (e.g., N/2, then halves each pass)

// @compute @workgroup_size(1, 1, 1)
// fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
//     let uv = vec2<f32>(global_id.xy) / uResolution; // Normalize coordinates
//     let current_pixel = textureLoad(uTexture, vec2<i32>(global_id.xy), 0); // Current color at pixel

//     let stepSize = uStepSize; 

//     textureStore(uOutput, vec2<i32>(global_id.xy), current_pixel);
//     return; 
// }


@compute @workgroup_size(1, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let uv = vec2<f32>(global_id.xy) / uResolution; // Normalize coordinates
    let curr_coord = vec2<f32>(global_id.xy); 
    let curr_pixel = textureLoad(uTexture, vec2<i32>(curr_coord), 0); // Current color at pixel

    var bestDist : f32 = 99999.; 
    var bestCoord = vec2f(0.); 
    var bestColor = vec4f(0.); 

    // Iterate over neighbors (up, down, left, right, diagonals at uStepSize distance)
    for (var i = -1; i <= 1; i = i + 1) {
        for (var j = -1; j <= 1; j = j + 1) {
            let neighbor_coord = vec2<f32>(global_id.xy) + (f32(uStepSize) * vec2f(f32(i), f32(j)));
            let neighbor_pixel : vec4f = textureLoad(uTexture, vec2<i32>(neighbor_coord), 0); 
            let seed_coord : vec2f = vec2f(neighbor_pixel.r * uResolution.x, neighbor_pixel.g * uResolution.y);; 
            let dist : f32 = distance(seed_coord, curr_coord);

            if (neighbor_coord.x < 0.0 || neighbor_coord.y < 0.0 || neighbor_coord.x >= uResolution.x || neighbor_coord.y >= uResolution.y) {
                continue;
            }

            if ((neighbor_pixel.a != 0.0) && dist < bestDist) {
                bestDist = dist; 
                bestCoord = seed_coord; 
                bestColor = neighbor_pixel; 
            }
        }
    }
    // Write the result color for the current pixel to the output texture
    textureStore(uOutput, vec2<i32>(global_id.xy), bestColor);
}

// @compute @workgroup_size(1, 1)
// fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
//     let uv = vec2<f32>(global_id.xy) / uResolution; // Normalize coordinates
//     let current_pixel = textureLoad(uTexture, vec2<i32>(global_id.xy), 0); // Current color at pixel

//     var best_color = current_pixel; // Start with current color
//     var best_dist = f32(1e10); // Initial large distance

//     let current_seed_coord: vec2<f32> = current_pixel.xy; 
//     let current_dist = distance(vec2<f32>(global_id.xy), current_seed_coord); 

//     // Iterate over neighbors (up, down, left, right, diagonals at uStepSize distance)
//     for (var i = -1; i <= 1; i = i + 1) {
//         for (var j = -1; j <= 1; j = j + 1) {
//             let offset : vec2<i32> = vec2<i32>(global_id.xy) + (uStepSize * vec2<i32>(i, j));
//             let neighbor_coord : vec2f = vec2f(offset);  
//             let neighbor_color : vec4f = textureLoad(uTexture, offset, 0); 
//             let neighbor_seed_coord = neighbor_color.xy; 

//             let new_dist = distance(vec2<f32>(global_id.xy), neighbor_seed_coord);

//             // if p is undefined and q is colored
//             if (current_pixel.a == 0.0 && neighbor_color.a > 0.0) {
//                 if (new_dist < best_dist) {
//                     best_color = neighbor_color;
//                     best_dist =  new_dist; 
//                 }
                
//             } 
//             else if (current_pixel.a > 0.0 && neighbor_color.a > 0.0) {
//                 if (new_dist < current_dist && new_dist < best_dist) {
//                     best_color = neighbor_color; 
//                     best_dist = new_dist; 
//                 }
//             }
//         }
//     }

//     // Write the result color for the current pixel to the output texture
//     textureStore(uOutput, vec2<i32>(global_id.xy), best_color);
// }
