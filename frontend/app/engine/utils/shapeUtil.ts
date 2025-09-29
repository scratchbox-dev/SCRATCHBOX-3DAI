import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ShapeType } from '@/engine/entity/types/ShapeEntity';
import { defaultShapeMaterial } from './materialUtil';

let cachedMeshes: Map<string, THREE.Mesh> = new Map();

// Helper to clone meshes with materials
const cloneMesh = (mesh: THREE.Mesh): THREE.Mesh => {
  const clonedMesh = mesh.clone();
  
  // Clone the geometry
  if (mesh.geometry) {
    clonedMesh.geometry = mesh.geometry.clone();
  }
  
  // Clone the material
  if (mesh.material) {
    if (Array.isArray(mesh.material)) {
      clonedMesh.material = mesh.material.map(mat => mat.clone());
    } else {
      clonedMesh.material = mesh.material.clone();
    }
  }
  
  return clonedMesh;
};

// Add this function to load all shape meshes once
export async function loadShapeMeshes(scene: THREE.Scene): Promise<void> {
  // Create a map to store the loaded meshes
  const shapeMeshes = new Map<string, THREE.Mesh>();
  
  try {
    console.log("Loading shape meshes from GLTF file...");
    
    // Create a loader
    const loader = new GLTFLoader();
    
    // Load the model
    const gltf = await new Promise<any>((resolve, reject) => {
      loader.load(
        "./models/shapes.gltf",
        (gltf) => resolve(gltf),
        undefined,
        (error) => reject(error)
      );
    });
    
    // Process all meshes
    gltf.scene.traverse((object: THREE.Object3D) => {
      if (object instanceof THREE.Mesh) {
        const meshName = object.name.toLowerCase();
        console.log(`Caching shape mesh: ${meshName}`);
        
        // Hide the original mesh
        object.visible = false;
        
        // Add to cache
        shapeMeshes.set(meshName, object);
      }
    });
    
    // Store in environment objects
    cachedMeshes = shapeMeshes;
    
    console.log(`Successfully cached ${shapeMeshes.size} shape meshes`);
  } catch (error) {
    console.error("Error loading shape meshes:", error);
  }
}

export const createShapeMesh = (scene: THREE.Scene, shapeType: ShapeType): THREE.Mesh => {
  // Check if the cached meshes exist
  if (!cachedMeshes || cachedMeshes.size === 0) {
    console.warn("Shape meshes haven't been loaded yet. Creating fallback box.");
    // Create a fallback box if meshes aren't loaded yet
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.4,
      side: THREE.DoubleSide
    });
    return new THREE.Mesh(geometry, material);
  }
  
  // Check if the shape exists in our cache
  const cachedMesh = cachedMeshes.get(shapeType);
  
  if (cachedMesh) {
    // Clone the cached mesh
    const clonedMesh = cloneMesh(cachedMesh);
    
    // Apply the default material for proper lighting
    if (defaultShapeMaterial) {
      clonedMesh.material = defaultShapeMaterial.clone();
      const material = clonedMesh.material as THREE.MeshStandardMaterial;
      console.log("Applied defaultShapeMaterial to cloned mesh:", {
        color: material?.color,
        metalness: material?.metalness,
        roughness: material?.roughness
      });
    } else {
      // Fallback material if defaultShapeMaterial isn't ready
      clonedMesh.material = new THREE.MeshStandardMaterial({ 
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0.4,
        side: THREE.DoubleSide
      });
      const fallbackMaterial = clonedMesh.material as THREE.MeshStandardMaterial;
      console.log("Applied fallback material to cloned mesh:", {
        color: fallbackMaterial?.color,
        metalness: fallbackMaterial?.metalness,
        roughness: fallbackMaterial?.roughness
      });
    }
    
    // Make sure it's visible
    clonedMesh.visible = true;
    
    // DON'T add to scene here - the EntityBase constructor will handle that
    // scene.add(clonedMesh);
    
    // Return the created mesh
    console.log(`createShapeMesh: ${clonedMesh.name}`);
    return clonedMesh;
  }
  
  console.warn(`Shape "${shapeType}" not found in cached meshes. Creating fallback box.`);
  // Create a fallback box
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ 
    color: 0xffffff,
    metalness: 0.1,
    roughness: 0.4,
    side: THREE.DoubleSide
  });
  return new THREE.Mesh(geometry, material);
}

