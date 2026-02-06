'use client';

import { ChatPanel } from '@/components/ChatPanel';
import { CodePanel } from '@/components/CodePanel';

export default function Home() {
  return (
    <main className="h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎵</span>
          <span className="font-bold text-lg">Strudel Studio</span>
          <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-0.5 rounded ml-2">
            BETA
          </span>
        </div>
        
        <nav className="flex items-center gap-4">
          <a 
            href="https://strudel.cc/learn" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-zinc-400 hover:text-white transition"
          >
            Learn Strudel
          </a>
          <a 
            href="https://github.com/YNCK000/strudel-studio" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-zinc-400 hover:text-white transition"
          >
            GitHub
          </a>
        </nav>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Panel - Left */}
        <div className="w-1/2 lg:w-2/5 border-r border-zinc-800">
          <ChatPanel />
        </div>
        
        {/* Code Panel - Right */}
        <div className="w-1/2 lg:w-3/5">
          <CodePanel />
        </div>
      </div>
    </main>
  );
}
