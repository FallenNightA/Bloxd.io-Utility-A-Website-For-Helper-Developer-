'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { X, MessageSquare, Trash2, Check, Download, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { conversations, currentConversationId, setCurrentConversationId, deleteConversation, updateConversation } = useAppStore();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartRename = (id: string, currentTitle: string) => {
     setEditingId(id);
     setEditTitle(currentTitle);
     setDeletingId(null); // clear any active delete confirm
  };

  const handleSaveRename = (id: string) => {
     if (editTitle.trim()) {
        updateConversation(id, { title: editTitle.trim() });
        toast.success('Conversation renamed');
     }
     setEditingId(null);
  };

  const handleStartDelete = (id: string) => {
     setDeletingId(id);
     setEditingId(null); // clear any active rename
  };

  const handleConfirmDelete = (id: string) => {
     deleteConversation(id);
     toast.success('Conversation deleted');
     setDeletingId(null);
  };

  const handleExportMarkdown = async (conv: any) => {
     try {
        const md = conv.messages.map((m: any) => `**${m.role.toUpperCase()}**:\n${m.content}\n\n---\n`).join('\n');
        
        // Copy to clipboard as a powerful backup just in case browser sandBox blocks download starts
        await navigator.clipboard.writeText(md);
        
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-${conv.id.slice(0,6)}.md`;
        a.click();
        URL.revokeObjectURL(url);
        
        toast.success('Markdown exported & copied to clipboard!');
     } catch (err) {
        toast.success('Markdown copied to clipboard!');
     }
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-40 sm:hidden" 
        onClick={onClose}
      />
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-[var(--surface)] border-r border-[var(--border)] transform transition-transform duration-200 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
         <div className="h-14 border-b border-[var(--border)] flex items-center justify-between px-4 flex-none">
            <h2 className="font-semibold text-sm">Conversation History</h2>
            <button onClick={onClose} className="p-1 hover:bg-[var(--background)] rounded-md">
               <X className="w-4 h-4" />
            </button>
         </div>
         
         <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.length === 0 ? (
               <div className="text-center p-4 text-sm text-[var(--text-muted)]">
                  No previous conversations.
               </div>
            ) : (
               conversations.sort((a,b) => b.updatedAt - a.updatedAt).map(conv => (
                  <div 
                     key={conv.id}
                     onClick={() => {
                        if (editingId !== conv.id && deletingId !== conv.id) {
                           setCurrentConversationId(conv.id);
                           if (window.innerWidth < 640) onClose();
                        }
                     }}
                     className={`w-full text-left p-3 rounded-lg flex items-start gap-3 group cursor-pointer transition-colors relative ${currentConversationId === conv.id ? 'bg-[var(--background)] border border-[var(--border)]' : 'hover:bg-[var(--background)] border border-transparent'}`}
                  >
                     <MessageSquare className="w-4 h-4 mt-1 text-[var(--text-muted)] shrink-0" />
                     <div className="flex-1 min-w-0 pr-8">
                        {editingId === conv.id ? (
                           <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <input
                                 type="text"
                                 value={editTitle}
                                 onChange={(e) => setEditTitle(e.target.value)}
                                 onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveRename(conv.id);
                                    else if (e.key === 'Escape') setEditingId(null);
                                 }}
                                 className="bg-[var(--background)] border border-[var(--primary)] text-sm rounded px-2 py-1 text-[var(--text-primary)] w-full focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                                 autoFocus
                              />
                              <button 
                                 onClick={() => handleSaveRename(conv.id)}
                                 className="p-1 hover:text-[var(--primary)] bg-[var(--surface)] border border-[var(--border)] rounded cursor-pointer"
                              >
                                 <Check className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                 onClick={() => setEditingId(null)}
                                 className="p-1 hover:text-red-500 bg-[var(--surface)] border border-[var(--border)] rounded cursor-pointer"
                              >
                                 <X className="w-3.5 h-3.5" />
                              </button>
                           </div>
                        ) : (
                           <>
                              <div className="text-sm font-medium truncate pr-24">{conv.title}</div>
                              <div className="text-xs text-[var(--text-muted)] mt-1">{new Date(conv.updatedAt).toLocaleDateString()}</div>
                           </>
                        )}
                      </div>
                      {editingId !== conv.id && (
                         <div 
                            className="flex items-center gap-1.5 absolute right-2 top-1/2 -translate-y-1/2 bg-[var(--surface)] border border-[var(--border)] shadow-md px-1.5 py-1 rounded-md z-30" 
                            onClick={(e) => e.stopPropagation()}
                         >
                            {deletingId === conv.id ? (
                               <div className="flex items-center gap-1 text-xs">
                                  <span className="text-[var(--text-muted)] text-[10px] uppercase font-bold mr-1">Delete?</span>
                                  <button 
                                     onClick={() => handleConfirmDelete(conv.id)}
                                     className="p-1 text-red-500 hover:bg-red-500/10 rounded cursor-pointer"
                                     title="Confirm"
                                  >
                                     <Check className="w-3.5 h-3.5 text-red-500" />
                                  </button>
                                  <button 
                                     onClick={() => setDeletingId(null)}
                                     className="p-1 text-[var(--text-muted)] hover:bg-[var(--background)] rounded cursor-pointer"
                                     title="Cancel"
                                  >
                                     <X className="w-3.5 h-3.5" />
                                  </button>
                               </div>
                            ) : (
                               <>
                                  <button 
                                     onClick={() => handleExportMarkdown(conv)}
                                     className="p-1.5 hover:text-[var(--primary)] hover:bg-[var(--background)] rounded cursor-pointer transition-colors"
                                     title="Export as Markdown"
                                  >
                                     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                                  </button>
                                  <button 
                                     onClick={() => handleStartRename(conv.id, conv.title)}
                                     className="p-1.5 hover:text-blue-500 hover:bg-[var(--background)] rounded cursor-pointer transition-colors"
                                     title="Rename"
                                  >
                                     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                                  </button>
                                  <button 
                                     onClick={() => handleStartDelete(conv.id)}
                                     className="p-1.5 hover:text-red-500 hover:bg-[var(--background)] rounded cursor-pointer transition-colors"
                                     title="Delete"
                                  >
                                     <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                               </>
                            )}
                         </div>
                      )}
                  </div>
               ))
            )}
         </div>
      </div>
    </>
  );
}
