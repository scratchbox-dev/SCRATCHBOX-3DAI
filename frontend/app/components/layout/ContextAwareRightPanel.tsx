'use client';

import React, { useState, useEffect } from 'react';
import { useEditorEngine } from '../../context/EditorEngineContext';
import { EntityBase } from '../../engine/entity/base/EntityBase';
import { cn } from '@/lib/utils';
import { 
  IconArrowsMove,
  IconRotate,
  IconArrowsMaximize,
  IconCube3dSphere,
  IconPalette,
  IconWand,
  IconPlayerPlay,
  IconSettings,
  IconEye,
  IconEyeOff,
  IconTrash,
  IconCopy,
  IconFocus,
  IconCube,
  IconPhoto,
  IconTransform,
  IconChevronDown,
  IconRefresh,
  IconDownload,
  IconX,
  IconArrowLeft,
  IconArrowRight
} from '@tabler/icons-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { Textarea } from '../ui/textarea';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';
import { downloadImage } from '@/engine/utils/helpers';

// Import skybox data and generation utilities
import { skyboxFiles, skyboxFolder, getAllSkyboxFiles, getSkyboxThumbnailUrl } from '../../engine/managers/environmentManager';
import { generateSkybox } from '../../engine/utils/generation/generation-util';
import * as THREE from 'three';

interface ContextAwareRightPanelProps {
  className?: string;
  workflowSection?: 'basic3d' | 'generate' | 'generation-frame' | 'canvas-to-image' | 'convert' | 'environment' | 'animation' | 'properties';
}

