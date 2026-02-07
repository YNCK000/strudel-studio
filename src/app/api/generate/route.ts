/**
 * Agent Pipeline API Route - Streaming Version
 * Uses Server-Sent Events to avoid timeouts
 * Runs agentic loop until completion with progress updates
 */

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { BUNDLED_GENRES, AVAILABLE_GENRES } from '@/lib/bundled-skills';
import { CONDENSED_SKILL, CONDENSED_ANTIPATTERNS } from '@/lib/condensed-skill';
import { validateStrudelCode, formatValidationResult } from '@/lib/validator';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// System prompt with condensed skill embedded
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

// Tool definitions
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

// Check if response content has validated code
function checkIfCodeValidated(content: string): boolean {
  const codeMatch = content.match(/```(?:javascript|js)?\n([\s\S]*?)```/);
  if (!codeMatch) return false;
  
  const code = codeMatch[1].trim();
  const result = validateStrudelCode(code);
  return result.valid;
}

// Truncate genre content to essential parts
function truncateGenreContent(content: string): string {
  if (content.length <= 2500) return content;
  
  const lines = content.split('\n');
  let result = '';
  
  for (const line of lines) {
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

// SSE helper to send events
function sendSSE(controller: ReadableStreamDefaultController, event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(new TextEncoder().encode(payload));
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: 'ANTHROPIC_API_KEY not configured' },
      { status: 500 }
    );
  }

  let requestBody: { messages: Array<{ role: string; content: string }> };
  try {
    requestBody = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { messages } = requestBody;

  // Create a streaming response using SSE
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Convert messages to Anthropic format
        const anthropicMessages: Anthropic.MessageParam[] = messages.map(
          (m: { role: string; content: string }) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })
        );

        let currentMessages = anthropicMessages;
        let iterations = 0;
        const maxIterations = 10; // More generous limit since we're streaming

        // Send initial status
        sendSSE(controller, 'status', { 
          status: 'started', 
          message: 'Understanding your request...' 
        });

        while (iterations < maxIterations) {
          iterations++;

          // Send progress update
          sendSSE(controller, 'progress', { 
            iteration: iterations, 
            message: iterations === 1 ? 'Generating track...' : `Iteration ${iterations}...` 
          });

          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4000,
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
            const validated = checkIfCodeValidated(textContent);
            
            console.log(`Generate completed in ${elapsed}ms with ${iterations} iterations (validated: ${validated})`);

            // Send final result
            sendSSE(controller, 'complete', { 
              content: textContent,
              iterations,
              timeMs: elapsed,
              validated,
            });
            
            controller.close();
            return;
          }

          // Handle tool calls
          if (response.stop_reason === 'tool_use') {
            const toolUseBlocks = response.content.filter(
              (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
            );

            if (toolUseBlocks.length === 0) {
              // No tool calls but stop reason was tool_use - return text
              const textContent = response.content
                .filter((block): block is Anthropic.TextBlock => block.type === 'text')
                .map((block) => block.text)
                .join('\n');
              
              sendSSE(controller, 'complete', { 
                content: textContent, 
                iterations,
                timeMs: Date.now() - startTime,
              });
              controller.close();
              return;
            }

            // Send tool call status
            const toolNames = toolUseBlocks.map(t => t.name);
            console.log(`Iteration ${iterations}: Tool calls:`, toolNames.join(', '));
            
            sendSSE(controller, 'tools', { 
              tools: toolNames,
              message: toolNames.includes('validate_code') ? 'Validating code...' : 
                       toolNames.includes('read_genre') ? 'Loading genre patterns...' : 
                       'Processing...'
            });

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
            
            sendSSE(controller, 'complete', { 
              content: textContent, 
              iterations,
              timeMs: Date.now() - startTime,
            });
            controller.close();
            return;
          }
        }

        // Max iterations reached
        sendSSE(controller, 'error', { 
          error: 'Generation taking too many steps. Try a simpler request.',
          iterations 
        });
        controller.close();

      } catch (error: unknown) {
        console.error('Generate API error:', error);
        
        const errorMessage = error instanceof Anthropic.APIError 
          ? error.message 
          : 'Failed to generate. Please try again.';
        
        sendSSE(controller, 'error', { error: errorMessage });
        controller.close();
      }
    },
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
