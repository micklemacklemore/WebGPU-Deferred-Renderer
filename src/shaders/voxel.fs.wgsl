@group(${bindGroup_scene}) @binding(1) var<storage, read> lightSet: LightSet;

@group(${bindGroup_material}) @binding(0) var diffuseTex: texture_2d<f32>;
@group(${bindGroup_material}) @binding(1) var diffuseTexSampler: sampler;

@group(${bindGroup_storage}) @binding(0) var voxelOut: texture_storage_3d<rgba8unorm, write>; 
@group(${bindGroup_storage}) @binding(1) var<uniform> orthoDirection: u32; 


struct FragmentInput
{
    @location(0) pos: vec3f,
    @location(1) nor: vec3f,
    @location(2) uv: vec2f
}

@fragment
fn main(in: FragmentInput, @builtin(position) pixelPosition: vec4<f32>) -> @location(0) vec4f
{
    let diffuseColor = textureSample(diffuseTex, diffuseTexSampler, in.uv);
    if (diffuseColor.a < 0.5f) {
        discard;
    }
    var finalColor = diffuseColor.rgb;

    var x : u32; 
    var y : u32; 
    var z : u32; 

    // TODO: Right now, direction is not aligned. So we are picking a general
    // direction (looking to +Y axis) that seems generally good for sponza.
    // I think it has something to do with how the orthographic camera is set up

    if (orthoDirection == 0) {
        //x = u32(pixelPosition.z * 128); 
        //y = u32(pixelPosition.y); 
        //z = u32(pixelPosition.x); 
        //finalColor *= vec3f(1, 0, 0); 
    } else if (orthoDirection == 1) {
        x = u32(pixelPosition.y); 
        y = u32(pixelPosition.z * 128);
        z = u32(pixelPosition.x);  
        //finalColor *= vec3f(0, 1, 0); 
    } else if (orthoDirection == 2) {
        //x = u32(pixelPosition.x); 
        //y = u32(pixelPosition.y); 
        //z = u32(pixelPosition.z * 128); 
        //finalColor *= vec3f(0, 0, 1); 
    } else {
        discard; 
    }

    let voxelCoord = vec3<u32>(x, y, z); 
    finalColor = vec3f(voxelCoord) / 128.0; 
    textureStore(voxelOut, voxelCoord, vec4f(finalColor, 1)); 

    return vec4(finalColor, 1);
}
