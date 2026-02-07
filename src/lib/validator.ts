/**
 * Strudel Code Validator
 * Validates Strudel code syntax and structure
 */

import * as acorn from 'acorn';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateStrudelCode(code: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Check JavaScript syntax
  try {
    acorn.parse(code, { 
      ecmaVersion: 2020,
      sourceType: 'module',
    });
  } catch (e: unknown) {
    const error = e as Error & { loc?: { line: number; column: number } };
    const location = error.loc ? ` (line ${error.loc.line}, col ${error.loc.column})` : '';
    errors.push(`Syntax error${location}: ${error.message}`);
    return { valid: false, errors, warnings };
  }

  // 2. Check for tempo setting
  if (!code.includes('setcps(')) {
    errors.push('Missing tempo - use setcps(BPM/4/60), e.g. setcps(130/4/60)');
  }

  // 3. Check for playable expression
  const hasPlayable = 
    code.includes('stack(') || 
    code.includes('arrange(') ||
    code.includes('cat(') ||
    code.includes('sequence(') ||
    // Ends with a function call or variable
    /\)\s*$/.test(code.trim()) ||
    /^[a-z_][a-z0-9_]*\s*$/im.test(code.trim().split('\n').pop() || '');
    
  if (!hasPlayable) {
    warnings.push('Code should end with stack(), arrange(), or a pattern expression');
  }

  // 4. Check for hallucinated functions
  const hallucinations = ['.tempo(', '.glide(', '.portamento(', '.slide(', '.volume('];
  for (const h of hallucinations) {
    if (code.includes(h)) {
      errors.push(`"${h.slice(1, -1)}" is not a real Strudel function`);
    }
  }

  // 5. Check for obvious mistakes
  if (code.includes('undefined')) {
    warnings.push('Code contains "undefined" - check variable names');
  }

  if (/\blet\s+\w+\s*=\s*;/.test(code)) {
    errors.push('Empty variable assignment found');
  }

  return { 
    valid: errors.length === 0, 
    errors,
    warnings,
  };
}

/**
 * Extract Strudel code from markdown content
 */
export function extractCodeFromMarkdown(content: string): string | null {
  const match = content.match(/```(?:javascript|js)?\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

/**
 * Format validation result as a string
 */
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];
  
  if (result.valid) {
    lines.push('✓ Code is valid!');
  } else {
    lines.push('✗ Validation failed:');
    for (const error of result.errors) {
      lines.push(`  - ${error}`);
    }
  }
  
  if (result.warnings.length > 0) {
    lines.push('\nWarnings:');
    for (const warning of result.warnings) {
      lines.push(`  ⚠ ${warning}`);
    }
  }
  
  return lines.join('\n');
}
