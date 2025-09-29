import * as THREE from 'three';

/**
 * Utility to fix lighting and material issues with generated 3D models
 */

export const fix3DModelLighting = (model: THREE.Object3D, options: {
  brightenModel?: boolean;
  addAmbientLight?: boolean;
  adjustEmissive?: boolean;
} = {}) => {
  const {
    brightenModel = true,
    addAmbientLight = true,
    adjustEmissive = true
  } = options;

  // Fix materials on the model
  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const material = child.material;
      
      if (material instanceof THREE.MeshStandardMaterial) {
        // Fix common issues with generated 3D models
        
        if (adjustEmissive) {
          // Reduce excessive emissive that makes models look flat
          material.emissiveIntensity = Math.min(material.emissiveIntensity, 0.2);
          
          // If emissive is too strong, tone it down
          if (material.emissive && material.emissive.r > 0.8) {
            material.emissive.multiplyScalar(0.3);
          }
        }
        
        if (brightenModel) {
          // Only brighten the base color if it's very dark (close to black)
          // This avoids overriding user-set colors
          if (material.color.r < 0.1 && material.color.g < 0.1 && material.color.b < 0.1) {
            console.log('fix3DModelLighting: Brightening very dark color from', material.color);
            material.color.multiplyScalar(3.0); // Make it more visible but still dark
          }
          
          // Ensure the model responds well to lighting
          material.roughness = Math.max(material.roughness, 0.4);
          material.metalness = Math.min(material.metalness, 0.3);
        }
        
        // Ensure double-sided rendering for better visibility
        material.side = THREE.DoubleSide;
        
        material.needsUpdate = true;
      }
      
      // Ensure mesh casts and receives shadows
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  
  // Add ambient light to the scene if requested
  if (addAmbientLight) {
    const scene = model.parent;
    if (scene instanceof THREE.Scene) {
      // Check if we need more ambient light
      const existingAmbient = scene.children.find(child => 
        child instanceof THREE.AmbientLight
      ) as THREE.AmbientLight;
      
      if (!existingAmbient) {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        console.log('Added ambient light for 3D model visibility');
      } else if (existingAmbient.intensity < 0.5) {
        existingAmbient.intensity = 0.6;
        console.log('Increased ambient light intensity');
      }
    }
  }
};

/**
 * Specifically fix the emissive material issue that makes models look flat
 */
export const fixEmissiveMaterials = (model: THREE.Object3D) => {
  model.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
      // The issue is often that emissiveMap is set to the same as the main texture
      // and emissive intensity is too high, making the model self-lit and flat
      
      if (child.material.emissiveMap === child.material.map) {
        // Remove emissive map or reduce its impact
        child.material.emissiveIntensity = 0.1;
        child.material.emissive.set(0.05, 0.05, 0.05); // Very subtle emissive
      }
      
      // Ensure the material responds to scene lighting
      child.material.color.multiplyScalar(1.2); // Brighten base color
      child.material.roughness = 0.8; // More diffuse
      child.material.metalness = 0.1; // Less metallic
      
      child.material.needsUpdate = true;
    }
  });
};

/**
 * Add better lighting setup for 3D models
 */
export const improveSceneLighting = (scene: THREE.Scene) => {
  // Add or improve ambient light
  const existingAmbient = scene.children.find(child => 
    child instanceof THREE.AmbientLight
  ) as THREE.AmbientLight;
  
  if (!existingAmbient) {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
  } else {
    existingAmbient.intensity = Math.max(existingAmbient.intensity, 0.6);
  }
  
  // Add or improve directional light
  const existingDirectional = scene.children.find(child => 
    child instanceof THREE.DirectionalLight
  ) as THREE.DirectionalLight;
  
  if (!existingDirectional) {
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
  } else {
    existingDirectional.intensity = Math.max(existingDirectional.intensity, 0.8);
  }
  
  console.log('Improved scene lighting for 3D model visibility');
};
