'use client';

import React, { useState, useEffect } from 'react';
import RatioSelector from './RatioSelector';
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { IconVideo } from '@tabler/icons-react';
import { ImageRatio } from '@/engine/utils/imageUtil';
import { useEditorEngine } from '../context/EditorEngineContext';
import { IRenderSettings } from '@/engine/interfaces/rendering';

const CameraPanel: React.FC = () => {
  const { engine, renderSettings, setAspectRatio } = useEditorEngine();

  // Local state to manage UI
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [padding, setPadding] = useState(10);
  const [rightExtraPadding, setRightExtraPadding] = useState(0);
  const [ratio, setRatio] = useState<ImageRatio>(renderSettings.ratio || '16:9');
  const [fov, setFov] = useState(0.8);
  const [farClip, setFarClip] = useState(20);
  const [isGizmoVisible, setIsGizmoVisible] = useState(true);

  // Initialize state from camera manager settings
  useEffect(() => {
    if (!engine) return;

    const cameraManager = engine.getCameraManager();

    // Get initial camera settings
    const cameraSettings = cameraManager.getCameraSettings();
    setFov(cameraSettings.fov);
    setFarClip(cameraSettings.farClip);

    // Get initial ratio overlay settings
    const overlaySettings = cameraManager.getRatioOverlaySettings();
    setOverlayVisible(overlaySettings.isVisible);
    setPadding(overlaySettings.padding);
    setRightExtraPadding(overlaySettings.rightExtraPadding);
    setRatio(overlaySettings.ratio);

    // Set up type-safe subscriptions
    const unsubFov = cameraManager.observer.subscribe('fovChanged',
      ({ fov }) => setFov(fov)
    );

    const unsubFarClip = cameraManager.observer.subscribe('farClipChanged',
      ({ farClip }) => setFarClip(farClip)
    );

    const unsubVisibility = cameraManager.observer.subscribe('ratioOverlayVisibilityChanged',
      ({ visible }) => setOverlayVisible(visible)
    );

    const unsubPadding = cameraManager.observer.subscribe('ratioOverlayPaddingChanged',
      ({ padding }) => setPadding(padding)
    );

    const unsubRightPadding = cameraManager.observer.subscribe('ratioOverlayRightPaddingChanged',
      ({ padding }) => setRightExtraPadding(padding)
    );

    const unsubRatio = cameraManager.observer.subscribe('ratioOverlayRatioChanged',
      ({ ratio }) => setRatio(ratio)
    );

    const unsubGizmosVisibility = engine.getObjectManager().observer.subscribe('gizmosVisibilityChanged',
      ({ visible }) => setIsGizmoVisible(visible)
    );

    // Cleanup subscriptions
    return () => {
      unsubFov();
      unsubFarClip();
      unsubVisibility();
      unsubPadding();
      unsubRightPadding();
      unsubRatio();
      unsubGizmosVisibility();
    };
  }, [engine]);

  // Event handlers
  const handleRatioChange = (newRatio: ImageRatio) => {
    setRatio(newRatio);
    setAspectRatio(newRatio);
  };

  const handlePaddingChange = (newValues: number[]) => {
    setPadding(newValues[0]);
    engine.getCameraManager().setRatioOverlayPadding(newValues[0]);
  };

  const handleRightExtraPaddingChange = (newValues: number[]) => {
    setRightExtraPadding(newValues[0]);
    engine.getCameraManager().setRatioOverlayRightPadding(newValues[0]);
  };

  const handleVisibilityChange = (checked: boolean) => {
    setOverlayVisible(checked);
    engine.getCameraManager().setRatioOverlayVisibility(checked);
  };

  const handleFovChange = (newValues: number[]) => {
    setFov(newValues[0]);
    engine.getCameraManager().setFOV(newValues[0]);
  };

  const handleFarClipChange = (newValues: number[]) => {
    setFarClip(newValues[0]);
    engine.getCameraManager().setFarClip(newValues[0]);
  };

  const handleGizmoVisibilityChange = (checked: boolean) => {
    setIsGizmoVisible(checked);
    engine.getRenderService().setAllGizmoVisibility(checked);
  };

  return (
    <div className='group relative'>
      <Button
        variant={'outline'}
        size="icon"
        aria-label="position gizmo"
        className='relative'
      >
        <IconVideo className="h-4 w-4" />
      </Button>
      <div className="hidden group-hover:block absolute top-8 pt-5 left-1/2 -translate-x-1/2">
        <div className="panel-shape max-w-sm p-4 space-y-4 w-48 ">

          <div className="space-y-4">

            {/* Ratio */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="ratio-selector" className="text-xs">Aspect Ratio</Label>
                <RatioSelector
                  value={ratio}
                  onChange={handleRatioChange}
                  disabled={!overlayVisible}
                  dropdownClassName="-top-5 left-0"
                />
              </div>
            </div>

            {/* Field of View */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="fov-slider" className="text-xs">Field of View</Label>
                <span className="text-xs text-gray-400">{fov}°</span>
              </div>
              <Slider
                id="fov-slider"
                value={[fov]}
                min={10}
                max={90}
                step={1}
                onValueChange={handleFovChange}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="far-clip-slider" className="text-xs">Far Clip</Label>
                <span className="text-xs text-gray-400">{farClip}</span>
              </div>
              <Slider
                id="far-clip-slider"
                value={[farClip]}
                min={10}
                max={200}
                step={10}
                onValueChange={handleFarClipChange}
              />
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <Label htmlFor="gizmo-visibility" className="text-xs">
                Gizmos
                <span className="text-xs opacity-50">(X)</span>
              </Label>

              <Switch
                id="gizmo-visibility"
                checked={isGizmoVisible}
                onCheckedChange={handleGizmoVisibilityChange}
              />
            </div>

            <div className="flex justify-between items-center">
              <Label htmlFor="overlay-visibility" className="text-xs">
                Frame
                <span className="text-xs opacity-50">(Z)</span>
              </Label>
              <Switch
                id="overlay-visibility"
                checked={overlayVisible}
                onCheckedChange={handleVisibilityChange}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="padding-slider" className="text-xs">Padding</Label>
                <span className="text-xs text-gray-400">{padding}%</span>
              </div>
              <Slider
                id="padding-slider"
                disabled={!overlayVisible}
                value={[padding]}
                min={0}
                max={30}
                step={1}
                onValueChange={handlePaddingChange}
              />
            </div>

            {/* <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="right-extra-padding-slider" className="text-xs">Right Extra Padding</Label>
              <span className="text-xs text-gray-400">{rightExtraPadding}%</span>
            </div>
            <Slider
              id="right-extra-padding-slider"
              disabled={!overlayVisible}
              value={[rightExtraPadding]}
              min={0}
              max={30}
              step={1}
              onValueChange={handleRightExtraPaddingChange}
            />
          </div> */}

          </div>
        </div></div></div>
  );
};

export default CameraPanel; 