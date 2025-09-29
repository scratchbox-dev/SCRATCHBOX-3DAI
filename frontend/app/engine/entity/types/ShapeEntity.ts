import * as THREE from 'three';
import { EntityBase, SerializedEntityData, toThreeVector3, toThreeEuler } from '../base/EntityBase';
import { createShapeMesh } from '@/engine/utils/shapeUtil';
import { defaultShapeMaterial } from '@/engine/utils/materialUtil';
import { setupMeshShadows } from '@/engine/utils/lightUtil';
import { MaterialProps } from '../protperty/material';
import { trackEvent } from '@/engine/utils/external/analytics';
import { ANALYTICS_EVENTS } from '@/engine/utils/external/analytics';
import { fix3DModelLighting } from '@/engine/utils/3dModelLightingFix';

/**
 * Entity that represents primitive shapes
 */
export type ShapeType = 'cube' | 'sphere' | 'cylinder' | 'plane' | 'pyramid' | 'cone' | 'floor';
export interface ShapeEntityProps {
  shapeType: ShapeType;
  material?: MaterialProps;
}

// Add serialized data interface
export interface SerializedShapeEntityData extends SerializedEntityData {
  props: ShapeEntityProps;
}

export class ShapeEntity extends EntityBase {
  // ShapeEntity specific properties
  props: ShapeEntityProps;
  modelMesh: THREE.Mesh;

  constructor(
    name: string,
    scene: THREE.Scene,
    data: SerializedShapeEntityData,
    onLoaded?: (entity: ShapeEntity) => void
  ) {
    super(name, scene, 'shape', data);

    this.props = data.props;

    // Create the shape mesh
    const newMesh = createShapeMesh(scene, this.props.shapeType);
    this.add(newMesh);
    newMesh.userData = { rootSelectable: this };
    this.modelMesh = newMesh;

    // Setup shadows (material should already be applied by createShapeMesh)
    setupMeshShadows(newMesh);
    
    const material = Array.isArray(newMesh.material) ? newMesh.material[0] : newMesh.material;
    const standardMaterial = material as THREE.MeshStandardMaterial;
    console.log('ShapeEntity: Initial material after createShapeMesh:', {
      color: standardMaterial?.color,
      metalness: standardMaterial?.metalness,
      roughness: standardMaterial?.roughness,
      map: standardMaterial?.map,
      type: standardMaterial?.constructor.name
    });

    // Apply lighting fix BEFORE color to avoid overriding user colors
    fix3DModelLighting(this, {
      brightenModel: true,
      addAmbientLight: false, // Don't add ambient light as it's already handled by EnvironmentManager
      adjustEmissive: true
    });

    // Apply the color AFTER lighting fix to ensure it's not overridden
    if (this.props.material?.color) {
      this._applyColorToMesh(this.props.material.color);
    }

    // Final debug log to see the material state
    const finalMaterial = Array.isArray(newMesh.material) ? newMesh.material[0] : newMesh.material;
    const finalStandardMaterial = finalMaterial as THREE.MeshStandardMaterial;
    console.log('ShapeEntity: FINAL material state:', {
      color: finalStandardMaterial?.color,
      metalness: finalStandardMaterial?.metalness,
      roughness: finalStandardMaterial?.roughness,
      map: finalStandardMaterial?.map,
      visible: newMesh.visible,
      type: finalStandardMaterial?.constructor.name
    });

    // Return the created mesh
    console.log(`ShapeEntity: constructor done`, this.name, this.uuid);
    onLoaded?.(this);
  }

  /**
   * Serialize with shape-specific properties
   */
  serialize(): SerializedShapeEntityData {
    const base = super.serialize();
    return {
      ...base,
      props: this.props,
    };
  }

  private _applyColorToMesh(colorString: string): void {
    if (this.modelMesh.material) {
      console.log('ShapeEntity._applyColorToMesh: Applying color', colorString, 'to material:', this.modelMesh.material);
      
      // Always ensure we have a MeshStandardMaterial
      if (!(this.modelMesh.material instanceof THREE.MeshStandardMaterial)) {
        console.log('ShapeEntity._applyColorToMesh: Creating new MeshStandardMaterial');
        this.modelMesh.material = new THREE.MeshStandardMaterial({ 
          color: new THREE.Color(colorString),
          side: THREE.DoubleSide,
          roughness: 0.4,
          metalness: 0.1
        });
      } else {
        console.log('ShapeEntity._applyColorToMesh: Updating existing MeshStandardMaterial');
        // Update the existing material
        this.modelMesh.material.color.set(new THREE.Color(colorString));
        this.modelMesh.material.side = THREE.DoubleSide;
        this.modelMesh.material.roughness = 0.4;
        this.modelMesh.material.metalness = 0.1;
        this.modelMesh.material.needsUpdate = true;
      }
      
      const meshMaterial = this.modelMesh.material as THREE.MeshStandardMaterial;
      console.log('ShapeEntity._applyColorToMesh: Final material color:', meshMaterial?.color);
    }
  }


  public setColor(colorString: string): void {
    this.props.material = {
      ...this.props.material,
      color: colorString
    };
    this._applyColorToMesh(colorString);
  }
} 