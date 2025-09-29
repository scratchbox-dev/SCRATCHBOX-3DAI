


## ✨ Main Features

- Dummy characters and pose control
- 3D model generation with Gen AI (Fal.ai)
- Color/Depth guided rendering with [ComfyUI](https://github.com/n0neye/scratchbox-comfyui-integration) or Fal.ai
- Drag-drop your 3D models or characters(Tested with [Mixamo characters](https://www.mixamo.com/))


## 💸 Cost
The app is **free to use**, but some optional features require 3rd party services for now. We aim to offer fully local workflows in future updates.
- 3D model generation with [Trellis](https://fal.ai/models/fal-ai/trellis)
- Final render with [Flux lora depth](https://fal.ai/models/fal-ai/flux-control-lora-depth/image-to-image)
- Fast image generation with [Fast-LCM](https://fal.ai/models/fal-ai/fast-lcm-diffusion)
- Remove background with [rembg](https://fal.ai/models/fal-ai/imageutils/rembg)


## 🛠️ Roadmap

- [ ] OpenPose to ComfyUI
- [ ] Animation system & Depth guided video rendering (Wan2.1)
- [ ] Local 3D model generation (ComfyUI and/or built-in python tools)
- [ ] Skybox generation
- [ ] More built-in characters & poses
- [ ] IK system for easier pose control

## 🧪 Development

1. Install dependencies: `yarn` or `npm install`
1. Run the electron app & nextjs development server: `yarn dev` or `npm run dev`
1. Build electron app: `yarn dist` or `npm run dist`

see [guide/development.md](guide/development.md) for more details



