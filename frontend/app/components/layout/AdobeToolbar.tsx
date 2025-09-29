'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  IconPointer,
  IconArrowsMove,
  IconRotate,
  IconArrowsMaximize,
  IconCube3dSphere,
  IconCube,
  IconSphere,
  IconCylinder,
  IconPyramid,
  IconSquare,
  IconSquareRotated,
  IconBulb,
  IconUser,
  IconCamera,
  IconEye,
  IconRuler,
  IconColorPicker,
  IconBrush,
  IconEraser,
  IconPencil,
  IconPhoto,
  IconHandStop,
  IconZoomIn,
  IconZoomOut,
  IconWorld,
  IconAxisY,
  IconLock,
  IconLockOpen,
  IconFocus,
  IconEyeOff,
  IconSun,
  IconMoon,
  IconPlayerPlay,
  IconViewportWide
} from '@tabler/icons-react';
import { useEditorEngine } from '../../context/EditorEngineContext';
import { ViewMode } from '@/engine/interfaces/viewMode';
import CharacterSelectionModal from '../CharacterSelectionModal';
import * as THREE from 'three';

interface ToolGroup {
  id: string;
  name: string;
  tools: Tool[];
}

interface Tool {
  id: string;
  name: string;
  icon: React.ReactNode;
  shortcut?: string;
  action?: () => void;
}

