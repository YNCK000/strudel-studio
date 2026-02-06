'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStudioStore, extractCode } from '@/lib/store';
import { Send, Loader2, RefreshCw, AlertCircle } from 'lucide-react';

export function ChatPanel() {
  const [input, setInput] = useState('');
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, addMessage, updateLastMessage, setIsLoading, setCurrentCode } = useStudioStore();

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return;

    setRetryMessage(userMessage);
    
    // Add user message
    addMessage({ role: 'user', content: userMessage });
    
    // Add placeholder for assistant
    addMessage({ role: 'assistant', content: '' });
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
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
      
      setRetryMessage(null);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Something went wrong';
      updateLastMessage(`⚠️ Error: ${errorMsg}\n\nClick the retry button to try again.`);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, addMessage, updateLastMessage, setIsLoading, setCurrentCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userMessage = input.trim();
    setInput('');
    await sendMessage(userMessage);
  };

  const handleRetry = () => {
    if (retryMessage) {
      // Remove the last two messages (user + failed assistant response)
      // Then resend
      sendMessage(retryMessage);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          💬 Chat
        </h2>
        <p className="text-sm text-zinc-400">Describe the music you want to create</p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-zinc-500 py-8">
              <p className="text-lg mb-2">🎵 Welcome to Strudel Studio</p>
              <p className="text-sm mb-4">Try: &quot;Make me a techno beat at 130 BPM&quot;</p>
              <div className="text-xs text-zinc-600 space-y-1">
                <p>• &quot;Create a chill ambient pad&quot;</p>
                <p>• &quot;Give me some drum and bass&quot;</p>
                <p>• &quot;Add some filter sweeps&quot;</p>
              </div>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-purple-600 text-white'
                    : 'bg-zinc-800 text-zinc-100'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm">
                  {message.content || (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                </div>
                
                {/* Retry button for failed messages */}
                {message.role === 'assistant' && 
                 message.content.includes('⚠️ Error') && 
                 retryMessage && 
                 !isLoading && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                    className="mt-2 border-zinc-600 text-zinc-300 hover:bg-zinc-700"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* API Key Warning */}
      {process.env.NODE_ENV === 'development' && (
        <div className="px-4 py-2 bg-yellow-900/30 border-t border-yellow-800/50 text-xs text-yellow-200/70">
          <AlertCircle className="w-3 h-3 inline mr-1" />
          Make sure OPENAI_API_KEY is set in .env.local
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-800">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your track..."
            className="min-h-[60px] max-h-[120px] bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 resize-none"
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
            className="bg-purple-600 hover:bg-purple-700 self-end"
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
