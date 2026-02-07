'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useStudioStore } from '@/lib/store';
import { Play, Square, Copy, Check, Volume2, AlertCircle, Loader2, Code2, Keyboard } from 'lucide-react';
import { EditorView, basicSetup } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { initStrudel, stopStrudel, isStrudelReady, type StrudelInstance } from '@/lib/strudel';

export function CodePanel() {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const strudelRef = useRef<StrudelInstance | null>(null);
  
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [volumeValue, setVolumeValue] = useState(80);
  
  const { currentCode, isPlaying, setCurrentCode, setIsPlaying, volume } = useStudioStore();

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
          '&': {
            height: '100%',
          },
          '.cm-scroller': {
            overflow: 'auto',
            fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
          },
          '.cm-content': {
            padding: '16px 0',
          },
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
          changes: {
            from: 0,
            to: currentDoc.length,
            insert: currentCode,
          },
        });
      }
    }
  }, [currentCode]);

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
    
    try {
      setIsInitializing(true);
      
      if (!strudelRef.current || !isStrudelReady()) {
        strudelRef.current = await initStrudel();
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
    <div className="flex flex-col h-full bg-zinc-925">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-800/60 bg-zinc-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800/80">
              <Code2 className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-white">Code Editor</h2>
              <p className="text-[11px] text-zinc-500">
                {lineCount} line{lineCount !== 1 ? 's' : ''} · Strudel pattern
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 px-3 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-all duration-150"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1.5 text-green-400" />
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
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="px-5 py-3 bg-red-950/50 border-b border-red-900/50 flex items-center gap-3 animate-fade-in">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-400" />
          </div>
          <span className="text-sm text-red-200 flex-1">{error}</span>
          <button 
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300 text-xs font-medium px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Editor */}
      <div ref={editorRef} className="flex-1 overflow-hidden" />

      {/* Playback Controls */}
      <div className="px-5 py-4 border-t border-zinc-800/60 bg-zinc-900/50">
        <div className="flex items-center gap-4">
          {/* Play/Stop Button */}
          <Button
            onClick={handlePlay}
            disabled={isInitializing}
            className={`h-11 px-6 rounded-xl font-medium text-sm transition-all duration-200 ${
              isPlaying 
                ? 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-500/20' 
                : 'bg-green-600 hover:bg-green-500 shadow-lg shadow-green-500/20'
            } ${isInitializing ? 'opacity-70' : ''} btn-glow`}
          >
            {isInitializing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
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
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-zinc-800/40 border border-zinc-800/60">
            <Volume2 className={`w-4 h-4 ${volumeValue > 0 ? 'text-zinc-400' : 'text-zinc-600'}`} />
            <input
              type="range"
              min="0"
              max="100"
              value={volumeValue}
              onChange={(e) => setVolumeValue(Number(e.target.value))}
              className="w-20"
            />
            <span className="text-xs text-zinc-500 w-8 text-right tabular-nums">{volumeValue}%</span>
          </div>
          
          {/* Keyboard Shortcut Hint */}
          <div className="ml-auto flex items-center gap-2 text-xs text-zinc-600">
            <Keyboard className="w-3.5 h-3.5" />
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800/60 border border-zinc-700/50 text-zinc-500 font-mono text-[10px]">⌘</kbd>
              <span className="mx-0.5">+</span>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800/60 border border-zinc-700/50 text-zinc-500 font-mono text-[10px]">↵</kbd>
              <span className="ml-1.5 text-zinc-500">to play</span>
            </span>
          </div>
        </div>
        
        {/* Playing indicator */}
        {isPlaying && (
          <div className="mt-3 flex items-center gap-2 animate-fade-in">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
            <span className="text-xs text-green-400/80">Playing</span>
          </div>
        )}
      </div>
    </div>
  );
}
