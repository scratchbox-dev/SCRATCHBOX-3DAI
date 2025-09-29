'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface PanelConfig {
  id: string;
  title: string;
  component: React.ReactNode;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
  resizable?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  group?: {
    id: string;
    title: string;
    order?: number;
  };
}

interface WorkflowTabConfig {
  id: string;
  title: string;
  panels: PanelConfig[];
}

interface AdobeLayoutProps {
  children: React.ReactNode;
  leftPanels?: PanelConfig[];
  rightPanels?: PanelConfig[];
  bottomPanels?: PanelConfig[];
  topBar?: React.ReactNode;
  statusBar?: React.ReactNode;
  className?: string;
}

const AdobeLayout: React.FC<AdobeLayoutProps> = ({
  children,
  leftPanels = [],
  rightPanels = [],
  bottomPanels = [],
  topBar,
  statusBar,
  className
}) => {
  // Panel state management
  const [leftPanelWidth, setLeftPanelWidth] = useState(280);
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(200);
  const [collapsedPanels, setCollapsedPanels] = useState<Set<string>>(() => {
    const defaults = new Set<string>();
    [...leftPanels, ...rightPanels, ...bottomPanels].forEach((panel) => {
      if (panel.defaultCollapsed) {
        defaults.add(panel.id);
      }
    });
    return defaults;
  });
  const [stickyTab, setStickyTab] = useState<string | null>(null);

  const handleStickyTabChange = useCallback((tabId: string) => {
    setStickyTab(tabId);
  }, []);

  // Refs for resizing
  const leftResizeRef = useRef<HTMLDivElement>(null);
  const rightResizeRef = useRef<HTMLDivElement>(null);
  const bottomResizeRef = useRef<HTMLDivElement>(null);

  const togglePanelCollapse = useCallback((panelId: string) => {
    setCollapsedPanels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(panelId)) {
        newSet.delete(panelId);
      } else {
        newSet.add(panelId);
      }
      return newSet;
    });
  }, []);

  // Resizing handlers
  const handleMouseDown = useCallback((
    direction: 'left' | 'right' | 'bottom',
    event: React.MouseEvent
  ) => {
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (direction === 'left') {
        const newWidth = Math.max(200, Math.min(500, leftPanelWidth + (e.clientX - startX)));
        setLeftPanelWidth(newWidth);
      } else if (direction === 'right') {
        const newWidth = Math.max(200, Math.min(500, rightPanelWidth - (e.clientX - startX)));
        setRightPanelWidth(newWidth);
      } else if (direction === 'bottom') {
        const newHeight = Math.max(100, Math.min(400, bottomPanelHeight - (e.clientY - startY)));
        setBottomPanelHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [leftPanelWidth, rightPanelWidth, bottomPanelHeight]);

  const renderPanel = (panel: PanelConfig, position: 'left' | 'right' | 'bottom') => {
    const isCollapsed = collapsedPanels.has(panel.id);
    
    return (
      <div
        key={panel.id}
        className={cn(
          "adobe-panel border-border bg-card",
          isCollapsed && "collapsed"
        )}
      >
        <div className="adobe-panel-header">
          <span className="adobe-panel-title">{panel.title}</span>
          {panel.collapsible && (
            <button
              className="adobe-panel-collapse-btn"
              onClick={() => togglePanelCollapse(panel.id)}
            >
              {isCollapsed ? '▶' : '▼'}
            </button>
          )}
        </div>
        {!isCollapsed && (
          <div className="adobe-panel-content">
            {panel.component}
          </div>
        )}
      </div>
    );
  };

  const workflowTabs: WorkflowTabConfig[] = rightPanels
    .filter((panel) => panel.group)
    .reduce<WorkflowTabConfig[]>((acc, panel) => {
      const group = panel.group!;
      const existing = acc.find((tab) => tab.id === group.id);
      if (existing) {
        existing.panels.push(panel);
      } else {
        acc.push({
          id: group.id,
          title: group.title,
          panels: [panel],
        });
      }
      return acc;
    }, [])
    .sort((a, b) => {
      const aOrder = a.panels[0].group?.order ?? 0;
      const bOrder = b.panels[0].group?.order ?? 0;
      return aOrder - bOrder;
    });

  const activeTab = useMemo(() => {
    if (!workflowTabs.length) {
      return null;
    }
    if (stickyTab && workflowTabs.some((tab) => tab.id === stickyTab)) {
      return stickyTab;
    }
    return workflowTabs[0]?.id ?? null;
  }, [stickyTab, workflowTabs]);

  const ungroupedRightPanels = rightPanels.filter((panel) => !panel.group);

  return (
    <div className={cn("adobe-layout", className)}>
      {/* Top Bar */}
      {topBar && (
        <div className="adobe-top-bar">
          {topBar}
        </div>
      )}

      {/* Main Content Area */}
      <div className="adobe-main-container">
        {/* Left Panel */}
        {leftPanels.length > 0 && (
          <>
            <div 
              className="adobe-left-panel"
              style={{ width: leftPanelWidth }}
            >
              {leftPanels.map(panel => renderPanel(panel, 'left'))}
            </div>
            <div
              className="adobe-resize-handle adobe-resize-vertical"
              onMouseDown={(e) => handleMouseDown('left', e)}
            />
          </>
        )}

        {/* Center Content */}
        <div className="adobe-center-content">
          <div className="adobe-viewport">
            {children}
          </div>
          
          {/* Bottom Panel */}
          {bottomPanels.length > 0 && (
            <>
              <div
                className="adobe-resize-handle adobe-resize-horizontal"
                onMouseDown={(e) => handleMouseDown('bottom', e)}
              />
              <div 
                className="adobe-bottom-panel"
                style={{ height: bottomPanelHeight }}
              >
                {bottomPanels.map(panel => renderPanel(panel, 'bottom'))}
              </div>
            </>
          )}
        </div>

        {/* Right Panel */}
        {rightPanels.length > 0 && (
          <>
            <div
              className="adobe-resize-handle adobe-resize-vertical"
              onMouseDown={(e) => handleMouseDown('right', e)}
            />
            <div 
              className="adobe-right-panel"
              style={{ width: rightPanelWidth }}
            >
              {workflowTabs.length > 0 ? (
                <div className="adobe-sticky-tab-container">
                  <div className="adobe-sticky-tab-row">
                    {workflowTabs.map((tab) => (
                      <button
                        key={tab.id}
                        className={cn(
                          'adobe-sticky-tab',
                          activeTab === tab.id && 'active'
                        )}
                        onClick={() => handleStickyTabChange(tab.id)}
                      >
                        {tab.title}
                      </button>
                    ))}
                  </div>
                  <div className="adobe-sticky-tab-content">
                    {workflowTabs
                      .find((tab) => tab.id === activeTab)
                      ?.panels.map((panel) => renderPanel(panel, 'right'))}
                  </div>
                  {ungroupedRightPanels.length > 0 && (
                    <div className="adobe-ungrouped-panels">
                      {ungroupedRightPanels.map((panel) => renderPanel(panel, 'right'))}
                    </div>
                  )}
                </div>
              ) : (
                rightPanels.map(panel => renderPanel(panel, 'right'))
              )}
            </div>
          </>
        )}
      </div>

      {/* Status Bar */}
      {statusBar && statusBar}
    </div>
  );
};

export default AdobeLayout;
