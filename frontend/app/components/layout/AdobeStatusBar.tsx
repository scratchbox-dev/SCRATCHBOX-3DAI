'use client';

import React, { useState, useEffect } from 'react';
import { useEditorEngine } from '../../context/EditorEngineContext';
import { IconCube, IconSun, IconCamera, IconWand, IconUser } from '@tabler/icons-react';

const AdobeStatusBar: React.FC = () => {
  const { engine, selectedEntity } = useEditorEngine();
  const [sceneStats, setSceneStats] = useState({
    objects: 0,
    lights: 0,
    characters: 0,
    aiFrames: 0,
    cameras: 1
  });

  useEffect(() => {
    if (!engine) return;

    const updateStats = () => {
      try {
        const objectManager = engine.getObjectManager();
        const allEntities = objectManager.getAllEntities();
        
        const stats = {
          objects: 0,
          lights: 0,
          characters: 0,
          aiFrames: 0,
          cameras: 1
        };

        allEntities.forEach(entity => {
          switch (entity.entityType) {
            case 'shape':
              stats.objects++;
              break;
            case 'light':
              stats.lights++;
              break;
            case 'character':
              stats.characters++;
              break;
            case 'generative':
              stats.aiFrames++;
              break;
          }
        });

        setSceneStats(stats);
      } catch (error) {
        console.warn('Error updating scene stats:', error);
      }
    };

    updateStats();

    // Subscribe to object manager events
    const objectManager = engine.getObjectManager();
    if (objectManager && objectManager.observer) {
      const unsubscribe = objectManager.observer.subscribe('hierarchyChanged', updateStats);
      return unsubscribe;
    }
  }, [engine]);

  const getSelectedInfo = () => {
    if (!selectedEntity) return 'None';
    
    const typeIcon = {
      'shape': <IconCube size={12} />,
      'light': <IconSun size={12} />,
      'character': <IconUser size={12} />,
      'generative': <IconWand size={12} />
    }[selectedEntity.entityType] || <IconCube size={12} />;

    return (
      <span className="adobe-status-selected">
        {typeIcon}
        <span>{selectedEntity.name || selectedEntity.entityType}</span>
      </span>
    );
  };

  return (
    <div className="adobe-status-bar">
      <div className="adobe-status-left">
        <span className="adobe-status-item">
          <IconCube size={12} />
          {sceneStats.objects}
        </span>
        <span className="adobe-status-item">
          <IconSun size={12} />
          {sceneStats.lights}
        </span>
        <span className="adobe-status-item">
          <IconUser size={12} />
          {sceneStats.characters}
        </span>
        <span className="adobe-status-item">
          <IconWand size={12} />
          {sceneStats.aiFrames}
        </span>
        <span className="adobe-status-separator">|</span>
        <span className="adobe-status-item">
          Selected: {getSelectedInfo()}
        </span>
      </div>
      
      <div className="adobe-status-center">
        <span className="adobe-status-indicator">
          ● Ready
        </span>
      </div>
      
      <div className="adobe-status-right">
        <span className="adobe-status-item">
          <IconCamera size={12} />
          Perspective
        </span>
        <span className="adobe-status-separator">|</span>
        <span className="adobe-status-item">
          Zoom: 100%
        </span>
        <span className="adobe-status-separator">|</span>
        <span className="adobe-status-item">
          FPS: 60
        </span>
      </div>
    </div>
  );
};

export default AdobeStatusBar;
