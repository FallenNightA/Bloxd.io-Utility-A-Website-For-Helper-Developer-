'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Settings, Moon, Sun, Monitor, Plus, Github, BrainCircuit, Menu, Sparkles } from 'lucide-react';
import { SettingsModal } from './SettingsModal';
import toast from 'react-hot-toast';

export function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { 
    theme, setTheme, selectedModel, setSelectedModel, setCurrentConversationId,
    agentMode, setAgentMode 
  } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <header className="h-14 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <button 
             onClick={onMenuClick}
             className="p-1.5 -ml-1.5 hover:bg-[var(--background)] rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
             <Menu className="w-5 h-5" />
          </button>
          <BrainCircuit className="w-6 h-6 text-[var(--primary)]" />
          <span className="font-semibold text-lg tracking-tight hidden sm:inline-block">CodeMind AI</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Glowing Agent Mode Toggle */}
          <div className="flex items-center gap-2 border-r border-[var(--border)] pr-3 mr-1">
            <span className="text-[10px] sm:text-xs font-bold tracking-wider uppercase text-[var(--text-muted)] select-none hidden xs:inline-block">Agent Mode</span>
            <button
              onClick={() => {
                const nextActive = !agentMode;
                setAgentMode(nextActive);
                if (nextActive) {
                  toast.success('Agent Mode Activated! AgentMind unlocked.', { icon: '🤖' });
                  setSelectedModel('AgentMind');
                } else {
                  if (selectedModel === 'AgentMind') {
                    setSelectedModel('gemini-3.5-flash');
                  }
                  toast.success('Switched back to standard assistance.');
                }
              }}
              className={`w-10 h-6 flex items-center rounded-full p-1 transition-all cursor-pointer ${agentMode ? 'bg-gradient-to-r from-emerald-500 to-green-600 justify-end shadow-[0_0_12px_rgba(16,185,129,0.4)]' : 'bg-gray-600/30 justify-start'}`}
              title="Unlock autonomous AgentMind model"
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md transform transition-all" />
            </button>
          </div>

          <select
            value={selectedModel}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'AgentMind' && !agentMode) {
                toast.error('Please turn on Agent Mode first to unlock AgentMind!');
                return;
              }
              setSelectedModel(val);
              toast.success(`Active model: ${val === 'gemini-3.5-flash' ? 'Gemini 3.5 Flash' : val}`);
            }}
            className="bg-[var(--background)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--primary)] text-[var(--text-primary)] shadow-sm cursor-pointer"
          >
            <option value="CodexMind">⚡ CodexMind</option>
            <option value="MindChat">💬 MindChat</option>
            {agentMode && <option value="AgentMind">🤖 AgentMind</option>}
            <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
            <option value="gpt-3.5-turbo">GPT-3.5</option>
          </select>

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 hover:bg-[var(--background)] rounded-md transition-colors"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 hover:bg-[var(--background)] rounded-md transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setCurrentConversationId(null)}
            className="flex items-center gap-2 bg-[var(--primary)] text-white px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
            title="New Chat"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline-block">New Chat</span>
          </button>
        </div>
      </header>

      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}
    </>
  );
}
