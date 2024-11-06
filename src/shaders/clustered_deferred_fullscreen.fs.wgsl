struct Uniforms {
  screenSize: vec2f
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms; 

@fragment
fn main(@builtin(position) coord : vec4f) -> @location(0) vec4f {
    return vec4f(1., 0., 1., 1.);
}