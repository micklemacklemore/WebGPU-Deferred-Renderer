// CHECKITOUT: you can use this vertex shader for all of the renderers

// TODO-1.3: add a uniform variable here for camera uniforms (of type CameraUniforms)
// make sure to use ${bindGroup_scene} for the group
@group(${bindGroup_scene}) @binding(0) var<uniform> cameraUniforms: CameraUniforms;  

@group(${bindGroup_model}) @binding(0) var<uniform> modelMat: mat4x4f;

struct VertexInput
{
    @location(0) pos: vec3f
}

struct VertexOutput
{
    @builtin(position) fragPos: vec4f,
    @location(0) pos: vec3f
}

@vertex
fn main(in: VertexInput) -> VertexOutput
{
    var out: VertexOutput; 
    var pos: vec4f; 

    pos = cameraUniforms.viewProjMat * vec4(in.pos, 1.0); 

    out.fragPos = pos;
    out.pos = pos.xyz / pos.w; 
    return out;
}