const AdobeToolbar: React.FC = () => {
  const [activeTool, setActiveTool] = useState<string>('select');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const { engine, gizmoMode, gizmoSpace, openGallery, viewMode, setViewMode } = useEditorEngine();

  const toolGroups: ToolGroup[] = [
    {
      id: 'selection',
      name: 'Selection Tools',
      tools: [
        { 
          id: 'select', 
          name: 'Selection Tool', 
          icon: <IconPointer size={20} />, 
          shortcut: 'V',
          action: () => {
            console.log('Selection tool activated');
          }
        },
        { 
          id: 'hand', 
          name: 'Hand Tool', 
          icon: <IconHandStop size={20} />, 
          shortcut: 'H',
          action: () => {
            console.log('Hand tool activated');
          }
        },
      ]
    },
    {
      id: 'transform',
      name: 'Transform Tools',
      tools: [
        { 
          id: 'position', 
          name: 'Position Tool', 
          icon: <IconArrowsMove size={20} />, 
          shortcut: 'W',
          action: () => {
            engine?.setTransformControlMode(0);
          }
        },
        { 
          id: 'rotation', 
          name: 'Rotation Tool', 
          icon: <IconRotate size={20} />, 
          shortcut: 'E',
          action: () => {
            engine?.setTransformControlMode(1);
          }
        },
        { 
          id: 'scale', 
          name: 'Scale Tool', 
          icon: <IconArrowsMaximize size={20} />, 
          shortcut: 'R',
          action: () => {
            engine?.setTransformControlMode(2);
          }
        },
        { 
          id: 'bounding-box', 
          name: 'Bounding Box Tool', 
          icon: <IconCube3dSphere size={20} />, 
          shortcut: 'T',
          action: () => {
            engine?.setTransformControlMode(3);
          }
        },
      ]
    },
    {
      id: 'shapes',
      name: 'Basic Shapes',
      tools: [
        { 
          id: 'cube', 
          name: 'Add Cube', 
          icon: <IconCube size={20} />,
          shortcut: '1',
          action: () => {
            engine?.createEntityCommand({
              type: 'shape',
              shapeProps: { shapeType: 'cube' }
            });
          }
        },
        { 
          id: 'sphere', 
          name: 'Add Sphere', 
          icon: <IconSphere size={20} />,
          shortcut: '2',
          action: () => {
            engine?.createEntityCommand({
              type: 'shape',
              shapeProps: { shapeType: 'sphere' }
            });
          }
        },
        { 
          id: 'cylinder', 
          name: 'Add Cylinder', 
          icon: <IconCylinder size={20} />,
          shortcut: '3',
          action: () => {
            engine?.createEntityCommand({
              type: 'shape',
              shapeProps: { shapeType: 'cylinder' }
            });
          }
        },
        { 
          id: 'plane', 
          name: 'Add Plane', 
          icon: <IconSquare size={20} />,
          shortcut: '4',
          action: () => {
            engine?.createEntityCommand({
              type: 'shape',
              shapeProps: { shapeType: 'plane' }
            });
          }
        },
        { 
          id: 'cone', 
          name: 'Add Cone', 
          icon: <IconPyramid size={20} />,
          shortcut: '5',
          action: () => {
            engine?.createEntityCommand({
              type: 'shape',
              shapeProps: { shapeType: 'cone' }
            });
          }
        },
        { 
          id: 'floor', 
          name: 'Add Floor', 
          icon: <IconSquareRotated size={20} />,
          shortcut: '6',
          action: () => {
            engine?.createEntityCommand({
              type: 'shape',
              shapeProps: { shapeType: 'floor' }
            });
          }
        },
      ]
    },
    {
      id: 'entities',
      name: 'Entities',
      tools: [
        { 
          id: 'character', 
          name: 'Add Character', 
          icon: <IconUser size={20} />,
          shortcut: 'C',
          action: () => {
            setShowCharacterModal(true);
          }
        },
        { 
          id: 'light', 
          name: 'Add Light', 
          icon: <IconBulb size={20} />,
          shortcut: 'L',
          action: () => {
            engine?.createEntityDefaultCommand('light');
          }
        },
        { 
          id: 'generative', 
          name: 'Add AI Frame', 
          icon: <IconPhoto size={20} />,
          shortcut: 'G',
          action: () => {
            engine?.createEntityDefaultCommand('generative');
          }
        },
      ]
    },
    {
      id: 'camera',
      name: 'Camera & View',
      tools: [
        { 
          id: 'focus', 
          name: 'Focus on Selected', 
          icon: <IconFocus size={20} />, 
          shortcut: 'F',
          action: () => {
            const selectedEntity = engine?.getSelectionManager().getCurrentEntity();
            if (selectedEntity) {
              engine?.getCameraManager().focusOnObject(selectedEntity);
            }
          }
        },
        { 
          id: 'toggle-gizmo', 
          name: 'Toggle Gizmo', 
          icon: <IconEyeOff size={20} />, 
          shortcut: 'X',
          action: () => {
            engine?.getObjectManager().toggleGizmo();
          }
        },
        { 
          id: 'transform-space', 
          name: 'Toggle Transform Space', 
          icon: gizmoSpace === 'world' ? <IconWorld size={20} /> : <IconAxisY size={20} />, 
          shortcut: 'Q',
          action: () => {
            engine?.getTransformControlManager().toggleTransformControlSpace();
          }
        },
      ]
    },
    {
      id: 'utilities',
      name: 'Utilities',
      tools: [
        { 
          id: 'gallery', 
          name: 'View Gallery', 
          icon: <IconPhoto size={20} />,
          action: () => {
            openGallery();
          }
        },
        { 
          id: 'lighting-preset', 
          name: 'Bright Lighting', 
          icon: <IconSun size={20} />,
          action: () => {
            console.log('Bright lighting preset - increasing ambient light');
            const scene = engine?.getScene();
            if (scene) {
              // Find existing ambient light and increase intensity
              const ambientLight = scene.children.find(child => child instanceof THREE.AmbientLight) as THREE.AmbientLight;
              if (ambientLight) {
                ambientLight.intensity = Math.min(3.0, ambientLight.intensity + 0.5);
              } else {
                // Add new ambient light
                const newAmbientLight = new THREE.AmbientLight(0xffffff, 2.0);
                scene.add(newAmbientLight);
              }
            }
          }
        },
      ]
    }
  ];

  const handleToolClick = (tool: Tool, groupId: string) => {
    console.log('Toolbar - Tool clicked:', tool.id, tool.name);
    setActiveTool(tool.id);
    if (tool.action) {
      console.log('Toolbar - Executing action for tool:', tool.id);
      try {
        tool.action();
        console.log('Toolbar - Action executed successfully for tool:', tool.id);
      } catch (error) {
        console.error('Toolbar - Error executing action for tool:', tool.id, error);
      }
    } else {
      console.warn('Toolbar - No action defined for tool:', tool.id);
    }
  };

  // Get current active tool based on engine state
  const getCurrentActiveTool = () => {
    if (!engine) return 'select';
    
    // Map gizmo modes to tool IDs
    switch (gizmoMode) {
      case 0: return 'position';  // TransformMode.Position
      case 1: return 'rotation';  // TransformMode.Rotation
      case 2: return 'scale';     // TransformMode.Scale
      case 3: return 'bounding-box'; // TransformMode.BoundingBox
      default: return 'select';
    }
  };

  const currentActiveTool = getCurrentActiveTool();

  const handleGroupClick = (groupId: string) => {
    setActiveGroup(activeGroup === groupId ? null : groupId);
  };

  const renderToolGroup = (group: ToolGroup) => {
    const primaryTool = group.tools[0];
    const hasSubTools = group.tools.length > 1;
    const isGroupExpanded = activeGroup === group.id;

    return (
      <div key={group.id} className="adobe-tool-group-container">
        <div
          className={cn(
            "adobe-tool-button",
            (currentActiveTool === primaryTool.id || activeTool === primaryTool.id) && "active",
            hasSubTools && "has-subtool",
            isGroupExpanded && "expanded"
          )}
          data-tool={primaryTool.id}
          onClick={(e) => {
            if (hasSubTools) {
              // If has sub-tools, show the dropdown on click
              e.preventDefault();
              handleGroupClick(group.id);
            } else {
              // If single tool, execute it directly
              handleToolClick(primaryTool, group.id);
            }
          }}
          title={`${primaryTool.name}${primaryTool.shortcut ? ` (${primaryTool.shortcut})` : ''}${hasSubTools ? ' (Click to expand)' : ''}`}
        >
          {primaryTool.icon}
          {hasSubTools && (
            <div className="adobe-subtool-indicator">
              {isGroupExpanded ? '▼' : '▶'}
            </div>
          )}
        </div>

        {/* Sub-tools dropdown */}
        {hasSubTools && isGroupExpanded && (
          <div className="adobe-subtool-dropdown">
            <div className="adobe-subtool-header">
              <span className="adobe-subtool-title">{group.name}</span>
            </div>
            {group.tools.map((tool) => (
              <div
                key={tool.id}
                className={cn(
                  "adobe-subtool-item",
                  (currentActiveTool === tool.id || activeTool === tool.id) && "active"
                )}
                onClick={() => {
                  handleToolClick(tool, group.id);
                  setActiveGroup(null);
                }}
                title={`${tool.name}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
              >
                <span className="adobe-subtool-icon">{tool.icon}</span>
                <span className="adobe-subtool-name">{tool.name}</span>
                {tool.shortcut && (
                  <span className="adobe-subtool-shortcut">{tool.shortcut}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Add keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key.toLowerCase();
      const isShift = e.shiftKey;
      const isAlt = e.altKey;
      
      // Create shortcut string to match
      let shortcutString = key;
      if (isShift && isAlt) {
        shortcutString = `shift+alt+${key}`;
      } else if (isShift) {
        shortcutString = `shift+${key}`;
      } else if (isAlt) {
        shortcutString = `alt+${key}`;
      }
      
      // Find tool by shortcut
      for (const group of toolGroups) {
        for (const tool of group.tools) {
          if (tool.shortcut?.toLowerCase() === shortcutString) {
            e.preventDefault();
            handleToolClick(tool, group.id);
            return;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine]);

  return (
    <>
      <div className="adobe-toolbar-panel">
        <div className="adobe-toolbar-content">
          <div className="adobe-view-toggle">
            <button
              type="button"
              className={cn(
                'adobe-tool-button',
                viewMode === ViewMode.Canvas && 'active'
              )}
              onClick={() => setViewMode(ViewMode.Canvas)}
              title="Canvas View"
            >
              <IconViewportWide size={20} />
            </button>
            <button
              type="button"
              className={cn(
                'adobe-tool-button',
                viewMode === ViewMode.ThreeD && 'active'
              )}
              onClick={() => setViewMode(ViewMode.ThreeD)}
              title="3D View"
            >
              <IconCube size={20} />
            </button>
          </div>
          {toolGroups.map(renderToolGroup)}
        </div>
      </div>

      {/* Overlay to close sub-tools when clicking outside */}
      {activeGroup && (
        <div
          className="adobe-toolbar-overlay"
          onClick={() => setActiveGroup(null)}
        />
      )}

      {/* Character Selection Modal */}
      <CharacterSelectionModal 
        isOpen={showCharacterModal} 
        onClose={() => setShowCharacterModal(false)} 
      />
    </>
  );
};

export default AdobeToolbar;
