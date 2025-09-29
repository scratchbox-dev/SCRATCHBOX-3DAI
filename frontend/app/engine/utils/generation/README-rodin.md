# Hyper3D Rodin Integration

This document explains how to use the new Hyper3D Rodin integration for generating high-quality 3D models.

## Features

The Rodin integration provides several generation methods:

### 1. Text-to-3D Generation
Generate 3D models directly from text prompts using `generateRodin3DFromText()`.

```typescript
import { generateRodin3DFromText } from '@/engine/utils/generation/generation-util';

const result = await generateRodin3DFromText(
  "A futuristic robot with sleek metallic design",
  entity,
  scene,
  derivedFromId,
  {
    quality: 'high',
    material: 'PBR',
    hyper_mode: true
  }
);
```

### 2. Image-to-3D Generation
Convert images to 3D models using `generateRodin3DFromImage()`.

```typescript
import { generateRodin3DFromImage } from '@/engine/utils/generation/generation-util';

const result = await generateRodin3DFromImage(
  imageUrl, // or array of URLs for multi-view
  entity,
  scene,
  derivedFromId,
  {
    quality: 'medium',
    material: 'PBR',
    condition_mode: 'concat' // for multi-view images
  }
);
```

### 3. Multi-View Generation
Process multiple images of the same object for better reconstruction.

```typescript
import { generateRodin3DMultiView } from '@/engine/utils/generation/generation-util';

const result = await generateRodin3DMultiView(
  [imageUrl1, imageUrl2, imageUrl3],
  entity,
  scene,
  derivedFromId,
  'concat', // or 'fuse' for feature fusion
  {
    quality: 'high',
    material: 'PBR'
  }
);
```

### 4. High-Quality Generation
Generate production-ready models with 4K textures using HighPack.

```typescript
import { generateRodin3DHighQuality } from '@/engine/utils/generation/generation-util';

// Text-to-3D with HighPack
const result = await generateRodin3DHighQuality(
  "A detailed medieval sword",
  entity,
  scene,
  derivedFromId,
  {
    generate_with_pose: false,
    bounding_box: [1, 1, 1]
  }
);
```

## Configuration Options

### Quality Settings
- `high`: Best quality, slower generation
- `medium`: Balanced quality and speed (default)
- `low`: Faster generation, lower quality
- `extra-low`: Fastest generation

### Material Types
- `PBR`: Physically Based Rendering materials (default)
- `Shaded`: Stylized shading

### File Formats
- `glb`: GLTF Binary (default, recommended)
- `usdz`: USD for iOS/AR
- `fbx`: Autodesk FBX
- `obj`: Wavefront OBJ
- `stl`: STL for 3D printing

### Advanced Options
- `hyper_mode`: Enhanced quality mode
- `generate_with_pose`: T/A pose for human-like models
- `generation_adds_on`: Array of add-ons like `["HighPack"]`
- `bounding_box`: Dimensions constraint `[X, Y, Z]`

## UI Integration

The GenerativeEntityPanel now includes:

1. **3D Method Selector**: Choose between Trellis (fast) and Hyper3D Rodin (production quality)
2. **Text→3D Button**: Generate 3D models directly from text (Rodin only)
3. **Image→3D Button**: Convert current image to 3D model

## Cost Information

Based on the [fal.ai pricing](https://fal.ai/models/fal-ai/hyper3d/rodin):
- Standard generation: $0.40 per model
- HighPack add-on: 3x cost ($1.20) for 4K textures and high-poly models

## Tips for Best Results

1. **For Text-to-3D**: Use detailed, specific prompts
2. **For Image-to-3D**: Use high-quality images with clear object visibility
3. **For Multi-view**: Provide images from different angles of the same object
4. **For Production**: Use HighPack add-on for final assets requiring 4K textures

## Error Handling

The integration includes comprehensive error handling and progress tracking. Errors are logged to the console and displayed as toast notifications to users.
