import { fal, Result } from "@fal-ai/client";
import * as THREE from 'three';
import { GenerativeEntity } from '@/engine/entity/types/GenerativeEntity';
import { IGenerationLog } from '@/engine/interfaces/generation';
import { GenerationResult } from "./realtime-generation-util";

// Export Rodin generation functions
export {
    generateRodin3DFromText,
    generateRodin3DFromImage,
    generateRodin3DMultiView,
    generateRodin3DHighQuality,
    type RodinGenerationParams,
    type RodinOutput
} from './rodin-3d-generation';



// Types for callbacks and results
export interface GenerationProgress {
    message: string;
    progress?: number;
}

export interface PromptProps {
    prompt: string;
    negative_prompt?: string;
    width?: number;
    height?: number;
}


export type ProgressCallback = (progress: GenerationProgress) => void;

/**
 * Generate a thumbnail from a panoramic image
 */
async function generateThumbnail(imageUrl: string, size: number = 256): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
            try {
                // Create canvas for thumbnail
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }
                
                canvas.width = size;
                canvas.height = size;
                
                // For panoramic images, we'll take the center portion and make it square
                const sourceWidth = img.width;
                const sourceHeight = img.height;
                
                // Take a square section from the center of the panoramic image
                const cropSize = Math.min(sourceWidth / 4, sourceHeight); // Take 1/4 width or full height, whichever is smaller
                const sourceX = (sourceWidth - cropSize) / 2;
                const sourceY = (sourceHeight - cropSize) / 2;
                
                // Draw the cropped and scaled image
                ctx.drawImage(
                    img, 
                    sourceX, sourceY, cropSize, cropSize,  // Source crop
                    0, 0, size, size                        // Destination
                );
                
                // Convert to data URL
                const thumbnailDataUrl = canvas.toDataURL('image/webp', 0.8);
                resolve(thumbnailDataUrl);
                
            } catch (error) {
                reject(error);
            }
        };
        
        img.onerror = () => {
            reject(new Error('Failed to load image for thumbnail generation'));
        };
        
        img.src = imageUrl;
    });
}

/**
 * Generate a skybox/panoramic environment using FAL AI API
 */
export async function generateSkybox(
    prompt: string,
    options: {
        negativePrompt?: string;
        resolution?: '2K' | '4K';
        onProgress?: ProgressCallback;
    } = {}
): Promise<{ imageUrl: string; filename: string; width: number; height: number; thumbnailUrl: string }> {
    const startTime = performance.now();
    
    // Optimize prompt for 360° panoramic generation
    const panoramicPrompt = `360 degree panoramic view, equirectangular projection, seamless horizon, immersive environment, ${prompt}, high quality HDRI, no seams, spherical mapping`;
    
    const negativePrompt = options.negativePrompt || 'cropped, distorted, seams, text, watermark, logos, split screen, multiple views, frame, border';
    
    // Set resolution - panoramic images should be 2:1 aspect ratio
    const width = options.resolution === '4K' ? 4096 : 2048;
    const height = options.resolution === '4K' ? 2048 : 1024;
    
    console.log(`%cGenerating skybox: "${panoramicPrompt}"`, "color: #4CAF50; font-weight: bold;");
    
    if (options.onProgress) {
        options.onProgress({ message: 'Starting skybox generation...', progress: 0 });
    }

    try {
        const result = await fal.subscribe("fal-ai/flux/dev", {
            input: {
                prompt: panoramicPrompt,
                image_size: {
                    width: width,
                    height: height
                },
                num_inference_steps: 28, // Higher steps for better quality
                guidance_scale: 7.5
            },
            logs: true,
            onQueueUpdate: (update) => {
                if (update.status === "IN_PROGRESS") {
                    console.log("Skybox generation in progress...");
                    if (options.onProgress) {
                        options.onProgress({ message: 'Generating skybox...', progress: 50 });
                    }
                    update.logs?.map((log) => log.message).forEach(console.log);
                }
            },
        });

        if (!result.data.images || result.data.images.length === 0) {
            throw new Error('No images generated');
        }

        const imageUrl = result.data.images[0].url;
        
        // Generate unique filename with timestamp
        const timestamp = Date.now();
        const filename = `generated_${timestamp}.jpg`;
        
        if (options.onProgress) {
            options.onProgress({ message: 'Generating thumbnail...', progress: 90 });
        }
        
        // Generate thumbnail from the panoramic image
        const thumbnailUrl = await generateThumbnail(imageUrl, 256);
        
        const duration = performance.now() - startTime;
        console.log(`%cSkybox generation completed in ${(duration / 1000).toFixed(2)} seconds`, "color: #4CAF50; font-weight: bold;");
        
        if (options.onProgress) {
            options.onProgress({ message: 'Skybox generated successfully!', progress: 100 });
        }

        return {
            imageUrl,
            filename,
            width,
            height,
            thumbnailUrl
        };

    } catch (error) {
        console.error('Error generating skybox:', error);
        if (options.onProgress) {
            options.onProgress({ message: 'Failed to generate skybox', progress: 0 });
        }
        throw error;
    }
}

