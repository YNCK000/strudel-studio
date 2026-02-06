import { NextRequest } from 'next/server';
import OpenAI from 'openai';

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

Always respond with:
1. A brief description of what you created
2. The Strudel code in a \`\`\`javascript code block

Keep responses concise but include all the code needed to play the pattern.`;

export async function POST(req: NextRequest) {
  // Check for API key first
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey || apiKey === 'sk-...') {
    console.error('Chat API error: OPENAI_API_KEY not configured');
    return new Response(
      JSON.stringify({ 
        error: 'API key not configured. Please add OPENAI_API_KEY to .env.local' 
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const openai = new OpenAI({ apiKey });
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: messages array required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 2000,
    });

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (streamError) {
          console.error('Stream error:', streamError);
          controller.error(streamError);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    
    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      const message = error.status === 401 
        ? 'Invalid API key. Please check your OPENAI_API_KEY.'
        : error.status === 429
        ? 'Rate limit exceeded. Please wait and try again.'
        : `OpenAI API error: ${error.message}`;
      
      return new Response(
        JSON.stringify({ error: message }),
        { 
          status: error.status || 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'Failed to generate response. Please try again.' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
