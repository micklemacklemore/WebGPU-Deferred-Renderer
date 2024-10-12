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


@compute
@workgroup_size(${clusterNumThreadsPerWorkgroup}, ${clusterNumThreadsPerWorkgroup}, ${clusterNumThreadsPerWorkgroup})
fn main(@builtin(global_invocation_id) global_invocation_id: vec3<u32>,
        @builtin(workgroup_id) workgroup_id: vec3<u32>,
        @builtin(num_workgroups) num_workgroups: vec3<u32>,
        @builtin(local_invocation_index) local_invocation_index: u32
) {
    if (global_invocation_id.x < ${clusterX} || global_invocation_id.y < ${clusterY} || global_invocation_id.z < ${clusterZ}) {
        let workgroupIdx = 
            workgroup_id.x +
            workgroup_id.y * num_workgroups.x + 
            workgroup_id.z * num_workgroups.x * num_workgroups.y; 
        
        let threadIdx = 
            workgroupIdx * ${clusterNumThreadsPerWorkgroup} + local_invocation_index; 

        clusterSet.clusters[threadIdx].numLights = threadIdx; 
    }
    return; 
}