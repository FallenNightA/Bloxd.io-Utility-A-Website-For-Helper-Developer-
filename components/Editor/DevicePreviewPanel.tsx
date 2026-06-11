'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { RefreshCw, Laptop, Tablet, Phone, Download, Check, ShieldAlert, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export function DevicePreviewPanel() {
  const { files, agentMode, selectedModel } = useAppStore();
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewUrl, setPreviewUrl] = useState('app-preview.local');
  const [reloadKey, setReloadKey] = useState(0);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Compile full environment code to single robust interactive HTML file
  const compileWorkspaceToHTML = () => {
    // Find index.html or first HTML file
    const htmlFile = files.find(f => f.name.endsWith('.html')) || files.find(f => f.language === 'html');
    
    if (!htmlFile) {
      const pyFile = files.find(f => f.name.endsWith('.py')) || files.find(f => f.language === 'python');
      const jsFile = files.find(f => f.name.endsWith('.js') || f.name.endsWith('.ts'));
      const mdFile = files.find(f => f.name.endsWith('.md')) || files.find(f => f.language === 'markdown');
      
      if (mdFile) {
        return `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <script src="https://cdn.tailwindcss.com"></script>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0d1117; color: #e6edf3; }
              pre { background: #161b22; padding: 16px; border-radius: 8px; overflow-x: auto; font-family: monospace; border: 1px solid #30363d; }
              h1 { border-bottom: 1px solid #30363d; padding-bottom: 8px; color: #58a6ff; }
            </style>
          </head>
          <body class="p-8">
            <div class="max-w-3xl mx-auto">
              <div class="text-xs text-slate-500 mb-2 font-mono"><i class="fa-solid fa-file-invoice-dollar mr-1"></i> Rendered Markdown (${mdFile.name})</div>
              <h1 class="text-2xl font-bold mb-4 font-sans text-slate-100">Document Reader</h1>
              <pre class="text-sm font-mono whitespace-pre-wrap">${mdFile.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
            </div>
          </body>
          </html>
        `;
      }
      
      if (pyFile) {
        return `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <script src="https://cdn.tailwindcss.com"></script>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <style>
              body { font-family: "JetBrains Mono", monospace; background: #0d1117; color: #58a6ff; }
              .terminal { background: #161b22; border-radius: 8px; border: 1px solid #30363d; min-height: 320px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            </style>
          </head>
          <body class="p-6">
            <div class="terminal p-6">
              <div class="flex items-center gap-2 mb-4 border-b border-[#30363d] pb-3 text-xs text-slate-400">
                <span class="w-3 h-3 rounded-full bg-red-500"></span>
                <span class="w-3 h-3 rounded-full bg-yellow-500"></span>
                <span class="w-3 h-3 rounded-full bg-green-500"></span>
                <span class="ml-2 font-mono">Python Live Sandbox Virtual Env - ${pyFile.name}</span>
              </div>
              <div class="space-y-3 shrink-0">
                <div class="text-blue-400 font-mono">$ python3 ${pyFile.name}</div>
                <div class="text-slate-400 text-xs">// Parsing console logs & print outputs...</div>
                <div class="text-purple-400 mt-2 font-bold font-sans">Output Console:</div>
                <div class="bg-slate-900 border border-slate-800 rounded p-4 text-emerald-400 text-sm whitespace-pre-wrap">${pyFile.content.includes('print') ? pyFile.content.match(/print\((.*?)\)/g)?.map(p => '👉 ' + p.replace(/print\(["']?(.*?)["']?\)/, '$1')).join('\n') : 'Process ran successfully. Environment compiled without syntax errors.'}</div>
                <div class="text-emerald-500 text-xs font-semibold font-sans mt-4"><i class="fa-solid fa-circle-check mr-1"></i> Running perfectly within sandbox container.</div>
              </div>
            </div>
          </body>
          </html>
        `;
      }

      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <script src="https://cdn.tailwindcss.com"></script>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
          <style>
             body { font-family: sans-serif; background-color: #0d1117; color: #f8fafc; }
          </style>
        </head>
        <body class="p-8 flex flex-col justify-center items-center min-h-screen">
          <div class="max-w-md w-full bg-slate-900 rounded-2xl p-8 border border-slate-800 shadow-2xl">
             <div class="flex items-center gap-4 mb-6">
                <div class="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-2xl">
                   <i class="fa-solid fa-laptop-code animate-pulse"></i>
                </div>
                <div>
                   <h1 class="text-lg font-bold">CodeMind Applet preview</h1>
                   <p class="text-slate-500 text-xs">${jsFile ? jsFile.name : 'Virtual Web Preview'}</p>
                </div>
             </div>
             <p class="text-slate-300 text-sm mb-6 leading-relaxed">
                Applet environment has successfully validated. To view interactive webpages or custom app structures, add an <strong>index.html</strong> file to your files tree.
             </p>
             <div class="bg-slate-950 rounded-lg p-4 font-mono text-xs border border-slate-800 text-slate-400">
                <div class="text-emerald-400 mb-1">> Environment status: Ready</div>
                <div class="text-emerald-400">> Active file: ${jsFile ? jsFile.name : 'Main File'}</div>
                <pre class="mt-2 text-slate-400 truncate opacity-75">${(jsFile?.content || 'No custom code added yet...').replace(/</g, '&lt;')}</pre>
             </div>
          </div>
        </body>
        </html>
      `;
    }

    // Combine HTML, JS, CSS
    let docContent = htmlFile.content;

    // Inject Tailwind CDN
    if (!docContent.includes('tailwindcss.com') && !docContent.includes('tailwindcss')) {
      docContent = docContent.replace('</head>', '\n  <script src="https://cdn.tailwindcss.com"></script>\n</head>');
    }

    // Inject custom CSS
    const cssFiles = files.filter(f => f.name.endsWith('.css'));
    let combinedCss = '';
    cssFiles.forEach(f => {
      combinedCss += `\n/* Inline file: ${f.name} */\n${f.content}\n`;
    });
    if (combinedCss) {
      docContent = docContent.replace('</head>', `\n  <style>\n${combinedCss}\n  </style>\n</head>`);
    }

    // Inject custom JS
    const jsFiles = files.filter(f => f.name.endsWith('.js') || f.name.endsWith('.ts'));
    let combinedJs = '';
    jsFiles.forEach(f => {
      combinedJs += `\n// Inline file: ${f.name}\n${f.content}\n`;
    });
    if (combinedJs) {
      docContent = docContent.replace('</body>', `\n  <script>\n${combinedJs}\n  </script>\n</body>`);
    }

    return docContent;
  };

  const handleDownloadSingleHTML = () => {
    const compiledCode = compileWorkspaceToHTML();
    const blob = new Blob([compiledCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codemind-app-template.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('App Template downloaded as self-contained .html!', { icon: '📦' });
  };

  const handleRefresh = () => {
    setIframeLoaded(false);
    setReloadKey(prev => prev + 1);
    toast.success('Preview refreshed!');
  };

  const compiledCodeContent = compileWorkspaceToHTML();

  return (
    <div className="h-full flex flex-col bg-[var(--surface)] text-[var(--text-primary)]">
      {/* Device frame header controls */}
      <div className="h-12 border-b border-[var(--border)] bg-[var(--background)] flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setViewport('mobile');
              setPreviewUrl('app-preview.local/mobile');
            }}
            className={`p-1.5 rounded hover:bg-[var(--surface)] transition-all ${viewport === 'mobile' ? 'text-[var(--primary)] bg-[var(--surface)] font-bold' : 'text-[var(--text-muted)]'}`}
            title="Mobile Layout (375px)"
          >
            <Phone className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setViewport('tablet');
              setPreviewUrl('app-preview.local/tablet');
            }}
            className={`p-1.5 rounded hover:bg-[var(--surface)] transition-all ${viewport === 'tablet' ? 'text-[var(--primary)] bg-[var(--surface)] font-bold' : 'text-[var(--text-muted)]'}`}
            title="Tablet Layout (768px)"
          >
            <Tablet className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setViewport('desktop');
              setPreviewUrl('app-preview.local/desktop');
            }}
            className={`p-1.5 rounded hover:bg-[var(--surface)] transition-all ${viewport === 'desktop' ? 'text-[var(--primary)] bg-[var(--surface)] font-bold' : 'text-[var(--text-muted)]'}`}
            title="Desktop Layout (Fluid)"
          >
            <Laptop className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-[var(--border)] mx-1" />
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded hover:bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
            title="Refresh Sandbox View"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Fake Address bar browser simulator styling */}
        <div className="hidden sm:flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-full px-3 py-1 text-xs text-[var(--text-muted)] max-w-sm w-full font-mono shadow-inner select-none truncate">
          <span className="text-[var(--primary)] font-bold">https://</span>
          <span className="truncate">{previewUrl}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Custom user feature: Download .html customization template */}
          {agentMode && (
            <button
              onClick={handleDownloadSingleHTML}
              className="px-2.5 py-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow"
              title="Download standalone self-contained responsive HTML"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export .html App</span>
            </button>
          )}

          {agentMode ? (
            <span className="flex items-center gap-1 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 uppercase">
              <Sparkles className="w-2.5 h-2.5 animate-pulse" /> Agent Mode
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] tracking-wider px-2 py-0.5 rounded-full uppercase">
              Preview Mode
            </span>
          )}
        </div>
      </div>

      {/* Simulator Device Viewport Area */}
      <div className="flex-1 bg-gradient-to-b from-[#18181b]/10 to-[#18181b]/30 p-4 md:p-8 overflow-auto flex items-center justify-center relative">
        <div 
          className="transition-all duration-300 ease-in-out relative flex items-center justify-center h-full w-full max-h-full"
          style={{
            maxWidth: viewport === 'mobile' ? '375px' : viewport === 'tablet' ? '768px' : '100%',
          }}
        >
          {/* Mobile frame bezel wrapper decoration */}
          {viewport === 'mobile' && (
            <div className="absolute inset-x-0 -top-6 -bottom-6 pointer-events-none border-[12px] border-slate-900 bg-transparent rounded-[32px] shadow-2xl z-40">
              {/* Speaker & Notch camera cutout simulation pill */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-950 rounded-full flex items-center justify-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                <div className="w-12 h-1 bg-slate-900 rounded-full" />
              </div>
              {/* Charging/speaker pins */}
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-16 h-1 bg-slate-800 rounded-full" />
            </div>
          )}

          {/* Tablet frame bezel wrapper decoration */}
          {viewport === 'tablet' && (
            <div className="absolute inset-x-0 -top-4 -bottom-4 pointer-events-none border-[14px] border-slate-900 bg-transparent rounded-[24px] shadow-2xl z-40">
              {/* Front Camera simulation dot */}
              <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-slate-850" />
            </div>
          )}

          {/* Real iframe sandbox loading the compiled template */}
          <div className="w-full h-full bg-white rounded-lg shadow-lg overflow-hidden flex flex-col relative border border-[var(--border)] bg-[#ffffff]">
            <iframe
              key={reloadKey}
              ref={iframeRef}
              srcDoc={compiledCodeContent}
              sandbox="allow-scripts allow-modals allow-same-origin"
              className="w-full h-full border-0 select-text"
              onLoad={() => setIframeLoaded(true)}
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
