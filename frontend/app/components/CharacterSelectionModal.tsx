'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { characterDatas, ICharacterData } from '@/engine/data/CharacterData';
import { EditorEngine } from '@/engine/core/EditorEngine';
import * as THREE from 'three';
import { trackEvent, ANALYTICS_EVENTS } from '@/engine/utils/external/analytics';
import { IconX } from '@tabler/icons-react';

interface CharacterSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CharacterSelectionModal: React.FC<CharacterSelectionModalProps> = ({ isOpen, onClose }) => {
  // Handle character entity creation
  const handleCreateCharacter = (model: ICharacterData) => {
    EditorEngine.getInstance().createEntityCommand({
      type: 'character',
      characterProps: {
        builtInModelId: model.builtInModelId,
        name: model.name,
      },
      scaling: new THREE.Vector3(model.scale, model.scale, model.scale),
    });

    // Track analytics
    trackEvent(ANALYTICS_EVENTS.CREATE_ENTITY, {
      method: 'modal',
      entityType: 'character',
      characterModel: model.name
    });

    // Close the modal after creation
    onClose();
  };

  // Convert character data map to array for easier rendering
  const characterList = Array.from(characterDatas.values());

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Select Character ({characterList.length} available)</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <IconX size={16} />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
          {characterList.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <p className="text-muted-foreground">No characters available</p>
              <p className="text-sm text-muted-foreground mt-2">
                Character data size: {characterDatas.size}
              </p>
            </div>
          ) : (
            characterList.map((character) => (
            <Card
              key={character.builtInModelId}
              className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-2 hover:border-primary/50"
              onClick={() => handleCreateCharacter(character)}
            >
              <div className="p-3">
                {/* Character Thumbnail */}
                <div className="relative mb-3">
                  <img
                    src={character.thumbnail}
                    alt={character.name}
                    className="w-full h-32 object-cover rounded-md border"
                    onError={(e) => {
                      // Fallback if thumbnail doesn't load
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiBmaWxsPSIjZjNmNGY2Ii8+CjxwYXRoIGQ9Ik02NCA0MEM3My4zODg4IDQwIDgxIDQ3LjYxMTIgODEgNTdDODEgNjYuMzg4OCA3My4zODg4IDc0IDY0IDc0QzU0LjYxMTIgNzQgNDcgNjYuMzg4OCA0NyA1N0M0NyA0Ny42MTEyIDU0LjYxMTIgNDAgNjQgNDBaIiBmaWxsPSIjOGE5MGEwIi8+CjxwYXRoIGQ9Ik0zMiAxMDBDNDEuMzg4OCAxMDAgNDkgOTIuMzg4OCA0OSA4M0M0OSA3My42MTEyIDQxLjM4ODggNjYgMzIgNjZDMjIuNjExMiA2NiAxNSA3My42MTEyIDE1IDgzQzE1IDkyLjM4ODggMjIuNjExMiAxMDAgMzIgMTAwWiIgZmlsbD0iIzhhOTBhMCIvPgo8cGF0aCBkPSJNOTYgMTAwQzEwNS4zODkgMTAwIDExMyA5Mi4zODg4IDExMyA4M0MxMTMgNzMuNjExMiAxMDUuMzg5IDY2IDk2IDY2Qzg2LjYxMTIgNjYgNzkgNzMuNjExMiA3OSA4M0M3OSA5Mi4zODg4IDg2LjYxMTIgMTAwIDk2IDEwMFoiIGZpbGw9IiM4YTkwYTAiLz4KPC9zdmc+';
                    }}
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 rounded-md flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 text-white font-medium text-sm transition-opacity duration-200">
                      Add Character
                    </span>
                  </div>
                </div>
                
                {/* Character Info */}
                <div className="space-y-1">
                  <h3 className="font-medium text-sm text-foreground truncate">
                    {character.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    ID: {character.builtInModelId}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Scale: {character.scale}x
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Animations: {character.animationsFiles.length}
                  </p>
                </div>
              </div>
            </Card>
            ))
          )}
        </div>
        
        {/* Footer with additional info */}
        <div className="border-t pt-4 mt-4">
          <p className="text-xs text-muted-foreground text-center">
            Click on any character to add it to your scene. Characters include built-in animations and rigging controls.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CharacterSelectionModal;
