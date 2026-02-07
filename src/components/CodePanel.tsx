'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useStudioStore } from '@/lib/store';
import { Play, Square, Copy, Check, Volume2, VolumeX, AlertCircle, Loader2, Code2, X } from 'lucide-react';
import { EditorView, basicSetup } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { initStrudel, stopStrudel, isStrudelReady, getInitProgress, setVolume, type StrudelInstance } from '@/lib/strudel';

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
            fontSize: '13px',
          },
          '.cm-content': { padding: '16px 0' },
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

  // Update editor when code changes externally
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

  // Update volume when slider changes
  useEffect(() => {
    setVolume(volumeValue);
  }, [volumeValue]);

  // Clear error when code changes from external source (new generation)
  const prevCodeRef = useRef(currentCode);
  useEffect(() => {
    if (currentCode !== prevCodeRef.current) {
      // Code changed externally, clear any existing error
      if (error) setError(null);
      prevCodeRef.current = currentCode;
    }
  }, [currentCode, error]);

  // Handle keyboard shortcut
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
    
    // Handle empty code
    const trimmedCode = currentCode.trim();
    if (!trimmedCode) {
      setError('No code to play. Write some Strudel code first!');
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
      
      await strudelRef.current.evaluate(trimmedCode);
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
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="px-4 sm:px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-900">
            <Code2 className="w-4 h-4 text-zinc-400" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-white">Editor</h2>
            <p className="text-[11px] text-zinc-500">
              {lineCount} {lineCount === 1 ? 'line' : 'lines'} · Strudel
            </p>
          </div>
        </div>
        
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="px-4 py-3 bg-red-500/15 border-b-2 border-red-500/40 flex items-center gap-3 animate-fade-in shadow-[0_4px_12px_-2px_rgba(239,68,68,0.2)]">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-red-500/25 shrink-0 animate-pulse">
            <AlertCircle className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-red-300 block">Playback Error</span>
            <span className="text-xs text-red-200/80 block truncate">{error}</span>
          </div>
          <button 
            onClick={() => setError(null)}
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editor */}
      <div ref={editorRef} className="flex-1 overflow-hidden" />

      {/* Playback Controls */}
      <div className="px-4 sm:px-5 py-4 border-t border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-4">
          {/* Play/Stop Button */}
          <Button
            onClick={handlePlay}
            disabled={isInitializing}
            className={`h-11 px-6 rounded-xl font-medium text-sm transition-all ${
              isPlaying 
                ? 'bg-red-600 hover:bg-red-500 shadow-[0_0_24px_-4px_rgba(239,68,68,0.35)]' 
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_24px_-4px_rgba(16,185,129,0.35)]'
            } ${isInitializing ? 'opacity-70' : ''}`}
          >
            {isInitializing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span className="hidden sm:inline">
                  {initStatus === 'audio' && 'Starting...'}
                  {initStatus === 'samples' && 'Loading...'}
                  {(initStatus === 'idle' || initStatus === 'ready') && 'Starting...'}
                </span>
                <span className="sm:hidden">...</span>
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
          
          {/* Volume Control */}
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
            <button 
              onClick={() => setVolumeValue(v => v === 0 ? 80 : 0)}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              {volumeValue === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={volumeValue}
              onChange={(e) => setVolumeValue(Number(e.target.value))}
              className="w-20 sm:w-24"
            />
            <span className="text-xs text-zinc-500 w-8 text-right tabular-nums font-medium">
              {volumeValue}%
            </span>
          </div>
          
          {/* Keyboard Shortcut Hint */}
          <div className="hidden lg:flex ml-auto items-center gap-2 text-xs text-zinc-500">
            <kbd>⌘</kbd>
            <span>+</span>
            <kbd>↵</kbd>
            <span className="ml-1">to {isPlaying ? 'stop' : 'play'}</span>
          </div>
        </div>
        
        {/* Playing indicator */}
        {isPlaying && (
          <div className="mt-3 flex items-center gap-2.5 animate-fade-in">
            <div className="flex items-center gap-[3px]">
              <div className="waveform-bar" />
              <div className="waveform-bar" />
              <div className="waveform-bar" />
              <div className="waveform-bar" />
            </div>
            <span className="text-xs font-medium text-emerald-400">Playing</span>
          </div>
        )}
      </div>
    </div>
  );
}
