
@group(0) @binding(0) var<uniform> uniforms: CameraUniforms; 
@group(0) @binding(1) var<uniform> layer: u32; 
@group(0) @binding(2) var ourSampler: sampler;
@group(0) @binding(3) var ourTexture: texture_3d<f32>; 
// @group(0) @binding(2) var ourTexture: texture_2d<f32>;
// @group(0) @binding(3) var seedTexture: texture_2d<f32>;

@fragment
fn main(@builtin(position) coord : vec4f) -> @location(0) vec4f {
    
    let uv : vec2f = vec2f(coord.x / uniforms.canvasSize.x, coord.y / uniforms.canvasSize.y); 
    let color : vec4f = textureSample(ourTexture, ourSampler, vec3(uv.x, uv.y, f32(layer) / 128.0)); 

    return vec4f(color.rgb, 1);
}