'use client';

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStudioStore, extractCode, type Message } from '@/lib/store';
import { Send, Loader2, RefreshCw, Zap, MessageSquare, CheckCircle2, Clock, Trash2, Sparkles, Music, Drum, Waves } from 'lucide-react';

type Mode = 'simple' | 'agent';

// Quick prompt suggestions
const SUGGESTIONS = [
  { icon: Drum, label: 'Techno beat 130 BPM', prompt: 'Create a driving techno beat at 130 BPM with kick, hi-hats, and claps' },
  { icon: Waves, label: 'Ambient soundscape', prompt: 'Make a dreamy ambient soundscape with pads and subtle textures' },
  { icon: Music, label: 'Lo-fi hip hop', prompt: 'Generate a chill lo-fi hip hop beat with vinyl crackle and smooth chords' },
  { icon: Sparkles, label: 'Random pattern', prompt: 'Surprise me with something creative and experimental' },
];

// Loading messages that cycle during agent processing
const LOADING_MESSAGES = [
  'Understanding your request...',
  'Composing the pattern...',
  'Adding sonic details...',
  'Validating syntax...',
];

const LoadingIndicator = memo(function LoadingIndicator({ mode }: { mode: Mode }) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (mode !== 'agent') return;
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [mode]);

  return (
    <div className="flex items-center gap-3">
      <div className="typing-indicator">
        <span />
        <span />
        <span />
      </div>
      {mode === 'agent' && (
        <span className="text-sm text-zinc-400">
          {LOADING_MESSAGES[messageIndex]}
        </span>
      )}
    </div>
  );
});

// Memoized message component
const ChatMessage = memo(function ChatMessage({ 
  message, 
  isLast,
  isLoading, 
  mode,
  onRetry 
}: { 
  message: Message;
  isLast: boolean;
  isLoading: boolean;
  mode: Mode;
  onRetry: () => void;
}) {
  const isUser = message.role === 'user';
  const hasError = message.content.includes('⚠️');
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div
        className={`max-w-[88%] px-4 py-3 ${
          isUser
            ? 'message-user'
            : 'message-assistant'
        }`}
      >
        {/* Message Content */}
        <div className="text-[14px] leading-relaxed whitespace-pre-wrap">
          {message.content || (isLast && isLoading && <LoadingIndicator mode={mode} />)}
        </div>
        
        {/* Metadata for successful generations */}
        {!isUser && message.validated !== undefined && !hasError && (
          <div className="mt-3 pt-2 border-t border-zinc-700/50 flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Validated
            </span>
            {message.timeMs && (
              <span className="flex items-center gap-1.5 text-zinc-500">
                <Clock className="w-3.5 h-3.5" />
                {(message.timeMs / 1000).toFixed(1)}s
              </span>
            )}
            {message.iterations && message.iterations > 1 && (
              <span className="text-zinc-500">
                {message.iterations} attempts
              </span>
            )}
          </div>
        )}
        
        {/* Retry button for errors */}
        {!isUser && hasError && !isLoading && (
          <button
            onClick={onRetry}
            className="mt-3 flex items-center gap-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </button>
        )}
      </div>
    </div>
  );
});

// Welcome state with suggestions
const WelcomeState = memo(function WelcomeState({ 
  mode, 
  onSuggestionClick 
}: { 
  mode: Mode;
  onSuggestionClick: (prompt: string) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12 animate-fade-in">
      {/* Hero */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/20 mb-4">
          <Music className="w-8 h-8 text-violet-400" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">
          Create music with AI
        </h2>
        <p className="text-[14px] text-zinc-400 max-w-[280px]">
          Describe what you want to hear and let AI generate Strudel patterns for you.
        </p>
      </div>
      
      {/* Suggestion Chips */}
      <div className="w-full max-w-[340px] space-y-2">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
          Try these
        </p>
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion.label}
            onClick={() => onSuggestionClick(suggestion.prompt)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all text-left group"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-950 group-hover:bg-violet-500/10 transition-colors">
              <suggestion.icon className="w-4 h-4 text-zinc-400 group-hover:text-violet-400 transition-colors" />
            </div>
            <span className="text-[13px] font-medium text-zinc-400 group-hover:text-white transition-colors">
              {suggestion.label}
            </span>
          </button>
        ))}
      </div>
      
      {/* Mode indicator */}
      {mode === 'agent' && (
        <div className="mt-8 flex items-center gap-2 text-xs text-violet-400/70 bg-violet-500/10 rounded-full px-4 py-2">
          <Zap className="w-3.5 h-3.5" />
          Agent mode validates code automatically
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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { messages, isLoading, addMessage, updateLastMessage, setIsLoading, setCurrentCode, clearMessages } = useStudioStore();

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Parse SSE event from stream chunk
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
            console.warn('Failed to parse SSE data:', currentData);
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
      updateLastMessage(`⚠️ ${errorMsg}\n\nTry simplifying your request or click retry.`);
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

  const handleSuggestionClick = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="px-4 sm:px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-semibold text-white">Chat</h2>
          {messages.length > 0 && (
            <span className="text-xs text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-full">
              {messages.length}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Clear Button */}
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          
          {/* Mode Toggle */}
          <div className="flex items-center bg-zinc-900 rounded-lg p-1">
            <button
              onClick={() => setMode('simple')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                mode === 'simple' 
                  ? 'bg-zinc-800 text-white shadow-sm' 
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Simple
            </button>
            <button
              onClick={() => setMode('agent')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                mode === 'agent' 
                  ? 'bg-violet-600 text-white shadow-sm' 
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Agent
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        {messages.length === 0 ? (
          <WelcomeState mode={mode} onSuggestionClick={handleSuggestionClick} />
        ) : (
          <div className="p-4 space-y-4">
            {messages.map((message, index) => (
              <ChatMessage 
                key={message.id}
                message={message}
                isLast={index === messages.length - 1}
                isLoading={isLoading}
                mode={mode}
                onRetry={handleRetry}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="p-3 sm:p-4 border-t border-zinc-800 bg-zinc-950">
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your music..."
              rows={1}
              className="w-full min-h-[52px] max-h-[140px] px-4 py-3.5 pr-14 bg-zinc-900 border border-zinc-800 rounded-xl text-[14px] text-white placeholder:text-zinc-500 resize-none focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              style={{
                height: 'auto',
                minHeight: '52px',
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 140)}px`;
              }}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className={`absolute right-2 bottom-2 h-9 w-9 p-0 rounded-lg transition-all ${
                input.trim() && !isLoading
                  ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/25'
                  : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-zinc-500 text-center">
            Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line
          </p>
        </form>
      </div>
    </div>
  );
}
