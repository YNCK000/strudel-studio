'use client';

import { ChatPanel } from '@/components/ChatPanel';
import { CodePanel } from '@/components/CodePanel';

export default function Home() {
  return (
    <main className="h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-sm flex items-center justify-between px-5 relative z-10">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg shadow-purple-500/20">
            <svg 
              className="w-5 h-5 text-white" 
              viewBox="0 0 24 24" 
              fill="currentColor"
            >
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="font-semibold text-base tracking-tight">Strudel Studio</span>
            <span className="text-[10px] font-medium bg-purple-500/15 text-purple-400 px-1.5 py-0.5 rounded uppercase tracking-wider">
              Beta
            </span>
          </div>
        </div>
        
        <nav className="flex items-center gap-1">
          <a 
            href="https://strudel.cc/learn" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-zinc-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-zinc-800/60 transition-all duration-150"
          >
            Learn
          </a>
          <a 
            href="https://strudel.cc/reference" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-zinc-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-zinc-800/60 transition-all duration-150"
          >
            Docs
          </a>
          <div className="w-px h-4 bg-zinc-800 mx-1" />
          <a 
            href="https://github.com/YNCK000/strudel-studio" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-white p-2 rounded-md hover:bg-zinc-800/60 transition-all duration-150"
            title="GitHub"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
            </svg>
          </a>
        </nav>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Panel - Left */}
        <div className="w-1/2 lg:w-2/5 panel-divider">
          <ChatPanel />
        </div>
        
        {/* Code Panel - Right */}
        <div className="w-1/2 lg:w-3/5 bg-zinc-900">
          <CodePanel />
        </div>
      </div>
    </main>
  );
}
