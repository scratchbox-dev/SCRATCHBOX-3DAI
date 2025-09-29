/**
 * EditorEngineContext.tsx
 * 
 * React context that bridges the React component world with the
 * Three.js EditorEngine. This context:
 * - Provides access to the EditorEngine singleton
 * - Converts engine events into React state updates
 * - Makes engine state (like selection) available to all components
 * - Handles cleanup of event listeners
 * 
 * This is the only file that should directly interact with both
 * React hooks/state AND the EditorEngine - it acts as the boundary
 * between the two systems.
 */
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { EditorEngine } from '../engine/core/EditorEngine';
import { EntityBase } from '@/engine/entity/base/EntityBase';
import { IRenderSettings, IRenderLog } from '../engine/interfaces/rendering';
import { defaultSettings } from '@/engine/utils/ProjectUtil';
import { ImageRatio } from '@/engine/utils/imageUtil';
import EngineUIContainer from '../components/EngineUIContainer';
import { TransformMode } from '@/engine/managers/TransformControlManager';
import { ViewMode } from '@/engine/interfaces/viewMode';
import { Selectable } from '../engine/entity/base/Selectable';
import { DEFAULT_PREFERENCES, UserPreferences } from '../engine/managers/UserPrefManager';
import { fal } from '@fal-ai/client';

interface EditorEngineContextType {
  engine: EditorEngine;
  isInitialized: boolean;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  selectedEntity: EntityBase | null;
  selectedSelectable: Selectable | null;
  gizmoMode: TransformMode;
  gizmoAllowedModes: TransformMode[];
  renderSettings: IRenderSettings;
  setRenderSettings: (settings: Partial<IRenderSettings>) => void;
  setAspectRatio: (ratio: ImageRatio) => void;
  uiLayoutMode: UiLayoutMode;
  setUiLayoutMode: (mode: UiLayoutMode) => void;
  gizmoSpace: 'world' | 'local';
  setGizmoSpace: (space: 'world' | 'local') => void;
  userPreferences: UserPreferences;
  setUserPreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  showGuide: boolean;
  setShowGuide: (show: boolean) => void;
  // Gallery state
  galleryOpen: boolean;
  setGalleryOpen: (open: boolean) => void;
  openGallery: (index?: number) => void;
}

export enum UiLayoutMode {
  Image = 'image',
  Video = 'video',
}

const EditorEngineContext = createContext<EditorEngineContextType | null>(null);

