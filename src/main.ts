import Stats from 'stats.js';
import { GUI } from 'dat.gui';

import { initWebGPU, Renderer, device } from './renderer';
import { JumpFloodRenderer } from './renderers/jump_flood';
import { SDF3D } from './renderers/sdf3D';
import { NaiveRenderer } from './renderers/naive';
import { Voxelizer } from './renderers/voxelizer';
// import { ForwardPlusRenderer } from './renderers/forward_plus';
// import { ClusteredDeferredRenderer } from './renderers/clustered_deferred';

import { setupLoaders, Scene } from './stage/scene';
import { Lights } from './stage/lights';
import { Camera } from './stage/camera';
import { Stage } from './stage/stage';

export class Texture3DViewer {

    maxLayer : number; 
    currentLayer : number; 

    hostBuffer : Uint32Array; 
    deviceBuffer : GPUBuffer; 
    
    constructor(depth: number) {
        this.maxLayer = depth;
        this.currentLayer = 0; 
        this.hostBuffer = new Uint32Array(1); 
        this.deviceBuffer = device.createBuffer({
            label: "texture viewer buffer",
            size: this.hostBuffer.byteLength, 
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })
         
        this.update(); 
    }

    public update() {
        this.hostBuffer[0] = this.currentLayer; 
        device.queue.writeBuffer(this.deviceBuffer, 0, this.hostBuffer); 
    }
}

await initWebGPU();
setupLoaders();

let scene = new Scene();
await scene.loadGltf('./scenes/sponza/Sponza.gltf');

const camera = new Camera();
const lights = new Lights(camera);
const textureview = new Texture3DViewer(128); 

const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);

const gui = new GUI();
// gui.add(lights, 'numLights').min(1).max(Lights.maxNumLights).step(1).onChange(() => {
//     lights.updateLightSetUniformNumLights();
// });

gui.add(textureview, 'currentLayer').min(0).max(textureview.maxLayer).step(1).onChange(() => {
    textureview.update(); 
})


var renderer: Renderer | undefined;

function setRenderer(mode: string) {
    renderer?.stop();

    let stage : Stage; 

    switch (mode) {
        case renderModes.JumpFloodRenderer:
            stage = new Stage(scene, lights, camera, stats);
            renderer = new JumpFloodRenderer(stage);
            renderer.start(); 
            break;
        case renderModes.SDF3D: 
            stage = new Stage(scene, lights, new Camera(true), stats); 
            renderer = new SDF3D(stage, textureview); 
            renderer.start(); 
            break; 
        case renderModes.Voxelizer: 
            stage = new Stage(scene, lights, new Camera(true), stats); 
            renderer = new Voxelizer(stage, textureview); 
            renderer.start(); 
            break; 
        case renderModes.NaiveRender: 
            stage = new Stage(scene, lights, camera, stats);
            renderer = new NaiveRenderer(stage); 
            renderer.start(); 
            break; 
    }
}

const renderModes = {SDF3D: 'SDF3D', Voxelizer: 'Voxelizer', JumpFloodRenderer: 'JumpFloodRenderer', NaiveRender: 'NaiveRender'};
let renderModeController = gui.add({ mode: renderModes.SDF3D }, 'mode', renderModes);
renderModeController.onChange(setRenderer);

setRenderer(renderModeController.getValue());
