'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { useAppStore, Message } from '@/lib/store';
import { MessageItem } from './MessageItem';
import toast from 'react-hot-toast';

export function ChatPanel() {
  const [input, setInput] = useState('');
  const [systemPrompt, setSystemPrompt] = useState("You are CodeMind AI, a powerful agentic AI coding assistant built by Google DeepMind, powered by the Antigravity agent and Gemini models.\n\nRules:\n- Build exactly what the user described. Nothing more, nothing less.\n- Prioritize taking action and calling tools over telling the user what you will do.\n- For long code, add brief comments explaining key sections\n- Treat the user's request as the absolute ceiling of your functional scope.");
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { 
    currentConversationId, conversations, addConversation, updateConversation,
    openAIApiKey, geminiApiKey, selectedModel, setEditorCode, setEditorLanguage,
    editorCode, editorLanguage, projectInstructions, setProjectInstructions
  } = useAppStore();

  const activeConversation = useMemo(() => conversations.find(c => c.id === currentConversationId), [conversations, currentConversationId]);
  const messages = useMemo(() => activeConversation?.messages || [], [activeConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  const playSuccessSound = useCallback(() => {
    try {
       const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
       if (!AudioCtx) return;
       const ctx = new AudioCtx();
       
       // First note
       const osc1 = ctx.createOscillator();
       const gain1 = ctx.createGain();
       osc1.type = 'sine';
       osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
       gain1.gain.setValueAtTime(0.12, ctx.currentTime);
       gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
       osc1.connect(gain1);
       gain1.connect(ctx.destination);
       osc1.start();
       osc1.stop(ctx.currentTime + 0.25);
       
       // Second note
       const osc2 = ctx.createOscillator();
       const gain2 = ctx.createGain();
       osc2.type = 'sine';
       osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12); // E5
       gain2.gain.setValueAtTime(0.12, ctx.currentTime + 0.12);
       gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.38);
       osc2.connect(gain2);
       gain2.connect(ctx.destination);
       osc2.start(ctx.currentTime + 0.12);
       osc2.stop(ctx.currentTime + 0.38);
    } catch (e) {
       console.error("Audio play failed:", e);
    }
  }, []);

  const handleSendToEditor = useCallback((code: string, lang: string) => {
    const validLangs = ['typescript', 'javascript', 'python', 'html', 'css', 'json', 'markdown'];
    const normalizedLang = validLangs.includes(lang.toLowerCase()) ? lang.toLowerCase() : 'typescript';
    
    setEditorLanguage(normalizedLang);
    setEditorCode(code);
    toast.success(`Code sent to Editor!`);
  }, [setEditorLanguage, setEditorCode]);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isGenerating) return;

    if (selectedModel.startsWith('gpt') && !openAIApiKey) {
       toast.error('Please configure your OpenAI API Key in Settings first.');
       return;
    }
    const isCustomModel = ['CodexMind', 'MindChat', 'AgentMind'].includes(selectedModel);
    const isGemini = selectedModel.startsWith('gemini') || isCustomModel;
    if (isGemini && !geminiApiKey && !isCustomModel) {
       // Assuming it might fall back to server env var if missing, but UI requirement says to ask for it
       toast.error('Please configure your Gemini API Key in Settings first.');
       return;
    }

    const newMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().getTime()
    };

    let convId = currentConversationId;
    let currentMessages = [...messages];

    if (!convId || !activeConversation) {
      convId = crypto.randomUUID();
      const newConv = {
        id: convId,
        title: newMessage.content.slice(0, 40) + '...',
        messages: [newMessage],
        updatedAt: new Date().getTime()
      };
      addConversation(newConv);
      useAppStore.getState().setCurrentConversationId(convId);
      currentMessages = [newMessage];
    } else {
      currentMessages = [...currentMessages, newMessage];
      updateConversation(convId, { messages: currentMessages });
    }

    setInput('');
    setIsGenerating(true);

    const assistantMsgId = crypto.randomUUID();
    const assistantMessage: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().getTime()
    };
    
    currentMessages = [...currentMessages, assistantMessage];
    updateConversation(convId, { messages: currentMessages });

    try {
      abortControllerRef.current = new AbortController();
      const currentFiles = useAppStore.getState().files;
      const projInst = useAppStore.getState().projectInstructions;
      const injectedSystemPrompt = `${systemPrompt}\n\n[SYSTEM INSTRUCTION]
You have the ability to run commands in the terminal and create/update files in the editor.
To do this, use the following XML tags in your response (do NOT wrap them in markdown code blocks unless you want the user to copy them manually):

<command type="create_file" name="filename.ext">
Your code content here
</command>

<command type="rename_file" name="old_name.ext" new_name="new_name.ext" />

<command type="run_terminal">
npm install something
</command>

Current workspace files: ${currentFiles.map(f => f.name).join(', ')}
${projInst ? `\n\n[PROJECT INSTRUCTIONS (User defined)]\n${projInst}` : ''}`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          messages: currentMessages.slice(0, -1), // Everything except the empty assistant message
          model: selectedModel,
          openAIApiKey,
          geminiApiKey,
          systemPrompt: injectedSystemPrompt
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to generate response');
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullContent = '';
      let buffer = '';

      while (!done) {
         const { value, done: doneReading } = await reader.read();
         done = doneReading;
         if (value) {
            buffer += decoder.decode(value, { stream: !done });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('data: ')) {
                    const data = trimmedLine.slice(6);
                    if (data === '[DONE]') {
                       // Fully done
                       playSuccessSound();
                       toast.success('AI Build Completed! Live Sandbox ready 🚀', { icon: '🔔', duration: 4000 });
                       // Auto-extract code blocks and send the largest/last one to the editor
                       // Add logic to parse special XML commands
                       const cmdRegex = /<command\s+type="([^"]+)"(?:\s+name="([^"]+)")?(?:\s+new_name="([^"]+)")?(?:\s+[^>]*?)?(?:>([\s\S]*?)<\/command>|\s*\/>)/g;
                       const commands = [...fullContent.matchAll(cmdRegex)];
                       
                       for (const match of commands) {
                          const type = match[1];
                          const name = match[2];
                          const newName = match[3];
                          const innerContent = (match[4] || '').trim();

                          if (type === 'create_file' || type === 'update_file') {
                             if (name) {
                                let lang = 'typescript';
                                if (name.endsWith('.py')) lang = 'python';
                                else if (name.endsWith('.js')) lang = 'javascript';
                                else if (name.endsWith('.html')) lang = 'html';
                                else if (name.endsWith('.css')) lang = 'css';
                                else if (name.endsWith('.json')) lang = 'json';
                                else if (name.endsWith('.md')) lang = 'markdown';
                                
                                const files = useAppStore.getState().files;
                                const existing = files.find(f => f.name === name);
                                if (existing) {
                                   useAppStore.getState().updateFile(existing.id, innerContent);
                                   useAppStore.getState().setActiveFileId(existing.id);
                                } else {
                                   const id = crypto.randomUUID();
                                   useAppStore.getState().addFile({ id, name, content: innerContent, language: lang });
                                }
                                toast.success(`Created/Updated file: ${name}`, { icon: '📁' });
                             }
                          } else if (type === 'delete_file' || type === 'delete') {
                             if (name) {
                                const files = useAppStore.getState().files;
                                const existing = files.find(f => f.name === name);
                                if (existing) {
                                   useAppStore.getState().deleteFile(existing.id);
                                   toast.success(`Deleted file: ${name}`, { icon: '🗑️' });
                                } else {
                                   const cleanName = name.replace(/^\//, '');
                                   const fuzzy = files.find(f => f.name.toLowerCase().endsWith(cleanName.toLowerCase()) || cleanName.toLowerCase().endsWith(f.name.toLowerCase()));
                                   if (fuzzy) {
                                      useAppStore.getState().deleteFile(fuzzy.id);
                                      toast.success(`Deleted file: ${fuzzy.name}`, { icon: '🗑️' });
                                   } else {
                                      toast.error(`File path not found to delete: ${name}`);
                                   }
                                }
                             }
                          } else if (type === 'rename_file') {
                             if (name && newName) {
                                const files = useAppStore.getState().files;
                                const existing = files.find(f => f.name === name);
                                if (existing) {
                                   let lang = existing.language;
                                   if (newName.endsWith('.py')) lang = 'python';
                                   else if (newName.endsWith('.js')) lang = 'javascript';
                                   else if (newName.endsWith('.html')) lang = 'html';
                                   else if (newName.endsWith('.css')) lang = 'css';
                                   else if (newName.endsWith('.json')) lang = 'json';
                                   else if (newName.endsWith('.md')) lang = 'markdown';
                                   
                                   useAppStore.getState().renameFile(existing.id, newName, lang);
                                   toast.success(`Renamed file to: ${newName}`, { icon: '📝' });
                                }
                             }
                          } else if (type === 'run_terminal') {
                             useAppStore.getState().setTerminalOpen(true);
                             useAppStore.getState().setTerminalLogs(prev => [...prev, `> ${innerContent}`, '> Executing...', `> Done.`]);
                          }
                       }

                       if (commands.length === 0) {
                          // Fallback to old behavior
                          const codeBlocks = [...fullContent.matchAll(/```(\w*)[ \t]*\r?\n([\s\S]*?)```/g)];
                          if (codeBlocks.length > 0) {
                             const lastBlock = codeBlocks[codeBlocks.length - 1];
                             const lang = lastBlock[1] || 'typescript';
                             const code = lastBlock[2].trim();
                             
                             if (code.length > 10) {
                                const files = useAppStore.getState().files;
                                if (files.length > 0) {
                                   const active = useAppStore.getState().activeFileId;
                                   const fileToUpdate = files.find(f => f.id === active) || files[0];
                                   useAppStore.getState().updateFile(fileToUpdate.id, code);
                                   
                                   const validLangs = ['typescript', 'javascript', 'python', 'html', 'css', 'json', 'markdown'];
                                   const normalizedLang = validLangs.includes(lang.toLowerCase()) ? lang.toLowerCase() : 'typescript';
                                   useAppStore.getState().renameFile(fileToUpdate.id, fileToUpdate.name, normalizedLang);
                                   toast.success(`Generated code auto-filled into Editor!`, { icon: '✨' });
                                }
                             }
                          }
                       }
                    } else if (data) {
                       try {
                          const parsed = JSON.parse(data);
                          if (parsed.delta) {
                             fullContent += parsed.delta;
                             // Update the message in the store
                             const updatedMsgs = currentMessages.map(m => 
                                m.id === assistantMsgId ? { ...m, content: fullContent } : m
                             );
                             updateConversation(convId, { messages: updatedMsgs });
                             currentMessages = updatedMsgs; // For next iteration
                          }
                       } catch (e) {
                          console.error("Error parsing delta:", data);
                       }
                    }
                }
            }
         }
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
         toast('Response stopped.');
      } else {
         toast.error(error.message || 'An error occurred while communicating with the AI.');
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [input, isGenerating, selectedModel, openAIApiKey, geminiApiKey, messages, currentConversationId, activeConversation, addConversation, updateConversation, systemPrompt, playSuccessSound]);

  const stopGenerating = () => {
     if (abortControllerRef.current) {
        abortControllerRef.current.abort();
     }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--background)] relative">
      {/* System Prompt Collapsible */}
      <div className="border-b border-[var(--border)] bg-[var(--surface)]">
         <button 
            onClick={() => setShowSystemPrompt(!showSystemPrompt)}
            className="w-full px-4 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition-colors flex items-center justify-between"
         >
            <span>System Prompt & Project Instructions</span>
            <span>{showSystemPrompt ? '▲' : '▼'}</span>
         </button>
         {showSystemPrompt && (
            <div className="p-4 border-t border-[var(--border)] bg-[var(--background)] flex flex-col gap-3">
               <div>
                 <label className="text-xs font-semibold text-[var(--text-muted)] mb-1 block">System Prompt (AI Persona / Rules)</label>
                 <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="w-full h-24 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                    placeholder="Set your custom system prompt here..."
                 />
                 <div className="flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-hide">
                    <button onClick={() => setSystemPrompt("You are CodeMind AI, a powerful agentic AI coding assistant built by Google DeepMind... (Reset to Default)")} className="px-2 py-1 bg-[var(--surface)] border border-[var(--border)] rounded text-xs whitespace-nowrap hover:bg-[var(--primary)] hover:text-white transition-colors">Default</button>
                    <button onClick={() => setSystemPrompt("You are a Senior Full Stack Developer. Always write clean, modular, and well-documented code.")} className="px-2 py-1 bg-[var(--surface)] border border-[var(--border)] rounded text-xs whitespace-nowrap hover:bg-[#238636] hover:text-white transition-colors">Full Stack Dev</button>
                    <button onClick={() => setSystemPrompt("You are a strict Code Reviewer. Analyze code for performance, security, and best practices. Point out every flaw clearly.")} className="px-2 py-1 bg-[var(--surface)] border border-[var(--border)] rounded text-xs whitespace-nowrap hover:bg-[#238636] hover:text-white transition-colors">Code Reviewer</button>
                    <button onClick={() => setSystemPrompt("You are a Python Expert. Always write PEP-8 compliant code and use modern Python features (type hints, dataclasses).")} className="px-2 py-1 bg-[var(--surface)] border border-[var(--border)] rounded text-xs whitespace-nowrap hover:bg-[#238636] hover:text-white transition-colors">Python Expert</button>
                 </div>
               </div>
               <div>
                 <label className="text-xs font-semibold text-[var(--text-muted)] mb-1 block">Custom Project Instructions (Workspace Context)</label>
                 <textarea
                    value={projectInstructions}
                    onChange={(e) => setProjectInstructions(e.target.value)}
                    className="w-full h-24 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                    placeholder="E.g., Write components using Tailwind React hooks, use specific naming conventions..."
                 />
               </div>
            </div>
         )}
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 opacity-80 pt-10">
            <div className="w-16 h-16 bg-[var(--surface)] border border-[var(--border)] rounded-full flex items-center justify-center text-3xl shadow-sm">🤖</div>
            <div>
              <h2 className="text-2xl font-semibold mb-2 text-[var(--text-primary)]">What can I help you build?</h2>
              <p className="text-[var(--text-muted)] text-sm max-w-sm mx-auto">
                Ask me to write, debug, explain, or refactor any code. 
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl w-full px-4">
              {[
                { icon: '🐍', text: 'Write a Python API' },
                { icon: '⚛️', text: 'Fix a React bug' },
                { icon: '🔍', text: 'Explain Big O notation' },
                { icon: '🔧', text: 'Refactor this function' },
                { icon: '🌐', text: 'Create an HTML landing page' },
                { icon: '📊', text: 'Write SQL queries' }
              ].map((chip) => (
                <button
                  key={chip.text}
                  onClick={() => setInput(chip.text)}
                  className="bg-[var(--surface)] border border-[var(--border)] p-3 rounded-xl text-left text-sm hover:bg-[var(--background)] hover:border-[var(--primary)] transition-all flex items-center gap-3"
                >
                  <span className="text-xl">{chip.icon}</span>
                  <span className="font-medium text-[var(--text-primary)]">{chip.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((msg) => (
               <MessageItem key={msg.id} message={msg} onSendToEditor={handleSendToEditor} />
            ))}
            {isGenerating && selectedModel === 'CodexMind' && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 border border-indigo-500/20 shadow-sm animate-pulse flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-indigo-400 uppercase tracking-widest">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                    </span>
                    <span>CodexMind is Thinking... Deep reasoning enabled</span>
                  </div>
                  <span className="text-[10px] text-purple-400 font-mono tracking-wider px-2 py-0.5 rounded-full bg-purple-500/10">Thinking Mode</span>
                </div>
                <div className="text-xs text-[var(--text-muted)] leading-relaxed italic border-l-2 border-purple-500/30 pl-3">
                  Scanning workspace code, identifying system requirements, planning optimal architectural steps, writing test-compliant code outputs, and executing virtual compilers.
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-purple-500/10 h-1.5 rounded-full overflow-hidden">
                     <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full" style={{ width: '65%' }} />
                  </div>
                  <div className="text-[9px] font-mono text-purple-400 tracking-tight">Level 2 Analysis</div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Input Area */}
      <div className="p-4 border-t border-[var(--border)] bg-[var(--background)] flex flex-col items-center">
        {isGenerating && (
           <button 
             onClick={stopGenerating}
             className="mb-3 px-4 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-full text-sm font-medium hover:bg-[var(--background)] transition-colors flex items-center gap-2 shadow-sm"
           >
             <span className="w-2 h-2 rounded-sm bg-red-500 animate-pulse" />
             Stop generating
           </button>
        )}
        <div className="flex items-end gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-2 w-full focus-within:ring-1 focus-within:ring-[var(--primary)] transition-all">
           
           <button 
              onClick={() => {
                  setInput(`Here is my current code:\n\`\`\`${editorLanguage}\n${editorCode}\n\`\`\`\n\n`);
              }}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--background)] transition-colors"
              title="Attach current editor code"
           >
              <Paperclip className="w-5 h-5" />
           </button>

           <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about code..."
              className="flex-1 max-h-32 min-h-[44px] bg-transparent resize-none py-2.5 outline-none text-sm"
              rows={1}
              onKeyDown={(e) => {
                 if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                 }
              }}
           />

           <button 
             onClick={handleSubmit}
             disabled={!input.trim() || isGenerating}
             className={`p-2 rounded-lg transition-colors ${
               input.trim() && !isGenerating ? 'bg-[var(--primary)] text-white hover:opacity-90' : 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
             }`}
           >
              <Send className="w-5 h-5" />
           </button>
        </div>
        <div className="text-center mt-2 text-xs text-[var(--text-muted)]">
           Model: {selectedModel} · Press Enter to send · Shift+Enter for newline
        </div>
      </div>
    </div>
  );
}
