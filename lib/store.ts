import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

export interface EditorFile {
  id: string;
  name: string;
  content: string;
  language: string;
}

interface AppState {
  theme: 'dark' | 'light' | 'system';
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  openAIApiKey: string;
  setOpenAIApiKey: (key: string) => void;
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  agentMode: boolean;
  setAgentMode: (active: boolean) => void;
  conversations: Conversation[];
  currentConversationId: string | null;
  setCurrentConversationId: (id: string | null) => void;
  addConversation: (conv: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  deleteConversation: (id: string) => void;

  // Global Project Instructions
  projectInstructions: string;
  setProjectInstructions: (instructions: string) => void;

  // Terminal
  terminalLogs: string[];
  setTerminalLogs: (logs: string[] | ((prev: string[]) => string[])) => void;
  isTerminalOpen: boolean;
  setTerminalOpen: (isOpen: boolean) => void;

  // Editor Files
  files: EditorFile[];
  activeFileId: string | null;
  addFile: (file: EditorFile) => void;
  updateFile: (id: string, content: string) => void;
  renameFile: (id: string, name: string, language?: string) => void;
  deleteFile: (id: string) => void;
  setActiveFileId: (id: string | null) => void;
  resetFiles: () => void;

  // Editor Settings
  editorTabSize: number;
  setEditorTabSize: (size: number) => void;
  editorWordWrap: 'on' | 'off';
  setEditorWordWrap: (wrap: 'on' | 'off') => void;
  editorMinimap: boolean;
  setEditorMinimap: (show: boolean) => void;
  editorFontSize: number;
  setEditorFontSize: (size: number) => void;

  // Deprecated backwards compat (will map to active file inside hooks)
  editorCode: string;
  setEditorCode: (code: string) => void;
  editorLanguage: string;
  setEditorLanguage: (lang: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      openAIApiKey: '',
      setOpenAIApiKey: (openAIApiKey) => set({ openAIApiKey }),
      geminiApiKey: '',
      setGeminiApiKey: (geminiApiKey) => set({ geminiApiKey }),
      selectedModel: 'gemini-3.5-flash',
      setSelectedModel: (selectedModel) => set({ selectedModel }),
      agentMode: false,
      setAgentMode: (agentMode) => set({ agentMode }),
      conversations: [],
      currentConversationId: null,
      setCurrentConversationId: (id) => set({ currentConversationId: id }),
      addConversation: (conv) =>
        set((state) => ({ conversations: [conv, ...state.conversations] })),
      updateConversation: (id, updates) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
          ),
        })),
      deleteConversation: (id) =>
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
          currentConversationId:
            state.currentConversationId === id ? null : state.currentConversationId,
        })),
      
      projectInstructions: '',
      setProjectInstructions: (projectInstructions) => set({ projectInstructions }),

      terminalLogs: ['> Ready. Type code and hit "Run" to simulate execution.'],
      setTerminalLogs: (updater) => set((state) => ({
         terminalLogs: typeof updater === 'function' ? updater(state.terminalLogs) : updater
      })),
      isTerminalOpen: false,
      setTerminalOpen: (isTerminalOpen) => set({ isTerminalOpen }),

      files: [{ id: 'main', name: 'main.py', content: '# Write some code here...\n', language: 'python' }],
      activeFileId: 'main',
      addFile: (file) => set((state) => {
         const newFiles = [...state.files, file];
         if (newFiles.length > 150) newFiles.shift(); // keep it reasonable
         return { files: newFiles, activeFileId: file.id };
      }),
      updateFile: (id, content) => set((state) => ({
         files: state.files.map(f => f.id === id ? { ...f, content } : f)
      })),
      renameFile: (id, name, language) => set((state) => ({
         files: state.files.map(f => f.id === id ? { ...f, name, language: language || f.language } : f)
      })),
      deleteFile: (id) => set((state) => {
         const remaining = state.files.filter(f => f.id !== id);
         return { 
            files: remaining, 
            activeFileId: state.activeFileId === id ? (remaining[remaining.length - 1]?.id || null) : state.activeFileId 
         };
      }),
      setActiveFileId: (activeFileId) => set({ activeFileId }),
      resetFiles: () => set({
         files: [{ id: 'main', name: 'main.py', content: '# Write some code here...\n', language: 'python' }],
         activeFileId: 'main',
         terminalLogs: ['> Workspace reset successfully! Ready.']
      }),

      editorTabSize: 2,
      setEditorTabSize: (editorTabSize) => set({ editorTabSize }),
      editorWordWrap: 'off',
      setEditorWordWrap: (editorWordWrap) => set({ editorWordWrap }),
      editorMinimap: false,
      setEditorMinimap: (editorMinimap) => set({ editorMinimap }),
      editorFontSize: 14,
      setEditorFontSize: (editorFontSize) => set({ editorFontSize }),

      // Backwards-compatible setters that modify the active file
      editorCode: '',
      setEditorCode: (content) => set((state) => {
         if (!state.activeFileId) return state;
         return {
            files: state.files.map(f => f.id === state.activeFileId ? { ...f, content } : f)
         };
      }),
      editorLanguage: 'typescript',
      setEditorLanguage: (language) => set((state) => {
         if (!state.activeFileId) return state;
         return {
            files: state.files.map(f => f.id === state.activeFileId ? { ...f, language } : f)
         };
      }),
    }),
    {
      name: 'codemind-storage',
    }
  )
);
