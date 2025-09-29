import * as THREE from 'three';
import { ImageRatio } from "@/engine/utils/imageUtil";
import { EditorEngine } from "../core/EditorEngine";

export const skyboxFolder = "./demoAssets/skybox/";
export let skyboxFiles = [
    "1.jpg",
    "2.jpg",
    "3.jpg",
    "4.jpg",
    "5.jpg",
    "6.jpg",
    "7.jpg",
    // "8.jpg",
    // "9.jpg",
    // "10.jpg",
    "HDRI2_7_output.jpg",
    "HDRI2_21_output.jpg",
    // "HDRI2_28_output.jpg"
];

// Storage for generated skybox thumbnails
const generatedSkyboxThumbnails = new Map<string, string>();

/**
 * Add a generated skybox to the available skyboxes list
 */
export const addGeneratedSkybox = (filename: string, thumbnailUrl?: string) => {
    if (!skyboxFiles.includes(filename)) {
        skyboxFiles.unshift(filename); // Add to beginning of list
        console.log(`Added generated skybox: ${filename}`);
        
        // Store thumbnail mapping if provided
        if (thumbnailUrl) {
            generatedSkyboxThumbnails.set(filename, thumbnailUrl);
        }
    }
};

/**
 * Get thumbnail URL for a skybox file
 */
export const getSkyboxThumbnailUrl = (filename: string): string => {
    // Check if it's a generated skybox with stored thumbnail
    if (generatedSkyboxThumbnails.has(filename)) {
        return generatedSkyboxThumbnails.get(filename)!;
    }
    
    // For static skyboxes, use the standard thumbnail path
    return `${skyboxFolder}${filename.replace('.jpg', '_thumb.webp')}`;
};

/**
 * Get all available skyboxes (static + generated)
 */
export const getAllSkyboxFiles = () => {
    return [...skyboxFiles]; // Return a copy
};

interface SerializedEnvironment {
    sun?: {
        intensity: number;
        color: { r: number, g: number, b: number };
        direction: { x: number, y: number, z: number };
    };
    ambientLight?: {
        intensity: number;
        color: { r: number, g: number, b: number };
    };
    ratioOverlay?: {
        visible: boolean;
        ratio: ImageRatio;
        padding: number;
        rightExtraPadding?: number;
    };
    skybox: {
        path?: string;
    };
    camera?: {
        fov: number;
        farClip: number;
        position: { x: number, y: number, z: number };
        target: { x: number, y: number, z: number };
    };
}

export interface EnvironmentObjects {
    sun?: THREE.DirectionalLight;
    sunHelper?: THREE.DirectionalLightHelper;
    ambientLight?: THREE.AmbientLight;
    pointLights: THREE.PointLight[];
    skybox?: {
        path?: string;
    }
    background?: THREE.Mesh;
    grid?: THREE.GridHelper | THREE.Mesh;
}

export class EnvironmentManager {
    private engine: EditorEngine;
    private envSetting: EnvironmentObjects = {
        pointLights: [],
    };
    private currentTheme: 'dark' | 'light' = 'light'; // Default to light theme

    constructor(engine: EditorEngine) {
        this.engine = engine;
        this.createDefaultEnvironment();
    }

    createDefaultEnvironment(): void {
        const scene = this.engine.getScene();
        this.createWorldGrid(scene);
        this.createLights(scene);
        // Apply the default light theme instead of skybox
        this.applyTheme();
    }

    createWorldGrid = (
        scene: THREE.Scene,
        size: number = 100,
        divisions: number = 100
    ): THREE.GridHelper => {
        // Create a grid helper
        const grid = new THREE.GridHelper(size, divisions);
        grid.position.y = -0.01; // Slightly above 0 to avoid z-fighting
        grid.material.transparent = true;
        grid.material.opacity = 0.25;
        scene.add(grid);

        // Store in environment objects
        this.envSetting.grid = grid;

        return grid;
    };

    createLights = (scene: THREE.Scene): void => {
        // Create ambient light for even illumination - high intensity for proper object visibility
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.5); // Increased to 1.5 for much better visibility
        scene.add(ambientLight);
        this.envSetting.ambientLight = ambientLight;

