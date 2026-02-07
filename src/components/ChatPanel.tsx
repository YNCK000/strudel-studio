'use client';

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStudioStore, extractCode, type Message } from '@/lib/store';
import { Send, Loader2, RefreshCw, Zap, Sparkles, CheckCircle, Clock, Trash2, ArrowRight } from 'lucide-react';

type Mode = 'simple' | 'agent';

// Suggestion prompts
const SUGGESTIONS = [
  'techno beat at 130 BPM',
  'chill lo-fi vibes',
  'acid house bassline',
  'ambient textures',
];

// Loading states
const LOADING_STATES = [
  'Understanding your request...',
  'Composing patterns...',
  'Validating syntax...',
  'Finalizing...',
];

const LoadingIndicator = memo(function LoadingIndicator({ mode }: { mode: Mode }) {
  const [stateIndex, setStateIndex] = useState(0);

  useEffect(() => {
    if (mode !== 'agent') return;
    const interval = setInterval(() => {
      setStateIndex((i) => (i + 1) % LOADING_STATES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [mode]);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
      </div>
      <span className="text-sm text-zinc-400">
        {mode === 'agent' ? LOADING_STATES[stateIndex] : 'Generating...'}
      </span>
    </div>
  );
});

const ChatMessage = memo(function ChatMessage({ 
  message, 
  isLoading, 
  mode,
  retryMessage,
  onRetry 
}: { 
  message: Message; 
  isLoading: boolean;
  mode: Mode;
  retryMessage: string | null;
  onRetry: () => void;
}) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div
        className={`max-w-[88%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'message-user text-white'
            : 'message-assistant text-zinc-100'
        }`}
      >
        <div className="whitespace-pre-wrap text-[14px] leading-relaxed">
          {message.content || (isLoading && <LoadingIndicator mode={mode} />)}
        </div>
        
        {/* Metadata */}
        {message.role === 'assistant' && 
         message.validated !== undefined && 
         !message.content.includes('⚠️') && (
          <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle className="w-3 h-3" />
              Validated
            </span>
            {message.timeMs && (
              <span className="flex items-center gap-1.5 text-zinc-500">
                <Clock className="w-3 h-3" />
                {(message.timeMs / 1000).toFixed(1)}s
              </span>
            )}
          </div>
        )}
        
        {/* Retry */}
        {message.role === 'assistant' && 
         message.content.includes('⚠️') && 
         retryMessage && 
         !isLoading && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-3 h-8 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            <RefreshCw className="w-3 h-3 mr-1.5" />
            Retry
          </Button>
        )}
      </div>
    </div>
  );
});

const WelcomeScreen = memo(function WelcomeScreen({ 
  mode, 
  onSuggestionClick 
}: { 
  mode: Mode;
  onSuggestionClick: (text: string) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12 animate-fade-in">
      {/* Logo */}
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-violet-500/20">
        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>
      </div>
      
      <h1 className="text-2xl font-semibold text-white mb-2">
        What music shall we make?
      </h1>
      <p className="text-zinc-500 text-center mb-8 max-w-sm">
        Describe your track and I&apos;ll generate Strudel code for you
      </p>
      
      {/* Suggestion chips */}
      <div className="flex flex-wrap justify-center gap-2 max-w-md">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSuggestionClick(suggestion)}
            className="suggestion-chip flex items-center gap-2 group"
          >
            <span>{suggestion}</span>
            <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </button>
        ))}
      </div>
      
      {mode === 'agent' && (
        <div className="mt-8 flex items-center gap-2 text-xs text-violet-400/70 bg-violet-500/10 rounded-full px-4 py-2">
          <Zap className="w-3 h-3" />
          Agent mode validates your code automatically
        </div>
      )}
    </div>
  );
});

