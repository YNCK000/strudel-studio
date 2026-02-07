'use client';

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStudioStore, extractCode, type Message } from '@/lib/store';
import { Send, Loader2, RefreshCw, Zap, MessageSquare, CheckCircle, Clock, Trash2 } from 'lucide-react';

type Mode = 'simple' | 'agent';

// Loading messages that cycle during agent processing
const LOADING_MESSAGES = [
  'Understanding your request...',
  'Generating Strudel code...',
  'Validating syntax...',
  'Applying finishing touches...',
];

const LoadingIndicator = memo(function LoadingIndicator({ mode }: { mode: Mode }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    // Cycle through loading messages
    const messageInterval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 3000);

    // Animate dots
    const dotsInterval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 500);

    return () => {
      clearInterval(messageInterval);
      clearInterval(dotsInterval);
    };
  }, []);

  if (mode !== 'agent') {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm text-zinc-400">Generating{dots}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
        <span className="text-sm text-purple-300">{LOADING_MESSAGES[messageIndex]}{dots}</span>
      </div>
      <div className="text-xs text-zinc-500 ml-6">
        Agent pipeline active
      </div>
    </div>
  );
});

// Memoized message component for better performance with long chat histories
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
  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-2 ${
          message.role === 'user'
            ? 'bg-purple-600 text-white'
            : 'bg-zinc-800 text-zinc-100'
        }`}
      >
        <div className="whitespace-pre-wrap text-sm">
          {message.content || (
            isLoading && <LoadingIndicator mode={mode} />
          )}
        </div>
        
        {/* Generation metadata badge */}
        {message.role === 'assistant' && 
         message.validated !== undefined && 
         !message.content.includes('⚠️') && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-green-400">
              <CheckCircle className="w-3 h-3" />
              Validated
            </span>
            {message.timeMs && (
              <span className="flex items-center gap-1 text-zinc-500">
                <Clock className="w-3 h-3" />
                {(message.timeMs / 1000).toFixed(1)}s
              </span>
            )}
            {message.iterations && message.iterations > 1 && (
              <span className="text-zinc-500">
                ({message.iterations} iterations)
              </span>
            )}
          </div>
        )}
        
        {/* Retry button for failed messages */}
        {message.role === 'assistant' && 
         message.content.includes('⚠️') && 
         retryMessage && 
         !isLoading && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-2 border-zinc-600 text-zinc-300 hover:bg-zinc-700"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        )}
      </div>
    </div>
  );
});

// Welcome message component
const WelcomeMessage = memo(function WelcomeMessage({ mode }: { mode: Mode }) {
  return (
    <div className="text-center text-zinc-500 py-8">
      <p className="text-lg mb-2">🎵 Welcome to Strudel Studio</p>
      <p className="text-sm mb-4">Try: &quot;Make me a techno beat at 130 BPM&quot;</p>
      <div className="text-xs text-zinc-600 space-y-1">
        <p>• &quot;Create a chill lo-fi track&quot;</p>
        <p>• &quot;Give me some drum and bass&quot;</p>
        <p>• &quot;Make a dubstep drop&quot;</p>
      </div>
      {mode === 'agent' && (
        <div className="mt-4 text-xs text-purple-400/70 bg-purple-900/20 rounded p-2">
          <Zap className="w-3 h-3 inline mr-1" />
          Agent mode: Validates code, typically 10-20 seconds
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
  const { messages, isLoading, addMessage, updateLastMessage, setIsLoading, setCurrentCode, clearMessages } = useStudioStore();

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
    
    // Add user message
    addMessage({ role: 'user', content: userMessage });
    
    // Add placeholder for assistant
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
        // Agent mode uses SSE streaming
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete events in buffer
          const events = parseSSE(buffer);
          buffer = ''; // Clear processed buffer
          
          for (const { event, data } of events) {
            const eventData = data as Record<string, unknown>;
            
            switch (event) {
              case 'status':
              case 'progress':
              case 'tools':
                // Update loading message with status
                updateLastMessage(`⏳ ${eventData.message || 'Processing...'}`);
                break;
                
              case 'complete':
                // Final result
                const content = (eventData.content as string) || '';
                updateLastMessage(content, {
                  validated: eventData.validated as boolean ?? true,
                  iterations: eventData.iterations as number,
                  timeMs: eventData.timeMs as number,
                });
                
                // Extract and update code
                const code = extractCode(content);
                if (code) {
                  setCurrentCode(code);
                }
                
                // Log performance
                if (eventData.timeMs) {
                  console.log(`Generated in ${eventData.timeMs}ms (${eventData.iterations} iterations)`);
                }
                break;
                
              case 'error':
                throw new Error(eventData.error as string || 'Generation failed');
            }
          }
        }
      } else {
        // Simple mode streams text directly
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          fullContent += chunk;
          updateLastMessage(fullContent);
          
          // Extract and update code if found
          const code = extractCode(fullContent);
          if (code) {
            setCurrentCode(code);
          }
        }
      }
      
      setRetryMessage(null);
    } catch (error) {
      console.error('Chat error:', error);
      
      let errorMsg = 'Something went wrong';
      if (error instanceof Error) {
        errorMsg = error.message;
      }
      
      updateLastMessage(`⚠️ ${errorMsg}\n\nClick retry to try again, or simplify your request.`);
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
    if (retryMessage) {
      sendMessage(retryMessage);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
            💬 Chat
          </h2>
          
          <div className="flex items-center gap-2">
            {/* Clear Button */}
            {messages.length > 0 && (
              <button
                onClick={clearMessages}
                className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-zinc-800/60 transition-colors"
                title="Clear chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            
            {/* Mode Toggle */}
            <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-1">
            <button
              onClick={() => setMode('simple')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition ${
                mode === 'simple' 
                  ? 'bg-zinc-700 text-white' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Simple mode: Direct AI response"
            >
              <MessageSquare className="w-3 h-3" />
              Simple
            </button>
            <button
              onClick={() => setMode('agent')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition ${
                mode === 'agent' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Agent mode: Validates code automatically"
            >
              <Zap className="w-3 h-3" />
              Agent
            </button>
            </div>
          </div>
        </div>
        <p className="text-sm text-zinc-400">
          {mode === 'agent' 
            ? 'Agent validates code automatically (~10-20s)' 
            : 'Simple mode: direct AI response'}
        </p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && <WelcomeMessage mode={mode} />}
          
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

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 sm:p-4 border-t border-zinc-800">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your track..."
            className="min-h-[50px] sm:min-h-[60px] max-h-[100px] sm:max-h-[120px] bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 resize-none text-sm sm:text-base"
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
            className={`self-end h-10 w-10 sm:h-auto sm:w-auto sm:px-4 ${
              mode === 'agent' 
                ? 'bg-purple-600 hover:bg-purple-700' 
                : 'bg-zinc-700 hover:bg-zinc-600'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
