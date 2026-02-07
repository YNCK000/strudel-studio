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

  // 2. Check for required elements
  // MUST use setcps() for BPM - .tempo() is NOT a real Strudel function
  if (!code.includes('setcps(')) {
    errors.push('Missing tempo - set BPM using setcps(BPM/4/60), e.g. setcps(130/4/60) for 130 BPM');
  }

  // Check for playable expression (stack, arrange, or pattern at top level)
  const hasPlayable = 
    code.includes('stack(') || 
    code.includes('arrange(') ||
    code.match(/^[a-z_][a-z0-9_]*\s*$/im) || // Variable reference at end
    code.match(/\)\s*$/); // Ends with function call
    
  if (!hasPlayable) {
    warnings.push('Code may not have a playable expression. Ensure it ends with stack(), arrange(), or a pattern.');
  }

  // 3. Check for common mistakes
  if (code.includes('undefined')) {
    errors.push('Code contains "undefined" - check variable names are defined before use');
  }

  if (code.match(/\blet\s+\w+\s*=\s*;/)) {
    errors.push('Found empty variable assignment (let x = ;)');
  }

  // 4. Check for Strudel-specific issues
  if (code.includes('.s(') && !code.includes('note(') && !code.includes('s(')) {
    warnings.push('.s() is typically used after note(). For drums, use s("bd") directly.');
  }

  // Check for missing quotes in pattern strings
  const patterns = code.match(/s\(([^)]+)\)/g) || [];
  for (const pattern of patterns) {
    if (!pattern.includes('"') && !pattern.includes("'") && !pattern.includes('`')) {
      errors.push(`Pattern ${pattern} might be missing quotes. Use s("bd") not s(bd)`);
    }
  }

  // 5. Check for anti-patterns (warnings)
  // Check if same variable used multiple times in arrange
  const arrangeMatch = code.match(/arrange\(\s*(\[[\s\S]*?\](?:\s*,\s*\[[\s\S]*?\])*)\s*\)/);
  if (arrangeMatch) {
    const sections = arrangeMatch[1].match(/\[\d+,\s*(\w+)\]/g) || [];
    const vars = sections.map(s => s.match(/,\s*(\w+)/)?.[1]).filter(Boolean);
    const unique = new Set(vars);
    if (vars.length > 2 && unique.size < vars.length / 2) {
      warnings.push('Anti-pattern: Same sections repeated in arrange(). Add variation between drops!');
    }
  }

  // Check for very long method chains without variables
  const longChains = code.match(/\)\.[a-z]+\([^)]*\)\.[a-z]+\([^)]*\)\.[a-z]+\([^)]*\)\.[a-z]+\([^)]*\)\.[a-z]+\(/g);
  if (longChains && longChains.length > 3) {
    warnings.push('Consider breaking long method chains into variables for readability');
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
