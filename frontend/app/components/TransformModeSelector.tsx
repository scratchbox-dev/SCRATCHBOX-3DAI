import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  IconArrowsMove, // Position
  IconRotate, // Rotation
  IconArrowsMaximize, // Scale
  IconCube3dSphere, // Bounding Box
  IconWorld, // World space
  IconAxisY, // Local space
  IconLock, // Uniform scaling locked
  IconLockOpen // Uniform scaling unlocked
} from '@tabler/icons-react';
import { useEditorEngine } from '../context/EditorEngineContext';
import { TransformMode } from '../engine/managers/TransformControlManager';

const GizmoModeSelector: React.FC = () => {
  const { gizmoMode, gizmoAllowedModes, gizmoSpace, engine } = useEditorEngine();
  const [uniformScaling, setUniformScaling] = useState(false);

  const toggleTransformSpace = () => {
    if (engine) {
      engine.getTransformControlManager().toggleTransformControlSpace();
    }
  };

  const toggleUniformScaling = () => {
    if (engine) {
      const newUniformScaling = !uniformScaling;
      setUniformScaling(newUniformScaling);
      engine.getTransformControlManager().setUniformScaling(newUniformScaling);
    }
  };

  // Reset uniform scaling when switching away from scale modes
  useEffect(() => {
    if (gizmoMode !== TransformMode.Scale && gizmoMode !== TransformMode.BoundingBox) {
      if (uniformScaling) {
        setUniformScaling(false);
        if (engine) {
          engine.getTransformControlManager().setUniformScaling(false);
        }
      }
    }
  }, [gizmoMode, engine, uniformScaling]);

  return (
    <>
      <TooltipProvider>


        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTransformSpace}
              aria-label="transform space toggle"
            >
              {gizmoSpace === 'world' ? (
                <IconWorld className="h-4 w-4" />
              ) : (
                <IconCube3dSphere className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{gizmoSpace === 'world' ? 'World Space (Q)' : 'Local Space (Q)'}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={gizmoMode === TransformMode.Position ? 'default' : 'outline'}
              disabled={!gizmoAllowedModes.includes(TransformMode.Position)}
              size="icon"
              onClick={() => engine.setTransformControlMode(TransformMode.Position)}
              aria-label="position gizmo"
            >
              <IconArrowsMove className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Move (W)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={gizmoMode === TransformMode.Rotation ? 'default' : 'outline'}
              disabled={!gizmoAllowedModes.includes(TransformMode.Rotation)}
              size="icon"
              onClick={() => engine.setTransformControlMode(TransformMode.Rotation)}
              aria-label="rotation gizmo"
            >
              <IconRotate className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Rotate (E)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={gizmoMode === TransformMode.Scale ? 'default' : 'outline'}
              disabled={!gizmoAllowedModes.includes(TransformMode.Scale)}
              size="icon"
              onClick={() => engine.setTransformControlMode(TransformMode.Scale)}
              aria-label="scale gizmo"
            >
              <IconArrowsMaximize className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Scale (R)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={gizmoMode === TransformMode.BoundingBox ? 'default' : 'outline'}
              disabled={!gizmoAllowedModes.includes(TransformMode.BoundingBox)}
              size="icon"
              onClick={() => engine.setTransformControlMode(TransformMode.BoundingBox)}
              aria-label="bounding box gizmo"
            >
              <IconCube3dSphere className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Bounding Box (T)</p>
          </TooltipContent>
        </Tooltip>

        {/* Uniform Scaling Toggle - only show when in scale modes */}
        {(gizmoMode === TransformMode.Scale || gizmoMode === TransformMode.BoundingBox) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={uniformScaling ? 'default' : 'outline'}
                size="icon"
                onClick={toggleUniformScaling}
                aria-label="uniform scaling toggle"
              >
                {uniformScaling ? (
                  <IconLock className="h-4 w-4" />
                ) : (
                  <IconLockOpen className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{uniformScaling ? 'Uniform Scaling (Locked)' : 'Free Scaling (Unlocked)'}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
    </>
  );
};

export default GizmoModeSelector; 