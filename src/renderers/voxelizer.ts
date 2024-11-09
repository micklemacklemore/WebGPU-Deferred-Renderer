import * as renderer from '../renderer';
import * as shaders from '../shaders/shaders';
import { Stage } from '../stage/stage';
import { Texture3DViewer } from '../main'; 

class Texture3D {
    kTextureX: number;
    kTextureY: number;
    kTextureZ: number;
    textureData: Uint8Array;
    texture: GPUTexture;
    sampler: GPUSampler;

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
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_DST
                    | GPUTextureUsage.TEXTURE_BINDING,
        });

        // Upload the 3D texture data to the GPU texture
        renderer.device.queue.writeTexture(
            { texture: this.texture },
            this.textureData,
            { bytesPerRow: this.kTextureX * 4, rowsPerImage: this.kTextureY },
            { width: this.kTextureX, height: this.kTextureY, depthOrArrayLayers: this.kTextureZ },
        );

        // Create the sampler
        this.sampler = renderer.device.createSampler();
    }
}

class OrthoDir {
    host : Uint32Array; 
    device : GPUBuffer; 

    constructor() {
        this.host = new Uint32Array(1); 
        this.device = renderer.device.createBuffer({
            label: "orthoDir buffer", 
            size: this.host.byteLength, 
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        }); 

        this.update(0); 
    }

    // x : 0, y : 1, z: 2
    public update(dir: number) {
        this.host[0] = dir; 
        renderer.device.queue.writeBuffer(this.device, 0, this.host); 
    }
}

export class Voxelizer extends renderer.Renderer {
    sceneUniformsBindGroupLayout: GPUBindGroupLayout;
    sceneUniformsBindGroup: GPUBindGroup;

    voxelStorageBindGroupLayout: GPUBindGroupLayout; 
    voxelStorageBindGroup: GPUBindGroup; 

    fullScreenBindGroup: GPUBindGroup; 

    // voxel pipeline
    pipeline: GPURenderPipeline;

    voxelTexture: Texture3D; 
    textureView : Texture3DViewer; 

    // this pipeline is just for viewing the texture
    fullscreenpipeline: GPURenderPipeline; 

    depthTexture: GPUTexture;
    depthTextureView: GPUTextureView;

    orthoDir : OrthoDir; 

    runOnce: boolean; 

    constructor(stage: Stage, texView: Texture3DViewer) {
        super(stage);

        this.textureView = texView; 
        this.orthoDir = new OrthoDir(); 

        this.runOnce = true; 

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
                }, 
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: { type: 'uniform' }
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
                }, 
                {
                    binding: 1, 
                    resource: { buffer: this.orthoDir.device }
                }
            ]
        });

        // we're not depth culling, so no need to write to depth

        this.depthTexture = renderer.device.createTexture({
            size: [renderer.canvas.width, renderer.canvas.height],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
        this.depthTextureView = this.depthTexture.createView();

        // create voxel pipeline

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
                    label: "voxel vert shader",
                    code: shaders.voxelVertSrc
                }),
                buffers: [ renderer.vertexBufferLayout ]
            },
            fragment: {
                module: renderer.device.createShaderModule({
                    label: "voxel frag shader",
                    code: shaders.voxelFragSrc,
                }),
                targets: [
                    {
                        format: renderer.canvasFormat,
                    }
                ]
            }
        });

        // create full screen pipeline
        this.fullscreenpipeline = renderer.device.createRenderPipeline({
            label: "Voxel Fullscreen pipeline",
            layout: 'auto',
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: "less",
                format: "depth24plus"
            },
            vertex: {
                module: renderer.device.createShaderModule({
                    label: "fullscreen voxel vert shader",
                    code: shaders.voxelFullScreenVertSrc
                }),
            },
            fragment: {
                module: renderer.device.createShaderModule({
                    label: "fullscreen voxel frag shader",
                    code: shaders.voxelFullscreenFragSrc,
                }),
                targets: [
                    {   
                        format: renderer.canvasFormat 
                    }
                ]
            }
        }); 

        this.fullScreenBindGroup = renderer.device.createBindGroup({
            label: "fullscreen voxel bindgroup", 
            layout: this.fullscreenpipeline.getBindGroupLayout(0), 
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.camera.uniformsGPUBuffer }
                }, 
                {
                    binding: 1, 
                    resource: { buffer: this.textureView.deviceBuffer }
                },
                {
                    binding: 2, 
                    resource: this.voxelTexture.sampler
                }, 
                {
                    binding: 3, 
                    resource: this.voxelTexture.texture.createView()  
                }
            ]
        })
    }

    private voxelize() {
        this.camera.updateOrtho('x'); 
        this.orthoDir.update(0); 
        this.voxelPass(); 

        this.camera.updateOrtho('y'); 
        this.orthoDir.update(1); 
        this.voxelPass(); 

        this.camera.updateOrtho('z'); 
        this.orthoDir.update(2); 
        this.voxelPass(); 
    }

    private voxelPass() {
        const encoder = renderer.device.createCommandEncoder();
        const canvasTextureView = renderer.context.getCurrentTexture().createView();

        // unfortunately we can't have a renderpass with no color attachments
        // TODO: can we create a dummy texture for the renderpass? 
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

    override draw() {
        // I want to run the voxelize step within the draw function, 
        // otherwise webGPU inspector doesn't capture it
        if (this.runOnce) {
            this.voxelize(); 
            this.runOnce = false; 
        }

        const encoder = renderer.device.createCommandEncoder();
        const canvasTextureView = renderer.context.getCurrentTexture().createView();

        {
            const fullScreenRenderPassDescriptor : GPURenderPassDescriptor = {
                label: "jump flood render pass",
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

            const renderPass = encoder.beginRenderPass(fullScreenRenderPassDescriptor); 

            renderPass.setPipeline(this.fullscreenpipeline); 
            renderPass.setBindGroup(0, this.fullScreenBindGroup); 
            renderPass.draw(6); 

            renderPass.end(); 
        }

        renderer.device.queue.submit([encoder.finish()]);
    }
}
