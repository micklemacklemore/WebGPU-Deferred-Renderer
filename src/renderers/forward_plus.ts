import * as renderer from '../renderer';
import * as shaders from '../shaders/shaders';
import { Stage } from '../stage/stage';

import { Mat4, mat4, Vec3, vec3 } from "wgpu-matrix";
import { toRadians } from "../math_util";

export class ForwardPlusRenderer extends renderer.Renderer {
    // TODO-2: add layouts, pipelines, textures, etc. needed for Forward+ here
    // you may need extra uniforms such as the camera view matrix and the canvas resolution
    sceneUniformsBindGroupLayout : GPUBindGroupLayout; 
    sceneUniformsBindGroup : GPUBindGroup; 

    // depth buffer
    depthTexture : GPUTexture; 
    depthTextureView : GPUTextureView; 

    pipeline : GPURenderPipeline; 

    linepipeline : GPURenderPipeline; 

    lineVertexGPUBuffer: GPUBuffer; 
    lineVertices: Float32Array; 
    lineCounter: number; 

    constructor(stage: Stage) {
        // TODO-2: initialize layouts, pipelines, textures, etc. needed for Forward+ here
        super(stage);

        this.sceneUniformsBindGroupLayout = renderer.device.createBindGroupLayout({
            label: "forward scene uniforms bind group layout",
            entries: [
                // TODO-1.2 DONE: add an entry for camera uniforms at binding 0, visible to only the vertex shader, and of type "uniform"
                { // camera uniforms
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: "uniform" }
                },
                { // lightSet
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: { type: "read-only-storage" }
                }
            ]
        });

        this.sceneUniformsBindGroup = renderer.device.createBindGroup({
            label: "forward scene uniforms bind group",
            layout: this.sceneUniformsBindGroupLayout,
            entries: [
                // TODO-1.2 DONE: add an entry for camera uniforms at binding 0
                // you can access the camera using `this.camera`
                // if you run into TypeScript errors, you're probably trying to upload the host buffer instead
                {
                    binding: 0,
                    resource: { buffer: this.camera.uniformsGPUBuffer }
                },
                {
                    binding: 1,
                    resource: { buffer: this.lights.lightSetStorageBuffer }
                }
            ]
        });

        this.depthTexture = renderer.device.createTexture({
            size: [renderer.canvas.width, renderer.canvas.height],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
        this.depthTextureView = this.depthTexture.createView();

        this.pipeline = renderer.device.createRenderPipeline({
            layout: renderer.device.createPipelineLayout({
                label: "forward pipeline layout",
                bindGroupLayouts: [
                    this.sceneUniformsBindGroupLayout,
                    renderer.modelBindGroupLayout,
                    renderer.materialBindGroupLayout
                ]
            }),
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: "less",
                format: "depth24plus"
            },
            vertex: {
                module: renderer.device.createShaderModule({
                    label: "forward vert shader",
                    code: shaders.naiveVertSrc
                }),
                buffers: [ renderer.vertexBufferLayout ]
            },
            fragment: {
                module: renderer.device.createShaderModule({
                    label: "forward frag shader",
                    code: shaders.forwardPlusFragSrc,
                }),
                targets: [
                    {
                        format: renderer.canvasFormat,
                    }
                ]
            }
        });

        this.linepipeline = renderer.device.createRenderPipeline(
            {
                layout: renderer.device.createPipelineLayout({
                    label: "forward pipeline layout",
                    bindGroupLayouts: [
                        this.sceneUniformsBindGroupLayout,
                        renderer.modelBindGroupLayout,
                        renderer.materialBindGroupLayout
                    ]
                }),
                depthStencil: {
                    depthWriteEnabled: true,
                    depthCompare: "less",
                    format: "depth24plus"
                },
                vertex: {
                    module: renderer.device.createShaderModule({
                        label: "forward vert shader",
                        code: shaders.lineVertSrc
                    }),
                    buffers: [ renderer.vertexBufferLineLayout ]
                },
                fragment: {
                    module: renderer.device.createShaderModule({
                        label: "forward frag shader",
                        code: shaders.lineFragSrc,
                    }),
                    targets: [
                        {
                            format: renderer.canvasFormat,
                        }
                    ]
                },
                primitive: {
                    topology: "line-list"
                }
            }
        ); 
/*
        const camPos : Vec3 = this.camera.cameraPos;
        let camPosRay = vec3.add(camPos, vec3.mulScalar(this.camera.cameraFront, 20)); 

        let len = vec3.len(vec3.subtract(camPosRay, camPos)); 

        const a = toRadians(renderer.fovYDegrees) / 2.0; 
        const V : Vec3 = vec3.mulScalar(this.camera.cameraUp, len * Math.tan(a));
        const H : Vec3 = vec3.mulScalar(this.camera.cameraRight, len * Math.tan(a) * renderer.aspectRatio); 

        this.lineVertices = new Float32Array((camPos.length + camPosRay.length) * 4);
        
        const sxsy = [
            {x: 1, y: 1},
            {x: -1, y: 1},
            {x: 1, y: -1},
            {x: -1, y: -1},
        ]

        let offset = 0; 

        for (let i = 0; i < 4; i++) {
            let h = vec3.mulScalar(H, sxsy[i].x); 
            let v = vec3.mulScalar(V, sxsy[i].y); 
            
            let p : Vec3 = vec3.add(camPosRay, h); 
            p = vec3.add(p, v); 

            this.lineVertices.set(camPos, offset); 
            offset += 3; 
            this.lineVertices.set(p, offset); 
            offset += 3; 
        }
*/
        const camPos: Vec3 = this.camera.cameraPos;
        let camPosRay = vec3.add(camPos, vec3.mulScalar(this.camera.cameraFront, 30));

        let len = vec3.len(vec3.subtract(camPosRay, camPos));

        const a = toRadians(renderer.fovYDegrees) / 2.0;
        const V: Vec3 = vec3.mulScalar(this.camera.cameraUp, len * Math.tan(a));
        const H: Vec3 = vec3.mulScalar(this.camera.cameraRight, len * Math.tan(a) * renderer.aspectRatio);

        // Define the step size in NDC space (-1 to 1) with 0.1 intervals
        const step = 0.1;
        const totalSteps = Math.ceil(2 / step); // since range is -1 to 1

        // Compute how many vertices are needed
        this.lineVertices = new Float32Array((camPos.length + camPosRay.length) * totalSteps * totalSteps * 4);

        let offset = 0; 
        this.lineCounter = 0; 

        // Loop over the grid with intervals of 0.1
        for (let sx = -1; sx <= 1; sx += step) {
            for (let sy = -1; sy <= 1; sy += step) {
                let h = vec3.mulScalar(H, sx); 
                let v = vec3.mulScalar(V, sy); 

                // Calculate point in world space
                let p: Vec3 = vec3.add(camPosRay, h);
                p = vec3.add(p, v);

                // Store the start and end point of the ray
                this.lineVertices.set(camPos, offset); 
                offset += 3; 
                this.lineVertices.set(p, offset); 
                offset += 3; 
                this.lineCounter += 2; 
            }
        }

        this.lineVertexGPUBuffer = renderer.device.createBuffer({
            label: "line vertex buffer",
            size: this.lineVertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });

        renderer.device.queue.writeBuffer(this.lineVertexGPUBuffer, 0, this.lineVertices); 
    }

