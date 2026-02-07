import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a professional electronic music producer and Strudel expert. You create live-coded music using the Strudel library (https://strudel.cc).

When generating music:
1. Always use valid Strudel syntax
2. Include tempo with .tempo(bpm)
3. Use stack() to layer multiple patterns
4. Apply effects like .room(), .delay(), .lpf(), .hpf()
5. Create interesting rhythms with mini-notation: "bd*4" means 4 kicks, "~ sd" means rest then snare
6. Use .note() for melodies with note names like "c4 e4 g4"

Example patterns:
- Drums: s("bd sd bd sd") or s("bd*4, ~ sd ~ sd, hh*8")
- Bass: note("c2 c2 g2 f2").s("sawtooth").lpf(800)
- Melody: note("c4 e4 g4 b4").s("sine").room(0.5)

Professional production tips:
- Add variation with .sometimes(), .rarely(), .every()
- Use filter automation: .lpf(saw.range(200, 2000).slow(8))
- Layer sounds for depth
- Build energy with arrangement
- Use drum fills before transitions
- Evolve chord progressions (don't just loop 4 chords)
- Make each drop unique

Always respond with:
1. A brief description of what you created
2. The Strudel code in a \`\`\`javascript code block

Keep responses concise but include all the code needed to play the pattern.`;

export async function POST(req: NextRequest) {
  try {
    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ 
          error: 'API key not configured',
          message: 'Make sure ANTHROPIC_API_KEY is set in .env.local'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { messages } = await req.json();

    // Convert messages to Anthropic format
    const anthropicMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const response = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: anthropicMessages,
    });

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of response) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: unknown) {
    console.error('Chat API error:', error);
    
    // Handle Anthropic API errors
    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Invalid API key' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (error.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limited. Please try again.' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    
    return new Response(
      JSON.stringify({ error: 'Failed to generate response' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