/**
 * Generate an image using the FAL AI API with persistent WebSocket connection
 */
export async function generateBackground(
    prompt: string,
    entity: GenerativeEntity,
    scene: THREE.Scene,
    options: {
        negativePrompt?: string;
    } = {}
): Promise<GenerationResult> {
    // Use defaults if not provided
    const startTime = performance.now();
    const entityType = entity.getEntityType();
    const negativePrompt = options.negativePrompt || 'cropped, out of frame, blurry, blur';
    // Update entity state
    entity.setProcessingState('generating2D', 'Starting generation...');

    const result = await fal.subscribe("fal-ai/flux/dev", {
        input: {
            prompt: prompt,
            image_size: {
                width: 1280,
                height: 720
            }
            // Flux Dev might have different parameters than the other models
            // so we're just using the basic ones for now
        },
        logs: true,
        onQueueUpdate: (update) => {
            if (update.status === "IN_PROGRESS") {
                console.log("Flux generation in progress...");
                update.logs?.map((log) => log.message).forEach(console.log);
            }
        },
    });

    let log: IGenerationLog | null = null;
    const success = result.data.images.length > 0;
    if (success && result.data.images[0].url) {

        // Apply the image to the entity mesh
        entity.applyImage(result.data.images[0].url);

        // Add to history
        log = entity.addImageGenerationLog(prompt, result.data.images[0].url, '16:9',);

        // Log time
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.log(`%cBackground generation took ${(duration / 1000).toFixed(2)} seconds`, "color: #4CAF50; font-weight: bold;");
    }

    entity.setProcessingState('idle', success ? 'Image generated successfully!' : 'Failed to generate image');

    return { success: success, generationLog: log };
}

/**
 * Remove background from an image using the FAL AI API
 */
export async function removeBackground(
    imageUrl: string,
    entity: GenerativeEntity,
    derivedFromId: string
): Promise<GenerationResult> {
    // Update entity state
    entity.setProcessingState('generating2D', 'Removing background...');

    try {
        const startTime = performance.now();

        // Call the FAL API to remove background
        const result = await fal.subscribe("fal-ai/imageutils/rembg", {
            input: {
                image_url: imageUrl
            },
            logs: true,
            onQueueUpdate: (update) => {
                if (update.status === "IN_PROGRESS") {
                    console.log("Background removal in progress...");
                    update.logs?.map((log) => log.message).forEach(console.log);
                }
            },
        });

        const success = result.data && result.data.image && result.data.image.url;
        if (success) {
            // Apply the image to the entity mesh
            await entity.applyImage(result.data.image.url, entity.temp_ratio);

            // Add to history - note this is a special case derived from another image
            const prompt = entity.getCurrentGenerationLog()?.prompt || '';
            const log = entity.addImageGenerationLog(prompt, result.data.image.url, 
               entity.temp_ratio || '1:1',
            );

            // Log time
            const endTime = performance.now();
            const duration = endTime - startTime;
            console.log(`%cBackground removal took ${(duration / 1000).toFixed(2)} seconds`, "color: #4CAF50; font-weight: bold;");

            entity.setProcessingState('idle', 'Background removed successfully!');

            return { success: true, generationLog: log };
        }

        throw new Error('Failed to remove background');

    } catch (error) {
        console.error("Background removal failed:", error);
        entity.setProcessingState('idle', 'Failed to remove background');
        return {
            success: false,
            generationLog: null
        };
    }
}