struct Uniforms {
  screenSize: vec2f
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms; 
@group(0) @binding(1) var ourSampler: sampler;
@group(0) @binding(2) var ourTexture: texture_2d<f32>;
@group(0) @binding(3) var seedTexture: texture_2d<f32>;

@fragment
fn main(@builtin(position) coord : vec4f) -> @location(0) vec4f {
    
    let uv : vec2f = vec2f(coord.x / uniforms.screenSize.x, coord.y / uniforms.screenSize.y); 
    let color : vec4f = textureSample(ourTexture, ourSampler, uv);
    let seeds : vec4f = textureSample(seedTexture, ourSampler, uv); 

    return seeds;
}