'use client';

import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { IconArrowLeft, IconArrowRight, IconX, IconDownload } from '@tabler/icons-react';
import { downloadImage } from '../engine/utils/helpers';
import { IRenderLog } from '@/engine/interfaces/rendering';
import { useEditorEngine } from '../context/EditorEngineContext';
import { API_Info, availableAPIs } from '../engine/utils/generation/image-render-api';

const GalleryPanel: React.FC = () => {
  // State for the component
  const [currentIndex, setCurrentIndex] = useState(0);
  const [galleryLogs, setGalleryLogs] = useState<IRenderLog[]>([]);
  
  // Get engine and gallery state from context
  const { engine, galleryOpen, setGalleryOpen } = useEditorEngine();

  // Subscribe to renderLogsChanged event directly from ProjectManager
  useEffect(() => {
    // When component mounts, get initial render logs
    setGalleryLogs(engine.getProjectManager().getRenderLogs() || []);
    
    // Subscribe to renderLogsChanged event
    const unsubscribe = engine.getProjectManager().observers.subscribe(
      'renderLogsChanged', 
      ({ renderLogs, isNewRenderLog }) => {
        setGalleryLogs(renderLogs);
        
        // Only open gallery if this is a new render log and settings say to open
        if (isNewRenderLog && renderLogs.length > 0) {
          const settings = engine.getProjectManager().getRenderSettings();
          if (settings.openOnRendered) {
            setCurrentIndex(renderLogs.length - 1);
            setGalleryOpen(true);
          }
        }
      }
    );
    
    // Clean up subscription when component unmounts
    return () => unsubscribe();
  }, [engine]);

  // Close gallery
  const closeGallery = () => {
    setGalleryOpen(false);
  };

  // Handle opening with specific index
  React.useEffect(() => {
    if (galleryOpen) {
      // Gallery was opened, set appropriate index
      if (galleryLogs.length > 0) {
        setCurrentIndex(Math.min(currentIndex, galleryLogs.length - 1));
      } else {
        setCurrentIndex(0);
      }
    }
  }, [galleryOpen, galleryLogs.length]);

  const navigateImages = (direction: number) => {
    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = galleryLogs.length - 1;
    if (newIndex >= galleryLogs.length) newIndex = 0;
    setCurrentIndex(newIndex);
  };

  const handleApplySettings = () => {
    if (galleryLogs.length === 0 || currentIndex >= galleryLogs.length) return;
    
    // Apply settings from the selected render log
    engine.getProjectManager().updateRenderSettings({
      prompt: galleryLogs[currentIndex].prompt,
      seed: galleryLogs[currentIndex].seed,
      promptStrength: galleryLogs[currentIndex].promptStrength,
      depthStrength: galleryLogs[currentIndex].depthStrength,
      selectedLoras: galleryLogs[currentIndex].selectedLoras || [],
      // Find the API by name
      selectedAPI: availableAPIs.find((api: API_Info) => api.name === galleryLogs[currentIndex].model)?.id
    });
    
    // Close the gallery panel
    closeGallery();
  };

  // Handle keyboard navigation
  useEffect(() => {
    if (!galleryOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        navigateImages(-1);
      } else if (e.key === 'ArrowRight') {
        navigateImages(1);
      } else if (e.key === 'Escape') {
        closeGallery();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [galleryOpen, currentIndex, galleryLogs.length]);

  // Debug logging
  React.useEffect(() => {
    console.log('GalleryPanel: galleryOpen state changed to:', galleryOpen);
    console.log('GalleryPanel: galleryLogs count:', galleryLogs.length);
  }, [galleryOpen, galleryLogs.length]);

  if (!galleryOpen) {
    console.log('GalleryPanel: not rendering (galleryOpen is false)');
    return null;
  }

  console.log('GalleryPanel: rendering gallery modal');
  const currentImage = galleryLogs.length > 0 ? galleryLogs[currentIndex] : null;

  // Add click outside to close functionality
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeGallery();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-95 z-[9999] flex flex-col overflow-hidden"
      style={{ backdropFilter: 'blur(8px)' }}
      onClick={handleBackdropClick}
    >
      {/* Header */}
      <div className="flex justify-between items-center p-6 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center gap-4">
          <h1 className="text-white text-xl font-semibold">Generated Images Gallery</h1>
          {galleryLogs.length > 0 && (
            <span className="text-gray-400 text-sm">
              {currentIndex + 1} of {galleryLogs.length}
            </span>
          )}
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={closeGallery} 
          className="text-white hover:bg-white/10 rounded-full"
          title="Close Gallery (Esc)"
        >
          <IconX size={24} />
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Image display */}
        <div className="flex-1 flex items-center justify-center p-6 relative">
          {currentImage ? (
            <>
              {/* Navigation Buttons */}
              {galleryLogs.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-6 top-1/2 transform -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-sm border border-white/20"
                    onClick={() => navigateImages(-1)}
                    title="Previous Image (←)"
                  >
                    <IconArrowLeft size={24} />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-6 top-1/2 transform -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-sm border border-white/20"
                    onClick={() => navigateImages(1)}
                    title="Next Image (→)"
                  >
                    <IconArrowRight size={24} />
                  </Button>
                </>
              )}

              {/* Main Image */}
              <div className="relative max-h-full max-w-full flex items-center justify-center">
                <div className="relative rounded-lg overflow-hidden shadow-2xl">
                  <img
                    src={currentImage.imageUrl}
                    alt="Generated image"
                    className="max-h-[75vh] max-w-[90vw] object-contain"
                    style={{
                      filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))'
                    }}
                  />
                  
                  {/* Download Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm"
                    onClick={() => {
                      downloadImage(currentImage.imageUrl, `canvas-render-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.png`);
                    }}
                    title="Download Image"
                  >
                    <IconDownload size={20} />
                  </Button>

                  {/* Image Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <p className="text-white text-sm font-medium truncate">
                      {currentImage.prompt}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-300">
                      <span>{currentImage.model}</span>
                      <span>Seed: {currentImage.seed}</span>
                      <span>{currentImage.timestamp.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="text-center text-white max-w-md mx-auto">
              <div className="text-8xl mb-6 opacity-50">🎨</div>
              <h3 className="text-2xl font-semibold mb-4">Gallery is Empty</h3>
              <p className="text-gray-300 mb-8 leading-relaxed">
                Start creating AI-generated images using:
              </p>
              <div className="space-y-3 mb-8 text-left">
                <div className="flex items-center gap-3 text-gray-300">
                  <span className="text-blue-400">📸</span>
                  <span><strong>Canvas to Image</strong> - Transform your 3D scene</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <span className="text-green-400">🖼️</span>
                  <span><strong>Frame Generation</strong> - Generate content in frames</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <span className="text-purple-400">🌄</span>
                  <span><strong>Environment</strong> - Create custom skyboxes</span>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={closeGallery}
                className="text-white border-white/30 hover:bg-white hover:text-black px-8 py-2"
              >
                Close Gallery
              </Button>
            </div>
          )}
        </div>

        {/* Info panel */}
        <div className="w-full md:w-80 bg-black/30 backdrop-blur-sm border-l border-white/10 p-6 overflow-y-auto">
          {currentImage ? (
            <div className="space-y-6">
              {/* Image Details Header */}
              <div className="border-b border-white/20 pb-4">
                <h2 className="text-white text-lg font-semibold mb-2">Image Details</h2>
                <p className="text-gray-400 text-xs">
                  Generated on {currentImage.timestamp.toLocaleDateString()} at {currentImage.timestamp.toLocaleTimeString()}
                </p>
              </div>

              {/* Generation Info */}
              <div className="space-y-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <h3 className="text-white text-sm font-medium mb-2 flex items-center gap-2">
                    <span className="text-blue-400">💬</span>
                    Prompt
                  </h3>
                  <p className="text-gray-300 text-sm leading-relaxed">{currentImage.prompt}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 rounded-lg p-3">
                    <h3 className="text-white text-xs font-medium mb-1">Model</h3>
                    <p className="text-gray-300 text-sm">{currentImage.model}</p>
                  </div>

                  {currentImage.seed !== undefined && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <h3 className="text-white text-xs font-medium mb-1">Seed</h3>
                      <p className="text-gray-300 text-sm font-mono">{currentImage.seed}</p>
                    </div>
                  )}
                </div>

                {currentImage.promptStrength !== undefined && (
                  <div className="bg-white/5 rounded-lg p-3">
                    <h3 className="text-white text-xs font-medium mb-1">Creativity Strength</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-600 h-1 rounded">
                        <div 
                          className="bg-blue-400 h-1 rounded transition-all" 
                          style={{ width: `${(currentImage.promptStrength || 0) * 100}%` }}
                        />
                      </div>
                      <span className="text-gray-300 text-sm">{(currentImage.promptStrength || 0).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {currentImage.depthStrength !== undefined && currentImage.depthStrength > 0 && (
                  <div className="bg-white/5 rounded-lg p-3">
                    <h3 className="text-white text-xs font-medium mb-1">Depth Strength</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-600 h-1 rounded">
                        <div 
                          className="bg-purple-400 h-1 rounded transition-all" 
                          style={{ width: `${(currentImage.depthStrength || 0) * 100}%` }}
                        />
                      </div>
                      <span className="text-gray-300 text-sm">{(currentImage.depthStrength || 0).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {currentImage.selectedLoras && currentImage.selectedLoras.length > 0 && (
                  <div className="bg-white/5 rounded-lg p-3">
                    <h3 className="text-white text-xs font-medium mb-2">Applied Styles</h3>
                    <div className="space-y-2">
                      {currentImage.selectedLoras.map((lora: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <span className="text-gray-300">{lora.info.name}</span>
                          <span className="text-blue-400 font-mono">{lora.strength.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4 border-t border-white/20">
                <Button
                  variant="default"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={handleApplySettings}
                >
                  📋 Apply These Settings
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full text-white border-white/30 hover:bg-white hover:text-black"
                  onClick={() => {
                    downloadImage(currentImage.imageUrl, `canvas-render-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.png`);
                  }}
                >
                  <IconDownload size={16} className="mr-2" />
                  Download Image
                </Button>
              </div>
            </div>
          ) : (
            /* Empty state info panel */
            <div className="text-center text-white">
              <h3 className="text-lg font-medium mb-4">Gallery Tips</h3>
              <div className="space-y-3 text-sm text-gray-300">
                <p>• Generate images in frames using the "Generate Image" tab</p>
                <p>• Transform your 3D scene with "Generate from Canvas"</p>
                <p>• Create custom skyboxes in the "Environment" tab</p>
                <p>• All generated images will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Thumbnail Grid */}
      {galleryLogs.length > 0 && (
        <div className="bg-black/50 backdrop-blur-sm border-t border-white/10 p-4">
          <div className="flex items-center gap-4 mb-3">
            <h3 className="text-white text-sm font-medium">Generated Images</h3>
            <span className="text-gray-400 text-xs">{galleryLogs.length} total</span>
          </div>
          <div className="flex overflow-x-auto gap-3 pb-2" style={{ scrollbarWidth: 'thin' }}>
            {galleryLogs.map((image, idx) => (
              <div
                key={idx}
                className={`relative cursor-pointer flex-shrink-0 rounded-lg overflow-hidden transition-all ${
                  idx === currentIndex 
                    ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-black scale-105' 
                    : 'hover:scale-105 hover:ring-1 hover:ring-white/30'
                }`}
                onClick={() => setCurrentIndex(idx)}
                title={`${image.prompt.substring(0, 50)}... (${image.model})`}
              >
                <img
                  src={image.imageUrl}
                  alt={`Generated image ${idx + 1}`}
                  className="w-20 h-20 object-cover"
                />
                {idx === currentIndex && (
                  <div className="absolute inset-0 bg-blue-400/20 flex items-center justify-center">
                    <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Gallery now uses React context instead of global window functions

export default GalleryPanel; 