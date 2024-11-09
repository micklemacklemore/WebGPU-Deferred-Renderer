import Stats from 'stats.js';
import { GUI } from 'dat.gui';

import { initWebGPU, Renderer } from './renderer';
import { JumpFloodRenderer } from './renderers/jump_flood';
import { Voxelizer } from './renderers/voxelizer';
import { NaiveRenderer } from './renderers/naive';
// import { ForwardPlusRenderer } from './renderers/forward_plus';
// import { ClusteredDeferredRenderer } from './renderers/clustered_deferred';

import { setupLoaders, Scene } from './stage/scene';
import { Lights } from './stage/lights';
import { Camera } from './stage/camera';
import { Stage } from './stage/stage';


await initWebGPU();
setupLoaders();

let scene = new Scene();
await scene.loadGltf('./scenes/sponza/Sponza.gltf');

const camera = new Camera();
const lights = new Lights(camera);

const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);

const gui = new GUI();
gui.add(lights, 'numLights').min(1).max(Lights.maxNumLights).step(1).onChange(() => {
    lights.updateLightSetUniformNumLights();
});

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
        case renderModes.Voxelizer: 
            stage = new Stage(scene, lights, new Camera(true), stats); 
            renderer = new Voxelizer(stage); 
            renderer.start(); 
            break; 
        case renderModes.NaiveRender: 
            stage = new Stage(scene, lights, camera, stats);
            renderer = new NaiveRenderer(stage); 
            renderer.start(); 
            break; 
    }
}

const renderModes = {Voxelizer: 'Voxelizer', JumpFloodRenderer: 'JumpFloodRenderer', NaiveRender: 'NaiveRender'};
let renderModeController = gui.add({ mode: renderModes.Voxelizer }, 'mode', renderModes);
renderModeController.onChange(setRenderer);

setRenderer(renderModeController.getValue());
