'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css'; // Add CSS globally or dynamically
import { Message } from '@/lib/store';
import { Copy, Plus, Check } from 'lucide-react';
import { useState } from 'react';

// Custom Code Block component
function CodeBlock({ node, inline, className, children, onSendToEditor, ...props }: any) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : '';
  const codeContent = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inline && match) {
     return (
        <div className="my-4 rounded-md overflow-hidden bg-[var(--code-bg)] border border-[var(--border)]">
           <div className="flex items-center justify-between px-4 py-1.5 bg-black/40 text-[var(--text-muted)] text-xs font-mono">
              <span>{lang}</span>
              <div className="flex items-center gap-2">
                 <button onClick={handleCopy} className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors">
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                 </button>
                 <button 
                  onClick={() => onSendToEditor && onSendToEditor(codeContent, lang)}
                  className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors"
                 >
                    <Plus className="w-3 h-3" />
                    <span>Send to Editor</span>
                 </button>
              </div>
           </div>
           <div className="p-4 overflow-x-auto text-sm font-mono leading-relaxed">
              <code className={className} {...props}>
                 {children}
              </code>
           </div>
        </div>
     );
  }

  return (
    <code className={`${className} bg-gray-500/20 px-1.5 py-0.5 rounded text-sm font-mono`} {...props}>
      {children}
    </code>
  );
}

export function MessageItem({ message, onSendToEditor }: { message: Message; onSendToEditor: (code: string, lang: string) => void }) {
  const isUser = message.role === 'user';
  
  let displayContent = message.content;
  const commands: any[] = [];
  
  if (!isUser && displayContent) {
     // Extract <command> tags
     const cmdRegex = /<command\s+type="([^"]+)"(?:\s+name="([^"]+)")?(?:\s+new_name="([^"]+)")?.*?>([\s\S]*?)<\/command>/g;
     const matches = [...displayContent.matchAll(cmdRegex)];
     
     // Remove from display
     displayContent = displayContent.replace(cmdRegex, '').trim();

     for (const m of matches) {
        commands.push({
           type: m[1],
           name: m[2],
           newName: m[3],
           content: m[4]?.trim()
        });
     }
  }

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`max-w-[85%] flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      >
        {!isUser && (
           <div className="w-8 h-8 rounded-full bg-[var(--surface)] flex items-center justify-center flex-shrink-0 border border-[var(--border)]">
              🤖
           </div>
        )}
        
        <div 
           className={`relative px-5 py-4 ${
              isUser 
                ? 'bg-[var(--primary)] text-white' 
                : 'bg-transparent text-[var(--text-primary)] w-full'
           }`}
           style={{
              borderRadius: isUser ? '18px 18px 4px 18px' : '0px',
           }}
        >
           {isUser ? (
              <div className="whitespace-pre-wrap">{displayContent}</div>
           ) : (
              <div className="flex flex-col gap-3">
                 {/* Commands Render */}
                 {commands.map((cmd, idx) => (
                    <div key={idx} className="border border-[var(--border)] rounded-md p-3 bg-[var(--surface)] shadow-sm">
                       {cmd.type === 'create_file' || cmd.type === 'update_file' ? (
                          <div className="flex items-center gap-2 text-sm text-[var(--primary)] font-medium">
                             <span>📁</span> Finished writing to file: <span className="font-mono bg-[var(--background)] px-1.5 py-0.5 rounded text-xs">{cmd.name}</span>
                          </div>
                       ) : cmd.type === 'rename_file' ? (
                          <div className="flex items-center gap-2 text-sm text-[var(--primary)] font-medium">
                             <span>📝</span> Renamed file <span className="font-mono bg-[var(--background)] px-1.5 py-0.5 rounded text-xs">{cmd.name}</span> to <span className="font-mono bg-[var(--background)] px-1.5 py-0.5 rounded text-xs">{cmd.newName}</span>
                          </div>
                       ) : cmd.type === 'run_terminal' ? (
                          <div className="flex flex-col gap-1">
                             <div className="flex items-center gap-2 text-sm text-[var(--text-primary)] font-medium">
                                <span>▶️</span> Executed command
                             </div>
                             <code className="text-xs bg-[var(--background)] p-2 rounded text-[var(--text-muted)] mt-1 font-mono">{cmd.content}</code>
                          </div>
                       ) : null}
                    </div>
                 ))}

                 {/* Remaining Text */}
                 <div className="prose prose-invert max-w-none w-full prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0 min-h-[24px]">
                    {message.content ? (
                       <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                          components={{
                             code: (props) => <CodeBlock {...props} onSendToEditor={onSendToEditor} />
                          }}
                       >
                          {displayContent}
                       </ReactMarkdown>
                    ) : (
                       <div className="flex items-center gap-2 h-6">
                          <span className="w-2 h-2 bg-[var(--primary)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-2 h-2 bg-[var(--primary)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-2 h-2 bg-[var(--primary)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                       </div>
                    )}
                 </div>
              </div>
           )}
           
           {/* Actions / Timestamp */}
           <div className={`text-[10px] opacity-60 mt-2 flex ${isUser ? 'justify-end text-neutral-200' : 'justify-start text-[var(--text-muted)]'}`}>
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
           </div>
        </div>
      </div>
    </div>
  );
}