    override draw() {
        // TODO-2: run the Forward+ rendering pass:
        const encoder = renderer.device.createCommandEncoder();
        const canvasTextureView = renderer.context.getCurrentTexture().createView();

        // - run the clustering compute shader

        // - run the main rendering pass, using the computed clusters for efficient lighting
        const renderPassDescriptor : GPURenderPassDescriptor = {
            label: "forward render pass",
            colorAttachments: [
                {
                    view: canvasTextureView,
                    clearValue: [0, 0, 0, 0],
                    loadOp: "clear",
                    storeOp: "store"
                }
            ],
            depthStencilAttachment: {
                view: this.depthTextureView,
                depthClearValue: 1.0,
                depthLoadOp: "clear",
                depthStoreOp: "store"
            }
        }; 

        const renderPass = encoder.beginRenderPass(renderPassDescriptor); 
        renderPass.setPipeline(this.pipeline); 
        
        renderPass.setBindGroup(shaders.constants.bindGroup_scene, this.sceneUniformsBindGroup); 

        // render scene
        this.scene.iterate(node => {
            renderPass.setBindGroup(shaders.constants.bindGroup_model, node.modelBindGroup);
        }, material => {
            renderPass.setBindGroup(shaders.constants.bindGroup_material, material.materialBindGroup);
        }, primitive => {
            renderPass.setVertexBuffer(0, primitive.vertexBuffer);
            renderPass.setIndexBuffer(primitive.indexBuffer, 'uint32');
            renderPass.drawIndexed(primitive.numIndices);
        });

        renderPass.setPipeline(this.linepipeline); 
        renderPass.setBindGroup(shaders.constants.bindGroup_scene, this.sceneUniformsBindGroup); 

        this.scene.iterate(node => {
            renderPass.setBindGroup(shaders.constants.bindGroup_model, node.modelBindGroup);
        }, material => {
            renderPass.setBindGroup(shaders.constants.bindGroup_material, material.materialBindGroup);
        }, primitive => {
        });

        renderPass.setVertexBuffer(0, this.lineVertexGPUBuffer); 
        renderPass.draw(this.lineCounter); 

        renderPass.end(); 

        this.lights.doLightClustering(encoder); 

        renderer.device.queue.submit([encoder.finish()]); 
    }
}
