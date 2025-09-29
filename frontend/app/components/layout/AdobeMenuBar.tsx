'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  IconFile, 
  IconEdit, 
  IconEye, 
  IconSettings, 
  IconHelp,
  IconFolder,
  IconDeviceFloppy,
  IconDownload,
  IconUpload,
  IconCopy,
  IconCut,
  IconClipboard,
  IconArrowBack,
  IconArrowForward,
  IconZoomIn,
  IconZoomOut,
  IconZoomReset,
  IconKey
} from '@tabler/icons-react';
import { useEditorEngine } from '../../context/EditorEngineContext';
import { useState as useReactState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';

interface MenuItemProps {
  label: string;
  items: {
    label: string;
    icon?: React.ReactNode;
    shortcut?: string;
    action?: () => void;
    separator?: boolean;
    disabled?: boolean;
  }[];
}

const AdobeMenuBar: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useReactState(false);
  const [falApiKey, setFalApiKey] = useReactState('');
  const { engine, userPreferences, setUserPreference } = useEditorEngine();

  // Load current API key when dialog opens
  React.useEffect(() => {
    console.log('Settings dialog state changed:', settingsOpen);
    if (settingsOpen && userPreferences.falApiKey) {
      setFalApiKey(userPreferences.falApiKey);
      console.log('Loaded existing API key');
    }
  }, [settingsOpen, userPreferences.falApiKey]);

  // Add keyboard shortcut for settings
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        console.log('Settings keyboard shortcut triggered');
        setSettingsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const menuItems: MenuItemProps[] = [
    {
      label: 'File',
      items: [
        { 
          label: 'New', 
          icon: <IconFile size={16} />, 
          shortcut: 'Ctrl+N',
          action: () => engine?.getProjectManager().createNewProject()
        },
        { 
          label: 'Open', 
          icon: <IconFolder size={16} />, 
          shortcut: 'Ctrl+O',
          action: () => {
            setActiveMenu(null);
            if (window.electron?.showOpenDialog) {
              window.electron.showOpenDialog().then(result => {
                if (result && result.content) {
                  engine?.getProjectManager().loadProjectFromPath(result.filePath, result.content);
                }
              });
              return;
            }

            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) {
                engine?.getProjectManager().loadProjectFromFile(file);
              }
            };
            input.click();
          }
        },
        { 
          label: 'Save', 
          icon: <IconDeviceFloppy size={16} />, 
          shortcut: 'Ctrl+S',
          action: () => engine?.getProjectManager().saveProject()
        },
        { 
          label: 'Save As...', 
          shortcut: 'Ctrl+Shift+S',
          action: () => engine?.getProjectManager().saveProjectAs()
        },
        { separator: true, label: '' },
        { 
          label: 'Import', 
          icon: <IconUpload size={16} />, 
          shortcut: 'Ctrl+I',
          action: () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.glb,.gltf,.fbx,.obj,.dae,.3ds,.ply,.stl,.jpg,.jpeg,.png,.webp';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) {
                import('../../engine/services/ImportService').then(({ ImportService }) => {
                  ImportService.importFile(file);
                });
              }
            };
            input.click();
          }
        },
        { 
          label: 'Export', 
          icon: <IconDownload size={16} />, 
          shortcut: 'Ctrl+E',
          action: async () => {
            const projectManager = engine?.getProjectManager();
            if (!projectManager) {
              return;
            }

            const projectData = projectManager.serializeProject();
            const serialized = JSON.stringify(projectData, null, 2);

            if (window.electron?.showSaveDialog) {
              const filePath = await window.electron.showSaveDialog(projectManager.getCurrentProjectName());
              if (filePath) {
                await window.electron.writeFile(filePath, new TextEncoder().encode(serialized).buffer as ArrayBuffer);
              }
              return;
            }

            const blob = new Blob([serialized], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = projectManager.getCurrentProjectName();
            anchor.click();
            URL.revokeObjectURL(url);
          }
        },
        { separator: true, label: '' },
        { 
          label: 'Settings', 
          icon: <IconSettings size={16} />, 
          shortcut: 'Ctrl+,',
          action: () => {
            console.log('Settings menu clicked - opening dialog');
            setActiveMenu(null);
            setSettingsOpen(true);
          }
        },
        { separator: true, label: '' },
        { label: 'Recent Files' },
      ]
    },
    {
      label: 'Edit',
      items: [
        { 
          label: 'Undo', 
          icon: <IconArrowBack size={16} />, 
          shortcut: 'Ctrl+Z',
          action: () => engine?.getHistoryManager().undo()
        },
        { 
          label: 'Redo', 
          icon: <IconArrowForward size={16} />, 
          shortcut: 'Ctrl+Y',
          action: () => engine?.getHistoryManager().redo()
        },
        { separator: true, label: '' },
        { label: 'Cut', icon: <IconCut size={16} />, shortcut: 'Ctrl+X' },
        { label: 'Copy', icon: <IconCopy size={16} />, shortcut: 'Ctrl+C' },
        { label: 'Paste', icon: <IconClipboard size={16} />, shortcut: 'Ctrl+V' },
        { separator: true, label: '' },
        { label: 'Select All', shortcut: 'Ctrl+A' },
        { label: 'Deselect All', shortcut: 'Ctrl+D' },
      ]
    },
    {
      label: 'View',
      items: [
        { 
          label: 'Zoom In', 
          icon: <IconZoomIn size={16} />, 
          shortcut: 'Ctrl++',
          action: () => console.log('Zoom in - TODO: implement')
        },
        { 
          label: 'Zoom Out', 
          icon: <IconZoomOut size={16} />, 
          shortcut: 'Ctrl+-',
          action: () => console.log('Zoom out - TODO: implement')
        },
        { 
          label: 'Focus on Selected', 
          icon: <IconZoomReset size={16} />, 
          shortcut: 'F',
          action: () => {
            const selectedEntity = engine?.getSelectionManager().getCurrentEntity();
            if (selectedEntity) {
              engine?.getCameraManager().focusOnObject(selectedEntity);
            }
          }
        },
        { separator: true, label: '' },
        { label: 'Show Grid', shortcut: 'Ctrl+;' },
        { label: 'Show Rulers', shortcut: 'Ctrl+R' },
        { label: 'Show Guides', shortcut: 'Ctrl+;' },
        { separator: true, label: '' },
        { label: 'Fullscreen', shortcut: 'F11' },
      ]
    },
    {
      label: 'Object',
      items: [
        { label: 'Transform' },
        { label: 'Arrange' },
        { label: 'Group', shortcut: 'Ctrl+G' },
        { label: 'Ungroup', shortcut: 'Ctrl+Shift+G' },
        { separator: true, label: '' },
        { label: 'Lock', shortcut: 'Ctrl+2' },
        { label: 'Unlock All', shortcut: 'Ctrl+Alt+2' },
      ]
    },
    {
      label: 'Window',
      items: [
        { label: 'Workspace' },
        { separator: true, label: '' },
        { label: 'Tools Panel' },
        { label: 'Properties Panel' },
        { label: 'Layers Panel' },
        { label: 'Timeline Panel' },
        { separator: true, label: '' },
        { label: 'Reset Workspace' },
      ]
    },
    {
      label: 'Help',
      items: [
        { label: 'About', icon: <IconHelp size={16} /> },
        { label: 'User Guide' },
        { label: 'Keyboard Shortcuts', shortcut: 'Ctrl+/' },
        { separator: true, label: '' },
        { 
          label: 'API Settings', 
          icon: <IconKey size={16} />,
          action: () => {
            console.log('API Settings menu clicked - opening dialog');
            setActiveMenu(null);
            setSettingsOpen(true);
          }
        },
        { separator: true, label: '' },
        { label: 'Report Bug' },
        { label: 'Feature Request' },
      ]
    }
  ];

  const handleMenuClick = (menuLabel: string) => {
    setActiveMenu(activeMenu === menuLabel ? null : menuLabel);
  };

  const handleMenuItemClick = (item: any) => {
    if (item.action) {
      item.action();
    }
    setActiveMenu(null);
  };

  const renderDropdown = (menu: MenuItemProps) => {
    if (activeMenu !== menu.label) return null;

    return (
      <div className="adobe-menu-dropdown">
        {menu.items.map((item, index) => {
          if (item.separator) {
            return <div key={index} className="adobe-menu-separator" />;
          }

          return (
            <div
              key={index}
              className={cn(
                "adobe-menu-dropdown-item",
                item.disabled && "disabled"
              )}
              onClick={() => !item.disabled && handleMenuItemClick(item)}
            >
              <div className="adobe-menu-dropdown-item-content">
                {item.icon && (
                  <span className="adobe-menu-dropdown-item-icon">
                    {item.icon}
                  </span>
                )}
                <span className="adobe-menu-dropdown-item-label">
                  {item.label}
                </span>
              </div>
              {item.shortcut && (
                <span className="adobe-menu-dropdown-item-shortcut">
                  {item.shortcut}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const handleSaveSettings = () => {
    if (falApiKey.trim()) {
      setUserPreference('falApiKey', falApiKey.trim());
      console.log('FAL API key saved');
    }
    setSettingsOpen(false);
  };

  return (
    <>
      <div className="adobe-menu-bar">
        {menuItems.map((menu) => (
          <div key={menu.label} className="adobe-menu-item-container">
            <div
              className={cn(
                "adobe-menu-item",
                activeMenu === menu.label && "active"
              )}
              onClick={() => handleMenuClick(menu.label)}
            >
              {menu.label}
            </div>
            {renderDropdown(menu)}
          </div>
        ))}
      </div>

      {/* Overlay to close menu when clicking outside */}
      {activeMenu && (
        <div
          className="adobe-menu-overlay"
          onClick={() => setActiveMenu(null)}
        />
      )}

      {/* Settings Modal - Simple implementation */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-6">
              <IconSettings size={20} />
              <h2 className="text-lg font-semibold">Application Settings</h2>
            </div>

            {/* FAL API Key Section */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-2">
                <IconKey size={16} />
                <Label htmlFor="fal-api-key" className="text-sm font-medium">
                  FAL.ai API Key
                </Label>
              </div>
              <div className="space-y-2">
                <Input
                  id="fal-api-key"
                  type="password"
                  placeholder="Enter your FAL.ai API key"
                  value={falApiKey}
                  onChange={(e) => setFalApiKey(e.target.value)}
                  className="font-mono text-sm w-full"
                />
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Required for AI image generation features. Get your API key from{' '}
                  <a 
                    href="https://fal.ai/dashboard" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    fal.ai/dashboard
                  </a>
                </p>
                {userPreferences.falApiKey && (
                  <p className="text-xs text-green-600">
                    ✅ API key is currently configured
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  console.log('Settings dialog cancelled');
                  setSettingsOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  console.log('Settings being saved');
                  handleSaveSettings();
                }}
                disabled={!falApiKey.trim()}
              >
                Save Settings
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdobeMenuBar;
