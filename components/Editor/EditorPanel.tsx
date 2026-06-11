'use client';

import { useAppStore } from '@/lib/store';
import Editor, { useMonaco } from '@monaco-editor/react';
import { 
  Play, Copy, Download, Trash2, FilePlus, Code2, Upload, FolderUp, 
  Search, X, Check, Edit3, ChevronDown, ChevronRight, File, Folder, 
  Settings, Columns, Terminal, RefreshCw
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';

export function EditorPanel() {
  const { 
    theme, editorFontSize, editorWordWrap, editorMinimap, editorTabSize,
    files, activeFileId, setActiveFileId, addFile, updateFile, renameFile, deleteFile,
    isTerminalOpen, setTerminalOpen, terminalLogs, setTerminalLogs, resetFiles
  } = useAppStore();
  const monaco = useMonaco();

  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editFilename, setEditFilename] = useState('');

  interface TreeNode {
    name: string;
    path: string;
    type: 'file' | 'folder';
    fileId?: string;
    children?: TreeNode[];
  }

  const [collapsedPaths, setCollapsedPaths] = useState<Record<string, boolean>>({});

  const buildTree = (filesList: typeof files) => {
    const root: TreeNode = { name: 'Root', path: '', type: 'folder', children: [] };

    filesList.forEach(file => {
      if (searchQuery && !file.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return;
      }
      const parts = file.name.split('/');
      let current = root;
      let currentPath = '';

      parts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const isLast = index === parts.length - 1;

        if (isLast) {
          if (current.children) {
            const existingFile = current.children.find(c => c.type === 'file' && c.name === part);
            if (!existingFile) {
              current.children.push({
                name: part,
                path: currentPath,
                type: 'file',
                fileId: file.id
              });
            }
          }
        } else {
          if (current.children) {
            let existingFolder = current.children.find(c => c.type === 'folder' && c.name === part);
            if (!existingFolder) {
              existingFolder = {
                name: part,
                path: currentPath,
                type: 'folder',
                children: []
              };
              current.children.push(existingFolder);
            }
            current = existingFolder;
          }
        }
      });
    });

    const sortTree = (node: TreeNode) => {
      if (node.children) {
        node.children.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'folder' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
        node.children.forEach(sortTree);
      }
    };
    sortTree(root);

    return root.children || [];
  };

  const activeFile = files.find(f => f.id === activeFileId) || files[0];
  const editorCode = activeFile?.content || '';
  const editorLanguage = activeFile?.language || 'typescript';

  const setEditorCode = (code: string) => {
    if (activeFileId) updateFile(activeFileId, code);
  };
  const setEditorLanguage = (lang: string) => {
    if (activeFileId) renameFile(activeFileId, activeFile.name, lang);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editorCode);
    toast.success('Code copied to clipboard');
  };

  const handleDownload = () => {
    const blob = new Blob([editorCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
     if (confirm('Are you sure you want to clear this file?')) {
         setEditorCode('');
     }
  };

  const getLanguageIcon = (name: string) => {
     const ext = name.split('.').pop() || '';
     switch(ext) {
        case 'py': return { icon: '🐍', color: 'text-emerald-400' };
        case 'js': return { icon: '🟨', color: 'text-yellow-400' };
        case 'ts': return { icon: '🟦', color: 'text-blue-400' };
        case 'html': return { icon: '🌐', color: 'text-orange-400' };
        case 'css': return { icon: '🎨', color: 'text-pink-400' };
        case 'json': return { icon: '⚙️', color: 'text-purple-400' };
        case 'md': return { icon: '📝', color: 'text-sky-400' };
        default: return { icon: '📄', color: 'text-slate-400' };
     }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;
    
    for (let i = 0; i < selectedFiles.length; i++) {
       const file = selectedFiles[i];
       const path = file.webkitRelativePath || file.name;
       if (path.includes('node_modules/') || path.includes('.git/')) continue;
       
       const content = await file.text();
       const name = path.split('/').pop() || file.name;
       let lang = 'typescript';
       if (name.endsWith('.py')) lang = 'python';
       else if (name.endsWith('.js')) lang = 'javascript';
       else if (name.endsWith('.html')) lang = 'html';
       else if (name.endsWith('.css')) lang = 'css';
       else if (name.endsWith('.json')) lang = 'json';
       else if (name.endsWith('.md')) lang = 'markdown';
       
       const existing = files.find(f => f.name === path);
       if (existing) {
          updateFile(existing.id, content);
       } else {
          addFile({ id: crypto.randomUUID(), name: path, content, language: lang });
       }
    }
    toast.success(`Uploaded ${selectedFiles.length} file(s)`);
    e.target.value = ''; // Reset
  };

  const inlineStartRename = (id: string, currentName: string) => {
    setEditingFileId(id);
    setEditFilename(currentName);
  };

  const inlineSaveRename = (id: string) => {
    if (!editFilename.trim()) {
      setEditingFileId(null);
      return;
    }
    
    let lang = 'typescript';
    if (editFilename.endsWith('.py')) lang = 'python';
    else if (editFilename.endsWith('.js')) lang = 'javascript';
    else if (editFilename.endsWith('.html')) lang = 'html';
    else if (editFilename.endsWith('.css')) lang = 'css';
    else if (editFilename.endsWith('.json')) lang = 'json';
    else if (editFilename.endsWith('.md')) lang = 'markdown';

    renameFile(id, editFilename, lang);
    setEditingFileId(null);
    toast.success('File renamed successfully');
  };

  const renderNode = (node: TreeNode, depth: number): React.ReactNode => {
    const isFolder = node.type === 'folder';
    const isExpanded = !collapsedPaths[node.path];

    if (isFolder) {
      return (
        <div key={node.path} className="flex flex-col">
          {/* Folder row */}
          <div 
            className="flex items-center justify-between px-2 py-1 text-xs text-zinc-300 hover:bg-[#2d2d2f] hover:text-zinc-100 rounded-md cursor-pointer group/folder"
            style={{ paddingLeft: `${depth * 10 + 6}px` }}
            onClick={(e) => {
              setCollapsedPaths(prev => ({
                ...prev,
                [node.path]: !prev[node.path]
              }));
            }}
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="text-zinc-500 shrink-0">
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </span>
              <span className="text-sm shrink-0">📁</span>
              <span className="font-semibold truncate text-zinc-300 text-[12.5px]" title={node.path}>{node.name}</span>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover/folder:opacity-100 transition-opacity pr-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const filename = prompt(`Create new file inside ${node.path}:`, 'config.json');
                  if (filename) {
                     const fullPath = `${node.path}/${filename}`;
                     const id = crypto.randomUUID();
                     let lang = 'typescript';
                     if (filename.endsWith('.py')) lang = 'python';
                     else if (filename.endsWith('.js')) lang = 'javascript';
                     else if (filename.endsWith('.html')) lang = 'html';
                     else if (filename.endsWith('.css')) lang = 'css';
                     else if (filename.endsWith('.json')) lang = 'json';
                     else if (filename.endsWith('.md')) lang = 'markdown';
                     addFile({ id, name: fullPath, content: '', language: lang });
                     setCollapsedPaths(prev => ({ ...prev, [node.path]: false }));
                     toast.success(`Created file ${fullPath}`);
                  }
                }}
                className="p-1 text-zinc-500 hover:text-indigo-400 rounded hover:bg-[#1a1a1f]"
                title="New File inside Folder"
              >
                <FilePlus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Are you sure you want to delete folder "${node.name}" and all its contents?`)) {
                     const childrenFiles = files.filter(f => f.name.startsWith(node.path + '/'));
                     childrenFiles.forEach(f => deleteFile(f.id));
                     toast.success(`Deleted folder ${node.name}`);
                  }
                }}
                className="p-1 text-zinc-500 hover:text-red-400 rounded hover:bg-[#1a1a1f]"
                title="Delete Folder"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Children and leaf folders */}
          {isExpanded && node.children && (
            <div className="flex flex-col mt-0.5">
              {node.children.map(child => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    } else {
      const f = files.find(file => file.id === node.fileId);
      if (!f) return null;

      const langInfo = getLanguageIcon(f.name);
      const isActive = f.id === activeFileId;
      const isEditing = f.id === editingFileId;

      return (
        <div 
          key={f.id}
          onClick={() => setActiveFileId(f.id)}
          className={`flex items-center justify-between px-2 py-1 rounded-md text-xs font-mono group/file cursor-pointer border border-transparent transition-all ${isActive ? 'bg-[#2a2a2c] text-white font-semibold' : 'text-zinc-400 hover:bg-[#2d2d2f] hover:text-zinc-100'}`}
          style={{ paddingLeft: `${depth * 10 + 20}px` }}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="text-sm shrink-0">{langInfo.icon}</span>
            {isEditing ? (
              <input
                type="text"
                value={editFilename}
                onChange={(e) => setEditFilename(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') inlineSaveRename(f.id);
                  else if (e.key === 'Escape') setEditingFileId(null);
                }}
                className="bg-[#151515] border border-blue-500 rounded text-xs px-1 text-white w-full focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono py-0.5"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="truncate" title={f.name}>{node.name}</span>
            )}
          </div>

          {!isEditing && (
            <div className="flex items-center gap-1 opacity-0 group-hover/file:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  inlineStartRename(f.id, f.name);
                }}
                className="p-1 text-zinc-500 hover:text-blue-400 rounded hover:bg-[#1a1a1f]"
                title="Rename File"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              {files.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Are you absolutely sure you want to delete ${f.name}? This is irreversible!`)) {
                      deleteFile(f.id);
                      toast.success(`Deleted ${f.name}`);
                    }
                  }}
                  className="p-1 text-zinc-500 hover:text-red-400 rounded hover:bg-[#1a1a1f]"
                  title="Delete File"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      );
    }
  };

  const workspaceTree = buildTree(files);

  return (
    <div className="h-full flex bg-[var(--surface)] text-[var(--text-primary)] font-sans overflow-hidden">
      
      {/* Activity Bar Left Strips (VS Code Style) */}
      <div className="w-12 bg-[#18181b] border-r border-[#27272a] flex flex-col items-center py-2 justify-between shrink-0">
        <div className="flex flex-col gap-4 items-center w-full">
          {/* Logo / Spark */}
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400" title="Code Workspace">
            <Code2 className="w-4 h-4 animate-pulse" />
          </div>
          {/* Explorer Tab Toggle */}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-2 rounded-lg transition-colors relative group ${sidebarOpen ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-500 hover:text-zinc-200'}`}
            title="Toggle File Explorer Pane"
          >
            <File className="w-5 h-5" />
            <span className="absolute left-14 bg-[#1e1e1f] border border-[#2d2d2f] text-xs text-zinc-300 rounded px-2 py-1 shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">File Explorer</span>
          </button>
        </div>

        <div className="flex flex-col gap-4 items-center">
          <div className="w-4 h-px bg-zinc-800" />
          <div className="text-[10px] text-zinc-500 font-mono tracking-tighter">V1.5</div>
        </div>
      </div>

      {/* Interactive Sidebar Panel (Explorer) */}
      {sidebarOpen && (
        <div className="w-60 bg-[#1e1e1f] border-r border-[#2d2d2f] flex flex-col shrink-0 select-none">
          <div className="h-10 border-b border-[#2d2d2f] px-3 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-zinc-400 shrink-0">
            <span>Workspace</span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => {
                  const name = prompt('Create new file name:', 'main.py');
                  if (name) {
                     const id = crypto.randomUUID();
                     let lang = 'typescript';
                     if (name.endsWith('.py')) lang = 'python';
                     else if (name.endsWith('.js')) lang = 'javascript';
                     else if (name.endsWith('.html')) lang = 'html';
                     else if (name.endsWith('.css')) lang = 'css';
                     else if (name.endsWith('.json')) lang = 'json';
                     else if (name.endsWith('.md')) lang = 'markdown';
                     addFile({ id, name, content: '', language: lang });
                     toast.success(`Created file ${name}`);
                  }
                }}
                className="p-1 hover:bg-[#2d2d2f] hover:text-white rounded transition-colors text-zinc-400"
                title="New File"
              >
                <FilePlus className="w-3.5 h-3.5" />
              </button>
              
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-1 hover:bg-[#2d2d2f] hover:text-white rounded transition-colors text-zinc-400 lg:hidden"
                title="Hide Sidebar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Search filter bar */}
          <div className="p-2 border-b border-[#2d2d2f]">
            <div className="relative flex items-center bg-[#151515] border border-[#2d2d2f] rounded px-2 py-1 text-xs text-zinc-400">
              <Search className="w-3.5 h-3.5 mr-1 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-0 focus:outline-none w-full text-zinc-200 text-xs"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-zinc-500 hover:text-zinc-200">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* File Lists & Folders */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {workspaceTree.length === 0 ? (
              <div className="text-xs text-zinc-500 text-center py-8">No files match search</div>
            ) : (
              workspaceTree.map(node => renderNode(node, 0))
            )}

            {/* Quick manual Actions */}
            <div className="pt-4 px-2 flex flex-col gap-1.5 border-t border-[#2d2d2f] mt-4">
               <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1 mb-1">Import assets</div>
               <label className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer p-1 rounded hover:bg-[#2d2d2f]">
                  <Upload className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Upload File(s)</span>
                  <input type="file" multiple className="hidden" onChange={handleFileUpload} />
               </label>
               <label className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer p-1 rounded hover:bg-[#2d2d2f]">
                  <FolderUp className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Upload Folder</span>
                  <input type="file" multiple {...{ webkitdirectory: "true", directory: "true" } as any} className="hidden" onChange={handleFileUpload} />
               </label>
            </div>

            <div className="pt-4 px-2 flex flex-col gap-1.5 border-t border-red-950/40 mt-4">
               <div className="text-[10px] font-bold text-red-500/80 uppercase tracking-widest pl-1 mb-1">Troubleshoot</div>
               <button
                  onClick={() => {
                     if (confirm("Are you sure you want to RESET the workspace? This will delete all custom files & folders and reload the workspace. This is useful for clearing large files to fix lag.")) {
                        resetFiles();
                        toast.success("Workspace reset to default configuration", { icon: '🧹' });
                     }
                  }}
                  className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 cursor-pointer p-1.5 rounded hover:bg-red-950/20 hover:text-red-200 transition-all text-left w-full"
               >
                  <RefreshCw className="w-3.5 h-3.5 text-red-500/80" />
                  <span>Reset Workspace</span>
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Code Editor Deck Right section */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
        {/* Editor Tabs / Toolbar */}
        <div className="flex-none flex flex-col">
           {/* Top toolbar */}
           <div className="h-10 border-b border-[#2d2d2f] flex items-center justify-between px-2 bg-[#18181b] text-[#cccccc]">
              {/* Filename tab list */}
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1">
                 {files.map(f => {
                    const langInfo = getLanguageIcon(f.name);
                    const isActive = f.id === activeFileId;
                    return (
                        <div 
                           key={f.id} 
                           onClick={() => setActiveFileId(f.id)}
                           className={`flex items-center gap-1.5 px-3 py-1.5 min-w-[90px] max-w-[180px] cursor-pointer relative group border-r border-[#2d2d2f] transition-all shrink-0 ${isActive ? 'bg-[#1e1e1e] border-t-2 border-indigo-500 text-white text-xs font-mono font-medium' : 'bg-transparent border-t-2 border-transparent text-zinc-500 hover:bg-[#222224] hover:text-zinc-300 text-xs font-mono'}`} 
                           title={f.name}
                        >
                           <span className="text-xs shrink-0">{langInfo.icon}</span>
                           <span className="truncate flex-1">{f.name}</span>
                        </div>
                    );
                 })}
              </div>

              {/* Toggles and workspace action controllers */}
              <div className="flex items-center gap-1 shrink-0 px-2">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className={`p-1 hover:bg-[#2d2d2f] rounded text-[#cccccc] ${sidebarOpen ? 'text-indigo-400' : ''}`}
                  title="Toggle Workspace Sidebar"
                >
                  <Columns className="w-4 h-4" />
                </button>
              </div>
           </div>

           {/* Actions Toolbar (Controls layout) */}
           <div className="h-10 border-b border-[#2d2d2f] flex items-center justify-between px-3 bg-[#1e1e1e]">
             <div className="flex items-center gap-2">
                 <span className="text-xs text-zinc-500 uppercase font-bold tracking-widest mr-1">Active compiler</span>
                 <span className="bg-[#2a2a2c] text-indigo-400 font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-[#2d2d2f]">
                    {editorLanguage} Virtual Engine
                 </span>
             </div>
             
             <div className="flex items-center gap-0.5">
               <button 
                 onClick={() => setTerminalOpen(!isTerminalOpen)} 
                 className={`p-1.5 rounded transition-colors ${isTerminalOpen ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-[#2d2d2f] text-zinc-400 hover:text-white'}`} 
                 title="Toggle Terminal Drawer"
               >
                 <Play className="w-4 h-4" />
               </button>
               <div className="w-px h-4 bg-zinc-800 mx-1.5" />
               <button onClick={handleCopy} className="p-1.5 hover:bg-[#2d2d2f] rounded text-zinc-400 hover:text-white" title="Copy code"><Copy className="w-4 h-4" /></button>
               <button onClick={handleDownload} className="p-1.5 hover:bg-[#2d2d2f] rounded text-zinc-400 hover:text-white" title="Download"><Download className="w-4 h-4" /></button>
               <button onClick={handleClear} className="p-1.5 hover:bg-red-500/10 rounded text-red-400 hover:bg-red-500/20" title="Clear editor"><Trash2 className="w-4 h-4" /></button>
             </div>
           </div>
        </div>

        {/* Monaco Editor Container */}
        <div className="flex-1 min-h-0 bg-[#1e1e1e] flex flex-col relative border-t border-[#2d2d2f]">
           <div className="flex-1 min-h-0 relative">
             <Editor
                height="100%"
                language={editorLanguage}
                theme="vs-dark"
                value={editorCode}
                onChange={(val) => setEditorCode(val || '')}
                options={{
                  fontSize: editorFontSize,
                  wordWrap: editorWordWrap,
                  minimap: { enabled: editorMinimap },
                  tabSize: editorTabSize,
                  fontFamily: '"JetBrains Mono", "Menlo", "Ubuntu Mono", "Consolas", "Courier New", monospace',
                  padding: { top: 16 },
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  cursorBlinking: 'smooth',
                  cursorSmoothCaretAnimation: 'on',
                  cursorStyle: 'line',
                  formatOnPaste: true,
                  automaticLayout: true,
                  renderLineHighlight: 'all',
                }}
             />
           </div>

           {/* Terminal Panel */}
           {isTerminalOpen && (
              <div className="h-48 border-t border-[#2d2d2f] bg-[#1e1e1f] flex flex-col z-10 w-full relative">
                 <div className="flex-none h-8 bg-[#18181b] flex items-center justify-between px-3 border-b border-[#2d2d2f]">
                    <span className="text-xs font-mono text-[#cccccc] uppercase tracking-wider flex items-center gap-1.5">
                       <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                       <span>Terminal Console Log</span>
                    </span>
                    <div className="flex items-center gap-2">
                       <button 
                          onClick={() => {
                             setTerminalLogs(['> Executing compiler... (Python/JS Virtual Core)']);
                             setTimeout(() => {
                                setTerminalLogs(prev => [...prev, '> Validated environment constraints.', '> Sandbox execution: Success.', `> Execution completed within ${Math.floor(Math.random()*150 + 50)}ms.`]);
                             }, 800);
                          }} 
                          className="text-xs text-[#cccccc] hover:text-white flex items-center gap-1 bg-[#2a2a2c] px-2 py-0.5 rounded border border-[#2d2d2f]"
                          title="Execute Sandbox"
                       >
                          <Play className="w-2.5 h-2.5" /> 
                          <span>Run</span>
                       </button>
                       <button onClick={() => setTerminalLogs(['> Clear.'])} className="text-[#cccccc] hover:text-white p-1 rounded hover:bg-[#2d2d2f]" title="Clear"><Trash2 className="w-3 h-3" /></button>
                       <button onClick={() => setTerminalOpen(false)} className="text-[#cccccc] hover:text-white p-1 rounded hover:bg-[#2d2d2f]"><X className="w-3 h-3" /></button>
                    </div>
                 </div>
                 <div className="flex-1 overflow-y-auto p-3 font-mono text-xs text-[#cccccc] bg-[#151517]">
                    {terminalLogs.map((log, i) => (
                       <div key={i} className={`whitespace-pre-wrap ${log.includes('Error') ? 'text-red-400' : log.includes('Success') || log.includes('completed') ? 'text-emerald-400' : ''}`}>{log}</div>
                    ))}
                 </div>
              </div>
           )}
        </div>
      </div>
    </div>
  );
}
