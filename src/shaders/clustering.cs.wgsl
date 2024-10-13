// TODO-2: implement the light clustering compute shader

// ------------------------------------
// Calculating cluster bounds:
// ------------------------------------
// For each cluster (X, Y, Z):
//     - Calculate the screen-space bounds for this cluster in 2D (XY).
//     - Calculate the depth bounds for this cluster in Z (near and far planes).
//     - Convert these screen and depth bounds into view-space coordinates.
//     - Store the computed bounding box (AABB) for the cluster.

// ------------------------------------
// Assigning lights to clusters:
// ------------------------------------
// For each cluster:
//     - Initialize a counter for the number of lights in this cluster.

//     For each light:
//         - Check if the light intersects with the cluster’s bounding box (AABB).
//         - If it does, add the light to the cluster's light list.
//         - Stop adding lights if the maximum number of lights is reached.

//     - Store the number of lights assigned to this cluster.

@group(${bindGroup_scene}) @binding(0) var<storage, read> lightSet: LightSet;
@group(${bindGroup_scene}) @binding(1) var<storage, read_write> clusterSet: ClusterSet;
@group(${bindGroup_scene}) @binding(2) var<uniform> cameraUniforms: CameraUniforms;  

// number of clusters in xyz
const numGrid = vec3<u32>(${clusterSize}); 

@compute
@workgroup_size(${clusterWorkgroupSize})
fn main(@builtin(global_invocation_id) globalID: vec3<u32>,
        @builtin(workgroup_id) workgroup_id: vec3<u32>,
        @builtin(num_workgroups) num_workgroups: vec3<u32>,
        @builtin(local_invocation_index) local_invocation_index: u32
) {
    // check bounds
    if (globalID.x >= numGrid.x || 
        globalID.y >= numGrid.y || 
        globalID.z >= numGrid.z) {
        return;
    }

    // calculate cluster bounds
    // -----------------------

    // cluster linear index
    let clusterIndex = globalID.x + globalID.y * numGrid.x + globalID.z * numGrid.x * numGrid.y;

    clusters[clusterIndex].

    // https://github.com/DaveH355/clustered-shading
    // https://www.aortiz.me/2018/12/21/CG.html 

    // calculate screensize (vec2) tile size using canvas dimensions
    // vec2 tileSize
    vec2 tileSize = cameraUniforms.canvasSize / numGrid.xy; 

    // get the current tile in screenspace
    // vec2 min tile (top left corner point)
    // vec2 max tile (bottom right corner point)

    // convert min and max tile to view space (trace ray? inverse projection)
    // vec3 min tile
    // vec3 max tile

    // get current cluster's near and far planes
    // float planeNear
    // float planeFar

    // calculate Axis Aligned Bounding Box and assign to cluster

    // vec3 minPointNear
    // vec3 minPointFar
    // vec3 maxPointNear
    // vec3 maxPointFar

    // vec4 minPoint = min(minPointNear, minPointFar)
    // vec4 maxPoint = max(maxPointNear, maxPointFar) 


    // assign lights to current cluster
    // --------------------------------

    // For each cluster:
    //     - Initialize a counter for the number of lights in this cluster.

    //     For each light:
    //         - Check if the light intersects with the cluster’s bounding box (AABB).
    //         - If it does, add the light to the cluster's light list.
    //         - Stop adding lights if the maximum number of lights is reached.

    //     - Store the number of lights assigned to this cluster.


    return; 
}