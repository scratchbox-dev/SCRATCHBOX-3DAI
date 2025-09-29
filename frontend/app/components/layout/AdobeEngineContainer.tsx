'use client';

import React from 'react';
import AdobeLayout from './AdobeLayout';
import AdobeMenuBar from './AdobeMenuBar';
import AdobeToolbar from './AdobeToolbar';
import AdobeStatusBar from './AdobeStatusBar';
import { useEditorEngine } from '../../context/EditorEngineContext';
import { ViewMode } from '@/engine/interfaces/viewMode';
import { cn } from '@/lib/utils';
import { 
  IconCube3dSphere,
  IconFocus,
  IconEyeOff,
  IconFrame,
  IconPalette
} from '@tabler/icons-react';

// Import existing panels (only the ones we need)
import GalleryPanel from '../GalleryPanel';
import DebugPanel from '../Debug/DebugPanel';
import Guide from '../Guide';
import FileDragDropOverlay from '../FileDragDropOverlay';
import RatioOverlay from '../RatioOverlay';
import EntityPanel from '../EntityPanels/EntityPanel';
import ContextAwareRightPanel from './ContextAwareRightPanel';
import SceneHierarchyPanel from './SceneHierarchyPanel';
import LightingSettingsPanel from './LightingSettingsPanel';

// Panel wrapper component to adapt existing panels to Adobe style
const PanelWrapper: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`adobe-panel-wrapper ${className}`}>
    {children}
  </div>
);

