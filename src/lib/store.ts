import { create } from 'zustand';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  code?: string;
  createdAt: Date;
  // Generation metadata
  validated?: boolean;
  iterations?: number;
  timeMs?: number;
}

interface StudioState {
  // Chat state
  messages: Message[];
  isLoading: boolean;
  
  // Code state
  currentCode: string;
  
  // Playback state
  isPlaying: boolean;
  volume: number;
  
  // Actions
  addMessage: (message: Omit<Message, 'id' | 'createdAt'>) => void;
  updateLastMessage: (content: string, metadata?: { validated?: boolean; iterations?: number; timeMs?: number }) => void;
  setIsLoading: (loading: boolean) => void;
  setCurrentCode: (code: string) => void;
  setIsPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  clearMessages: () => void;
}

export const useStudioStore = create<StudioState>((set) => ({
  // Initial state
  messages: [],
  isLoading: false,
  currentCode: `// Welcome to Strudel Studio!
// Start chatting to generate music...
// Click Play or press Cmd+Enter to hear the beat

stack(
  s("bd*4"),
  s("~ sd ~ sd"),
  s("hh*8")
).tempo(120)`,
  isPlaying: false,
  volume: 0.8,
  
  // Actions
  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          createdAt: new Date(),
        },
      ],
    })),
    
  updateLastMessage: (content, metadata) =>
    set((state) => {
      const messages = [...state.messages];
      if (messages.length > 0) {
        messages[messages.length - 1].content = content;
        if (metadata) {
          Object.assign(messages[messages.length - 1], metadata);
        }
      }
      return { messages };
    }),
    
  setIsLoading: (isLoading) => set({ isLoading }),
  setCurrentCode: (currentCode) => set({ currentCode }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setVolume: (volume) => set({ volume }),
  clearMessages: () => set({ messages: [] }),
}));

// Helper to extract code from AI response
export function extractCode(content: string): string | null {
  const codeMatch = content.match(/```(?:javascript|js)?\n([\s\S]*?)```/);
  return codeMatch ? codeMatch[1].trim() : null;
}
