<img width="999" alt="image" src="https://github.com/user-attachments/assets/c2c60221-5e59-4312-a9f0-2a1c348ec68b">

WebGPU Forward+ and Clustered Deferred Shading
==============================================

## 🚀 Overview

> University of Pennsylvania, CIS 5650: GPU Programming and Architecture, Project 4 - WebGPU Clustered Renderer
> * Michael Mason
>   + [Personal Website](https://www.michaelmason.xyz/)
> * Tested on: Windows 11, Ryzen 9 5900HS @ 3.00GHz 16GB, RTX 3080 (Laptop) 8192MB

This is a *[clustered deferred renderer](https://www.aortiz.me/2018/12/21/CG.html)* implemented in [WebGPU](https://github.com/gpuweb/gpuweb), an explicit GPU API for the web.   

The goal of this 1.5-week project was to:

* Learn the WebGPU API and develop a better understanding of explicit APIs.
* Understand clustered shading, which involves splitting up the camera frustum into bounding "clusters", and assign the lights from the scene to them.
* Understand deferred shading, which involves splitting rendering in to a "G-Buffer" render pass and a "Full-screen" lighting render pass.
  + "G-Buffer" pass: process the geometry data and output seperate position, normal and albedo framebuffers
  + "Full-screen" Lighting pass: using the framebuffers from the last pass, calculate the lighting for each pixel.


### 🎮 Live Demo

[See Live Demo Here! (WebGPU Supported Browsers Only)](https://micklemacklemore.github.io/WebGPU-Deferred-Renderer/)

### 📺 Demo Video

https://github.com/user-attachments/assets/cfd5b4da-c825-4aac-a5a3-9921906e8ecb

## 🤹‍♂️ Performance Analysis

```
Compare your implementations of Forward+ and Clustered Deferred shading and analyze their differences.
Is one of them faster?
Is one of them better at certain types of workloads?
What are the benefits and tradeoffs of using one over the other?
For any differences in performance, briefly explain what may be causing the difference.
```

### 👨‍🔬 Explanation of Clustered and Deferred Implementations

TODO: text here.

### 📊 Results

TODO: text here.

#### Varying Light Counts

TODO: text here.

<div align="center">
  <img src="https://github.com/user-attachments/assets/ede17366-3423-467a-b4f2-81d4f88dbf19">
  <p><i>Lower is Better.</i></p>
  <br>
</div>

#### Varying Cluster Size

TODO: text here.

<div align="center">
  <img src="https://github.com/user-attachments/assets/23476e90-7c71-4ebb-a402-8d5d2fe63ecb">
  <p><i>Lower is Better.</i></p>
  <br>
</div>

#### Varying Workgroup Size

TODO: text here.

<div align="center">
  <img src="https://github.com/user-attachments/assets/6ab13e44-e0c8-4bfb-90d3-63323a65b028">
  <p><i>Lower is Better.</i></p>
  <br>
</div>




## Credits

- [Vite](https://vitejs.dev/)
- [loaders.gl](https://loaders.gl/)
- [dat.GUI](https://github.com/dataarts/dat.gui)
- [stats.js](https://github.com/mrdoob/stats.js)
- [wgpu-matrix](https://github.com/greggman/wgpu-matrix)

These were great resources on deferred and clustered shading methods:

- [A Primer on Efficient Rendering Algorithms & Clustered Shading by Ángel Ortiz](https://www.aortiz.me/2018/12/21/CG.html)
- [DaveH355 Explanation of the blog above with more GLSL Samples](https://github.com/DaveH355/clustered-shading)
- [A WebGPU Example that implements deferred shading](https://webgpu.github.io/webgpu-samples/?sample=deferredRendering)
