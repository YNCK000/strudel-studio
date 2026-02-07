import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { STRUDEL_SYSTEM_PROMPT } from '@/lib/prompts';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
      max_tokens: 4000,
      system: STRUDEL_SYSTEM_PROMPT,
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
