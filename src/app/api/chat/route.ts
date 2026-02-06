import { NextRequest } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

Always respond with:
1. A brief description of what you created
2. The Strudel code in a \`\`\`javascript code block

Keep responses concise but include all the code needed to play the pattern.`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

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
        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            controller.enqueue(encoder.encode(content));
          }
        }
        controller.close();
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
    return new Response('Error generating response', { status: 500 });
  }
}