export function EditorEngineProvider({ children }: { children: React.ReactNode }) {
  const engine = EditorEngine.getInstance();
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<EntityBase | null>(null);
  const [selectedSelectable, setSelectedSelectable] = useState<Selectable | null>(null);
  const [gizmoMode, setGizmoMode] = useState<TransformMode>(TransformMode.Position);
  const [gizmoAllowedModes, setGizmoAllowedModes] = useState<TransformMode[]>([TransformMode.Position, TransformMode.Rotation, TransformMode.Scale, TransformMode.BoundingBox]);
  const [renderSettings, setRenderSettingsState] = useState<IRenderSettings>(defaultSettings);
  const [renderLogs, setRenderLogs] = useState<IRenderLog[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [uiLayoutMode, setUiLayoutMode] = useState<UiLayoutMode>(UiLayoutMode.Image);
  const [viewMode, setViewModeState] = useState<ViewMode>(ViewMode.ThreeD);
  const [gizmoSpace, setGizmoSpaceState] = useState<'world' | 'local'>('world');
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [showGuide, setShowGuide] = useState(false);
  
  // Gallery state
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  
  // Gallery function
  const openGallery = (index?: number) => {
    console.log('EditorEngineContext: openGallery called with index:', index);
    const logs = engine.getProjectManager().getRenderLogs() || [];
    let nextIndex = logs.length > 0 ? logs.length - 1 : 0;
    if (index !== undefined) {
      nextIndex = Math.min(Math.max(index, 0), logs.length > 0 ? logs.length - 1 : 0);
    }
    setGalleryIndex(nextIndex);
    setGalleryOpen(logs.length > 0);
  };

  useEffect(() => {
    if (canvasRef.current) {
      let unsubAll: (() => void)[] = [];

      const initEngine = async () => {
        console.log('EditorEngineContext: initEngine: initEngine');
        
        if (!canvasRef.current) return;
        const engine = await EditorEngine.initEngine(canvasRef.current);

        // Subscribe to engine events
        const unsubGizmoMode = engine.getTransformControlManager().observers.subscribe('gizmoModeChanged', ({ mode }) => setGizmoMode(mode));
        const unsubGizmoAllowedModes = engine.getTransformControlManager().observers.subscribe('gizmoAllowedModesChanged', ({ modes }) => setGizmoAllowedModes(modes));
        const unsubEntitySelected = engine.getSelectionManager().selectionObserver.subscribe('entitySelected', ({ entity }) => setSelectedEntity(entity));
        const unsubSelectableSelected = engine.getSelectionManager().selectionObserver.subscribe('selectableSelected', ({ selectable }) => setSelectedSelectable(selectable));

        // Subscribe to project manager events
        const applyRenderSettings = (settings: IRenderSettings) => {
          setRenderSettingsState(settings);
          if (settings.ratio) {
            engine.getCameraManager().setRatioOverlayRatio(settings.ratio);
          }
        };

        const unsubRenderSettingsChanged = engine.getProjectManager().observers.subscribe('renderSettingsChanged', ({ renderSettings }) => applyRenderSettings(renderSettings));
        const unsubProjectLoaded = engine.getProjectManager().observers.subscribe('projectLoaded', ({ project }) => applyRenderSettings(project));

        const unsubGizmoSpace = engine.getTransformControlManager().observers.subscribe(
          'gizmoSpaceChanged',
          ({ space }) => {
            setGizmoSpaceState(space);
          }
        );

        const unsubViewMode = engine.getCameraManager().observer.subscribe('viewModeChanged', ({ viewMode }) => {
          setViewModeState(viewMode);
        });

        const initialRenderSettings = engine.getProjectManager().getRenderSettings();
        if (initialRenderSettings) {
          applyRenderSettings(initialRenderSettings);
        }

        const renderLogs = engine.getProjectManager().getRenderLogs() || [];
        if (renderLogs.length > 0) {
          setGalleryIndex(renderLogs.length - 1);
        }

        // Subscribe to user preferences changes
        const unsubPreferences = engine.getUserPrefManager().observer.subscribe(
          'preferencesChanged',
          ({ preferences }) => {
            // TODO: Force an update for all preferences, may be inefficient
            setUserPreferences({...preferences});
          }
        );
        
        // Get initial values (asynchronously)
        const prefs = await engine.getUserPrefManager().getPreferences();
        console.log("EditorEngineContext: initEngine: getPreferences", prefs);
        setUserPreferences(prefs);
        
        unsubAll.push(unsubGizmoMode, unsubGizmoAllowedModes, unsubEntitySelected, unsubSelectableSelected, unsubRenderSettingsChanged, unsubProjectLoaded, unsubGizmoSpace, unsubViewMode, unsubPreferences);

        
        setIsInitialized(true);
      }

      initEngine();

      // Return cleanup function
      return () => {
        unsubAll.forEach(unsub => unsub());
      };
    }
  }, [canvasRef.current]);

  useEffect(() => {
    if (isInitialized) {
      console.log(`EditorEngineContext: isInitialized:`, isInitialized);
    }
  }, [isInitialized]);


  // React to user preferences changes
  useEffect(() => {
    // if theme changed, update the document element class
    document.documentElement.classList.toggle('dark', userPreferences.theme === 'dark');
  }, [userPreferences.theme]);

  // Fal api key changed, update the fal client
  useEffect(() => {
    if (userPreferences.falApiKey) {
      fal.config({ credentials: userPreferences.falApiKey });
    }
  }, [userPreferences.falApiKey]);

  // Create a function to update a specific preference
  const storeUserPreference = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]): void => {
    if (engine) {
      console.log("EditorEngineContext: storeUserPreference: setPreference", key, value);
      engine.getUserPrefManager().setPreference(key, value);
    }
  };

  return (
    <EditorEngineContext.Provider
      value={{
        engine,
        isInitialized,
        viewMode,
        setViewMode: (mode: ViewMode) => {
          setViewModeState(mode);
          engine.setViewMode(mode);
        },
        selectedEntity,
        selectedSelectable,
        gizmoMode,
        gizmoAllowedModes,
        renderSettings,
        setRenderSettings: (settings: Partial<IRenderSettings>) => {
          engine.getProjectManager().updateRenderSettings(settings);
        },
        setAspectRatio: (ratio: ImageRatio) => {
          engine.setAspectRatio(ratio);
        },
        uiLayoutMode,
        setUiLayoutMode,
        gizmoSpace,
        setGizmoSpace: setGizmoSpaceState,
        userPreferences,
        setUserPreference: storeUserPreference,
        showGuide,
        setShowGuide,
        // Gallery state and functions
        galleryOpen,
        setGalleryOpen,
        openGallery,
      }}
    >
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-auto"></canvas>
      {children}
      {isInitialized && <EngineUIContainer />}
    </EditorEngineContext.Provider>
  );
}

export function useEditorEngine() {
  const context = useContext(EditorEngineContext);
  if (!context) {
    throw new Error('useEditorEngine must be used within an EditorEngineProvider');
  }
  return context;
} 