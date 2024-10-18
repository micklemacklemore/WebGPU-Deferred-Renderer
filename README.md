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
  + "G-Buffer" geometry pass: process the geometry data and output seperate position, normal and albedo framebuffers
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

In my performance analysis I will discuss and compare (in the **[Results](#-results)** section) three methods of rendering, which this project implements. 

#### 1️⃣ Naive Forward Rendering

This is a basic naive forward renderer with none of the optimizations. This is just one vertex/fragment shader program processes the geometry and lighting in a single rendering pass. 
In the fragment shader, we niavely iterate through every light in the scene to determine the total light contribution of each fragment in the scene. 

This psuedo-code from xxx's blog illustrates it well: 

```psuedo
//Shaders:
Shader simpleShader

//Buffers:
Buffer display

for mesh in scene
    for light in scene
        display += simpleShader(mesh, light)
```

For scenes with a lot of lights up to 5000, this scales up very quickly. Clustered shading, as explained in the next section, helps with this significantly. 

#### 2️⃣ Clustered Rendering ("Forward+")

In the "Forward+" renderer, clustered rendering is introduced. 

Clustered rendering optimizes rendering by limiting how many lights we iterate per fragment, and this is done by putting the lights into a spatial data structure of 3D cells (called "clusters"). 

Since we're only concerned with what is viewable, we limit the extent of these cells to the camera's view frustum: 

<div align="center">
  <br>
  <img src="https://github.com/user-attachments/assets/0ba26f95-7cc2-4c57-81a4-bc3edda4ad34">
  <p><i>Top-down view of camera frustum in our 3D scene (Source: https://www.aortiz.me/2018/12/21/CG.html#clustered-shading)</i></p>
  <br>
</div>

The total amount of times we subdivide the frustum into 3D clusters seems to be varied across implementations of this algorithm, and I compare different configurations in [a section below.](#varying-cluster-size)

I use **16x9x24** (that is, 16 divisions in X view-space direction, 9 divisions in the Y view-space direction, 24 divisions in the Z view-space direction) as default for my implementation to match the configuration used in [Doom 2016](https://advances.realtimerendering.com/s2016/Siggraph2016_idTech6.pdf). Which seems to be a good configuration that matches the aspect ratio of most PC monitors. 

What also seems to vary in this algorithm is how to distribute the cluster divisions in the Z view-space direction:

<div align="center">
  <br>
  <img src="https://github.com/user-attachments/assets/47875c71-d32f-45c6-aa0c-2ca4a2e334ff" height=200px>
  <img src="https://github.com/user-attachments/assets/df87cb5e-ffd1-490d-ba86-0f7535a2db38" height=200px>
  <p><i>Linear scaling vs Logarithmic scaling. (source: https://www.aortiz.me/2018/12/21/CG.html#clustered-shading)</i></p>
  <br>
</div>

The niave method is dividing the z-depth in NDC space (image on the left). This seems to unevenly distribute the majority of clusters towards the camera's near plane, which is ultimately
unhelpful as the majority of lights will end up being placed in in the clusters closer to the far-plane. 

Ultimately it would be best to uniformly distribute lights across the clusters, so there is a general understanding logarithmically scaling the z-depth divisions is necessary (as shown in the image on the right). 
In a [SIGGRAPH 2016 Real-Time Rendering Talk for Doom 2016](https://advances.realtimerendering.com/s2016/Siggraph2016_idTech6.pdf), they presented a fairly simple subdivision scheme that I decided to use, and which seems to work pretty well: 

<div align="center">
  <br>
  <img src="https://github.com/user-attachments/assets/343a3786-39a8-41d3-84c2-40e409ec56f6">
  <p><i>Slide 5 of the <a href="https://advances.realtimerendering.com/s2016/Siggraph2016_idTech6.pdf">DOOM 2016 presentation.</a></i></p>
  <br>
</div>

#### 3️⃣ Clustered + Deferred Rendering


### 📊 Results

TODO: text here.

#### Varying Light Counts

TODO: text here.

<div align="center">
  <br>
  <img src="https://github.com/user-attachments/assets/ede17366-3423-467a-b4f2-81d4f88dbf19">
  <p><i>Lower is Better.</i></p>
  <br>
</div>

#### Varying Cluster Size

TODO: text here.

<div align="center">
  <br>
  <img src="https://github.com/user-attachments/assets/23476e90-7c71-4ebb-a402-8d5d2fe63ecb">
  <p><i>Lower is Better.</i></p>
  <br>
</div>

#### Varying Workgroup Size

TODO: text here.

<div align="center">
  <br>
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
