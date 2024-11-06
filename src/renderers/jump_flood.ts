import * as renderer from '../renderer';
import * as shaders from '../shaders/shaders';
import { Stage } from '../stage/stage';

interface UniformsViews {
    screenSize: Float32Array; 
}

export class JumpFloodRenderer extends renderer.Renderer {

    // -- Textures --

    // TODO 2D Texture

    depthTexture: GPUTexture;
    depthTextureView: GPUTextureView;

    /// --- Fullscreen ---

    FullScreenPipeline: GPURenderPipeline; 

    UniformsValues: ArrayBuffer; 
    UniformsViews: UniformsViews; 
    UniformsBuffer: GPUBuffer; 

    UniformsBindGroupLayout: GPUBindGroupLayout; 
    UniformsBindGroup: GPUBindGroup; 

    constructor(stage: Stage) {
        super(stage);

        // set up uniforms

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

        

        // depth texture + texture view

        this.depthTexture = renderer.device.createTexture({
            size: [renderer.canvas.width, renderer.canvas.height],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
        this.depthTextureView = this.depthTexture.createView();

        // full screen pipeline
        this.FullScreenPipeline = renderer.device.createRenderPipeline({
            label: "Fullscreen pipeline",
            layout: renderer.device.createPipelineLayout({
                label: "forward pipeline layout",
                bindGroupLayouts: []
            }),
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
        
    }

    override draw() {
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
            renderPass.draw(6); 

            renderPass.end(); 
        }

        renderer.device.queue.submit([encoder.finish()]);
    }
}
