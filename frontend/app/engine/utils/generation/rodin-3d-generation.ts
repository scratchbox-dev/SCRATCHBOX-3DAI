import { fal, Result } from "@fal-ai/client";
import { GenerationResult } from "./realtime-generation-util";
import { GenerativeEntity } from "@/engine/entity/types/GenerativeEntity";
import * as THREE from 'three';
import { FileService } from "@/engine/services/FileService/FileService";

/**
 * Hyper3D Rodin API response interface
 */
export interface RodinOutput {
  model_mesh: {
    url: string;
    content_type?: string;
    file_name?: string;
    file_size?: number;
  };
  textures: Array<{
    url: string;
    content_type: string;
    file_name: string;
    file_size: number;
    width: number;
    height: number;
  }>;
}

/**
 * Rodin generation parameters
 */
export interface RodinGenerationParams {
  // Input options
  prompt?: string;
  input_image_urls?: string | string[];
  
  // Generation options
  condition_mode?: "concat" | "fuse";
  seed?: number;
  
  // Output configuration
  geometry_file_format?: "glb" | "usdz" | "fbx" | "obj" | "stl";
  material?: "PBR" | "Shaded";
  quality?: "high" | "medium" | "low" | "extra-low";
  tier?: "Regular" | "Sketch";
  
  // Advanced options
  hyper_mode?: boolean;
  generate_with_pose?: boolean;
  bounding_box?: [number, number, number];
  generation_adds_on?: string[];
}

/**
 * Generate a 3D model from text using Hyper3D Rodin
 */
export async function generateRodin3DFromText(
    prompt: string,
    entity: GenerativeEntity,
    scene: THREE.Scene,
    derivedFromId: string,
    options: Partial<RodinGenerationParams> = {}
): Promise<GenerationResult> {
    try {
        const params: RodinGenerationParams = {
            prompt: prompt,
            geometry_file_format: options.geometry_file_format || "glb",
            material: options.material || "PBR",
            quality: options.quality || "medium",
            tier: options.tier || "Regular",
            seed: options.seed,
            hyper_mode: options.hyper_mode || false,
            generate_with_pose: options.generate_with_pose || false,
            bounding_box: options.bounding_box,
            generation_adds_on: options.generation_adds_on,
            ...options
        };

        console.log("generateRodin3DFromText", params);

        // Call the API
        const startTime = performance.now();
        entity.setProcessingState("generating3D", "Initializing Hyper3D Rodin generation...");

        const result = await fal.subscribe("fal-ai/hyper3d/rodin", {
            input: {
                ...params,
                input_image_urls: Array.isArray(params.input_image_urls) ? params.input_image_urls : [params.input_image_urls].filter(Boolean)
            },
            logs: true,
            onQueueUpdate: (update) => {
                if (update.status === "IN_PROGRESS") {
                    const estimatedTime = Math.max(45000 - (performance.now() - startTime), 0);
                    const latestLog = `Generating 3D model... ${(estimatedTime / 1000).toFixed(1)}s est`;
                    entity.setProcessingState("generating3D", latestLog);
                }
            },
        });

        // Create generation log with the model URL
        const log = await entity.createAndApplyNewGenerationLog("model", {
            fileUrl: result.data.model_mesh.url,
            prompt: prompt,
            derivedFromId: derivedFromId
        });

        entity.setProcessingState("idle", "3D model generated successfully!");

        return { success: true, generationLog: log };
    } catch (error) {
        console.error("Rodin text-to-3D generation failed:", error);
        entity.setProcessingState("idle", "Failed to generate 3D model");
        return { success: false, generationLog: null };
    }
}

/**
 * Generate a 3D model from image(s) using Hyper3D Rodin
 */
