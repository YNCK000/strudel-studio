'use client';

import { useState } from 'react';
import { ChatPanel } from '@/components/ChatPanel';
import { CodePanel } from '@/components/CodePanel';
import { MessageSquare, Code2, Github, BookOpen, FileCode } from 'lucide-react';

export default function Home() {
  const [mobileView, setMobileView] = useState<'chat' | 'code'>('chat');

  return (
    <main className="h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Header - Minimal v0-style */}
      <header className="h-14 border-b border-zinc-800/80 bg-[#0a0a0a] flex items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
            <svg 
              className="w-4.5 h-4.5 text-white" 
              viewBox="0 0 24 24" 
              fill="currentColor"
            >
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
          
          <span className="font-semibold text-[15px] tracking-tight text-white">
            Strudel Studio
          </span>
        </div>
        
        {/* Navigation */}
        <nav className="flex items-center gap-1">
          <a 
            href="https://strudel.cc/learn" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-[13px] text-zinc-400 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-all"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Learn
          </a>
          <a 
            href="https://strudel.cc/reference" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-[13px] text-zinc-400 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-all"
          >
            <FileCode className="w-3.5 h-3.5" />
            Docs
          </a>
          <div className="hidden sm:block w-px h-5 bg-zinc-800 mx-2" />
          <a 
            href="https://github.com/YNCK000/strudel-studio" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-all"
            title="View on GitHub"
          >
            <Github className="w-4 h-4" />
          </a>
        </nav>
      </header>

      {/* Mobile Tab Navigation */}
      <div className="md:hidden flex border-b border-zinc-800/80 bg-[#0a0a0a]">
        <button
          onClick={() => setMobileView('chat')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-all ${
            mobileView === 'chat' 
              ? 'text-white border-b-2 border-violet-500' 
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Chat
        </button>
        <button
          onClick={() => setMobileView('code')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-all ${
            mobileView === 'code' 
              ? 'text-white border-b-2 border-violet-500' 
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Code2 className="w-4 h-4" />
          Code
        </button>
      </div>

      {/* Main Content - Desktop */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {/* Chat Panel - Left */}
        <div className="w-[45%] lg:w-[42%] xl:w-[40%] panel-divider">
          <ChatPanel />
        </div>
        
        {/* Code Panel - Right */}
        <div className="flex-1 bg-[#0a0a0a]">
          <CodePanel />
        </div>
      </div>

      {/* Main Content - Mobile */}
      <div className="flex-1 md:hidden overflow-hidden">
        {mobileView === 'chat' ? (
          <ChatPanel />
        ) : (
          <CodePanel />
        )}
      </div>
    </main>
  );
}
