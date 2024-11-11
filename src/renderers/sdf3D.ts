import * as renderer from '../renderer';
import * as shaders from '../shaders/shaders';
import { Stage } from '../stage/stage';
import { Texture3DViewer } from '../main'; 

const CUBE_TEST : boolean = false; 

class CubeSampleTexture3D {
    kTextureX: number;
    kTextureY: number;
    kTextureZ: number;
    textureData: Uint8Array;
    texture: GPUTexture;
    sampler: GPUSampler;

    constructor(width: number, height: number, depth: number, cubeSize: number = 10) {
        this.kTextureX = width;
        this.kTextureY = height;
        this.kTextureZ = depth;

        // Initialize the 3D texture data, each voxel has RGBA channels (4 bytes per voxel)
        this.textureData = new Uint8Array(this.kTextureX * this.kTextureY * this.kTextureZ * 4);
        this.textureData.fill(0); // Start with all voxels as fully transparent

        // Calculate the center of the texture
        const centerX = Math.floor(this.kTextureX / 2);
        const centerY = Math.floor(this.kTextureY / 2);
        const centerZ = Math.floor(this.kTextureZ / 2);

        // Calculate the bounds of the cube around the center
        const halfSize = Math.floor(cubeSize / 2);
        const startX = Math.max(centerX - halfSize, 0);
        const endX = Math.min(centerX + halfSize, this.kTextureX - 1);
        const startY = Math.max(centerY - halfSize, 0);
        const endY = Math.min(centerY + halfSize, this.kTextureY - 1);
        const startZ = Math.max(centerZ - halfSize, 0);
        const endZ = Math.min(centerZ + halfSize, this.kTextureZ - 1);

        // Fill the cube in the middle with color and opacity
        for (let z = startZ; z <= endZ; z++) {
            for (let y = startY; y <= endY; y++) {
                for (let x = startX; x <= endX; x++) {
                    const index = ((z * this.kTextureY * this.kTextureX) + (y * this.kTextureX) + x) * 4;
                    this.textureData[index] = Math.floor((x / this.kTextureX) * 255); 
                    this.textureData[index + 1] = Math.floor((y / this.kTextureY) * 255); 
                    this.textureData[index + 2] = Math.floor((z / this.kTextureZ) * 255);   
                    this.textureData[index + 3] = 255;   // A channel (fully opaque)
                }
            }
        }

        // Create the GPU 3D texture
        this.texture = renderer.device.createTexture({
            label: '3D Cube Texture',
            size: [this.kTextureX, this.kTextureY, this.kTextureZ],
            dimension: '3d',
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
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
            label: 'Texture3D',
            size: [this.kTextureX, this.kTextureY, this.kTextureZ],
            dimension: '3d',
            format: 'rgba8unorm',
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC
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

export class SDF3D extends renderer.Renderer {

    // voxel pipeline
    voxelPipeline: GPURenderPipeline;
    voxelTexture: Texture3D; 
    textureView : Texture3DViewer; 

    voxelStorageBindGroupLayout: GPUBindGroupLayout; 
    voxelStorageBindGroup: GPUBindGroup; 

    sceneUniformsBindGroupLayout: GPUBindGroupLayout;
    sceneUniformsBindGroup: GPUBindGroup;

    orthoDir : OrthoDir; 

    // jump flood pipeline
    JumpFloodComputePipeline: GPUComputePipeline; 
    JumpFloodBindGroup: GPUBindGroup; 

    JumpFlooduResolution: Float32Array; 
    JumpFlooduResolutionGPU: GPUBuffer; 

    JumpFlooduStepSize: Uint32Array; 
    JumpFlooduStepSizeGPU: GPUBuffer; 

    JumpFloodVoronoiOutput: Texture3D; 
    JumpFloodSDFOutput: Texture3D; 

    JumpFloodTestInput: CubeSampleTexture3D; 

    // fullscreen pipeline for viewing 3D texture
    fullscreenpipeline: GPURenderPipeline; 
    fullScreenBindGroup: GPUBindGroup; 

    depthTexture: GPUTexture;
    depthTextureView: GPUTextureView;

    runOnce: boolean; 

    constructor(stage: Stage, texView: Texture3DViewer) {
        super(stage);

        this.textureView = texView; 
        this.orthoDir = new OrthoDir(); 

        this.JumpFloodVoronoiOutput = new Texture3D(128, 128, 128); 
        this.JumpFloodSDFOutput = new Texture3D(128, 128, 128); 

        this.JumpFloodTestInput = new CubeSampleTexture3D(128, 128, 128); 

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

        // depth texture is only needed for the fullscreen render

        this.depthTexture = renderer.device.createTexture({
            size: [renderer.canvas.width, renderer.canvas.height],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
        this.depthTextureView = this.depthTexture.createView();

        // create voxel pipeline

        this.voxelPipeline = renderer.device.createRenderPipeline({
            label: "voxel pipeline",
            layout: renderer.device.createPipelineLayout({
                label: "voxel pipeline layout",
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
                    resource: this.JumpFloodSDFOutput.texture.createView()  
                }
            ]
        }); 

        // --- jump flood pipeline setup ---

        this.JumpFloodComputePipeline = renderer.device.createComputePipeline({
            label: "jump flood compute pipeline",
            layout: 'auto',
            compute: {
                module: renderer.device.createShaderModule({
                    label: "jump flood compute shader",
                    code: shaders.jumpflood3DComputeSrc
                }),
                entryPoint: "main"
            }
        });

        // create jump flood shader resources

        this.JumpFlooduResolution = new Float32Array([128, 128, 128]); 
        this.JumpFlooduResolutionGPU = renderer.device.createBuffer({
            label: "resolution", 
            size: this.JumpFlooduResolution.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        }); 
        renderer.device.queue.writeBuffer(this.JumpFlooduResolutionGPU, 0, this.JumpFlooduResolution); 

        this.JumpFlooduStepSize = new Uint32Array([128 / 2]);
        this.JumpFlooduStepSizeGPU = renderer.device.createBuffer({
            label: "stepSize", 
            size: this.JumpFlooduStepSize.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });  
        renderer.device.queue.writeBuffer(this.JumpFlooduStepSizeGPU, 0, this.JumpFlooduStepSize);

        // create the bind group

        this.JumpFloodBindGroup = renderer.device.createBindGroup({
            label: "compute group", 
            layout: this.JumpFloodComputePipeline.getBindGroupLayout(0), 
            entries: [
                {
                    binding: 0, 
                    // resource: this.voxelTexture.texture.createView()
                    resource: CUBE_TEST ? this.JumpFloodTestInput.texture.createView() : this.voxelTexture.texture.createView()
                }, 
                {
                    binding: 1,
                    resource: this.JumpFloodVoronoiOutput.texture.createView()
                },
                {
                    binding: 2,
                    resource: {buffer: this.JumpFlooduResolutionGPU}
                }, 
                {
                    binding: 3,
                    resource: { buffer: this.JumpFlooduStepSizeGPU }
                }, 
                {
                    binding: 4, 
                    resource: this.JumpFloodSDFOutput.texture.createView()
                }
            ]
        });
    }

    private voxelize() {
        // in each pass we update the orthographic camera
        // to minimize voxel holes, we render the scene
        // from x, y and z axis and update the same 3D 
        // texture.

        // TODO: this is not working as it should since the voxels seems to
        // be misaligned. It's hard to tell because we're rendering sponza
        // ... sponza is so symettrical it's hard to tell what's going on..

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

        renderPass.setPipeline(this.voxelPipeline);
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

    private jumpFlood() {
        for (var i = 128 / 2; i >= 1; i /= 2) {
            this.JumpFlooduStepSize[0] = i; 
            //console.log(this.uStepSize[0]); 
            renderer.device.queue.writeBuffer(this.JumpFlooduStepSizeGPU, 0, this.JumpFlooduStepSize);

            const encoder = renderer.device.createCommandEncoder();

            const computePass = encoder.beginComputePass(); 
            computePass.setPipeline(this.JumpFloodComputePipeline); 
            computePass.setBindGroup(0, this.JumpFloodBindGroup); 
            computePass.dispatchWorkgroups(
                128, 128, 128 
            ); 

            computePass.end(); 
            
            // pass output back to input. (would be better to "ping pong" the textures here)
            encoder.copyTextureToTexture(
                { texture: this.JumpFloodVoronoiOutput.texture },
                { texture: CUBE_TEST ? this.JumpFloodTestInput.texture : this.voxelTexture.texture },
                [128, 128, 128]
            );     

            renderer.device.queue.submit([encoder.finish()]);
        }

        renderer.device.queue.writeBuffer(this.JumpFlooduStepSizeGPU, 0, this.JumpFlooduStepSize);
    }

    override draw() {
        // I want to run the voxelize step within the draw function, 
        // otherwise webGPU inspector doesn't capture it
        if (this.runOnce) {
            this.voxelize(); 
            this.jumpFlood(); 
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
