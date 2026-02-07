/**
 * Agent Pipeline API Route
 * Uses Anthropic's toolRunner for multi-turn agent workflow
 */

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { BUNDLED_SKILL, BUNDLED_GENRES, AVAILABLE_GENRES } from '@/lib/bundled-skills';
import { validateStrudelCode, formatValidationResult } from '@/lib/validator';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// System prompt for the agent
const SYSTEM_PROMPT = `You are a professional electronic music producer using Strudel (live-coding music environment).

## Your Workflow

1. **Read the skill documentation** - Call read_skill() to get production standards and syntax reference
2. **Read genre DNA** - If the user mentions a genre, call read_genre() to get genre-specific patterns
3. **Generate code** - Create complete, playable Strudel code
4. **Validate** - ALWAYS call validate_code() before returning your code
5. **Fix if needed** - If validation fails, fix the errors and validate again

## Important Rules

- ALWAYS call validate_code() before returning code to the user
- If validation fails, fix the issues and validate again (max 3 attempts)
- Follow the anti-patterns guidance - avoid static drums, broken buildups, looping same chords
- Each track should have: drum fills, evolving progressions, unique drops
- Code MUST start with setcps(BPM/4/60) and end with a playable expression (stack or pattern)

## Response Format

After validation passes, respond with:
1. Brief description (genre, BPM, key, notable features)
2. The complete Strudel code in a \`\`\`javascript code block

Keep descriptions concise. Code must be complete and immediately playable.`;

// Tool definitions using Zod schemas
const tools: Anthropic.Tool[] = [
  {
    name: 'read_skill',
    description: 'Read Strudel skill documentation including syntax reference, production standards, and anti-patterns. Call this first to understand how to write good Strudel code.',
    input_schema: {
      type: 'object' as const,
      properties: {
        section: {
          type: 'string',
          enum: ['core', 'patterns', 'theory', 'effects', 'antiPatterns', 'all'],
          description: 'Which section to read. Use "all" for core + anti-patterns (recommended for first call)',
        },
      },
      required: [],
    },
  },
  {
    name: 'read_genre',
    description: 'Read genre-specific production DNA including typical BPM, key, drum patterns, bass sounds, and arrangement tips.',
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
    description: 'Validate Strudel code syntax and structure. MUST be called before returning code to user. Returns errors if invalid - fix them and validate again.',
    input_schema: {
      type: 'object' as const,
      properties: {
        code: {
          type: 'string',
          description: 'The complete Strudel JavaScript code to validate',
        },
      },
      required: ['code'],
    },
  },
];

// Tool execution
function executeTool(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case 'read_skill': {
      const section = (input.section as string) || 'all';
      if (section === 'all') {
        return `# Strudel Skill Documentation\n\n${BUNDLED_SKILL.core}\n\n---\n\n# Anti-Patterns (What NOT to Do)\n\n${BUNDLED_SKILL.antiPatterns}`;
      }
      const content = BUNDLED_SKILL[section];
      if (!content) {
        return `Unknown section "${section}". Available: core, patterns, theory, effects, antiPatterns, all`;
      }
      return content;
    }
    
    case 'read_genre': {
      const genre = ((input.genre as string) || '').toLowerCase().replace(/[^a-z]/g, '');
      const content = BUNDLED_GENRES[genre];
      if (!content) {
        return `Unknown genre "${genre}". Available genres: ${AVAILABLE_GENRES.join(', ')}`;
      }
      return content;
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
  try {
    // Check for API key
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

    // Run agent loop with tool calling
    let currentMessages = anthropicMessages;
    let iterations = 0;
    const maxIterations = 10; // Safety limit

    while (iterations < maxIterations) {
      iterations++;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        messages: currentMessages,
        tools,
      });

      // Check if we're done (no more tool calls)
      if (response.stop_reason === 'end_turn') {
        // Extract text content
        const textContent = response.content
          .filter((block): block is Anthropic.TextBlock => block.type === 'text')
          .map((block) => block.text)
          .join('\n');

        return Response.json({ 
          content: textContent,
          iterations,
        });
      }

      // Handle tool calls
      if (response.stop_reason === 'tool_use') {
        const toolUseBlocks = response.content.filter(
          (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
        );

        if (toolUseBlocks.length === 0) {
          // No tool calls, return what we have
          const textContent = response.content
            .filter((block): block is Anthropic.TextBlock => block.type === 'text')
            .map((block) => block.text)
            .join('\n');
          
          return Response.json({ content: textContent, iterations });
        }

        // Execute tools and build response
        const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map(
          (toolUse) => ({
            type: 'tool_result' as const,
            tool_use_id: toolUse.id,
            content: executeTool(toolUse.name, toolUse.input as Record<string, unknown>),
          })
        );

        // Add assistant response and tool results to messages
        currentMessages = [
          ...currentMessages,
          { role: 'assistant' as const, content: response.content },
          { role: 'user' as const, content: toolResults },
        ];
      } else {
        // Unexpected stop reason
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
      { error: 'Max iterations reached', iterations },
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
      { error: 'Failed to generate' },
      { status: 500 }
    );
  }
}
