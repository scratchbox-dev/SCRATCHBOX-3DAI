'use client';

import React, { useState, useEffect } from 'react';
import { useEditorEngine } from '../../context/EditorEngineContext';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { IconSun, IconBulb, IconMoon, IconArrowUp } from '@tabler/icons-react';
import * as THREE from 'three';

interface LightingSettingsPanelProps {
  className?: string;
}

const LightingSettingsPanel: React.FC<LightingSettingsPanelProps> = ({ className }) => {
  const { engine } = useEditorEngine();
  const [ambientIntensity, setAmbientIntensity] = useState(1.5);
  const [directionalIntensity, setDirectionalIntensity] = useState(1.5);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');

  // Update local state when engine changes
  useEffect(() => {
    if (engine) {
      const scene = engine.getScene();
      if (scene) {
        try {
          // Get current lighting values from scene
          const ambientLight = scene.children.find(child => child instanceof THREE.AmbientLight) as THREE.AmbientLight;
          const directionalLight = scene.children.find(child => child instanceof THREE.DirectionalLight) as THREE.DirectionalLight;
          
          setAmbientIntensity(ambientLight ? ambientLight.intensity : 1.5);
          setDirectionalIntensity(directionalLight ? directionalLight.intensity : 1.5);
          setCurrentTheme('light'); // Default theme
        } catch (error) {
          console.warn('Error reading lighting values, using defaults:', error);
          setAmbientIntensity(1.5);
          setDirectionalIntensity(1.5);
          setCurrentTheme('light');
        }
      }
    }
  }, [engine]);

  const handleAmbientChange = (value: number) => {
    const scene = engine?.getScene();
    if (scene) {
      // Find and update ambient light
      const ambientLight = scene.children.find(child => child instanceof THREE.AmbientLight) as THREE.AmbientLight;
      if (ambientLight) {
        ambientLight.intensity = value;
      } else {
        // Create new ambient light
        const newAmbientLight = new THREE.AmbientLight(0xffffff, value);
        scene.add(newAmbientLight);
      }
      setAmbientIntensity(value);
    }
  };

  const handleDirectionalChange = (value: number) => {
    const scene = engine?.getScene();
    if (scene) {
      // Find and update directional light
      const directionalLight = scene.children.find(child => child instanceof THREE.DirectionalLight) as THREE.DirectionalLight;
      if (directionalLight) {
        directionalLight.intensity = value;
      } else {
        // Create new directional light
        const newDirectionalLight = new THREE.DirectionalLight(0xffffff, value);
        newDirectionalLight.position.set(10, 10, 5);
        scene.add(newDirectionalLight);
      }
      setDirectionalIntensity(value);
    }
  };

  const handlePresetClick = (preset: 'bright' | 'normal' | 'dramatic') => {
    const scene = engine?.getScene();
    if (scene) {
      let ambientValue = 1.5;
      let directionalValue = 1.5;
      
      switch (preset) {
        case 'bright':
          ambientValue = 2.5;
          directionalValue = 2.5;
          break;
        case 'normal':
          ambientValue = 1.5;
          directionalValue = 1.5;
          break;
        case 'dramatic':
          ambientValue = 0.5;
          directionalValue = 2.0;
          break;
      }
      
      handleAmbientChange(ambientValue);
      handleDirectionalChange(directionalValue);
    }
  };

  const handleThemeToggle = () => {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setCurrentTheme(newTheme);
    console.log('Theme toggled to:', newTheme);
    // Note: Theme functionality can be implemented later
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <IconSun size={20} />
          Lighting Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Toggle */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Environment Theme</Label>
          <Button
            variant={currentTheme === 'light' ? 'default' : 'outline'}
            size="sm"
            onClick={handleThemeToggle}
            className="w-full"
          >
            {currentTheme === 'light' ? (
              <>
                <IconSun size={16} className="mr-2" />
                Light Theme
              </>
            ) : (
              <>
                <IconMoon size={16} className="mr-2" />
                Dark Theme
              </>
            )}
          </Button>
        </div>

        {/* Ambient Light Control */}
        <div>
          <Label className="text-sm font-medium mb-2 flex items-center gap-2">
            <IconBulb size={16} />
            Ambient Light Intensity: {ambientIntensity.toFixed(1)}
          </Label>
          <Slider
            value={[ambientIntensity]}
            onValueChange={([value]) => handleAmbientChange(value)}
            min={0}
            max={3}
            step={0.1}
            className="w-full"
          />
          <div className="text-xs text-gray-500 mt-1">
            Controls overall brightness of all objects
          </div>
        </div>

        {/* Directional Light Control */}
        <div>
          <Label className="text-sm font-medium mb-2 flex items-center gap-2">
            <IconArrowUp size={16} />
            Directional Light Intensity: {directionalIntensity.toFixed(1)}
          </Label>
          <Slider
            value={[directionalIntensity]}
            onValueChange={([value]) => handleDirectionalChange(value)}
            min={0}
            max={4}
            step={0.1}
            className="w-full"
          />
          <div className="text-xs text-gray-500 mt-1">
            Controls shadows and depth perception
          </div>
        </div>

        {/* Quick Presets */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Quick Presets</Label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePresetClick('bright')}
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <IconSun size={16} />
              <span className="text-xs">Bright</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePresetClick('normal')}
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <IconBulb size={16} />
              <span className="text-xs">Normal</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePresetClick('dramatic')}
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <IconMoon size={16} />
              <span className="text-xs">Dramatic</span>
            </Button>
          </div>
        </div>

        {/* Help Text */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
          <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
            💡 Lighting Tips
          </div>
          <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <li>• If objects appear too dark, increase ambient light</li>
            <li>• For better shadows, adjust directional light</li>
            <li>• Use "Bright" preset for maximum visibility</li>
            <li>• Use "Dramatic" for artistic lighting</li>
          </ul>
        </div>

        {/* Quick Actions */}
        <div className="border-t pt-4">
          <Label className="text-sm font-medium mb-2 block">Quick Actions</Label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handleAmbientChange(2.0);
                handleDirectionalChange(2.5);
              }}
              className="flex-1"
            >
              🚀 Max Brightness
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handleAmbientChange(1.5);
                handleDirectionalChange(1.5);
              }}
              className="flex-1"
            >
              🔄 Reset Default
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LightingSettingsPanel;
