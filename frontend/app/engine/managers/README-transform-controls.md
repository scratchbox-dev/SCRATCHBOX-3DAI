# Transform Controls & 3D Object Scaling

This document explains the enhanced transform control system with improved 3D object scaling capabilities.

## Transform Modes

The system supports four transform modes accessible via the toolbar or keyboard shortcuts:

### 1. Position Mode (W key)
- **Icon**: Move arrows
- **Function**: Translate objects in 3D space
- **Gizmo**: XYZ translation handles

### 2. Rotation Mode (E key)
- **Icon**: Rotation arrows
- **Function**: Rotate objects around their center
- **Gizmo**: XYZ rotation rings

### 3. Scale Mode (R key) ⭐ **Enhanced**
- **Icon**: Maximize arrows
- **Function**: Scale objects along individual axes
- **Gizmo**: XYZ scale handles (corner and edge handles)
- **Features**:
  - Independent axis scaling
  - Uniform scaling toggle
  - Proportional scaling lock

### 4. Bounding Box Mode (T key) ⭐ **New**
- **Icon**: 3D cube
- **Function**: Scale objects using bounding box visualization
- **Gizmo**: Corner and edge handles for intuitive scaling
- **Features**:
  - Visual bounding box representation
  - Corner handles for uniform scaling
  - Edge handles for axis-specific scaling

## Scaling Features

### Uniform Scaling Toggle
When in Scale or Bounding Box mode, a lock/unlock button appears:

- **🔒 Locked (Uniform)**: All axes scale proportionally together
- **🔓 Unlocked (Free)**: Each axis can be scaled independently

### Transform Space
Toggle between World and Local coordinate systems:
- **🌍 World Space**: Transform relative to world coordinates
- **📦 Local Space**: Transform relative to object's local coordinates

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `W` | Switch to Position mode |
| `E` | Switch to Rotation mode |
| `R` | Switch to Scale mode |
| `T` | Switch to Bounding Box mode |
| `Q` | Toggle World/Local space |
| `X` | Toggle gizmo visibility |
| `F` | Focus camera on selected object |

## Usage Examples

### Basic Scaling
1. Select a 3D object
2. Press `R` or click the Scale button
3. Drag the colored handles to scale along specific axes
4. Use corner handles for uniform scaling

### Proportional Scaling
1. Enter Scale mode (`R`)
2. Click the lock button (🔒) to enable uniform scaling
3. Now all handles will scale proportionally

### Bounding Box Scaling
1. Press `T` or click the Bounding Box button
2. Use the visual bounding box handles
3. Corner handles automatically maintain proportions
4. Edge handles scale along specific axes

## API Methods

### TransformControlManager Methods

```typescript
// Set transform mode
setTransformControlMode(mode: TransformMode): TransformMode

// Enable/disable uniform scaling
setUniformScaling(enabled: boolean): void

// Set gizmo size
setGizmoSize(size: number): void

// Toggle transform space
toggleTransformControlSpace(): TransformSpace

// Set allowed transform modes for selected object
setAllowedModes(modes: TransformMode[]): void
```

### Transform Modes Enum
```typescript
enum TransformMode {
    Position = 0,
    Rotation = 1,
    Scale = 2,
    BoundingBox = 3
}
```

## Integration with Entities

Different entity types can restrict which transform modes are available:

```typescript
// Example: Limit a light entity to position and rotation only
entity.selectableConfig = {
    allowedTransformModes: [TransformMode.Position, TransformMode.Rotation],
    defaultTransformMode: TransformMode.Position,
    controlSize: 1.0
};
```

## Technical Implementation

The scaling system uses Three.js TransformControls with enhancements:

- **Scale Mode**: Direct axis scaling with optional uniform constraints
- **Bounding Box Mode**: Visual feedback with the same underlying scale controls
- **Uniform Scaling**: Implemented via `setScaleSnap()` for proportional scaling
- **History Integration**: All transforms are recorded for undo/redo
- **Entity Integration**: Respects per-entity transform restrictions

## Best Practices

1. **Use Bounding Box mode** for intuitive object resizing
2. **Enable uniform scaling** when maintaining proportions is important
3. **Use Local space** when scaling relative to object orientation
4. **Use World space** for consistent scaling relative to scene coordinates
5. **Focus on objects** (`F` key) before scaling for better visibility
