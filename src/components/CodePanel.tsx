'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useStudioStore } from '@/lib/store';
import { Play, Square, Copy, Check, Volume2, VolumeX, AlertCircle, Loader2 } from 'lucide-react';
import { EditorView, basicSetup } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { initStrudel, stopStrudel, isStrudelReady, getInitProgress, type StrudelInstance } from '@/lib/strudel';

export function CodePanel() {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const strudelRef = useRef<StrudelInstance | null>(null);
  
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initStatus, setInitStatus] = useState<'idle' | 'audio' | 'samples' | 'ready'>('idle');
  const [volumeValue, setVolumeValue] = useState(80);
  
  const { currentCode, isPlaying, setCurrentCode, setIsPlaying } = useStudioStore();

  // Initialize CodeMirror
  useEffect(() => {
    if (!editorRef.current || viewRef.current) return;

    const view = new EditorView({
      doc: currentCode,
      extensions: [
        basicSetup,
        javascript(),
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            setCurrentCode(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': {
            overflow: 'auto',
            fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
          },
          '.cm-content': { padding: '20px 0' },
        }),
      ],
      parent: editorRef.current,
    });

    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Sync external code changes
  useEffect(() => {
    if (viewRef.current) {
      const currentDoc = viewRef.current.state.doc.toString();
      if (currentDoc !== currentCode) {
        viewRef.current.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: currentCode },
        });
      }
    }
  }, [currentCode]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handlePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentCode, isPlaying]);

  const handlePlay = useCallback(async () => {
    setError(null);
    
    if (isPlaying) {
      stopStrudel();
      setIsPlaying(false);
      return;
    }
    
    try {
      setIsInitializing(true);
      
      if (!strudelRef.current || !isStrudelReady()) {
        const progressInterval = setInterval(() => {
          setInitStatus(getInitProgress());
        }, 100);
        
        try {
          strudelRef.current = await initStrudel();
        } finally {
          clearInterval(progressInterval);
          setInitStatus('ready');
        }
      }
      
      await strudelRef.current.evaluate(currentCode);
      setIsPlaying(true);
    } catch (err) {
      console.error('Playback error:', err);
      setError(err instanceof Error ? err.message : 'Failed to play');
      setIsPlaying(false);
    } finally {
      setIsInitializing(false);
    }
  }, [isPlaying, currentCode, setIsPlaying]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [currentCode]);

  const lineCount = currentCode.split('\n').length;

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="h-14 px-4 sm:px-5 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-white">Editor</span>
          <span className="text-xs text-zinc-600">
            {lineCount} line{lineCount !== 1 ? 's' : ''}
          </span>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-8 px-3 text-xs text-zinc-500 hover:text-white hover:bg-white/5"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="px-5 py-3 bg-red-950/40 border-b border-red-900/30 flex items-center gap-3 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-200 flex-1">{error}</span>
          <button 
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Editor */}
      <div ref={editorRef} className="flex-1 overflow-hidden" />

      {/* Controls */}
      <div className="h-16 px-4 sm:px-5 border-t border-zinc-800/80 flex items-center gap-4">
        {/* Play Button */}
        <Button
          onClick={handlePlay}
          disabled={isInitializing}
          className={`h-10 px-5 rounded-lg font-medium text-sm transition-all ${
            isPlaying 
              ? 'bg-white text-black hover:bg-zinc-200' 
              : 'bg-violet-600 hover:bg-violet-500 text-white'
          }`}
        >
          {isInitializing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {initStatus === 'audio' && 'Audio...'}
              {initStatus === 'samples' && 'Samples...'}
              {(initStatus === 'idle' || initStatus === 'ready') && 'Starting...'}
            </>
          ) : isPlaying ? (
            <>
              <Square className="w-4 h-4 mr-2 fill-current" />
              Stop
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2 fill-current" />
              Play
            </>
          )}
        </Button>
        
        {/* Playing indicator */}
        {isPlaying && (
          <div className="playing-bars">
            <span /><span /><span /><span />
          </div>
        )}
        
        {/* Spacer */}
        <div className="flex-1" />
        
        {/* Volume */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setVolumeValue(volumeValue > 0 ? 0 : 80)}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            {volumeValue > 0 ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={volumeValue}
            onChange={(e) => setVolumeValue(Number(e.target.value))}
            className="w-20"
          />
          <span className="text-xs text-zinc-600 w-8 text-right tabular-nums">
            {volumeValue}%
          </span>
        </div>
        
        {/* Shortcut hint - desktop */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-zinc-600 ml-4">
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 font-mono text-[10px]">⌘</kbd>
          <span>+</span>
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 font-mono text-[10px]">↵</kbd>
        </div>
      </div>
    </div>
  );
}
