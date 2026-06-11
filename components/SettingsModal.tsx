'use client';

import { X, Eye, EyeOff } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useState } from 'react';

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { openAIApiKey, setOpenAIApiKey, geminiApiKey, setGeminiApiKey, editorFontSize, setEditorFontSize } = useAppStore();
  const [showOpenAI, setShowOpenAI] = useState(false);
  const [showGemini, setShowGemini] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flexItems-center justify-center p-4">
      <div className="bg-[var(--surface)] w-full max-w-md rounded-xl border border-[var(--border)] shadow-xl overflow-hidden mt-20 mx-auto">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button onClick={onClose} className="p-1 hover:bg-[var(--background)] rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-[var(--text-muted)] uppercase tracking-wider">API Keys</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">OpenAI API Key</label>
              <div className="relative">
                <input
                  type={showOpenAI ? 'text' : 'password'}
                  value={openAIApiKey}
                  onChange={(e) => setOpenAIApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
                <button 
                  onClick={() => setShowOpenAI(!showOpenAI)}
                  className="absolute right-2 top-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  {showOpenAI ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Google Gemini API Key</label>
              <div className="relative">
                <input
                  type={showGemini ? 'text' : 'password'}
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
                <button 
                  onClick={() => setShowGemini(!showGemini)}
                  className="absolute right-2 top-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  {showGemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
             <h3 className="font-medium text-sm text-[var(--text-muted)] uppercase tracking-wider">Editor</h3>
             <div className="space-y-2">
              <label className="text-sm font-medium">Font Size ({editorFontSize}px)</label>
              <input 
                type="range" 
                min="10" max="24" 
                value={editorFontSize}
                onChange={(e) => setEditorFontSize(parseInt(e.target.value))}
                className="w-full"
              />
             </div>
          </div>
        </div>

        <div className="p-4 border-t border-[var(--border)] bg-[var(--background)] flex justify-end">
          <button 
            onClick={onClose}
            className="bg-[var(--primary)] text-white px-4 py-2 rounded-md font-medium text-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