const ContextAwareRightPanel: React.FC<ContextAwareRightPanelProps> = ({ className, workflowSection }) => {
  const { engine, gizmoMode, gizmoSpace, renderSettings, openGallery, galleryOpen, selectedEntity: contextSelectedEntity, selectedSelectable, setAspectRatio } = useEditorEngine();
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'transform' | 'material' | 'ai' | 'animation'>('transform');
  const [localGalleryOpen, setLocalGalleryOpen] = useState(false);
  const [localGalleryImages, setLocalGalleryImages] = useState<any[]>([]);
  const [localCurrentIndex, setLocalCurrentIndex] = useState(0);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [transformValues, setTransformValues] = useState({
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 }
  });
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Workflow-related state
  const [projectName, setProjectName] = useState('cat');
  const [isConverting, setIsConverting] = useState(false);
  const [isRemovingBG, setIsRemovingBG] = useState(false);
  const [activeSkybox, setActiveSkybox] = useState<string | null>(null);
  const [skyboxPrompt, setSkyboxPrompt] = useState('');
  const [isGeneratingSkybox, setIsGeneratingSkybox] = useState(false);
  const [skyboxGenerationProgress, setSkyboxGenerationProgress] = useState('');
  const [currentSkyboxFiles, setCurrentSkyboxFiles] = useState(getAllSkyboxFiles());
  const [canvasToImagePrompt, setCanvasToImagePrompt] = useState('');
  const [isGeneratingFromCanvas, setIsGeneratingFromCanvas] = useState(false);
  const [canvasGenerationProgress, setCanvasGenerationProgress] = useState('');
  const [lastCanvasScreenshot, setLastCanvasScreenshot] = useState<string | null>(null);
  const [galleryCount, setGalleryCount] = useState(0);

  // Check if engine is ready
  useEffect(() => {
    if (engine) {
      setIsEngineReady(true);
    } else {
      setIsEngineReady(false);
    }
  }, [engine]);

  // Listen for selection changes from context (no duplicate subscriptions)
  useEffect(() => {
    if (!isEngineReady) return;

    // Use the selectedEntity from context instead of subscribing to events
    const currentEntity = contextSelectedEntity;
    const currentSelectable = selectedSelectable;
    
    // Use entity if available, otherwise try to get entity from selectable
    let entityToUse = currentEntity;
    if (!entityToUse && currentSelectable && currentSelectable instanceof EntityBase) {
      entityToUse = currentSelectable as EntityBase;
    }
    
    // Only update if the selection has actually changed
    const currentEntityId = entityToUse?.uuid || null;
    const previousEntityId = selectedEntity?.uuid || null;
    
    if (currentEntityId !== previousEntityId) {
      console.log('Right Panel - Selection changed:', {
        previous: previousEntityId,
        current: currentEntityId,
        entityName: entityToUse?.name || 'none'
      });
      
      setSelectedEntity(entityToUse);
      setRefreshKey(prev => prev + 1); // Force UI refresh
      
      if (entityToUse) {
        // Update transform values from selected entity
        const position = entityToUse.position || { x: 0, y: 0, z: 0 };
        const rotation = entityToUse.rotation || { x: 0, y: 0, z: 0 };
        const scale = entityToUse.scale || { x: 1, y: 1, z: 1 };
        
        setTransformValues({
          position: { x: position.x, y: position.y, z: position.z },
          rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
          scale: { x: scale.x, y: scale.y, z: scale.z }
        });

        // Set appropriate tab based on entity type
        if (entityToUse.entityType === 'generative') {
          setActiveTab('ai');
        } else if (entityToUse.entityType === 'character') {
          setActiveTab('animation');
        } else {
          setActiveTab('transform');
        }
      }
    }
  }, [contextSelectedEntity, selectedSelectable, isEngineReady, selectedEntity?.uuid]);

  // Get project name from engine
  React.useEffect(() => {
    if (engine) {
      const currentName = engine.getProjectManager().getCurrentProjectName();
      setProjectName(currentName);
      
      // Subscribe to project name changes
      const unsubscribe = engine.getProjectManager().observers.subscribe(
        'projectNameChanged',
        ({ name }) => setProjectName(name)
      );
      
      return unsubscribe;
    }
  }, [engine]);

  // Track gallery count
  React.useEffect(() => {
    if (engine) {
      // Get initial count
      const renderLogs = engine.getProjectManager().getRenderLogs() || [];
      setGalleryCount(renderLogs.length);
      
      // Subscribe to render log changes
      const unsubscribe = engine.getProjectManager().observers.subscribe(
        'renderLogsChanged',
        ({ renderLogs }) => {
          setGalleryCount(renderLogs.length);
        }
      );
      
      return unsubscribe;
    }
  }, [engine]);

  // Local gallery functions as fallback
  const openLocalGallery = () => {
    if (engine) {
      const renderLogs = engine.getProjectManager().getRenderLogs() || [];
      setLocalGalleryImages(renderLogs);
      setLocalCurrentIndex(renderLogs.length > 0 ? renderLogs.length - 1 : 0);
      setLocalGalleryOpen(true);
      console.log('Local gallery opened with', renderLogs.length, 'images');
    }
  };

  const closeLocalGallery = () => {
    setLocalGalleryOpen(false);
  };

  const handleGenerateSkybox = async () => {
    if (!engine || !skyboxPrompt.trim()) return;
    
    setIsGeneratingSkybox(true);
    setSkyboxGenerationProgress('Starting generation...');
    
    try {
      console.log('Generating skybox with prompt:', skyboxPrompt);
      
      const result = await generateSkybox(skyboxPrompt, {
        resolution: '2K', // Default to 2K for faster generation
        onProgress: (progress) => {
          setSkyboxGenerationProgress(progress.message);
        }
      });
      
      if (result.imageUrl) {
        // Apply the generated skybox using the environment manager
        const environmentManager = engine.getEnvironmentManager();
        const scene = engine.getScene();
        
        await environmentManager.createGeneratedSkybox(scene, result.imageUrl, result.filename, result.thumbnailUrl);
        
        // Update the local skybox files list
        setCurrentSkyboxFiles(getAllSkyboxFiles());
        setActiveSkybox(result.filename);
        
        // Clear the prompt
        setSkyboxPrompt('');
        setSkyboxGenerationProgress('Skybox generated successfully!');
        
        console.log('Skybox generation completed:', result.filename);
      }
    } catch (error) {
      console.error('Failed to generate skybox:', error);
      setSkyboxGenerationProgress('Failed to generate skybox. Please try again.');
    } finally {
      setIsGeneratingSkybox(false);
      // Clear progress message after a delay
      setTimeout(() => setSkyboxGenerationProgress(''), 3000);
    }
  };

  const handleGenerateImage = async () => {
    if (!engine) return;
    
    try {
      // Use the existing render service
      const renderService = engine.getRenderService();
      
      // Get the selected API info (default to first available API)
      const { availableAPIs } = await import('../../engine/utils/generation/image-render-api');
      const selectedAPI = availableAPIs.find(api => api.id === renderSettings.selectedAPI) || availableAPIs[0];
      
      // Generate new seed if random seed is enabled
      const currentSeed = renderSettings.useRandomSeed 
        ? Math.floor(Math.random() * 1000000)
        : renderSettings.seed || 0;

      console.log('Generating image with:', {
        prompt: renderSettings.prompt,
        seed: currentSeed,
        api: selectedAPI.name
      });

      // Trigger the render
      const result = await renderService.Render({
        isTest: false,
        selectedAPI: selectedAPI,
        prompt: renderSettings.prompt || '',
        promptStrength: renderSettings.promptStrength || 0.8,
        noiseStrength: renderSettings.noiseStrength || 0.1,
        seed: currentSeed,
        selectedLoras: renderSettings.selectedLoras || [],
        onPreview: (imageUrl: string) => {
          console.log('Preview image generated:', imageUrl);
        },
      });

      if (result) {
        console.log('Image generation completed:', result);
      }
    } catch (error) {
      console.error('Error generating image:', error);
    }
  };

  const handleGenerateFromCanvas = async () => {
    if (!engine || !canvasToImagePrompt.trim()) {
      console.warn('Canvas generation failed: Missing engine or prompt');
      setCanvasGenerationProgress('Error: Missing engine or prompt');
      return;
    }
    
    setIsGeneratingFromCanvas(true);
    setCanvasGenerationProgress('Checking prerequisites...');
    
    try {
      // Check FAL API key first
      const userPrefManager = engine.getUserPrefManager();
      const falApiKey = await userPrefManager.getPreference("falApiKey");
      
      if (!falApiKey || falApiKey.length < 10) {
        throw new Error('FAL API key is required for Canvas to Image generation. Please set your API key in user preferences.');
      }

      console.log('✓ API key check passed');
      setCanvasGenerationProgress('Taking canvas screenshot...');

      // Use the existing render service with canvas prompt
      const renderService = engine.getRenderService();
      
      if (!renderService) {
        throw new Error('RenderService not available');
      }

      console.log('✓ RenderService available');
      
      // Get the selected API info (default to first available API)
      const { availableAPIs } = await import('../../engine/utils/generation/image-render-api');
      const selectedAPI = availableAPIs.find(api => api.id === renderSettings.selectedAPI) || availableAPIs[0];
      
      if (!selectedAPI) {
        throw new Error('No API configuration found');
      }

      console.log('✓ API configuration found:', selectedAPI.name);
      
      // Generate new seed if random seed is enabled
      const currentSeed = renderSettings.useRandomSeed 
        ? Math.floor(Math.random() * 1000000)
        : renderSettings.seed || 0;

      console.log('Canvas to Image generation starting with:', {
        prompt: canvasToImagePrompt,
        seed: currentSeed,
        api: selectedAPI.name,
        promptStrength: renderSettings.promptStrength || 0.8,
        noiseStrength: renderSettings.noiseStrength || 0.1
      });

      setCanvasGenerationProgress('Sending to AI service...');

      // Trigger the render with canvas prompt
      const result = await renderService.Render({
        isTest: false,
        selectedAPI: selectedAPI,
        prompt: canvasToImagePrompt,
        promptStrength: renderSettings.promptStrength || 0.8,
        noiseStrength: renderSettings.noiseStrength || 0.1,
        seed: currentSeed,
        selectedLoras: renderSettings.selectedLoras || [],
        onPreview: (imageUrl: string) => {
          setCanvasGenerationProgress('AI processing canvas...');
          console.log('Canvas generation preview received:', imageUrl ? 'Preview available' : 'No preview');
        },
      });

      if (result && result.imageUrl) {
        setCanvasGenerationProgress('Generated successfully! Check gallery for result.');
        console.log('✅ Canvas generation completed successfully:', result.imageUrl);
        
        // Clear the prompt after successful generation
        setCanvasToImagePrompt('');
      } else {
        console.warn('Canvas generation completed but no image returned:', result);
        setCanvasGenerationProgress('Generation completed but no image returned. Check console for details.');
      }
    } catch (error) {
      console.error('❌ Canvas to Image generation failed:', error);
      
      // Provide specific error messages
      let errorMessage = 'Generation failed. ';
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          errorMessage += 'Please check your FAL API key in user preferences.';
        } else if (error.message.includes('screenshot')) {
          errorMessage += 'Failed to capture scene screenshot.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage += 'Network error. Check your internet connection.';
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += 'Unknown error occurred.';
      }
      
      setCanvasGenerationProgress(errorMessage);
    } finally {
      setIsGeneratingFromCanvas(false);
      // Clear progress message after a longer delay for error messages
      setTimeout(() => setCanvasGenerationProgress(''), 5000);
    }
  };

  const handleTransformChange = (axis: 'x' | 'y' | 'z', type: 'position' | 'rotation' | 'scale', value: number) => {
    if (!selectedEntity || !engine) return;

    try {
      const newValues = {
        ...transformValues,
        [type]: {
          ...transformValues[type],
          [axis]: value
        }
      };

      setTransformValues(newValues);

      // Apply transform to entity
      if (type === 'position' && selectedEntity.position) {
        if (typeof selectedEntity.position.setComponent === 'function') {
          const idx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
          selectedEntity.position.setComponent(idx, value);
        } else {
          selectedEntity.position[axis] = value;
        }
      } else if (type === 'rotation' && selectedEntity.rotation) {
        selectedEntity.rotation[axis] = value;
      } else if (type === 'scale' && selectedEntity.scale) {
        if (typeof selectedEntity.scale.setComponent === 'function') {
          const idx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
          selectedEntity.scale.setComponent(idx, value);
        } else {
          selectedEntity.scale[axis] = value;
        }
      }

      if (typeof selectedEntity.updateMatrix === 'function') {
        selectedEntity.updateMatrix();
      }
      if (typeof selectedEntity.updateMatrixWorld === 'function') {
        selectedEntity.updateMatrixWorld(true);
      }

      // Update the transform controls
      const transformManager = engine.getTransformControlManager();
      if (transformManager) {
        // Force refresh of transform controls by getting the current controls
        const controls = transformManager.getTransformControls();
        if (controls && controls.object) {
          // Update the transform controls to reflect the new values
          controls.attach(controls.object);
        }
      }
    } catch (error) {
      console.warn('Error updating transform:', error);
    }
  };

  const handleGizmoModeChange = (mode: number) => {
    if (engine) {
      try {
        engine.setTransformControlMode(mode);
      } catch (error) {
        console.warn('Error changing gizmo mode:', error);
      }
    }
  };

  const handleGizmoSpaceToggle = () => {
    if (engine) {
      try {
        const transformManager = engine.getTransformControlManager();
        if (transformManager && transformManager.toggleTransformControlSpace) {
          transformManager.toggleTransformControlSpace();
        }
      } catch (error) {
        console.warn('Error toggling gizmo space:', error);
      }
    }
  };

  const handleFocus = () => {
    if (selectedEntity && engine) {
      try {
        const cameraManager = engine.getCameraManager();
        if (cameraManager && cameraManager.focusOnObject) {
          cameraManager.focusOnObject(selectedEntity);
        }
      } catch (error) {
        console.warn('Error focusing on object:', error);
      }
    }
  };

  const handleDelete = () => {
    if (selectedEntity && engine) {
      // Implement delete functionality
      console.log('Delete entity:', selectedEntity);
    }
  };

  const handleDuplicate = () => {
    if (selectedEntity && engine) {
      // Implement duplicate functionality
      console.log('Duplicate entity:', selectedEntity);
    }
  };

  const renderTransformTab = () => (
    <div className="adobe-panel-content">
      {/* Gizmo Mode Selector */}
      <div className="adobe-section">
        <Label className="adobe-section-title">Transform Mode</Label>
        <div className="adobe-tool-group">
          <button 
            className={cn("adobe-tool-button", gizmoMode === 0 && "active")}
            onClick={() => handleGizmoModeChange(0)}
            title="Position (W)"
          >
            <IconArrowsMove size={16} />
          </button>
          <button 
            className={cn("adobe-tool-button", gizmoMode === 1 && "active")}
            onClick={() => handleGizmoModeChange(1)}
            title="Rotation (E)"
          >
            <IconRotate size={16} />
          </button>
          <button 
            className={cn("adobe-tool-button", gizmoMode === 2 && "active")}
            onClick={() => handleGizmoModeChange(2)}
            title="Scale (R)"
          >
            <IconArrowsMaximize size={16} />
          </button>
          <button 
            className={cn("adobe-tool-button", gizmoMode === 3 && "active")}
            onClick={() => handleGizmoModeChange(3)}
            title="Bounding Box (T)"
          >
            <IconCube3dSphere size={16} />
          </button>
        </div>
      </div>

      {/* Transform Values */}
      <div className="adobe-section">
        <Label className="adobe-section-title">Position</Label>
        <div className="adobe-input-row">
          <Label className="adobe-input-label">X</Label>
          <Input
            type="number"
            value={transformValues.position.x.toFixed(3)}
            onChange={(e) => handleTransformChange('x', 'position', parseFloat(e.target.value) || 0)}
            className="adobe-number-input"
            step="0.1"
          />
          <Label className="adobe-input-label">Y</Label>
          <Input
            type="number"
            value={transformValues.position.y.toFixed(3)}
            onChange={(e) => handleTransformChange('y', 'position', parseFloat(e.target.value) || 0)}
            className="adobe-number-input"
            step="0.1"
          />
          <Label className="adobe-input-label">Z</Label>
          <Input
            type="number"
            value={transformValues.position.z.toFixed(3)}
            onChange={(e) => handleTransformChange('z', 'position', parseFloat(e.target.value) || 0)}
            className="adobe-number-input"
            step="0.1"
          />
        </div>
      </div>

      <div className="adobe-section">
        <Label className="adobe-section-title">Rotation</Label>
        <div className="adobe-input-row">
          <Label className="adobe-input-label">X</Label>
          <Input
            type="number"
            value={transformValues.rotation.x.toFixed(3)}
            onChange={(e) => handleTransformChange('x', 'rotation', parseFloat(e.target.value) || 0)}
            className="adobe-number-input"
            step="0.1"
          />
          <Label className="adobe-input-label">Y</Label>
          <Input
            type="number"
            value={transformValues.rotation.y.toFixed(3)}
            onChange={(e) => handleTransformChange('y', 'rotation', parseFloat(e.target.value) || 0)}
            className="adobe-number-input"
            step="0.1"
          />
          <Label className="adobe-input-label">Z</Label>
          <Input
            type="number"
            value={transformValues.rotation.z.toFixed(3)}
            onChange={(e) => handleTransformChange('z', 'rotation', parseFloat(e.target.value) || 0)}
            className="adobe-number-input"
            step="0.1"
          />
        </div>
      </div>

      <div className="adobe-section">
        <Label className="adobe-section-title">Scale</Label>
        <div className="adobe-input-row">
          <Label className="adobe-input-label">X</Label>
          <Input
            type="number"
            value={transformValues.scale.x.toFixed(3)}
            onChange={(e) => handleTransformChange('x', 'scale', parseFloat(e.target.value) || 1)}
            className="adobe-number-input"
            step="0.1"
          />
          <Label className="adobe-input-label">Y</Label>
          <Input
            type="number"
            value={transformValues.scale.y.toFixed(3)}
            onChange={(e) => handleTransformChange('y', 'scale', parseFloat(e.target.value) || 1)}
            className="adobe-number-input"
            step="0.1"
          />
          <Label className="adobe-input-label">Z</Label>
          <Input
            type="number"
            value={transformValues.scale.z.toFixed(3)}
            onChange={(e) => handleTransformChange('z', 'scale', parseFloat(e.target.value) || 1)}
            className="adobe-number-input"
            step="0.1"
          />
        </div>
      </div>

      {/* Transform Space Toggle */}
      <div className="adobe-section">
        <Button
          variant="outline"
          size="sm"
          onClick={handleGizmoSpaceToggle}
          className="adobe-action-button w-full"
        >
          {gizmoSpace === 'world' ? 'World Space' : 'Local Space'}
        </Button>
      </div>
    </div>
  );

  const renderMaterialTab = () => {
    // Force re-render when refreshKey changes
    const _ = refreshKey;
    
    // Get current material properties from selected entity
    const getCurrentColor = () => {
      if (!selectedEntity) return "#ffffff";
      
      // Try to get color from different entity types
      if (selectedEntity.props?.material?.color) {
        return selectedEntity.props.material.color;
      }
      if (selectedEntity.characterProps?.color) {
        return selectedEntity.characterProps.color;
      }
      if (selectedEntity.props?.color) {
        const color = selectedEntity.props.color;
        if (typeof color === 'object' && color.r !== undefined) {
          return `#${Math.round(color.r * 255).toString(16).padStart(2, '0')}${Math.round(color.g * 255).toString(16).padStart(2, '0')}${Math.round(color.b * 255).toString(16).padStart(2, '0')}`;
        }
        return color;
      }
      return "#ffffff";
    };

    const clamp01 = (val: number | undefined) => {
      if (typeof val !== 'number' || Number.isNaN(val)) {
        return 0;
      }
      return Math.min(Math.max(val, 0), 1);
    };

    const handleColorChange = (color: string) => {
      if (selectedEntity && typeof selectedEntity.setColor === 'function') {
        console.log('Setting color to:', color);
        selectedEntity.setColor(color);
        // Force UI refresh to show the change
        setRefreshKey(prev => prev + 1);
      }
    };

    const getCurrentMetallic = () => {
      if (!selectedEntity) return 0.1;
      // Try to get metallic from materials
      if (selectedEntity.meshes && selectedEntity.meshes.length > 0) {
        const material = selectedEntity.meshes[0].material;
        if (material && 'metalness' in material) {
          return clamp01(material.metalness as number);
        }
      }
      return 0.1;
    };

    const getCurrentRoughness = () => {
      if (!selectedEntity) return 0.4;
      // Try to get roughness from materials
      if (selectedEntity.meshes && selectedEntity.meshes.length > 0) {
        const material = selectedEntity.meshes[0].material;
        if (material && 'roughness' in material) {
          return clamp01(material.roughness as number);
        }
      }
      return 0.4;
    };

    const handleMetallicChange = (value: number) => {
      const nextValue = clamp01(value);
      if (selectedEntity && selectedEntity.meshes) {
        selectedEntity.meshes.forEach(mesh => {
          if (mesh.material && 'metalness' in mesh.material) {
            mesh.material.metalness = nextValue;
            mesh.material.needsUpdate = true;
          }
        });
        console.log('Setting metallic to:', nextValue);
        // Force UI refresh to show the change
        setRefreshKey(prev => prev + 1);
      }
    };

    const handleRoughnessChange = (value: number) => {
      const nextValue = clamp01(value);
      if (selectedEntity && selectedEntity.meshes) {
        selectedEntity.meshes.forEach(mesh => {
          if (mesh.material && 'roughness' in mesh.material) {
            mesh.material.roughness = nextValue;
            mesh.material.needsUpdate = true;
          }
        });
        console.log('Setting roughness to:', nextValue);
        // Force UI refresh to show the change
        setRefreshKey(prev => prev + 1);
      }
    };

    return (
      <div className="adobe-panel-content">
        <div className="adobe-section">
          <Label className="adobe-section-title">Material Properties</Label>
          <div className="adobe-input-row">
            <Label className="adobe-input-label">Color</Label>
            <Input
              type="color"
              value={getCurrentColor()}
              onChange={(e) => handleColorChange(e.target.value)}
              className="adobe-color-input"
            />
          </div>
        </div>

        <div className="adobe-section">
          <Label className="adobe-section-title">Metallic</Label>
          <Slider
            value={[getCurrentMetallic()]}
            onValueChange={([value]) => handleMetallicChange(value)}
            min={0}
            max={1}
            step={0.01}
            className="adobe-slider"
          />
        </div>

        <div className="adobe-section">
          <Label className="adobe-section-title">Roughness</Label>
          <Slider
            value={[getCurrentRoughness()]}
            onValueChange={([value]) => handleRoughnessChange(value)}
            min={0}
            max={1}
            step={0.01}
            className="adobe-slider"
          />
        </div>
      </div>
    );
  };

  const renderAITab = () => (
    <div className="adobe-panel-content">
      <div className="adobe-section">
        <Label className="adobe-section-title">AI Generation</Label>
        <p className="adobe-workflow-hint">
          This is a generative frame. Use the workflow panel below to generate content.
        </p>
      </div>
    </div>
  );

  const renderAnimationTab = () => (
    <div className="adobe-panel-content">
      <div className="adobe-section">
        <Label className="adobe-section-title">Animation Controls</Label>
        <p className="adobe-workflow-hint">
          This is a character. Use the Animation tab in the workflow panel below to control animations.
        </p>
      </div>
    </div>
  );



  const renderBasic3DControls = () => (
    <div className="adobe-workflow-content">
      <div className="adobe-workflow-section">
        <h4 className="adobe-section-title">Generation Frames</h4>
        <div className="adobe-button-row">
          <Button 
            variant="default" 
            size="sm"
            onClick={() => {
              // Create a generative entity (frame for AI generation)
              engine?.createEntityDefaultCommand('generative');
            }}
            className="adobe-primary-button"
          >
            <IconPhoto size={14} />
            Add Generation Frame
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              const selectedEntity = engine?.getSelectionManager().getCurrentEntity();
              if (selectedEntity) {
                engine?.getCameraManager().focusOnObject(selectedEntity);
              }
            }}
            className="adobe-action-button"
          >
            <IconFocus size={14} />
            Focus
          </Button>
        </div>
        <p className="adobe-workflow-hint">
          Place a frame in your scene, then switch to "Generate Image" to create content inside it.
        </p>
      </div>

      <div className="adobe-workflow-section">
        <h4 className="adobe-section-title">Scene Objects</h4>
        <div className="adobe-button-grid">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => engine?.createEntityCommand({ type: 'shape', shapeProps: { shapeType: 'cube' } })}
            className="adobe-grid-button"
          >
            <IconCube size={14} />
            Cube
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => engine?.createEntityDefaultCommand('light')}
            className="adobe-grid-button"
          >
            💡
            Light
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => engine?.createEntityDefaultCommand('character')}
            className="adobe-grid-button"
          >
            👤
            Character
          </Button>
        </div>
      </div>

      <div className="adobe-workflow-section">
        <h4 className="adobe-section-title">View Controls</h4>
        <div className="adobe-button-row">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => engine?.getObjectManager().toggleGizmo()}
            className="adobe-action-button"
          >
            <IconSettings size={14} />
            Toggle Gizmo
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              // Toggle ratio overlay
              const cameraManager = engine?.getCameraManager();
              if (cameraManager) {
                const isVisible = cameraManager.getRatioOverlayVisibility();
                cameraManager.setRatioOverlayVisibility(!isVisible);
              }
            }}
            className="adobe-action-button"
          >
            📐
            Frame Guide
          </Button>
        </div>
      </div>
    </div>
  );

  const renderGenerateControls = () => {
    return (
      <div className="adobe-workflow-content">
        {/* This content will be split into separate sections */}
        <p className="adobe-workflow-hint">
          Use the separate "Generation Frame" and "Canvas to Image" sections below for AI image generation.
        </p>
      </div>
    );
  };

  const renderGenerationFrameControls = () => {
    const updateRenderSettings = (newSettings: Partial<typeof renderSettings>) => {
      engine?.getProjectManager().updateRenderSettings(newSettings);
    };

    const selectedEntity = engine?.getSelectionManager().getCurrentEntity();
    const isGenerativeFrameSelected = selectedEntity?.entityType === 'generative';

    return (
      <div className="adobe-workflow-content">
        {/* Frame Status */}
        <div className="adobe-workflow-section">
          <h4 className="adobe-section-title">Frame Status</h4>
          {isGenerativeFrameSelected ? (
            <div className="adobe-status-good">
              ✅ Frame selected: {selectedEntity.name}
            </div>
          ) : (
            <div className="adobe-status-warning">
              ⚠️ Select a generation frame first, or create one in "Basic 3D" section
            </div>
          )}
        </div>

        {/* Prompt Section */}
        <div className="adobe-workflow-section">
          <Label className="adobe-section-title">Generation Prompt</Label>
          <Textarea
            value={renderSettings.prompt || ''}
            onChange={(e) => updateRenderSettings({ prompt: e.target.value })}
            placeholder="Describe what you want to generate inside the frame. Example: 'a red sports car', 'a fantasy castle', 'a cute robot'"
            className="adobe-prompt-input"
            rows={3}
            disabled={!isGenerativeFrameSelected}
          />
        </div>

        {/* Generation Controls */}
        <div className="adobe-workflow-section">
          <h4 className="adobe-section-title">Generate</h4>
          <div className="adobe-button-row">
            <Button 
              variant="default" 
              size="sm"
              onClick={async () => {
                if (isGenerativeFrameSelected && selectedEntity) {
                  // Generate image directly in the selected frame
                  const generativeEntity = selectedEntity as any; // GenerativeEntity
                  if (generativeEntity.generateRealtimeImage) {
                    try {
                      await generativeEntity.generateRealtimeImage(
                        renderSettings.prompt || '', 
                        { 
                          ratio: '1:1', // Use frame's ratio
                          stylePrompt: 'BASIC_3D' 
                        }
                      );
                    } catch (error) {
                      console.error('Frame generation failed:', error);
                    }
                  }
                } else {
                  console.log('No generative frame selected');
                }
              }}
              className="adobe-primary-button"
              disabled={!isGenerativeFrameSelected || !renderSettings.prompt?.trim()}
            >
              <IconPhoto size={14} />
              Generate in Frame
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                // Open the gallery using context function
                console.log('Gallery button clicked, opening gallery...');
                openGallery();
              }}
              className="adobe-action-button"
            >
              <IconDownload size={14} />
              Gallery
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderCanvasToImageControls = () => {
    return (
      <div className="adobe-workflow-content">
        {/* Description */}
        <div className="adobe-workflow-section">
          <h4 className="adobe-section-title">About Canvas to Image</h4>
          <div className="adobe-workflow-hint">
            Generate an AI image based on your current 3D scene composition, lighting, and camera angle.
          </div>
        </div>

        {/* Canvas Prompt */}
        <div className="adobe-workflow-section">
          <Label className="adobe-section-title">Canvas Transform Prompt</Label>
          <Textarea
            placeholder="Describe how you want to transform the 3D scene (e.g., 'photorealistic render', 'cartoon style', 'oil painting', 'cyberpunk aesthetic')"
            value={canvasToImagePrompt}
            onChange={(e) => setCanvasToImagePrompt(e.target.value)}
            className="adobe-textarea resize-none"
            rows={2}
          />
        </div>
        
        {/* Canvas Generation Controls */}
        <div className="adobe-workflow-section">
          <h4 className="adobe-section-title">Generate from Scene</h4>
          <div className="adobe-button-row">
            <Button 
              variant="default"
              size="sm"
              onClick={handleGenerateFromCanvas}
              disabled={isGeneratingFromCanvas || !canvasToImagePrompt.trim()}
              className="adobe-primary-button"
            >
              {isGeneratingFromCanvas ? (
                <>🔄 Generating...</>
              ) : (
                <>📸 Generate from Canvas</>
              )}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const logs = engine?.getProjectManager().getRenderLogs() || [];
                if (logs.length === 0) {
                  console.warn('No renders available to download');
                  return;
                }

                const latest = logs[logs.length - 1];
                if (!latest?.imageUrl) {
                  console.warn('Latest render log missing imageUrl');
                  return;
                }

                const fileName = `canvas-render-${new Date(latest.timestamp).toISOString().slice(0,19).replace(/:/g,'-')}.png`;
                downloadImage(latest.imageUrl, fileName);
              }}
              className="adobe-action-button"
              title="Download last generated image"
            >
              <IconDownload size={14} />
              Download
            </Button>
          </div>

          {/* Debug Tools */}
          <div className="adobe-workflow-section">
            <h4 className="adobe-section-title">Debug Tools</h4>
            <div className="adobe-button-row">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    console.log('Testing canvas screenshot...');
                    const renderService = engine.getRenderService();
                    const screenshot = await renderService.takeFramedScreenshot();
                    
                    if (screenshot) {
                      console.log('✅ Screenshot successful:', screenshot.substring(0, 100) + '...');
                      setCanvasGenerationProgress('Screenshot test successful!');
                      setLastCanvasScreenshot(screenshot);
                    } else {
                      console.error('❌ Screenshot failed: null result');
                      setCanvasGenerationProgress('Screenshot test failed: null result');
                    }
                  } catch (error) {
                    console.error('❌ Screenshot test failed:', error);
                    setCanvasGenerationProgress(`Screenshot test failed: ${error instanceof Error ? error.message : String(error)}`);
                  }
                  
                  setTimeout(() => setCanvasGenerationProgress(''), 3000);
                }}
                className="adobe-action-button"
                title="Test if canvas screenshot capture is working"
              >
                🧪 Test Screenshot
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    console.log('Testing API key...');
                    const userPrefManager = engine.getUserPrefManager();
                    const falApiKey = await userPrefManager.getPreference("falApiKey");
                    
                    if (falApiKey && falApiKey.length > 10) {
                      console.log('✅ API key found:', falApiKey.substring(0, 10) + '...');
                      setCanvasGenerationProgress('API key test: Valid key found');
                    } else {
                      console.error('❌ API key missing or invalid');
                      setCanvasGenerationProgress('API key test: Missing or invalid key');
                    }
                  } catch (error) {
                    console.error('❌ API key test failed:', error);
                    setCanvasGenerationProgress(`API key test failed: ${error instanceof Error ? error.message : String(error)}`);
                  }
                  
                  setTimeout(() => setCanvasGenerationProgress(''), 3000);
                }}
                className="adobe-action-button"
                title="Test if FAL API key is configured"
              >
                🔑 Test API Key
              </Button>
            </div>
            
            <div className="adobe-button-row">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  console.log('Testing gallery functionality...');
                  console.log('Gallery open state:', galleryOpen);
                  console.log('Gallery function type:', typeof openGallery);
                  console.log('Total images in gallery:', galleryCount);
                  
                  // Use local gallery as reliable fallback
                  openLocalGallery();
                  setCanvasGenerationProgress('Gallery test: Opening local gallery...');
                  
                  setTimeout(() => setCanvasGenerationProgress(''), 3000);
                }}
                className="adobe-action-button"
                title="Test gallery popup functionality"
              >
                🖼️ Test Gallery
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  console.log('Opening File → Settings for API key configuration');
                  setCanvasGenerationProgress('Open File → Settings to configure your FAL API key');
                  setTimeout(() => setCanvasGenerationProgress(''), 4000);
                }}
                className="adobe-action-button"
                title="Instructions for setting up API key"
              >
                ⚙️ Setup Guide
              </Button>
            </div>
          </div>
          
          {canvasGenerationProgress && (
            <p className={`adobe-workflow-hint text-sm ${canvasGenerationProgress.includes('failed') || canvasGenerationProgress.includes('Error') ? 'text-red-400' : 'text-blue-400'}`}>
              {canvasGenerationProgress}
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderConvertControls = () => {
    const selectedEntity = engine?.getSelectionManager().getCurrentEntity();
    const isGenerativeFrameSelected = selectedEntity?.entityType === 'generative';
    const generativeEntity = selectedEntity as any; // GenerativeEntity
    const hasGeneratedImage = isGenerativeFrameSelected && generativeEntity?.getCurrentGenerationLog();

    return (
      <div className="adobe-workflow-content">
        {/* Frame Status */}
        <div className="adobe-workflow-section">
          <h4 className="adobe-section-title">Selected Frame</h4>
          {isGenerativeFrameSelected ? (
            <div className="adobe-status-good">
              ✅ Frame: {selectedEntity.name}
              {hasGeneratedImage ? (
                <div className="adobe-status-ready">🖼️ Image ready for 3D conversion</div>
              ) : (
                <div className="adobe-status-warning">📷 No image generated yet</div>
              )}
            </div>
          ) : (
            <div className="adobe-status-warning">
              ⚠️ Select a generation frame with an image to convert to 3D
            </div>
          )}
        </div>

        {/* 3D Conversion */}
        <div className="adobe-workflow-section">
          <h4 className="adobe-section-title">Image to 3D Conversion</h4>
          <div className="adobe-button-row">
            <Button 
              variant="default" 
              size="sm"
              onClick={async () => {
                if (isGenerativeFrameSelected && hasGeneratedImage && generativeEntity) {
                  setIsConverting(true);
                  try {
                    const currentLog = generativeEntity.getCurrentGenerationLog();
                    console.log('Current generation log:', currentLog);
                    
                    if (currentLog && currentLog.assetType === 'image' && currentLog.fileUrl) {
                      console.log('Starting 3D conversion for:', currentLog.fileUrl);
                      
                      // Use the exact same method as the working old interface
                      const result = await generativeEntity.generate3DModel(
                        currentLog.fileUrl,
                        currentLog.id,
                        {
                          prompt: renderSettings.prompt || '',
                          apiProvider: 'trellis'
                        }
                      );
                      
                      console.log('3D conversion result:', result);
                      
                      if (result.success) {
                        console.log('3D conversion completed successfully');
                        
                        // Automatically apply lighting fix to the new 3D model
                        setTimeout(() => {
                          if (generativeEntity.gltfModel) {
                            // Import and apply lighting fix
                            import('../../engine/utils/3dModelLightingFix').then(({ fix3DModelLighting, improveSceneLighting }) => {
                              fix3DModelLighting(generativeEntity.gltfModel!, {
                                brightenModel: true,
                                addAmbientLight: true,
                                adjustEmissive: true
                              });
                              
                              // Also improve overall scene lighting
                              const scene = engine?.getScene();
                              if (scene) {
                                improveSceneLighting(scene);
                              }
                              
                              console.log('Automatically applied lighting fixes to new 3D model');
                            });
                          }
                        }, 1000); // Small delay to ensure model is fully loaded
                        
                        // Switch to 3D view to show the result
                        generativeEntity.setDisplayMode('3d');
                      } else {
                        console.error('3D conversion failed:', result);
                      }
                    } else {
                      console.error('No valid image found for conversion');
                      console.log('Current log details:', {
                        exists: !!currentLog,
                        assetType: currentLog?.assetType,
                        hasFileUrl: !!currentLog?.fileUrl
                      });
                    }
                  } catch (error) {
                    console.error('3D conversion failed:', error);
                  } finally {
                    setIsConverting(false);
                  }
                } else {
                  console.log('Cannot convert: need frame with generated image');
                  console.log('Debug info:', {
                    isGenerativeFrameSelected,
                    hasGeneratedImage,
                    hasGenerativeEntity: !!generativeEntity
                  });
                }
              }}
              className="adobe-primary-button"
              disabled={!hasGeneratedImage || isConverting}
            >
              {isConverting ? (
                <>
                  <div className="animate-spin">⚙️</div>
                  Converting...
                </>
              ) : (
                <>
                  <IconTransform size={14} />
                  Convert to 3D
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                if (isGenerativeFrameSelected && generativeEntity) {
                  // Switch display mode between 2D and 3D
                  const currentMode = generativeEntity.temp_displayMode || '2d';
                  const newMode = currentMode === '2d' ? '3d' : '2d';
                  generativeEntity.setDisplayMode(newMode);
                  generativeEntity.temp_displayMode = newMode;
                }
              }}
              className="adobe-action-button"
              disabled={!isGenerativeFrameSelected}
            >
              🔄
              Toggle View
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderEnvironmentControls = () => {
    return (
      <div className="adobe-workflow-content">
        {/* Skybox Generation */}
        <div className="adobe-workflow-section">
          <h4 className="adobe-section-title">Generate Skybox</h4>
          <div className="space-y-3">
            <Textarea
              placeholder="Describe your environment... (e.g., 'sunset over mountain range', 'cyberpunk city at night', 'peaceful forest clearing')"
              value={skyboxPrompt}
              onChange={(e) => setSkyboxPrompt(e.target.value)}
              className="adobe-textarea resize-none"
              rows={2}
            />
            <Button 
              onClick={handleGenerateSkybox}
              disabled={isGeneratingSkybox || !skyboxPrompt.trim()}
              className="adobe-action-button w-full"
            >
              {isGeneratingSkybox ? (
                <>🔄 Generating...</>
              ) : (
                <>✨ Generate Skybox</>
              )}
            </Button>
            {skyboxGenerationProgress && (
              <p className="adobe-workflow-hint text-sm text-blue-400">
                {skyboxGenerationProgress}
              </p>
            )}
          </div>
        </div>

        {/* Skybox Selection */}
        <div className="adobe-workflow-section">
          <h4 className="adobe-section-title">Skybox Environment</h4>
          <div className="adobe-skybox-grid">
            {currentSkyboxFiles.map((skyboxFile, index) => (
              <div
                key={index}
                className={`adobe-skybox-thumbnail ${activeSkybox === skyboxFile ? 'active' : ''}`}
                onClick={() => {
                  if (engine) {
                    const environmentManager = engine.getEnvironmentManager();
                    const scene = engine.getScene();
                    
                    // Check if this is a generated skybox (starts with 'generated_')
                    const isGenerated = skyboxFile.startsWith('generated_');
                    const skyboxUrl = isGenerated ? skyboxFile : `${skyboxFolder}${skyboxFile}`;
                    
                    environmentManager.createSkybox(scene, skyboxUrl);
                    setActiveSkybox(skyboxFile);
                  }
                }}
                title={skyboxFile.startsWith('generated_') ? 'Generated Skybox' : `Skybox ${index + 1}`}
              >
                <img
                  src={getSkyboxThumbnailUrl(skyboxFile)}
                  alt={skyboxFile.startsWith('generated_') ? 'Generated Skybox' : `Skybox ${index + 1}`}
                  className="adobe-skybox-image"
                  onError={(e) => {
                    // Fallback for missing thumbnails - use the original skybox image
                    const target = e.target as HTMLImageElement;
                    if (skyboxFile.startsWith('generated_')) {
                      target.src = skyboxFile; // Use the original generated image
                    } else {
                      target.src = `${skyboxFolder}${skyboxFile}`; // Use original static image
                    }
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderAnimationControls = () => {
    const selectedEntity = engine?.getSelectionManager().getCurrentEntity();
    const isCharacterSelected = selectedEntity?.entityType === 'character';
    const characterEntity = selectedEntity as any; // CharacterEntity

    // Preset animations available
    const presetAnimations = [
      { name: 'Jump', file: 'Jump.fbx' },
      { name: 'Male Sitting Pose', file: 'Male Sitting Pose.fbx' },
      { name: 'Running', file: 'Running.fbx' },
      { name: 'Sitting Idle', file: 'Sitting Idle.fbx' },
      { name: 'Sitting', file: 'Sitting.fbx' },
      { name: 'Walking', file: 'Walking.fbx' }
    ];

    return (
      <div className="adobe-workflow-content">
        {/* Animation Status */}
        <div className="adobe-workflow-section">
          <h4 className="adobe-section-title">Animation Target</h4>
          {isCharacterSelected ? (
            <div className="adobe-status-good">
              ✅ Character selected: {selectedEntity.name}
            </div>
          ) : (
            <div className="adobe-status-warning">
              ⚠️ Select a character to animate
            </div>
          )}
        </div>

        {/* Animation Controls */}
        {isCharacterSelected && (
          <>
            <div className="adobe-workflow-section">
              <h4 className="adobe-section-title">Animation Playback</h4>
              <div className="adobe-button-row">
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => {
                    if (characterEntity && characterEntity.currentAnimationAction) {
                      const isCurrentlyPaused = characterEntity.currentAnimationAction.paused;
                      characterEntity.currentAnimationAction.paused = !isCurrentlyPaused;
                      console.log(`Animation ${isCurrentlyPaused ? 'resumed' : 'paused'}`);
                    } else {
                      console.log('No active animation to play/pause');
                    }
                  }}
                  className="adobe-primary-button"
                >
                  <IconPlayerPlay size={14} />
                  {characterEntity?.currentAnimationAction?.paused === false ? 'Pause' : 'Play'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // Stop animation
                    if (characterEntity && characterEntity.currentAnimationAction) {
                      characterEntity.currentAnimationAction.stop();
                      characterEntity.currentAnimationAction = null;
                      console.log('Animation stopped');
                    }
                  }}
                  className="adobe-action-button"
                >
                  ⏹️
                  Stop
                </Button>
              </div>
            </div>

            {/* Available Animations */}
            <div className="adobe-workflow-section">
              <h4 className="adobe-section-title">Available Animations</h4>
              <div className="adobe-animation-list">
                {characterEntity?.animationFiles?.map((animationFile: string, index: number) => {
                  // Extract animation name from file path
                  const animationName = animationFile.split('/').pop()?.replace('.fbx', '') || `Animation ${index + 1}`;
                  
                  return (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (characterEntity) {
                          try {
                            console.log(`Playing animation ${index}: ${animationName}`);
                            await characterEntity.selectAnimationFile(index, true); // true = play immediately
                          } catch (error) {
                            console.error('Failed to play animation:', error);
                          }
                        }
                      }}
                      className="adobe-animation-button"
                    >
                      🎬 {animationName}
                    </Button>
                  );
                }) || (
                  <p className="adobe-workflow-hint">No animations loaded for this character</p>
                )}
              </div>
            </div>

            {/* Preset Mixamo Animations */}
            <div className="adobe-workflow-section">
              <h4 className="adobe-section-title">Mixamo Preset Animations</h4>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="adobe-dropdown-button w-full">
                    Load Preset Animation <IconChevronDown size={12} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  {presetAnimations.map((animation, index) => (
                    <DropdownMenuItem
                      key={index}
                      onClick={async () => {
                        if (characterEntity) {
                          try {
                            console.log(`Loading preset animation: ${animation.name}`);
                            // Add the animation file to the character's animation list
                            const animationPath = `./characters/_mixamo_animations/${animation.file}`;
                            
                            // Add to animation files if not already there
                            if (!characterEntity.animationFiles.includes(animationPath)) {
                              characterEntity.animationFiles.push(animationPath);
                            }
                            
                            // Select and play the new animation
                            const newIndex = characterEntity.animationFiles.indexOf(animationPath);
                            await characterEntity.selectAnimationFile(newIndex, true);
                          } catch (error) {
                            console.error('Failed to load preset animation:', error);
                          }
                        }
                      }}
                    >
                      🎭 {animation.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <p className="adobe-workflow-hint">
                Load professional Mixamo animations for any character
              </p>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderNoSelection = () => (
    <div className="adobe-panel-content">
      <div className="adobe-section">
        {!isEngineReady ? (
          <p className="adobe-workflow-hint">
            Loading engine...
          </p>
        ) : (
          <p className="adobe-workflow-hint">
            Select an object to view its properties and controls.
          </p>
        )}
      </div>
    </div>
  );

  const getAvailableTabs = () => {
    const tabs = [];
    
    if (selectedEntity) {
      tabs.push({ id: 'transform', label: 'Transform', icon: <IconArrowsMove size={14} /> });
      
      if (selectedEntity.entityType === 'generative') {
        tabs.push({ id: 'ai', label: 'AI', icon: <IconWand size={14} /> });
      }
      
      if (selectedEntity.entityType === 'character') {
        tabs.push({ id: 'animation', label: 'Animation', icon: <IconPlayerPlay size={14} /> });
      }
      
      tabs.push({ id: 'material', label: 'Material', icon: <IconPalette size={14} /> });
    }
    
    return tabs;
  };

  const availableTabs = getAvailableTabs();

  // Render different content based on workflowSection prop
  if (workflowSection === 'basic3d') {
    return (
      <div className={cn("adobe-panel-content", className)}>
        {renderBasic3DControls()}
      </div>
    );
  }

  if (workflowSection === 'generate') {
    return (
      <div className={cn("adobe-panel-content", className)}>
        {renderGenerateControls()}
      </div>
    );
  }

  if (workflowSection === 'generation-frame') {
    return (
      <div className={cn("adobe-panel-content", className)}>
        {renderGenerationFrameControls()}
      </div>
    );
  }

  if (workflowSection === 'canvas-to-image') {
    return (
      <div className={cn("adobe-panel-content", className)}>
        {renderCanvasToImageControls()}
      </div>
    );
  }

  if (workflowSection === 'convert') {
    return (
      <div className={cn("adobe-panel-content", className)}>
        {renderConvertControls()}
      </div>
    );
  }

  if (workflowSection === 'environment') {
    return (
      <div className={cn("adobe-panel-content", className)}>
        {renderEnvironmentControls()}
      </div>
    );
  }

  if (workflowSection === 'animation') {
    return (
      <div className={cn("adobe-panel-content", className)}>
        {renderAnimationControls()}
      </div>
    );
  }

  // Properties section - only show if entity is selected
  if (workflowSection === 'properties') {
    if (!selectedEntity) {
      return (
        <div className={cn("adobe-panel-content", className)}>
          <div className="adobe-section">
            {!isEngineReady ? (
              <p className="adobe-workflow-hint">
                Loading engine...
              </p>
            ) : (
              <p className="adobe-workflow-hint">
                Select an object to view its properties and controls.
              </p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className={cn("", className)}>
        {/* Panel Header with Actions */}
        <div className="adobe-panel-header">
          <div className="adobe-panel-title">
            {selectedEntity.entityType.toUpperCase()} PROPERTIES
          </div>
          <div className="adobe-panel-actions">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFocus}
              className="adobe-action-button"
              title="Focus on Object"
            >
              <IconFocus size={12} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDuplicate}
              className="adobe-action-button"
              title="Duplicate"
            >
              <IconCopy size={12} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="adobe-action-button"
              title="Delete"
            >
              <IconTrash size={12} />
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        {availableTabs.length > 0 && (
          <div className="adobe-tab-navigation">
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                className={cn(
                  "adobe-tab-button",
                  activeTab === tab.id && "active"
                )}
                onClick={() => setActiveTab(tab.id as any)}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Tab Content */}
        <div className="adobe-panel-content">
          {activeTab === 'transform' && renderTransformTab()}
          {activeTab === 'material' && renderMaterialTab()}
          {activeTab === 'ai' && renderAITab()}
          {activeTab === 'animation' && renderAnimationTab()}
        </div>
      </div>
    );
  }

  // Default fallback
  const fallbackContent = (
    <div className={cn("adobe-panel-content", className)}>
      <div className="adobe-section">
        <p className="adobe-workflow-hint">
          Unknown workflow section: {workflowSection}
        </p>
      </div>
    </div>
  );

  return (
    <>
      {fallbackContent}
      
      {/* Local Gallery Modal - Fallback implementation */}
      {localGalleryOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black bg-opacity-90">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-6xl h-full max-h-[90vh] mx-4 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold">Generated Images Gallery</h2>
                {localGalleryImages.length > 0 && (
                  <span className="text-sm text-gray-500">
                    {localCurrentIndex + 1} of {localGalleryImages.length}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeLocalGallery}
                className="rounded-full"
              >
                <IconX size={20} />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 flex overflow-hidden">
              {/* Main Image Area */}
              <div className="flex-1 flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-800">
                {localGalleryImages.length > 0 ? (
                  <div className="relative">
                    <img
                      src={localGalleryImages[localCurrentIndex]?.imageUrl}
                      alt="Generated image"
                      className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-lg"
                    />
                    
                    {/* Navigation */}
                    {localGalleryImages.length > 1 && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white rounded-full"
                          onClick={() => {
                            setLocalCurrentIndex(prev => 
                              prev > 0 ? prev - 1 : localGalleryImages.length - 1
                            );
                          }}
                        >
                          <IconArrowLeft size={20} />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white rounded-full"
                          onClick={() => {
                            setLocalCurrentIndex(prev => 
                              prev < localGalleryImages.length - 1 ? prev + 1 : 0
                            );
                          }}
                        >
                          <IconArrowRight size={20} />
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <div className="text-6xl mb-4">🖼️</div>
                    <h3 className="text-lg font-medium mb-2">No Images Yet</h3>
                    <p className="text-sm">Generate some images to see them here!</p>
                  </div>
                )}
              </div>

              {/* Info Panel */}
              {localGalleryImages.length > 0 && (
                <div className="w-80 bg-gray-100 dark:bg-gray-800 p-4 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
                  <h3 className="font-semibold mb-4">Image Details</h3>
                  
                  <div className="space-y-3 text-sm">
                    <div>
                      <strong>Prompt:</strong>
                      <p className="mt-1 text-gray-600 dark:text-gray-400">
                        {localGalleryImages[localCurrentIndex]?.prompt}
                      </p>
                    </div>
                    
                    <div>
                      <strong>Model:</strong>
                      <p className="mt-1 text-gray-600 dark:text-gray-400">
                        {localGalleryImages[localCurrentIndex]?.model}
                      </p>
                    </div>
                    
                    <div>
                      <strong>Seed:</strong>
                      <p className="mt-1 text-gray-600 dark:text-gray-400 font-mono">
                        {localGalleryImages[localCurrentIndex]?.seed}
                      </p>
                    </div>
                    
                    <div>
                      <strong>Generated:</strong>
                      <p className="mt-1 text-gray-600 dark:text-gray-400">
                        {localGalleryImages[localCurrentIndex]?.timestamp?.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-2">
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={() => {
                        // Apply settings from selected image
                        const currentImg = localGalleryImages[localCurrentIndex];
                        if (currentImg && engine) {
                          engine.getProjectManager().updateRenderSettings({
                            prompt: currentImg.prompt,
                            seed: currentImg.seed,
                            promptStrength: currentImg.promptStrength,
                            depthStrength: currentImg.depthStrength,
                            selectedLoras: currentImg.selectedLoras || [],
                          });
                          closeLocalGallery();
                        }
                      }}
                    >
                      Apply Settings
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        const currentImg = localGalleryImages[localCurrentIndex];
                        if (currentImg) {
                          // Download functionality
                          const link = document.createElement('a');
                          link.href = currentImg.imageUrl;
                          link.download = `generated-image-${Date.now()}.png`;
                          link.click();
                        }
                      }}
                    >
                      <IconDownload size={16} className="mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {localGalleryImages.length > 1 && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                <div className="flex overflow-x-auto gap-2">
                  {localGalleryImages.map((image, idx) => (
                    <div
                      key={idx}
                      className={`flex-shrink-0 cursor-pointer rounded-lg overflow-hidden ${
                        idx === localCurrentIndex ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-gray-300'
                      }`}
                      onClick={() => setLocalCurrentIndex(idx)}
                    >
                      <img
                        src={image.imageUrl}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-16 h-16 object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

// Add type declaration for window
declare global {
  interface Window {
    openGallery?: (index?: number) => void;
  }
}

export default ContextAwareRightPanel;
