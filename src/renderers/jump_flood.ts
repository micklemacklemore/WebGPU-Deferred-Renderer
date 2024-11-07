import * as renderer from '../renderer';
import * as shaders from '../shaders/shaders';
import { Stage } from '../stage/stage';


const TEX_WIDTH = 128; 
const TEX_HEIGHT = 128; 

interface UniformsViews {
    screenSize: Float32Array; 
}


class MikeTexture {
    kTextureWidth: number;
    kTextureHeight: number;
    textureData: Uint8Array;

    texture: GPUTexture;
    sampler: GPUSampler;

    constructor(numSeeds: number = 30) { // Allow the number of seeds to be specified
        this.kTextureWidth = TEX_WIDTH;
        this.kTextureHeight = TEX_HEIGHT;

        // Initialize the texture data to fully transparent (undefined pixels).
        this.textureData = new Uint8Array(this.kTextureWidth * this.kTextureHeight * 4);
        this.textureData.fill(0); // Start with all pixels as fully transparent

        // Set random seed pixels
        for (let i = 0; i < numSeeds; i++) {
            // Generate random x and y positions within the texture bounds
            const x = Math.floor(Math.random() * this.kTextureWidth);
            const y = Math.floor(Math.random() * this.kTextureHeight);
            const index = (y * this.kTextureWidth + x) * 4;

            // Encode coordinates in normalized form for rgba8unorm
            this.textureData[index] = Math.floor((x / this.kTextureWidth) * 255); // R
            this.textureData[index + 1] = Math.floor((y / this.kTextureHeight) * 255); // G
            this.textureData[index + 2] = 100; // B channel set to max (1.0 normalized)
            this.textureData[index + 3] = 255; // A channel set to max (1.0 normalized)
        }

        // Create the GPU texture
        this.texture = renderer.device.createTexture({
            label: 'Seed Texture',
            size: [this.kTextureWidth, this.kTextureHeight],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        });

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

export class JumpFloodRenderer extends renderer.Renderer {

    // -- Textures --

    depthTexture: GPUTexture;
    depthTextureView: GPUTextureView;
    InputTexture : MikeTexture; 
    OutputTexture : GPUTexture; 
    SeedTexture: GPUTexture; 

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
              GPUTextureUsage.COPY_DST
        });

        renderer.device.queue.writeTexture(
            { texture: this.SeedTexture },
            this.InputTexture.textureData,
            { bytesPerRow: this.InputTexture.kTextureWidth * 4 },
            { width: this.InputTexture.kTextureWidth, height: this.InputTexture.kTextureHeight },
        );

        

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
