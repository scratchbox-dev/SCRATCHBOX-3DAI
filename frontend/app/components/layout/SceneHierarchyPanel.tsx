'use client';

import React, { useState, useEffect } from 'react';
import { useEditorEngine } from '../../context/EditorEngineContext';
import { cn } from '@/lib/utils';
import { 
  IconChevronDown,
  IconChevronRight,
  IconEye,
  IconEyeOff,
  IconCube,
  IconSun,
  IconCamera,
  IconWand,
  IconUser,
  IconPlus,
  IconTrash,
  IconCopy,
  IconFocus
} from '@tabler/icons-react';
import { Button } from '../ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';

interface SceneHierarchyPanelProps {
  className?: string;
}

interface HierarchyNode {
  id: string;
  name: string;
  type: 'entity' | 'group';
  entityType?: string;
  entity?: any;
  children: HierarchyNode[];
  visible: boolean;
  expanded: boolean;
}

const SceneHierarchyPanel: React.FC<SceneHierarchyPanelProps> = ({ className }) => {
  const { engine } = useEditorEngine();
  const [hierarchy, setHierarchy] = useState<HierarchyNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Build hierarchy from scene objects
  const buildHierarchy = () => {
    if (!engine) return [];

    try {
      const objectManager = engine.getObjectManager();
      const scene = engine.getScene();
      
      // Get all entities from the object manager
      const entities = objectManager.getAllEntities();
      
      // Group entities by type
      const groups: { [key: string]: any[] } = {
        'Objects': [],
        'Lights': [],
        'Cameras': [],
        'Characters': [],
        'AI Frames': []
      };

      entities.forEach(entity => {
        if (entity.entityType === 'shape') {
          groups['Objects'].push(entity);
        } else if (entity.entityType === 'light') {
          groups['Lights'].push(entity);
        } else if (entity.entityType === 'character') {
          groups['Characters'].push(entity);
        } else if (entity.entityType === 'generative') {
          groups['AI Frames'].push(entity);
        }
      });

      // Add cameras from scene
      scene.children.forEach(child => {
        if (child.type === 'Camera') {
          groups['Cameras'].push(child);
        }
      });

      // Convert to hierarchy nodes
      const hierarchyNodes: HierarchyNode[] = [];
      
      Object.entries(groups).forEach(([groupName, items]) => {
        if (items.length > 0) {
          const groupNode: HierarchyNode = {
            id: `group-${groupName.toLowerCase().replace(' ', '-')}`,
            name: groupName,
            type: 'group',
            children: items.map((item, index) => ({
              id: item.id || `item-${index}`,
              name: item.name || `${item.entityType || 'Object'} ${index + 1}`,
              type: 'entity' as const,
              entityType: item.entityType,
              entity: item,
              children: [],
              visible: item.visible !== false,
              expanded: false
            })),
            visible: true,
            expanded: true
          };
          hierarchyNodes.push(groupNode);
        }
      });

      return hierarchyNodes;
    } catch (error) {
      console.warn('Error building hierarchy:', error);
      return [];
    }
  };

  // Update hierarchy when entities change
  useEffect(() => {
    if (!engine) return;

    const updateHierarchy = () => {
      setHierarchy(buildHierarchy());
    };

    // Initial update
    updateHierarchy();

    // Subscribe to object manager events
    const objectManager = engine.getObjectManager();
    if (objectManager && objectManager.observer) {
      const unsubscribe = objectManager.observer.subscribe('hierarchyChanged', updateHierarchy);
      return unsubscribe;
    }
  }, [engine]);

  // Handle node selection
  const handleNodeSelect = (node: HierarchyNode) => {
    if (node.type === 'entity' && node.entity) {
      setSelectedNodeId(node.id);
      
      // Select the entity in the engine
      if (engine) {
        const selectionManager = engine.getSelectionManager();
        if (selectionManager) {
          selectionManager.select(node.entity);
        }
      }
    }
  };

  // Handle visibility toggle
  const handleVisibilityToggle = (node: HierarchyNode) => {
    if (node.type === 'entity' && node.entity) {
      const newVisible = !node.visible;
      node.visible = newVisible;
      
      if (node.entity.visible !== undefined) {
        node.entity.visible = newVisible;
      }
      
      // Update hierarchy
      setHierarchy([...hierarchy]);
    }
  };

  // Handle group expansion toggle
  const handleGroupToggle = (node: HierarchyNode) => {
    node.expanded = !node.expanded;
    setHierarchy([...hierarchy]);
  };

  // Handle focus on object
  const handleFocus = (node: HierarchyNode) => {
    if (node.type === 'entity' && node.entity && engine) {
      const cameraManager = engine.getCameraManager();
      if (cameraManager && cameraManager.focusOnObject) {
        cameraManager.focusOnObject(node.entity);
      }
    }
  };

  // Handle delete object
  const handleDelete = (node: HierarchyNode) => {
    if (node.type === 'entity' && node.entity && engine) {
      // Implement delete functionality
      console.log('Delete entity:', node.entity);
    }
  };

  // Handle duplicate object
  const handleDuplicate = (node: HierarchyNode) => {
    if (node.type === 'entity' && node.entity && engine) {
      // Implement duplicate functionality
      console.log('Duplicate entity:', node.entity);
    }
  };

  // Get icon for entity type
  const getEntityIcon = (entityType?: string) => {
    switch (entityType) {
      case 'shape': return <IconCube size={14} />;
      case 'light': return <IconSun size={14} />;
      case 'character': return <IconUser size={14} />;
      case 'generative': return <IconWand size={14} />;
      default: return <IconCube size={14} />;
    }
  };

  // Render hierarchy node
  const renderNode = (node: HierarchyNode, depth: number = 0) => {
    const isSelected = selectedNodeId === node.id;
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id} className="hierarchy-node">
        <div 
          className={cn(
            "hierarchy-item",
            isSelected && "selected",
            !node.visible && "hidden"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => handleNodeSelect(node)}
        >
          {/* Expand/Collapse Button */}
          {hasChildren && (
            <button
              className="hierarchy-expand-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleGroupToggle(node);
              }}
            >
              {node.expanded ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
            </button>
          )}
          
          {/* Icon */}
          <div className="hierarchy-icon">
            {node.type === 'group' ? (
              <IconCube size={14} />
            ) : (
              getEntityIcon(node.entityType)
            )}
          </div>
          
          {/* Name */}
          <span className="hierarchy-name">{node.name}</span>
          
          {/* Actions */}
          {node.type === 'entity' && (
            <div className="hierarchy-actions">
              <button
                className="hierarchy-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleVisibilityToggle(node);
                }}
                title={node.visible ? "Hide" : "Show"}
              >
                {node.visible ? <IconEye size={12} /> : <IconEyeOff size={12} />}
              </button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="hierarchy-action-btn"
                    onClick={(e) => e.stopPropagation()}
                    title="More actions"
                  >
                    ⋯
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleFocus(node)}>
                    <IconFocus size={14} />
                    Focus
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicate(node)}>
                    <IconCopy size={14} />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDelete(node)}>
                    <IconTrash size={14} />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
        
        {/* Children */}
        {hasChildren && node.expanded && (
          <div className="hierarchy-children">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("adobe-panel", className)}>
      {/* Panel Header */}
      <div className="adobe-panel-header">
        <div className="adobe-panel-title">SCENE HIERARCHY</div>
        <div className="adobe-panel-actions">
          <Button
            variant="ghost"
            size="sm"
            className="adobe-action-button"
            title="Add Object"
          >
            <IconPlus size={12} />
          </Button>
        </div>
      </div>

      {/* Hierarchy Content */}
      <div className="adobe-panel-content">
        {hierarchy.length === 0 ? (
          <div className="hierarchy-empty">
            <p className="adobe-workflow-hint">No objects in scene</p>
          </div>
        ) : (
          <div className="hierarchy-tree">
            {hierarchy.map(node => renderNode(node))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SceneHierarchyPanel;