        // Create directional light (sun) with higher intensity for better object illumination
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.5); // Increased from 1.0 to 1.5
        sunLight.position.set(2, 5, 2);
        sunLight.castShadow = true;
        
        console.log('EnvironmentManager: Created lights:', {
          ambientIntensity: ambientLight.intensity,
          directionalIntensity: sunLight.intensity,
          directionalPosition: sunLight.position
        });

        // Configure shadow properties
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 50;

        // Set up shadow camera frustum
        const d = 20;
        sunLight.shadow.camera.left = -d;
        sunLight.shadow.camera.right = d;
        sunLight.shadow.camera.top = d;
        sunLight.shadow.camera.bottom = -d;

        scene.add(sunLight);
        this.envSetting.sun = sunLight;

        // // Create helper for the sun
        // const sunHelper = new THREE.DirectionalLightHelper(sunLight, 5);
        // scene.add(sunHelper);
        // this.envObjects.sunHelper = sunHelper;
    };

    createSkybox = (scene: THREE.Scene, url?: string): void => {
        if (url) {
            // Load equirectangular texture
            const textureLoader = new THREE.TextureLoader();
            textureLoader.load(url, (texture) => {
                texture.mapping = THREE.EquirectangularReflectionMapping;

                // Set as background and environment map
                scene.background = texture;
                scene.environment = texture; // For reflections on materials
                scene.environmentIntensity = 0.5;
            });
        } else {
            // Fallback to solid color background
            scene.background = new THREE.Color(0.3, 0.3, 0.3);
        }

        this.envSetting.skybox = {
            path: url
        };
    };

    /**
     * Create and apply a generated skybox from a URL
     */
    createGeneratedSkybox = async (scene: THREE.Scene, imageUrl: string, filename: string, thumbnailUrl?: string): Promise<void> => {
        try {
            // Add to the available skyboxes list
            addGeneratedSkybox(filename, thumbnailUrl);
            
            // Apply the skybox immediately
            this.createSkybox(scene, imageUrl);
            
            console.log(`Applied generated skybox: ${filename}`);
        } catch (error) {
            console.error('Failed to create generated skybox:', error);
            throw error;
        }
    };


    public getEnvObjects(): EnvironmentObjects {
        return this.envSetting;
    }

    // Serialize environment settings
    serializeEnvironment(): SerializedEnvironment {
        const scene = this.engine.getScene();
        const env = this.envSetting;
        const serializedEnv: SerializedEnvironment = {
            skybox: {
                path: env.skybox?.path || undefined
            }
        };

        // Serialize sun properties
        if (env.sun) {
            serializedEnv.sun = {
                intensity: env.sun.intensity,
                color: {
                    r: env.sun.color.r,
                    g: env.sun.color.g,
                    b: env.sun.color.b
                },
                direction: {
                    x: env.sun.position.x,
                    y: env.sun.position.y,
                    z: env.sun.position.z
                }
            };
        }

        // Serialize ambient light properties
        if (env.ambientLight) {
            serializedEnv.ambientLight = {
                intensity: env.ambientLight.intensity,
                color: {
                    r: env.ambientLight.color.r,
                    g: env.ambientLight.color.g,
                    b: env.ambientLight.color.b
                }
            };
        }

        // Serialize camera settings
        const camera = this.engine.getCameraManager().getCamera();
        if (camera) {
            serializedEnv.camera = {
                fov: camera.fov,
                farClip: camera.far,
                position: {
                    x: camera.position.x,
                    y: camera.position.y,
                    z: camera.position.z
                },
                target: {
                    x: 0, y: 0, z: 0 // Need to get target from OrbitControls
                }
            };
        }

        return serializedEnv;
    }

    deserializeEnvironment(data: SerializedEnvironment): void {
        const scene = this.engine.getScene();

        // Apply sun settings
        if (data.sun && this.envSetting.sun) {
            this.envSetting.sun.intensity = data.sun.intensity;
            this.envSetting.sun.color.setRGB(
                data.sun.color.r,
                data.sun.color.g,
                data.sun.color.b
            );
            this.envSetting.sun.position.set(
                data.sun.direction.x,
                data.sun.direction.y,
                data.sun.direction.z
            );

            // Update helper if it exists
            if (this.envSetting.sunHelper) {
                this.envSetting.sunHelper.update();
            }
        }

        // Apply ambient light settings
        if (data.ambientLight && this.envSetting.ambientLight) {
            this.envSetting.ambientLight.intensity = data.ambientLight.intensity;
            this.envSetting.ambientLight.color.setRGB(
                data.ambientLight.color.r,
                data.ambientLight.color.g,
                data.ambientLight.color.b
            );
        }

        // Apply skybox settings
        if (data.skybox && this.envSetting.skybox) {
            this.envSetting.skybox.path = data.skybox.path;
            this.createSkybox(scene, data.skybox.path);
        }

        // Apply camera settings
        // TODO: Move to CameraManager
        if (data.camera) {
            const cameraManager = this.engine.getCameraManager();
            const camera = cameraManager.getCamera();

            // Update FOV
            if (data.camera.fov !== undefined) {
                cameraManager.setFOV(data.camera.fov);
            }

            // Update far clip
            if (data.camera.farClip !== undefined) {
                cameraManager.setFarClip(data.camera.farClip);
            }

            // Update position
            if (data.camera.position) {
                camera.position.set(
                    data.camera.position.x,
                    data.camera.position.y,
                    data.camera.position.z
                );
            }

            // Update target
            if (data.camera.target) {
                const orbitControls = this.engine.getCameraManager().getOrbitControls();
                if (orbitControls) {
                    orbitControls.target.set(
                        data.camera.target.x,
                        data.camera.target.y,
                        data.camera.target.z
                    );
                }
            }
        }
    }

    setEnviromentGizmosVisible(visible: boolean): void {
        if (this.envSetting.grid) {
            this.envSetting.grid.visible = visible;
        }
    }

    /**
     * Get the current theme
     */
    getCurrentTheme(): 'dark' | 'light' {
        return this.currentTheme;
    }

    /**
     * Set the theme and update the environment accordingly
     */
    setTheme(theme: 'dark' | 'light'): void {
        this.currentTheme = theme;
        this.applyTheme();
    }

    // Lighting control methods
    setAmbientLightIntensity(intensity: number): void {
        if (this.envSetting.ambientLight) {
            this.envSetting.ambientLight.intensity = intensity;
            console.log('EnvironmentManager: Set ambient light intensity to:', intensity);
        }
    }

    setDirectionalLightIntensity(intensity: number): void {
        if (this.envSetting.sun) {
            this.envSetting.sun.intensity = intensity;
            console.log('EnvironmentManager: Set directional light intensity to:', intensity);
        }
    }

    getAmbientLightIntensity(): number {
        return this.envSetting.ambientLight?.intensity || 1.5;
    }

    getDirectionalLightIntensity(): number {
        return this.envSetting.sun?.intensity || 1.5;
    }

    applyLightingPreset(preset: 'bright' | 'normal' | 'dramatic'): void {
        switch (preset) {
            case 'bright':
                this.setAmbientLightIntensity(2.0);
                this.setDirectionalLightIntensity(2.5);
                break;
            case 'normal':
                this.setAmbientLightIntensity(1.0);
                this.setDirectionalLightIntensity(1.5);
                break;
            case 'dramatic':
                this.setAmbientLightIntensity(0.3);
                this.setDirectionalLightIntensity(2.0);
                break;
        }
        console.log('EnvironmentManager: Applied lighting preset:', preset);
    }

    /**
     * Apply the current theme to the scene
     */
    private applyTheme(): void {
        const scene = this.engine.getScene();
        
        if (this.currentTheme === 'light') {
            // Light theme: Clean white background with bright lighting
            scene.background = new THREE.Color(0xffffff);
            scene.environment = null; // Remove environment map for clean look
            
            // Update sun light for bright, even lighting
            if (this.envSetting.sun) {
                this.envSetting.sun.color.setHex(0xffffff);
                this.envSetting.sun.intensity = 1.0;
                this.envSetting.sun.position.set(2, 5, 2);
            }
            
            // Add ambient light for even illumination
            if (!this.envSetting.ambientLight) {
                this.envSetting.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
                scene.add(this.envSetting.ambientLight);
            } else {
                this.envSetting.ambientLight.color.setHex(0xffffff);
                this.envSetting.ambientLight.intensity = 0.6;
            }
            
            // Update grid for light theme
            if (this.envSetting.grid) {
                (this.envSetting.grid.material as THREE.Material).opacity = 0.1;
            }
            
        } else {
            // Dark theme: Dark background with moody lighting
            scene.background = new THREE.Color(0x1a1a1a);
            
            // Update sun light for darker, more dramatic lighting
            if (this.envSetting.sun) {
                this.envSetting.sun.color.setHex(0xffffff);
                this.envSetting.sun.intensity = 0.3;
                this.envSetting.sun.position.set(0, 2, 0);
            }
            
            // Reduce ambient light for darker look
            if (this.envSetting.ambientLight) {
                this.envSetting.ambientLight.color.setHex(0x404040);
                this.envSetting.ambientLight.intensity = 0.2;
            }
            
            // Update grid for dark theme
            if (this.envSetting.grid) {
                (this.envSetting.grid.material as THREE.Material).opacity = 0.25;
            }
        }
        
        console.log(`Applied ${this.currentTheme} theme`);
    }
}
