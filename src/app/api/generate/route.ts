/**
 * Agent Pipeline API Route
 * Optimized for speed - uses condensed skills and limited iterations
 */

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { BUNDLED_GENRES, AVAILABLE_GENRES } from '@/lib/bundled-skills';
import { CONDENSED_SKILL, CONDENSED_ANTIPATTERNS } from '@/lib/condensed-skill';
import { validateStrudelCode, formatValidationResult } from '@/lib/validator';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Timeout for the entire request (25 seconds to be safe under Vercel's 30s limit)
const REQUEST_TIMEOUT_MS = 25000;

// System prompt with condensed skill embedded - no need to read it
const SYSTEM_PROMPT = `You are a professional electronic music producer using Strudel.

${CONDENSED_SKILL}

${CONDENSED_ANTIPATTERNS}

## Your Workflow
1. If user mentions a genre, call read_genre() for specific patterns
2. Generate complete, playable Strudel code
3. ALWAYS call validate_code() before returning
4. If validation fails, fix and validate again (max 2 retries)

## Response Format
After validation passes:
1. Brief description (genre, BPM, key, notable features) - 1-2 sentences
2. Complete Strudel code in a \`\`\`javascript block

Keep it concise. Code must be complete and immediately playable.`;

// Streamlined tool definitions
const tools: Anthropic.Tool[] = [
  {
    name: 'read_genre',
    description: 'Read genre-specific production DNA (BPM, patterns, sounds). Call if user mentions a specific genre.',
    input_schema: {
      type: 'object' as const,
      properties: {
        genre: {
          type: 'string',
          description: `Genre name. Available: ${AVAILABLE_GENRES.join(', ')}`,
        },
      },
      required: ['genre'],
    },
  },
  {
    name: 'validate_code',
    description: 'Validate Strudel code. MUST call before returning code to user.',
    input_schema: {
      type: 'object' as const,
      properties: {
        code: {
          type: 'string',
          description: 'Complete Strudel JavaScript code to validate',
        },
      },
      required: ['code'],
    },
  },
];

// Truncate genre content to essential parts (max 2500 chars)
function truncateGenreContent(content: string): string {
  if (content.length <= 2500) return content;
  
  // Keep the header and drums/bass sections which are most important
  const lines = content.split('\n');
  let result = '';
  let inImportantSection = true;
  
  for (const line of lines) {
    // Stop at FX Profile or Structure to keep it short
    if (line.includes('## FX Profile') || line.includes('## Structure')) {
      result += '\n(See full genre file for FX/structure details)';
      break;
    }
    result += line + '\n';
    if (result.length > 2500) {
      result = result.substring(0, 2500) + '\n...';
      break;
    }
  }
  
  return result;
}

// Tool execution
function executeTool(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case 'read_genre': {
      const genre = ((input.genre as string) || '').toLowerCase().replace(/[^a-z]/g, '');
      const content = BUNDLED_GENRES[genre];
      if (!content) {
        return `Unknown genre "${genre}". Available: ${AVAILABLE_GENRES.join(', ')}. Proceed with general electronic music style.`;
      }
      return truncateGenreContent(content);
    }
    
    case 'validate_code': {
      const code = input.code as string;
      if (!code) {
        return 'Error: No code provided to validate';
      }
      const result = validateStrudelCode(code);
      return formatValidationResult(result);
    }
    
    default:
      return `Unknown tool: ${name}`;
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    const { messages } = await req.json();

    // Convert messages to Anthropic format
    const anthropicMessages: Anthropic.MessageParam[] = messages.map(
      (m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })
    );

    // Agent loop with strict limits
    let currentMessages = anthropicMessages;
    let iterations = 0;
    const maxIterations = 4; // Reduced from 10

    while (iterations < maxIterations) {
      // Check timeout
      if (Date.now() - startTime > REQUEST_TIMEOUT_MS) {
        console.warn('Request timeout approaching');
        return Response.json(
          { 
            error: 'Generation taking too long. Try a simpler request.',
            timeout: true 
          },
          { status: 504 }
        );
      }

      iterations++;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000, // Reduced from 8000
        system: SYSTEM_PROMPT,
        messages: currentMessages,
        tools,
      });

      // Check if we're done
      if (response.stop_reason === 'end_turn') {
        const textContent = response.content
          .filter((block): block is Anthropic.TextBlock => block.type === 'text')
          .map((block) => block.text)
          .join('\n');

        const elapsed = Date.now() - startTime;
        console.log(`Generate completed in ${elapsed}ms with ${iterations} iterations`);

        return Response.json({ 
          content: textContent,
          iterations,
          timeMs: elapsed,
        });
      }

      // Handle tool calls
      if (response.stop_reason === 'tool_use') {
        const toolUseBlocks = response.content.filter(
          (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
        );

        if (toolUseBlocks.length === 0) {
          const textContent = response.content
            .filter((block): block is Anthropic.TextBlock => block.type === 'text')
            .map((block) => block.text)
            .join('\n');
          
          return Response.json({ content: textContent, iterations });
        }

        // Execute tools
        const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map(
          (toolUse) => ({
            type: 'tool_result' as const,
            tool_use_id: toolUse.id,
            content: executeTool(toolUse.name, toolUse.input as Record<string, unknown>),
          })
        );

        // Add to conversation
        currentMessages = [
          ...currentMessages,
          { role: 'assistant' as const, content: response.content },
          { role: 'user' as const, content: toolResults },
        ];
      } else {
        // Unexpected stop reason - return what we have
        console.warn('Unexpected stop reason:', response.stop_reason);
        const textContent = response.content
          .filter((block): block is Anthropic.TextBlock => block.type === 'text')
          .map((block) => block.text)
          .join('\n');
        
        return Response.json({ content: textContent, iterations });
      }
    }

    // Max iterations reached
    return Response.json(
      { error: 'Generation taking too many steps. Try a simpler request.', iterations },
      { status: 500 }
    );

  } catch (error: unknown) {
    console.error('Generate API error:', error);
    
    if (error instanceof Anthropic.APIError) {
      return Response.json(
        { error: error.message },
        { status: error.status || 500 }
      );
    }
    
    return Response.json(
      { error: 'Failed to generate. Please try again.' },
      { status: 500 }
    );
  }
}
