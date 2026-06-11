'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatPanel } from './Chat/ChatPanel';
import { EditorPanel } from './Editor/EditorPanel';
import { DevicePreviewPanel } from './Editor/DevicePreviewPanel';
import { useMediaQuery } from '@/hooks/use-media-query';
import { MessageSquare, Code2, Eye, Sparkles } from 'lucide-react';

export function MainWorkspace() {
  const isTabletOrMobile = useMediaQuery('(max-width: 1024px)');
  const [chatWidth, setChatWidth] = useState(48); // percentage for desktop split
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Tabs management
  // 'chat' is only active on responsive mode where they toggle full screen views
  const [activeTab, setActiveTab] = useState<'chat' | 'code' | 'preview'>('chat');
  const [rightPanelTab, setRightPanelTab] = useState<'code' | 'preview'>('preview');

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      
      if (!isTabletOrMobile) {
         // Horizontal resizing
         const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
         if (newWidth > 15 && newWidth < 80) {
            setChatWidth(newWidth);
         }
      }
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none'; // Prevent text selection
    } else {
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isTabletOrMobile]);

  // Render Mobile/Tablet Multi-Tab UI Style for complete clarity
  if (isTabletOrMobile) {
    return (
      <div className="flex flex-col h-full w-full bg-[var(--background)]">
        {/* Device Mode Premium Navigation Tabs */}
        <div className="flex-none bg-[var(--surface)] border-b border-[var(--border)] px-4 py-2 flex items-center justify-between shadow-sm">
          <div className="flex bg-[var(--background)] border border-[var(--border)] rounded-lg p-0.5 w-full max-w-md mx-auto">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition-all cursor-pointer ${activeTab === 'chat' ? 'bg-[var(--primary)] text-white font-bold shadow' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat</span>
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition-all cursor-pointer ${activeTab === 'code' ? 'bg-[var(--primary)] text-white font-bold shadow' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Code Editor</span>
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition-all cursor-pointer ${activeTab === 'preview' ? 'bg-[var(--primary)] text-white font-bold shadow' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Preview</span>
            </button>
          </div>
        </div>

        {/* Dynamic Display Panel */}
        <div className="flex-1 min-h-0 overflow-hidden relative">
          {activeTab === 'chat' && (
            <div className="h-full w-full">
              <ChatPanel />
            </div>
          )}
          {activeTab === 'code' && (
            <div className="h-full w-full">
              <EditorPanel />
            </div>
          )}
          {activeTab === 'preview' && (
            <div className="h-full w-full">
              <DevicePreviewPanel />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render Desktop Layout (Side-by-side with switcher on the right side)
  return (
    <div className="flex h-full w-full relative" ref={containerRef}>
      {/* Left Column: Chat Panel */}
      <div style={{ width: `${chatWidth}%` }} className="h-full shrink-0 overflow-hidden">
        <ChatPanel />
      </div>

      {/* Horizontal Draggable Divider */}
      <div 
        className="w-1.5 h-full bg-[var(--border)] hover:bg-[var(--primary)] transition-colors cursor-col-resize flex-none z-10 flex flex-col justify-center items-center"
        onMouseDown={() => setIsDragging(true)}
      >
        <div className="w-1 h-8 bg-gray-500 rounded-full opacity-50" />
      </div>

      {/* Right Column: Code/Preview Deck */}
      <div style={{ width: `${100 - chatWidth}%` }} className="h-full flex-1 flex flex-col min-w-0 bg-[var(--surface)]">
        {/* Toggle bar between Code and Preview */}
        <div className="h-12 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between px-4 shrink-0 shadow-sm">
          <div className="flex bg-[var(--background)] border border-[var(--border)] rounded-lg p-0.5 scale-95 origin-left">
            <button
              onClick={() => setRightPanelTab('code')}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${rightPanelTab === 'code' ? 'bg-[var(--primary)] text-white shadow' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Code Workspace</span>
            </button>
            <button
              onClick={() => setRightPanelTab('preview')}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${rightPanelTab === 'preview' ? 'bg-[var(--primary)] text-white shadow' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Preview</span>
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)] text-[10px] uppercase font-bold tracking-wider">Workspace Controls</span>
          </div>
        </div>

        {/* Dynamic Display Panel */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {rightPanelTab === 'code' ? (
            <EditorPanel />
          ) : (
            <DevicePreviewPanel />
          )}
        </div>
      </div>
    </div>
  );
}
