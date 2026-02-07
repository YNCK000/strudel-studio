'use client';

import { useState } from 'react';
import { ChatPanel } from '@/components/ChatPanel';
import { CodePanel } from '@/components/CodePanel';
import { MessageSquare, Code2, Github, BookOpen, FileText } from 'lucide-react';

export default function Home() {
  const [mobileView, setMobileView] = useState<'chat' | 'code'>('chat');

  return (
    <main className="h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header - Clean and minimal */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-4 sm:px-6 relative z-10">
        {/* Left: Logo */}
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
          
          <div className="flex items-center gap-2.5">
            <span className="font-semibold text-[15px] tracking-tight">Strudel Studio</span>
            <span className="text-[10px] font-semibold bg-violet-500/15 text-violet-400 px-2 py-0.5 rounded-full uppercase tracking-wide">
              Beta
            </span>
          </div>
        </div>
        
        {/* Right: Nav Links */}
        <nav className="flex items-center gap-1">
          <a 
            href="https://strudel.cc/learn" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-[13px] text-zinc-400 hover:text-white px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Learn
          </a>
          <a 
            href="https://strudel.cc/reference" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-[13px] text-zinc-400 hover:text-white px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Docs
          </a>
          <div className="hidden sm:block w-px h-5 bg-zinc-800 mx-2" />
          <a 
            href="https://github.com/YNCK000/strudel-studio" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[13px] text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            title="View on GitHub"
          >
            <Github className="w-4 h-4" />
          </a>
        </nav>
      </header>

      {/* Mobile Tab Navigation */}
      <div className="md:hidden flex bg-zinc-950 border-b border-zinc-800">
        <button
          onClick={() => setMobileView('chat')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-all ${
            mobileView === 'chat' 
              ? 'text-white border-b-2 border-violet-500 bg-violet-500/5' 
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Chat
        </button>
        <button
          onClick={() => setMobileView('code')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-all ${
            mobileView === 'code' 
              ? 'text-white border-b-2 border-violet-500 bg-violet-500/5' 
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Code2 className="w-4 h-4" />
          Code
        </button>
      </div>

      {/* Main Content - Desktop Split View */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {/* Chat Panel - Left */}
        <div className="w-[420px] lg:w-[460px] xl:w-[500px] shrink-0 panel-divider">
          <ChatPanel />
        </div>
        
        {/* Code Panel - Right (fills remaining space) */}
        <div className="flex-1 min-w-0 bg-zinc-950">
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