const AdobeEngineContainer: React.FC = () => {
  const { engine, gizmoMode, gizmoSpace, viewMode } = useEditorEngine();

  // Handle viewport setup when Adobe layout mounts
  React.useEffect(() => {
    if (engine) {
      // Small delay to ensure layout is fully rendered
      setTimeout(() => {
        // Find the canvas and move it to the Adobe viewport container
        const canvas = document.querySelector('canvas');
        const canvasContainer = document.querySelector('.adobe-canvas-container');
        
        if (canvas && canvasContainer) {
          // Move canvas to the Adobe viewport container
          canvasContainer.appendChild(canvas);
          
          // Update canvas styling for Adobe layout
          canvas.style.position = 'absolute';
          canvas.style.top = '0';
          canvas.style.left = '0';
          canvas.style.width = '100%';
          canvas.style.height = '100%';
          canvas.style.zIndex = '1';
          
          // Resize the renderer to fit the new container
          engine.getCore().handleContainerResize();
        }

        // Set up ResizeObserver to handle viewport size changes
        const viewportContainer = document.querySelector('.adobe-3d-viewport');
        if (viewportContainer) {
          const resizeObserver = new ResizeObserver(() => {
            engine.getCore().handleContainerResize();
          });
          
          resizeObserver.observe(viewportContainer);
          
          return () => {
            resizeObserver.disconnect();
          };
        }
      }, 200);
    }
  }, [engine]);

  // Define left panels (tools are handled separately) - now empty since hierarchy moved to right
  const leftPanels = [];

  // Define right panels - separate workflow sections and entity properties
  const rightPanels = [
    {
      id: 'hierarchy',
      title: 'Hierarchy',
      component: (
        <PanelWrapper>
          <SceneHierarchyPanel />
        </PanelWrapper>
      ),
      collapsible: true,
      defaultCollapsed: false,
    },
    {
      id: 'basic3d',
      title: 'Basic 3D',
      component: (
        <PanelWrapper>
          <ContextAwareRightPanel workflowSection="basic3d" />
        </PanelWrapper>
      ),
      collapsible: true,
      group: {
        id: 'basic3d',
        title: 'Basic 3D',
        order: 1,
      },
    },
    {
      id: 'generation-frame',
      title: 'Frame Generation',
      component: (
        <PanelWrapper>
          <ContextAwareRightPanel workflowSection="generation-frame" />
        </PanelWrapper>
      ),
      collapsible: true,
      group: {
        id: 'generation-frame',
        title: 'Generation Frames',
        order: 2,
      },
    },
    {
      id: 'canvas-to-image',
      title: 'Canvas to Image',
      component: (
        <PanelWrapper>
          <ContextAwareRightPanel workflowSection="canvas-to-image" />
        </PanelWrapper>
      ),
      collapsible: true,
      group: {
        id: 'canvas-to-image',
        title: 'Canvas to Image',
        order: 3,
      },
    },
    {
      id: 'convert',
      title: 'Convert 3D',
      component: (
        <PanelWrapper>
          <ContextAwareRightPanel workflowSection="convert" />
        </PanelWrapper>
      ),
      collapsible: true,
      defaultCollapsed: true,
      group: {
        id: 'convert',
        title: 'Convert 3D',
        order: 4,
      },
    },
    {
      id: 'environment',
      title: 'Environment',
      component: (
        <PanelWrapper>
          <ContextAwareRightPanel workflowSection="environment" />
        </PanelWrapper>
      ),
      collapsible: true,
      defaultCollapsed: true,
      group: {
        id: 'environment',
        title: 'Environment',
        order: 5,
      },
    },
    {
      id: 'animation',
      title: 'Animation',
      component: (
        <PanelWrapper>
          <ContextAwareRightPanel workflowSection="animation" />
        </PanelWrapper>
      ),
      collapsible: true,
      defaultCollapsed: true,
      group: {
        id: 'animation',
        title: 'Animation',
        order: 6,
      },
    },
    {
      id: 'properties',
      title: 'Properties',
      component: (
        <PanelWrapper>
          <ContextAwareRightPanel workflowSection="properties" />
        </PanelWrapper>
      ),
      collapsible: true,
    },
    {
      id: 'lighting',
      title: 'Lighting',
      component: (
        <PanelWrapper>
          <LightingSettingsPanel />
        </PanelWrapper>
      ),
      collapsible: true,
      defaultCollapsed: true,
    }
  ];

  // Define bottom panels - removed workflow as it's now in the right panel
  const bottomPanels = [];

  const topBar = (
    <div className="adobe-top-bar-content">
      <AdobeMenuBar />
      
      <div className="adobe-top-bar-spacer" />
      <div className="adobe-top-bar-controls">
        <span className="adobe-project-name">3D Scene Editor</span>
      </div>
    </div>
  );

  return (
    <>
      <AdobeLayout
        topBar={topBar}
        leftPanels={leftPanels}
        rightPanels={rightPanels}
        bottomPanels={bottomPanels}
        statusBar={<AdobeStatusBar />}
        className="adobe-engine-layout"
      >
        {/* Main 3D viewport */}
        <div className="adobe-3d-viewport" id="adobe-3d-viewport">
          {/* Canvas container - the canvas will be moved here */}
          <div className={cn('adobe-canvas-container', viewMode === ViewMode.Canvas && 'canvas-mode')}>
            {/* The canvas is rendered by EditorEngineContext and will be moved here */}
          </div>
          
          {/* Overlays that should appear over the viewport */}
          <RatioOverlay />
          
          {/* Viewport overlays */}
          <div className="adobe-viewport-overlays">
            {/* Grid toggle button */}
            <div className="adobe-viewport-controls">
              <button 
                className="adobe-viewport-control-btn"
                onClick={() => console.log('Toggle grid')}
                title="Toggle Grid (G)"
              >
                <IconCube3dSphere size={16} />
              </button>
              
              {/* Focus button */}
              <button 
                className="adobe-viewport-control-btn"
                onClick={() => {
                  const selectedEntity = engine?.getSelectionManager().getCurrentEntity();
                  if (selectedEntity) {
                    engine?.getCameraManager().focusOnObject(selectedEntity);
                  }
                }}
                title="Focus on Selected (F)"
              >
                <IconFocus size={16} />
              </button>
              
              {/* View mode toggle */}
              <button 
                className="adobe-viewport-control-btn"
                onClick={() => console.log('Toggle view mode')}
                title="Toggle View Mode"
              >
                <IconEyeOff size={16} />
              </button>
            </div>
            
            {/* Viewport info overlay */}
            <div className="adobe-viewport-info">
              <div className="adobe-viewport-info-item">
                <span className="adobe-viewport-info-label">Mode:</span>
                <span className="adobe-viewport-info-value">
                  {gizmoMode === 0 ? 'Move' : gizmoMode === 1 ? 'Rotate' : 'Scale'}
                </span>
              </div>
              <div className="adobe-viewport-info-item">
                <span className="adobe-viewport-info-label">Space:</span>
                <span className="adobe-viewport-info-value">
                  {gizmoSpace === 'world' ? 'World' : 'Local'}
                </span>
              </div>
              <div className="adobe-viewport-info-item">
                <span className="adobe-viewport-info-label">View:</span>
                <span className="adobe-viewport-info-value">
                  {viewMode === ViewMode.Canvas ? 'Canvas' : '3D'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </AdobeLayout>

      {/* Left toolbar - positioned separately for precise control */}
      <div className="adobe-toolbar-container">
        <AdobeToolbar />
      </div>

      {/* Only keep essential overlays */}
      <GalleryPanel />
      <Guide />
      
      {/* File drag drop overlay */}
      <FileDragDropOverlay />
      
      {/* Development panels */}
      {!(process.env.NODE_ENV === 'production') && <DebugPanel />}
    </>
  );
};

export default AdobeEngineContainer;
