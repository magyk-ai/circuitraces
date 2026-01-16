#!/usr/bin/env node
import { readFile } from 'fs/promises';
import { validatePuzzle } from './validator.js';
import { auditPuzzle } from './auditor.js';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  circuitraces-validate <puzzle.json>     - Quick schema validation');
    console.log('  circuitraces-validate --audit <puzzle.json> - Full audit (solvability + fidelity)');
    process.exit(1);
  }

  // Check for --audit flag
  const isAudit = args[0] === '--audit';
  const filePath = isAudit ? args[1] : args[0];

  if (!filePath) {
    console.error('Error: No puzzle file specified');
    process.exit(1);
  }

  try {
    const content = await readFile(filePath, 'utf-8');
    const puzzle = JSON.parse(content);

    if (isAudit) {
      // Full audit
      const result = auditPuzzle(puzzle);
      printAuditReport(result, filePath);
      process.exit(result.valid ? 0 : 1);
    } else {
      // Quick schema validation
      const result = validatePuzzle(puzzle);
      if (result.valid) {
        console.log('✓ Puzzle is valid (schema check only)');
        console.log('  Tip: Run with --audit for full solvability check');
        process.exit(0);
      } else {
        console.error('✗ Puzzle validation failed:');
        for (const error of result.errors) {
          console.error(`  - ${error.path}: ${error.message}`);
        }
        process.exit(1);
      }
    }
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

function printAuditReport(result: ReturnType<typeof auditPuzzle>, filePath: string): void {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║           PUZZLE AUDIT REPORT                ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`\nFile: ${filePath}`);

  // Connectivity
  console.log('\n🔗 CONNECTIVITY:');
  if (result.connectivity.solvable) {
    console.log(`  ✅ Solvable (path length: ${result.connectivity.pathLength} steps)`);
  } else {
    console.log('  ❌ UNSOLVABLE');
    if (result.connectivity.unreachablePathWords.length > 0) {
      console.log(`  Unreachable words: ${result.connectivity.unreachablePathWords.join(', ')}`);
    }
  }

  // Errors
  if (result.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    for (const err of result.errors) {
      console.log(`  [${err.path}]`);
      console.log(`    ${err.message}`);
    }
  }

  // Warnings
  if (result.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    for (const warn of result.warnings) {
      console.log(`  [${warn.path}]`);
      console.log(`    ${warn.message}`);
    }
  }

  // Summary
  console.log('\n────────────────────────────────────────────────');
  if (result.valid) {
    console.log('✅ Puzzle is VALID and SOLVABLE');
  } else {
    console.log(`❌ Puzzle has ${result.errors.length} ERROR(S)`);
  }
  console.log('');
}

main();
