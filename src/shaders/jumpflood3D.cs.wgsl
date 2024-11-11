@group(0) @binding(0) var uTexture: texture_3d<f32>; // the input texture with initial seed pixels colored
@group(0) @binding(1) var uOutput: texture_storage_3d<rgba8unorm, write>; // output texture to store results
@group(0) @binding(2) var<uniform> uResolution: vec3<f32>; //resolution of the grid (e.g., vec2(N, N))
@group(0) @binding(3) var<uniform> uStepSize: i32; //current step size (e.g., N/2, then halves each pass)
@group(0) @binding(4) var sdfTexture: texture_storage_3d<rgba8unorm, write>;


@compute @workgroup_size(1, 1, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let uv = vec3<f32>(global_id) / uResolution; // Normalize coordinates
    let curr_coord = vec3<f32>(global_id); 
    let curr_pixel = textureLoad(uTexture, vec3<i32>(curr_coord), 0); // Current color at pixel

    var bestDist : f32 = 999999999999.; 
    var bestColor = vec4f(0.); 

    // Iterate over neighbors (up, down, left, right, diagonals at uStepSize distance)
    for (var i = -1; i <= 1; i = i + 1) {
        for (var j = -1; j <= 1; j = j + 1) {
            for (var k = -1; k <= 1; k = k + 1) {
                let neighbor_coord = curr_coord + (f32(uStepSize) * vec3f(f32(i), f32(j), f32(k)));
                let neighbor_pixel : vec4f = textureLoad(uTexture, vec3<i32>(neighbor_coord), 0); 
                
                // the seed coordinate at a given pixel is encoded in the red, green and blue channels
                let seed_coord : vec3f = vec3f(
                    neighbor_pixel.r * uResolution.x, 
                    neighbor_pixel.g * uResolution.y, 
                    neighbor_pixel.b * uResolution.z
                );
                let dist : f32 = distance(seed_coord, curr_coord);

                // make sure neighbour coords are within bounds of grid
                if (neighbor_coord.x < 0.0 || neighbor_coord.y < 0.0 || neighbor_coord.z < 0.0 ||
                     neighbor_coord.x >= uResolution.x || neighbor_coord.y >= uResolution.y || neighbor_coord.z >= uResolution.z) {
                    continue;
                }

                if ((neighbor_pixel.a != 0.0) && dist < bestDist) {
                    bestDist = dist; 
                    bestColor = neighbor_pixel; 
                }
            }

        }
    }
    textureStore(sdfTexture, vec3<i32>(global_id), vec4f(bestDist / uResolution.x, bestDist / uResolution.x, bestDist / uResolution.x, 1.));


    // Write the result color for the current pixel to the output texture
    textureStore(uOutput, vec3<i32>(global_id), bestColor);
}

