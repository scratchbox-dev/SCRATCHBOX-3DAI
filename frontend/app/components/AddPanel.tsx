import React, { useState, useEffect } from 'react';
import { EntityType, EntityBase } from '@/engine/entity/base/EntityBase';
import { ShapeType } from '@/engine/entity/types/ShapeEntity';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreateEntityCommand } from '../lib/commands';
import { v4 as uuidv4 } from 'uuid';
import {
  IconCube,
  IconSphere,
  IconCylinder,
  IconPyramid,
  IconPlus,
  IconSquareRotated,
  IconSquare,
  IconBulb,
  IconUser,
} from '@tabler/icons-react';
import { trackEvent, ANALYTICS_EVENTS } from '@/engine/utils/external/analytics';
import { EditorEngine } from '@/engine/core/EditorEngine';
import * as THREE from 'three';
import CharacterSelectionModal from './CharacterSelectionModal';

const AddPanel: React.FC = () => {
  const [showShapesMenu, setShowShapesMenu] = useState(false);
  const [showCharacterModal, setShowCharacterModal] = useState(false);

  // Create an entity with command pattern
  const handleCreateGenerativeEntity = (entityType: EntityType) => {
    EditorEngine.getInstance().createEntityDefaultCommand(entityType);

    // Track analytics
    trackEvent(ANALYTICS_EVENTS.CREATE_ENTITY, {
      method: 'button',
      entityType: entityType
    });

  };

  // Create a primitive shape
  const handleCreateShape = (shapeType: ShapeType) => {
    console.log(`Creating ${shapeType} primitive`);
    EditorEngine.getInstance().createEntityCommand({
      type: 'shape',
      shapeProps: {
        shapeType: shapeType
      },
    })

    // Track analytics
    trackEvent(ANALYTICS_EVENTS.CREATE_ENTITY, {
      method: 'button',
      entityType: 'shape',
      shapeType: shapeType
    });
    // Hide the shapes menu after creation
    setShowShapesMenu(false);
  };

  // Handle light entity creation
  const handleCreateLight = () => {
    EditorEngine.getInstance().createEntityDefaultCommand('light');
    // Track analytics
    trackEvent(ANALYTICS_EVENTS.CREATE_ENTITY, {
      method: 'button',
      entityType: 'light'
    });
  };

  // Handle character modal open
  const handleOpenCharacterModal = () => {
    setShowCharacterModal(true);
  };

  // Add keyboard shortcut for character modal (C key)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'c' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        // Only open if no input is focused
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          event.preventDefault();
          setShowCharacterModal(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // List of primitive shapes with icons
  const primitiveShapes: { type: ShapeType, label: string, icon: React.ReactNode }[] = [
    { type: 'cube', label: 'Cube', icon: <IconCube size={20} /> },
    { type: 'sphere', label: 'Sphere', icon: <IconSphere size={20} /> },
    { type: 'cylinder', label: 'Cylinder', icon: <IconCylinder size={20} /> },
    { type: 'cone', label: 'Cone', icon: <IconPyramid size={20} /> },
    { type: 'plane', label: 'Plane', icon: <IconSquare size={20} /> },
    { type: 'floor', label: 'Floor', icon: <IconSquareRotated size={20} /> },
  ];


  return (
    <div className="fixed z-50 left-4 top-1/2 -translate-y-1/2 panel-shape p-1">
      {/* Entity type buttons */}
      <div className="grid gap-2">
        <Button
          onClick={() => handleCreateGenerativeEntity('generative')}
          variant="outline"
          className="h-14 w-14 rounded-md"
        >
          <div className="flex flex-col items-center justify-center">
            <IconPlus size={20} className="mb-1" />
            <span className="text-xs">Generate</span>
          </div>
        </Button>

        <div
          className="relative"
          onMouseEnter={() => setShowShapesMenu(true)}
          onMouseLeave={() => setShowShapesMenu(false)}
        >
          <Button
            variant="ghost"
            className="h-14 w-14 rounded-md"
          >
            <div className="flex flex-col items-center justify-center">
              <IconCube size={20} className="mb-1" />
              <span className="text-xs">Shapes</span>
            </div>
          </Button>

          {/* Shapes dropdown menu */}
          {showShapesMenu && (
            <div className="absolute left-14 top-0 pl-2">
              <Card className="p-2 w-44 grid grid-cols-2 gap-2 panel-shape">
                {primitiveShapes.map((shape) => (
                  <Button
                    key={shape.type}
                    variant="ghost"
                    size="sm"
                    className="flex items-center justify-start gap-2 h-10"
                    onClick={() => handleCreateShape(shape.type)}
                  >
                    {shape.icon}
                    <span className="text-xs">{shape.label}</span>
                  </Button>
                ))}
              </Card>
            </div>
          )}
        </div>

        <Button
          onClick={handleCreateLight}
          variant="ghost"
          className="h-14 w-14 rounded-md"
        >
          <div className="flex flex-col items-center justify-center">
            <IconBulb size={20} className="mb-1" />
            <span className="text-xs">Light</span>
          </div>
        </Button>

        {/* Character button */}
        <Button
          onClick={handleOpenCharacterModal}
          variant="ghost"
          className="h-14 w-14 rounded-md"
          title="Add Character (C)"
        >
          <div className="flex flex-col items-center justify-center">
            <IconUser size={20} className="mb-1" />
            <span className="text-xs">Character</span>
          </div>
        </Button>
      </div>
      
      {/* Character Selection Modal */}
      <CharacterSelectionModal 
        isOpen={showCharacterModal} 
        onClose={() => setShowCharacterModal(false)} 
      />
    </div>
  );
};

export default AddPanel; 