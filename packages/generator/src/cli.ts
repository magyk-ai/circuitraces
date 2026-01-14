#!/usr/bin/env node
import { readFile } from 'fs/promises';
import { validatePuzzle } from './validator.js';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: circuitraces-validate <puzzle.json>');
    process.exit(1);
  }

  const filePath = args[0];

  try {
    const content = await readFile(filePath, 'utf-8');
    const puzzle = JSON.parse(content);
    const result = validatePuzzle(puzzle);

    if (result.valid) {
      console.log('✓ Puzzle is valid');
      process.exit(0);
    } else {
      console.error('✗ Puzzle validation failed:');
      for (const error of result.errors) {
        console.error(`  - ${error.path}: ${error.message}`);
      }
      process.exit(1);
    }
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