export function ChatPanel() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<Mode>('agent');
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { messages, isLoading, addMessage, updateLastMessage, setIsLoading, setCurrentCode, clearMessages } = useStudioStore();

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [input]);

  const parseSSE = (chunk: string): Array<{ event: string; data: unknown }> => {
    const events: Array<{ event: string; data: unknown }> = [];
    const lines = chunk.split('\n');
    let currentEvent = '';
    let currentData = '';
    
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7);
      } else if (line.startsWith('data: ')) {
        currentData = line.slice(6);
        if (currentEvent && currentData) {
          try {
            events.push({ event: currentEvent, data: JSON.parse(currentData) });
          } catch {
            // ignore parse errors
          }
          currentEvent = '';
          currentData = '';
        }
      }
    }
    return events;
  };

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return;

    setRetryMessage(userMessage);
    addMessage({ role: 'user', content: userMessage });
    addMessage({ role: 'assistant', content: '' });
    setIsLoading(true);

    try {
      const endpoint = mode === 'agent' ? '/api/generate' : '/api/chat';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }].map(m => ({
            role: m.role,
            content: m.content
          }))
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage = 'Unknown error';
        
        if (contentType?.includes('application/json')) {
          const errorJson = await response.json().catch(() => ({}));
          errorMessage = errorJson.error || `API error (${response.status})`;
        } else {
          errorMessage = await response.text().catch(() => 'Unknown error');
        }
        
        throw new Error(errorMessage);
      }

      if (mode === 'agent') {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const events = parseSSE(buffer);
          buffer = '';
          
          for (const { event, data } of events) {
            const eventData = data as Record<string, unknown>;
            
            switch (event) {
              case 'status':
              case 'progress':
              case 'tools':
                updateLastMessage(`⏳ ${eventData.message || 'Processing...'}`);
                break;
                
              case 'complete':
                const content = (eventData.content as string) || '';
                updateLastMessage(content, {
                  validated: eventData.validated as boolean ?? true,
                  iterations: eventData.iterations as number,
                  timeMs: eventData.timeMs as number,
                });
                
                const code = extractCode(content);
                if (code) setCurrentCode(code);
                break;
                
              case 'error':
                throw new Error(eventData.error as string || 'Generation failed');
            }
          }
        }
      } else {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          fullContent += chunk;
          updateLastMessage(fullContent);
          
          const code = extractCode(fullContent);
          if (code) setCurrentCode(code);
        }
      }
      
      setRetryMessage(null);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Something went wrong';
      updateLastMessage(`⚠️ ${errorMsg}\n\nClick retry or try a different request.`);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, mode, addMessage, updateLastMessage, setIsLoading, setCurrentCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userMessage = input.trim();
    setInput('');
    await sendMessage(userMessage);
  };

  const handleRetry = () => {
    if (retryMessage) sendMessage(retryMessage);
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="px-4 sm:px-5 py-3.5 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Mode Toggle - Pill style */}
          <div className="flex items-center p-1 bg-zinc-900 rounded-lg">
            <button
              onClick={() => setMode('simple')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                mode === 'simple' 
                  ? 'bg-zinc-800 text-white shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              Simple
            </button>
            <button
              onClick={() => setMode('agent')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                mode === 'agent' 
                  ? 'bg-violet-600 text-white shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Zap className="w-3 h-3" />
              Agent
            </button>
          </div>
        </div>
        
        {/* Clear */}
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="text-zinc-500 hover:text-zinc-300 p-2 rounded-lg hover:bg-white/5 transition-all"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages or Welcome */}
      {messages.length === 0 ? (
        <WelcomeScreen mode={mode} onSuggestionClick={handleSuggestionClick} />
      ) : (
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessage 
                key={message.id}
                message={message}
                isLoading={isLoading}
                mode={mode}
                retryMessage={retryMessage}
                onRetry={handleRetry}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Input Area - v0 style */}
      <div className="p-4 border-t border-zinc-800/80">
        <form onSubmit={handleSubmit}>
          <div className="relative bg-zinc-900 rounded-2xl border border-zinc-800 transition-all input-glow focus-within:border-zinc-700">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your track..."
              rows={1}
              className="w-full bg-transparent text-white text-[15px] placeholder:text-zinc-600 resize-none focus:outline-none px-4 py-4 pr-14 min-h-[56px] max-h-[160px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              size="icon"
              className={`absolute right-2 bottom-2 h-10 w-10 rounded-xl transition-all ${
                input.trim() && !isLoading
                  ? 'bg-violet-600 hover:bg-violet-500 text-white' 
                  : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </Button>
          </div>
        </form>
        
        {/* Quick suggestions when chat has messages */}
        {messages.length > 0 && !isLoading && (
          <div className="flex flex-wrap gap-2 mt-3">
            {['make it faster', 'add bass', 'more minimal'].map((quick) => (
              <button
                key={quick}
                onClick={() => sendMessage(quick)}
                className="text-xs text-zinc-500 hover:text-zinc-300 px-3 py-1.5 rounded-full border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all"
              >
                {quick}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
