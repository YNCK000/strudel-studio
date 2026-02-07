/**
 * Bundle Strudel skills at build time
 * Run with: npx tsx scripts/bundle-skills.ts
 */

import fs from 'fs';
import path from 'path';

const SKILL_PATH = path.resolve(__dirname, '../../skills/strudel');
const OUTPUT_PATH = path.resolve(__dirname, '../src/lib/bundled-skills.ts');

console.log('📦 Bundling Strudel skills...');
console.log(`   Source: ${SKILL_PATH}`);
console.log(`   Output: ${OUTPUT_PATH}`);

// Read core skill files
const skill: Record<string, string> = {};

const coreFiles = [
  ['core', 'SKILL.md'],
  ['patterns', 'references/patterns.md'],
  ['theory', 'references/theory.md'],
  ['effects', 'references/effects.md'],
  ['synths', 'references/synths.md'],
  ['samples', 'references/samples.md'],
  ['antiPatterns', 'references/anti-patterns.md'],
];

for (const [key, file] of coreFiles) {
  const filePath = path.join(SKILL_PATH, file);
  if (fs.existsSync(filePath)) {
    skill[key] = fs.readFileSync(filePath, 'utf-8');
    console.log(`   ✓ ${key}: ${file}`);
  } else {
    console.log(`   ⚠ ${key}: ${file} not found`);
    skill[key] = '';
  }
}

// Read genre files
const genres: Record<string, string> = {};
const genresPath = path.join(SKILL_PATH, 'genres');

if (fs.existsSync(genresPath)) {
  const genreFiles = fs.readdirSync(genresPath).filter(f => f.endsWith('.md'));
  
  for (const file of genreFiles) {
    const name = file.replace('.md', '');
    genres[name] = fs.readFileSync(path.join(genresPath, file), 'utf-8');
    console.log(`   ✓ genre: ${name}`);
  }
}

// Generate TypeScript file
const output = `/**
 * Bundled Strudel skills - AUTO-GENERATED
 * DO NOT EDIT - Run 'npm run bundle-skills' to regenerate
 * Generated: ${new Date().toISOString()}
 */

export const BUNDLED_SKILL: Record<string, string> = ${JSON.stringify(skill, null, 2)};

export const BUNDLED_GENRES: Record<string, string> = ${JSON.stringify(genres, null, 2)};

export const AVAILABLE_GENRES = ${JSON.stringify(Object.keys(genres))};
`;

fs.writeFileSync(OUTPUT_PATH, output);
console.log(`\n✅ Skills bundled successfully!`);
console.log(`   ${Object.keys(skill).length} skill sections`);
console.log(`   ${Object.keys(genres).length} genres`);