export async function generateRodin3DFromImage(
    imageUrls: string | string[],
    entity: GenerativeEntity,
    scene: THREE.Scene,
    derivedFromId: string,
    options: Partial<RodinGenerationParams> = {}
): Promise<GenerationResult> {
    try {
        // Convert image URLs to base64 if needed
        const processedImageUrls = Array.isArray(imageUrls) ? imageUrls : [imageUrls];
        const base64Images: string[] = [];
        
        for (const imageUrl of processedImageUrls) {
            try {
                const base64Data = await FileService.getInstance().readFileAsDataUrl(imageUrl);
                base64Images.push(base64Data);
            } catch (error) {
                console.warn(`Failed to convert image to base64: ${imageUrl}`, error);
                // Fallback to using the original URL
                base64Images.push(imageUrl);
            }
        }

        const params: RodinGenerationParams = {
            input_image_urls: base64Images.length === 1 ? base64Images[0] : base64Images,
            condition_mode: options.condition_mode || (base64Images.length > 1 ? "concat" : undefined),
            geometry_file_format: options.geometry_file_format || "glb",
            material: options.material || "PBR",
            quality: options.quality || "medium",
            tier: options.tier || "Regular",
            seed: options.seed,
            hyper_mode: options.hyper_mode || false,
            generate_with_pose: options.generate_with_pose || false,
            bounding_box: options.bounding_box,
            generation_adds_on: options.generation_adds_on,
            prompt: options.prompt, // Optional prompt for image-to-3D
            ...options
        };

        console.log("generateRodin3DFromImage", params);

        // Call the API
        const startTime = performance.now();
        entity.setProcessingState("generating3D", "Initializing Hyper3D Rodin image-to-3D...");

        const result = await fal.subscribe("fal-ai/hyper3d/rodin", {
            input: {
                ...params,
                input_image_urls: Array.isArray(params.input_image_urls) ? params.input_image_urls : [params.input_image_urls].filter(Boolean)
            },
            logs: true,
            onQueueUpdate: (update) => {
                if (update.status === "IN_PROGRESS") {
                    const estimatedTime = Math.max(45000 - (performance.now() - startTime), 0);
                    const latestLog = `Converting image to 3D... ${(estimatedTime / 1000).toFixed(1)}s est`;
                    entity.setProcessingState("generating3D", latestLog);
                }
            },
        });

        // Create generation log with the model URL
        const log = await entity.createAndApplyNewGenerationLog("model", {
            fileUrl: result.data.model_mesh.url,
            prompt: options.prompt || "Image-to-3D conversion",
            derivedFromId: derivedFromId
        });

        entity.setProcessingState("idle", "3D model generated from image successfully!");

        return { success: true, generationLog: log };
    } catch (error) {
        console.error("Rodin image-to-3D generation failed:", error);
        entity.setProcessingState("idle", "Failed to generate 3D model from image");
        return { success: false, generationLog: null };
    }
}

/**
 * Generate a 3D model with multi-view fusion using Hyper3D Rodin
 */
export async function generateRodin3DMultiView(
    imageUrls: string[],
    entity: GenerativeEntity,
    scene: THREE.Scene,
    derivedFromId: string,
    fusionMode: "concat" | "fuse" = "concat",
    options: Partial<RodinGenerationParams> = {}
): Promise<GenerationResult> {
    if (imageUrls.length < 2) {
        throw new Error("Multi-view generation requires at least 2 images");
    }

    return generateRodin3DFromImage(
        imageUrls,
        entity,
        scene,
        derivedFromId,
        {
            ...options,
            condition_mode: fusionMode
        }
    );
}

/**
 * Generate a high-quality 3D model with HighPack add-on
 */
export async function generateRodin3DHighQuality(
    promptOrImages: string | string[],
    entity: GenerativeEntity,
    scene: THREE.Scene,
    derivedFromId: string,
    options: Partial<RodinGenerationParams> = {}
): Promise<GenerationResult> {
    const highQualityOptions: Partial<RodinGenerationParams> = {
        ...options,
        quality: "high",
        generation_adds_on: ["HighPack"],
        hyper_mode: true
    };

    if (typeof promptOrImages === 'string' && !promptOrImages.startsWith('http')) {
        // Text-to-3D
        return generateRodin3DFromText(
            promptOrImages,
            entity,
            scene,
            derivedFromId,
            highQualityOptions
        );
    } else {
        // Image-to-3D
        return generateRodin3DFromImage(
            promptOrImages,
            entity,
            scene,
            derivedFromId,
            highQualityOptions
        );
    }
}
