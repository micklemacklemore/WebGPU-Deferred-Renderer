@group(0) @binding(0) var uTexture: texture_2d<f32>; // the input texture with initial seed pixels colored
@group(0) @binding(1) var uOutput: texture_storage_2d<rgba8unorm, write>; // output texture to store results
@group(0) @binding(2) var<uniform> uResolution: vec2<f32>; //resolution of the grid (e.g., vec2(N, N))
@group(0) @binding(3) var<uniform> uStepSize: i32; //current step size (e.g., N/2, then halves each pass)
@group(0) @binding(4) var sdfTexture: texture_storage_2d<rgba8unorm, write>; 


@compute @workgroup_size(1, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let uv = vec2<f32>(global_id.xy) / uResolution; // Normalize coordinates
    let curr_coord = vec2<f32>(global_id.xy); 
    let curr_pixel = textureLoad(uTexture, vec2<i32>(curr_coord), 0); // Current color at pixel

    var bestDist : f32 = 999999999999.; 
    //var bestCoord = vec2f(0.); 
    var bestColor = vec4f(0.); 

    // Iterate over neighbors (up, down, left, right, diagonals at uStepSize distance)
    for (var i = -1; i <= 1; i = i + 1) {
        for (var j = -1; j <= 1; j = j + 1) {
            let neighbor_coord = vec2<f32>(global_id.xy) + (f32(uStepSize) * vec2f(f32(i), f32(j)));
            let neighbor_pixel : vec4f = textureLoad(uTexture, vec2<i32>(neighbor_coord), 0); 
            
            // the seed coordinate at a given pixel is encoded in the red & green channels
            let seed_coord : vec2f = vec2f(neighbor_pixel.r * uResolution.x, neighbor_pixel.g * uResolution.y);; 
            let dist : f32 = distance(seed_coord, curr_coord);

            // make sure neighbour coords are within bounds of grid
            if (neighbor_coord.x < 0.0 || neighbor_coord.y < 0.0 || neighbor_coord.x >= uResolution.x || neighbor_coord.y >= uResolution.y) {
                continue;
            }

            if ((neighbor_pixel.a != 0.0) && dist < bestDist) {
                bestDist = dist; 
                //bestCoord = seed_coord; 
                bestColor = neighbor_pixel; 
            }
        }
    }

    textureStore(sdfTexture, vec2<i32>(global_id.xy), vec4f(bestDist / uResolution.x, bestDist / uResolution.x, bestDist / uResolution.x, 1.));

    // Write the result color for the current pixel to the output texture
    textureStore(uOutput, vec2<i32>(global_id.xy), bestColor);
}

