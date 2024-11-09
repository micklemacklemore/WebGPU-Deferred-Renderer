import * as renderer from '../renderer';
import * as shaders from '../shaders/shaders';
import { Stage } from '../stage/stage';

class Texture3D {
    kTextureX: number;
    kTextureY: number;
    kTextureZ: number;
    textureData: Uint8Array;
    texture: GPUTexture;
    // sampler: GPUSampler;

    constructor(width: number, height: number, depth: number) {
        this.kTextureX = width;
        this.kTextureY = height;
        this.kTextureZ = depth;

        // Initialize the 3D texture data, each voxel has RGBA channels (4 bytes per voxel)
        this.textureData = new Uint8Array(this.kTextureX * this.kTextureY * this.kTextureZ * 4);
        this.textureData.fill(0); // Start with all voxels as fully transparent

        // Create the GPU 3D texture
        this.texture = renderer.device.createTexture({
            label: 'Voxel Output',
            size: [this.kTextureX, this.kTextureY, this.kTextureZ],
            dimension: '3d',
            format: 'rgba8unorm',
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_DST,
        });

        // Upload the 3D texture data to the GPU texture
        renderer.device.queue.writeTexture(
            { texture: this.texture },
            this.textureData,
            { bytesPerRow: this.kTextureX * 4, rowsPerImage: this.kTextureY },
            { width: this.kTextureX, height: this.kTextureY, depthOrArrayLayers: this.kTextureZ },
        );

        // Create the sampler
        //this.sampler = renderer.device.createSampler();
    }
}

export class Voxelizer extends renderer.Renderer {
    sceneUniformsBindGroupLayout: GPUBindGroupLayout;
    sceneUniformsBindGroup: GPUBindGroup;

    voxelStorageBindGroupLayout: GPUBindGroupLayout; 
    voxelStorageBindGroup: GPUBindGroup; 

    //depthTexture: GPUTexture;
    //depthTextureView: GPUTextureView;

    voxelTexture: Texture3D; 

    pipeline: GPURenderPipeline;

    constructor(stage: Stage) {
        super(stage);

        this.sceneUniformsBindGroupLayout = renderer.device.createBindGroupLayout({
            label: "scene uniforms bind group layout",
            entries: [
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
            label: "scene uniforms bind group",
            layout: this.sceneUniformsBindGroupLayout,
            entries: [
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

        this.voxelTexture = new Texture3D(128, 128, 128); 

        this.voxelStorageBindGroupLayout = renderer.device.createBindGroupLayout({
            label: "voxel storage bind group layout",
            entries: [
                { // camera uniforms
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    storageTexture: { format: this.voxelTexture.texture.format, viewDimension: '3d' }
                }
            ]
        });

        this.voxelStorageBindGroup = renderer.device.createBindGroup({
            label: "voxel storage bind group",
            layout: this.voxelStorageBindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: this.voxelTexture.texture.createView()
                }
            ]
        });

        // this.depthTexture = renderer.device.createTexture({
        //     size: [renderer.canvas.width, renderer.canvas.height],
        //     format: "depth24plus",
        //     usage: GPUTextureUsage.RENDER_ATTACHMENT
        // });
        // this.depthTextureView = this.depthTexture.createView();

        this.pipeline = renderer.device.createRenderPipeline({
            layout: renderer.device.createPipelineLayout({
                label: "naive pipeline layout",
                bindGroupLayouts: [
                    this.sceneUniformsBindGroupLayout,
                    renderer.modelBindGroupLayout,
                    renderer.materialBindGroupLayout, 
                    this.voxelStorageBindGroupLayout
                ]
            }),
            vertex: {
                module: renderer.device.createShaderModule({
                    label: "naive vert shader",
                    code: shaders.naiveVertSrc
                }),
                buffers: [ renderer.vertexBufferLayout ]
            },
            fragment: {
                module: renderer.device.createShaderModule({
                    label: "naive frag shader",
                    code: shaders.naiveFragSrc,
                }),
                targets: [
                    {
                        format: renderer.canvasFormat,
                    }
                ]
            }
        });
    }

    override draw() {
        const encoder = renderer.device.createCommandEncoder();
        const canvasTextureView = renderer.context.getCurrentTexture().createView();

        const renderPass = encoder.beginRenderPass({
            label: "naive render pass",
            colorAttachments: [
                {
                    view: canvasTextureView, 
                    clearValue: [0, 0, 0, 0],
                    loadOp: "clear",
                    storeOp: "store"
                }
            ],
        });
        renderPass.setPipeline(this.pipeline);
        renderPass.setViewport(0, 0, 128, 128, 0, 1.0); 

        renderPass.setBindGroup(shaders.constants.bindGroup_scene, this.sceneUniformsBindGroup); 
        renderPass.setBindGroup(shaders.constants.bindGroup_storage, this.voxelStorageBindGroup); 

        this.scene.iterate(node => {
            renderPass.setBindGroup(shaders.constants.bindGroup_model, node.modelBindGroup);
        }, material => {
            renderPass.setBindGroup(shaders.constants.bindGroup_material, material.materialBindGroup);
        }, primitive => {
            renderPass.setVertexBuffer(0, primitive.vertexBuffer);
            renderPass.setIndexBuffer(primitive.indexBuffer, 'uint32');
            renderPass.drawIndexed(primitive.numIndices);
        });

        renderPass.end();

        renderer.device.queue.submit([encoder.finish()]);
    }
}
