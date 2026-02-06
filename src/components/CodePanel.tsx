'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useStudioStore } from '@/lib/store';
import { Play, Square, Copy, Check, Volume2 } from 'lucide-react';
import { EditorView, basicSetup } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

export function CodePanel() {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [copied, setCopied] = useState(false);
  
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
          '&': {
            height: '100%',
            fontSize: '14px',
          },
          '.cm-scroller': {
            overflow: 'auto',
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

  const handlePlay = useCallback(() => {
    // TODO: Integrate with Strudel web audio
    setIsPlaying(!isPlaying);
    
    if (!isPlaying) {
      // Start playback
      console.log('Playing:', currentCode);
      // Will integrate @strudel/web here
    } else {
      // Stop playback
      console.log('Stopped');
    }
  }, [isPlaying, currentCode, setIsPlaying]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [currentCode]);

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            📝 Code
          </h2>
          <p className="text-sm text-zinc-400">Strudel pattern code</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div ref={editorRef} className="flex-1 overflow-hidden" />

      {/* Playback Controls */}
      <div className="p-4 border-t border-zinc-800 flex items-center gap-4">
        <Button
          onClick={handlePlay}
          className={`${
            isPlaying 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-green-600 hover:bg-green-700'
          } text-white px-6`}
        >
          {isPlaying ? (
            <>
              <Square className="w-4 h-4 mr-2" /> Stop
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" /> Play
            </>
          )}
        </Button>
        
        <div className="flex items-center gap-2 text-zinc-400">
          <Volume2 className="w-4 h-4" />
          <input
            type="range"
            min="0"
            max="100"
            defaultValue="80"
            className="w-24 accent-purple-600"
          />
        </div>
        
        <div className="ml-auto text-sm text-zinc-500">
          Press Ctrl+Enter to play
        </div>
      </div>
    </div>
  );
}
