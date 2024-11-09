import * as renderer from '../renderer';
import * as shaders from '../shaders/shaders';
import { Stage } from '../stage/stage';


const TEX_WIDTH = 1024; 
const TEX_HEIGHT = 1024; 

interface UniformsViews {
    screenSize: Float32Array; 
}


class MikeTexture {
    kTextureWidth: number;
    kTextureHeight: number;
    textureData: Uint8Array;

    texture: GPUTexture;
    sampler: GPUSampler;

    constructor(lineThickness: number = 100, lineLength: number = 600, rotationAngle: number = 12) { 
        // lineThickness: width of each line in pixels
        // lineLength: length of each line arm in pixels
        // rotationAngle: rotation angle in degrees

        this.kTextureWidth = TEX_WIDTH;
        this.kTextureHeight = TEX_HEIGHT;

        // Initialize the texture data to fully transparent (undefined pixels).
        this.textureData = new Uint8Array(this.kTextureWidth * this.kTextureHeight * 4);
        this.textureData.fill(0); // Start with all pixels as fully transparent

        // Calculate the center of the texture
        const centerX = Math.floor(this.kTextureWidth / 2);
        const centerY = Math.floor(this.kTextureHeight / 2);

        // Convert rotation angle to radians
        const angleRad = (rotationAngle * Math.PI) / 180;

        // Helper function to rotate a point (x, y) around the center
        function rotatePoint(x: number, y: number): { x: number; y: number } {
            const cosAngle = Math.cos(angleRad);
            const sinAngle = Math.sin(angleRad);
            return {
                x: Math.round(centerX + (x - centerX) * cosAngle - (y - centerY) * sinAngle),
                y: Math.round(centerY + (x - centerX) * sinAngle + (y - centerY) * cosAngle),
            };
        }

        // Draw the vertical line of the plus sign (rotated)
        for (let i = -Math.floor(lineLength / 2); i <= Math.floor(lineLength / 2); i++) {
            for (let j = -Math.floor(lineThickness / 2); j <= Math.floor(lineThickness / 2); j++) {
                const rotatedPos = rotatePoint(centerX + j, centerY + i);
                const index = (rotatedPos.y * this.kTextureWidth + rotatedPos.x) * 4;

                // Check bounds
                if (rotatedPos.x >= 0 && rotatedPos.x < this.kTextureWidth && rotatedPos.y >= 0 && rotatedPos.y < this.kTextureHeight) {
                    // Encode coordinates in normalized form for rgba8unorm
                    this.textureData[index] = Math.floor((rotatedPos.x / this.kTextureWidth) * 255); // R
                    this.textureData[index + 1] = Math.floor((rotatedPos.y / this.kTextureHeight) * 255); // G
                    this.textureData[index + 2] = 100; // B channel for visualization
                    this.textureData[index + 3] = 255; // A channel to indicate full opacity
                }
            }
        }

        // Draw the horizontal line of the plus sign (rotated)
        for (let i = -Math.floor(lineLength / 2); i <= Math.floor(lineLength / 2); i++) {
            for (let j = -Math.floor(lineThickness / 2); j <= Math.floor(lineThickness / 2); j++) {
                const rotatedPos = rotatePoint(centerX + i, centerY + j);
                const index = (rotatedPos.y * this.kTextureWidth + rotatedPos.x) * 4;

                // Check bounds
                if (rotatedPos.x >= 0 && rotatedPos.x < this.kTextureWidth && rotatedPos.y >= 0 && rotatedPos.y < this.kTextureHeight) {
                    // Encode coordinates in normalized form for rgba8unorm
                    this.textureData[index] = Math.floor((rotatedPos.x / this.kTextureWidth) * 255); // R
                    this.textureData[index + 1] = Math.floor((rotatedPos.y / this.kTextureHeight) * 255); // G
                    this.textureData[index + 2] = 100; // B channel for visualization
                    this.textureData[index + 3] = 255; // A channel to indicate full opacity
                }
            }
        }

        // Create the GPU texture
        this.texture = renderer.device.createTexture({
            label: 'Seed Texture',
            size: [this.kTextureWidth, this.kTextureHeight],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        });

        this.texture.createView()

        // Upload the texture data to the GPU texture
        renderer.device.queue.writeTexture(
            { texture: this.texture },
            this.textureData,
            { bytesPerRow: this.kTextureWidth * 4 },
            { width: this.kTextureWidth, height: this.kTextureHeight },
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
                    this.textureData[index] = 255;       // R channel
                    this.textureData[index + 1] = 255;   // G channel
                    this.textureData[index + 2] = 255;   // B channel
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

export class JumpFloodRenderer extends renderer.Renderer {

    // -- Textures --
    depthTexture: GPUTexture;
    depthTextureView: GPUTextureView;
    InputTexture : MikeTexture; 
    OutputTexture : GPUTexture; 
    SeedTexture: GPUTexture; 
    SampleTexture3D: Texture3D; 

    /// --- Fullscreen ---

    FullScreenPipeline: GPURenderPipeline; 

    /// --- Jump Flood Compute Pipeline ---

    JumpFloodComputePipeline: GPUComputePipeline; 

    UniformsValues: ArrayBuffer; 
    UniformsViews: UniformsViews; 
    UniformsBuffer: GPUBuffer; 

    uResolution: Float32Array; 
    uResolutionGPU: GPUBuffer; 

    uStepSize: Uint32Array; 
    uStepSizeGPU: GPUBuffer; 
    

    UniformsBindGroup: GPUBindGroup; 
    ComputeBindGroup: GPUBindGroup; 

    runOnce: boolean; 

    constructor(stage: Stage) {
        super(stage);

        this.runOnce = true; 

        // full screen pipeline
        this.FullScreenPipeline = renderer.device.createRenderPipeline({
            label: "Fullscreen pipeline",
            layout: 'auto',
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: "less",
                format: "depth24plus"
            },
            vertex: {
                module: renderer.device.createShaderModule({
                    label: "fullscreen vert shader",
                    code: shaders.clusteredDeferredFullscreenVertSrc
                }),
            },
            fragment: {
                module: renderer.device.createShaderModule({
                    label: "fullscreen frag shader",
                    code: shaders.clusteredDeferredFullscreenFragSrc,
                }),
                targets: [
                    {   
                        format: renderer.canvasFormat 
                    }
                ]
            }
        }); 

        // jump flood pipeline
        // create pipeline
        this.JumpFloodComputePipeline = renderer.device.createComputePipeline({
            label: "cluster lights compute pipeline",
            layout: 'auto',
            compute: {
                module: renderer.device.createShaderModule({
                    label: "cluster lights compute shader",
                    code: shaders.jumpfloodComputeSrc
                }),
                entryPoint: "main"
            }
        });


        // depth texture + texture view

        this.depthTexture = renderer.device.createTexture({
            size: [renderer.canvas.width, renderer.canvas.height],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
        this.depthTextureView = this.depthTexture.createView();
        

        // ---- Set up all our shader resources ----

        // set up uniforms for render

        this.UniformsValues = new ArrayBuffer(8);
        this.UniformsViews = {
            screenSize: new Float32Array(this.UniformsValues),
        };

        this.UniformsViews.screenSize[0] = renderer.canvas.width; 
        this.UniformsViews.screenSize[1] = renderer.canvas.height; 

        this.UniformsBuffer = renderer.device.createBuffer({
            label: "uniforms",
            size: this.UniformsValues.byteLength, 
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        }); 

        renderer.device.queue.writeBuffer(this.UniformsBuffer, 0, this.UniformsValues); 


        // setup uniforms for compute

        this.uResolution = new Float32Array([TEX_WIDTH, TEX_HEIGHT]); 
        this.uResolutionGPU = renderer.device.createBuffer({
            label: "resolution", 
            size: this.uResolution.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        }); 
        renderer.device.queue.writeBuffer(this.uResolutionGPU, 0, this.uResolution); 

        this.uStepSize = new Uint32Array([TEX_WIDTH / 2]);
        this.uStepSizeGPU = renderer.device.createBuffer({
            label: "stepSize", 
            size: this.uStepSize.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });  
        renderer.device.queue.writeBuffer(this.uStepSizeGPU, 0, this.uStepSize);

        // textures

        this.InputTexture = new MikeTexture(); 
        this.OutputTexture = renderer.device.createTexture({
            label: 'output',
            size: [TEX_WIDTH, TEX_HEIGHT, 1],
            format: this.InputTexture.texture.format,
            usage:
              GPUTextureUsage.TEXTURE_BINDING |
              GPUTextureUsage.COPY_SRC | GPUTextureUsage.STORAGE_BINDING
        });

        // seed texture which a copy of the input texture. We'll use this to view the initial seeds

        this.SeedTexture = renderer.device.createTexture({
            label: 'output',
            size: [TEX_WIDTH, TEX_HEIGHT, 1],
            format: this.InputTexture.texture.format,
            usage:
              GPUTextureUsage.TEXTURE_BINDING |
              GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING
        });

        this.SampleTexture3D = new Texture3D(100, 100, 100); 

        // renderer.device.queue.writeTexture(
        //     { texture: this.SeedTexture },
        //     this.InputTexture.textureData,
        //     { bytesPerRow: this.InputTexture.kTextureWidth * 4 },
        //     { width: this.InputTexture.kTextureWidth, height: this.InputTexture.kTextureHeight },
        // );

        

        // setup bind groups

        this.ComputeBindGroup = renderer.device.createBindGroup({
            label: "compute group", 
            layout: this.JumpFloodComputePipeline.getBindGroupLayout(0), 
            entries: [
                {
                    binding: 0, 
                    resource: this.InputTexture.texture.createView()
                }, 
                {
                    binding: 1,
                    resource: this.OutputTexture.createView()
                },
                {
                    binding: 2,
                    resource: {buffer: this.uResolutionGPU}
                }, 
                {
                    binding: 3,
                    resource: { buffer: this.uStepSizeGPU }
                }, 
                {
                    binding: 4, 
                    resource: this.SeedTexture.createView()
                }
            ]
        });

        this.UniformsBindGroup = renderer.device.createBindGroup({
            label: "uniforms", 
            layout: this.FullScreenPipeline.getBindGroupLayout(0), 
            entries: [
                {
                    binding: 0, 
                    resource: { buffer: this.UniformsBuffer }
                }, 
                {
                    binding: 1,
                    resource: this.InputTexture.sampler
                },
                {
                    binding: 2,
                    resource: this.InputTexture.texture.createView()
                },
                {
                    binding: 3,
                    resource: this.SeedTexture.createView()
                }
            ]
        });      
    }

    private compute() {
        for (var i = TEX_HEIGHT / 2; i >= 1; i /= 2) {
            this.uStepSize[0] = i; 
            //console.log(this.uStepSize[0]); 
            renderer.device.queue.writeBuffer(this.uStepSizeGPU, 0, this.uStepSize);

            const encoder = renderer.device.createCommandEncoder();

            const computePass = encoder.beginComputePass(); 
            computePass.setPipeline(this.JumpFloodComputePipeline); 
            computePass.setBindGroup(0, this.ComputeBindGroup); 
            computePass.dispatchWorkgroups(
                TEX_WIDTH, TEX_HEIGHT, 1
            ); 

            computePass.end(); 
            
            encoder.copyTextureToTexture(
                { texture: this.OutputTexture },
                { texture: this.InputTexture.texture },
                [TEX_WIDTH, TEX_HEIGHT, 1]
            );     

            renderer.device.queue.submit([encoder.finish()]);
        }

        renderer.device.queue.writeBuffer(this.uStepSizeGPU, 0, this.uStepSize);
    }

    override draw() {
        if (this.runOnce) {
            this.compute(); 
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

            renderPass.setPipeline(this.FullScreenPipeline); 
            renderPass.setBindGroup(0, this.UniformsBindGroup); 
            renderPass.draw(6); 

            renderPass.end(); 
        }

        renderer.device.queue.submit([encoder.finish()]);
    }
}
