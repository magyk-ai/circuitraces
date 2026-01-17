#!/usr/bin/env node
/**
 * Wordlist Statistics Tool
 *
 * Analyzes wordlists and displays statistics including:
 * - Word counts per topic
 * - Length distributions with ASCII histograms
 * - Words filtered by generator constraints
 *
 * Usage:
 *   npm run wordlist-stats
 *   node dist/wordlist-stats.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORDLISTS_PATH = path.resolve(__dirname, '../wordlists/week1.json');

interface WordList {
  path: string[];
  bonus: string[];
}

interface WordlistsData {
  contentVersion: string;
  topics: Record<string, WordList>;
}

interface LengthDistribution {
  [length: number]: number;
}

function computeLengthDistribution(words: string[]): LengthDistribution {
  const dist: LengthDistribution = {};
  for (const word of words) {
    const len = word.length;
    dist[len] = (dist[len] || 0) + 1;
  }
  return dist;
}

function drawHistogram(dist: LengthDistribution, maxBarWidth = 40): string {
  const entries = Object.entries(dist)
    .map(([len, count]) => ({ len: parseInt(len), count }))
    .sort((a, b) => a.len - b.len);

  if (entries.length === 0) return '  (no data)';

  const maxCount = Math.max(...entries.map(e => e.count));
  const lines: string[] = [];

  for (const { len, count } of entries) {
    const barLen = Math.round((count / maxCount) * maxBarWidth);
    const bar = '█'.repeat(barLen) + '░'.repeat(maxBarWidth - barLen);
    const lenStr = len.toString().padStart(2);
    const countStr = count.toString().padStart(3);
    lines.push(`  ${lenStr} chars │${bar}│ ${countStr}`);
  }

  return lines.join('\n');
}

function getFilteredWords(words: string[], minLen = 3, maxLen = 7): string[] {
  return words.filter(w => w.length >= minLen && w.length <= maxLen);
}

async function main() {
  console.log('📊 Wordlist Statistics\n');
  console.log('='.repeat(60));

  const content = await fs.readFile(WORDLISTS_PATH, 'utf-8');
  const data: WordlistsData = JSON.parse(content);

  console.log(`\nSource: ${path.relative(process.cwd(), WORDLISTS_PATH)}`);
  console.log(`Version: ${data.contentVersion}`);
  console.log(`Topics: ${Object.keys(data.topics).length}\n`);

  // Aggregated stats
  let totalPathWords = 0;
  let totalBonusWords = 0;
  const allPathWords: string[] = [];
  const allBonusWords: string[] = [];

  for (const [topicId, wordlist] of Object.entries(data.topics)) {
    const pathWords = wordlist.path;
    const bonusWords = wordlist.bonus;
    const filteredPath = getFilteredWords(pathWords);
    const filteredBonus = getFilteredWords(bonusWords);

    totalPathWords += pathWords.length;
    totalBonusWords += bonusWords.length;
    allPathWords.push(...pathWords);
    allBonusWords.push(...bonusWords);

    console.log('─'.repeat(60));
    console.log(`📁 ${topicId.toUpperCase()}`);
    console.log('─'.repeat(60));

    // Path words
    console.log(`\n  Path Words: ${pathWords.length} total, ${filteredPath.length} usable (3-7 chars)`);
    const pathDist = computeLengthDistribution(pathWords);
    console.log('\n  Length Distribution:');
    console.log(drawHistogram(pathDist, 30));

    // Bonus words
    console.log(`\n  Bonus Words: ${bonusWords.length} total, ${filteredBonus.length} usable (3-7 chars)`);
    const bonusDist = computeLengthDistribution(bonusWords);
    console.log('\n  Length Distribution:');
    console.log(drawHistogram(bonusDist, 30));

    // Show words outside usable range
    const tooShort = pathWords.filter(w => w.length < 3);
    const tooLong = pathWords.filter(w => w.length > 7);
    if (tooShort.length > 0 || tooLong.length > 0) {
      console.log('\n  ⚠️  Words outside usable range (3-7 chars):');
      if (tooShort.length > 0) {
        console.log(`     Too short (<3): ${tooShort.join(', ')}`);
      }
      if (tooLong.length > 0) {
        console.log(`     Too long (>7): ${tooLong.join(', ')}`);
      }
    }

    console.log('');
  }

  // Summary
  console.log('═'.repeat(60));
  console.log('📈 SUMMARY');
  console.log('═'.repeat(60));

  console.log(`\nTotal Path Words: ${totalPathWords}`);
  console.log(`Total Bonus Words: ${totalBonusWords}`);
  console.log(`Total All Words: ${totalPathWords + totalBonusWords}`);

  const filteredAllPath = getFilteredWords(allPathWords);
  const filteredAllBonus = getFilteredWords(allBonusWords);
  console.log(`\nUsable Path Words (3-7 chars): ${filteredAllPath.length} (${Math.round(filteredAllPath.length / allPathWords.length * 100)}%)`);
  console.log(`Usable Bonus Words (3-7 chars): ${filteredAllBonus.length} (${Math.round(filteredAllBonus.length / allBonusWords.length * 100)}%)`);

  console.log('\n📊 Aggregate Path Word Length Distribution:');
  console.log(drawHistogram(computeLengthDistribution(allPathWords), 40));

  console.log('\n📊 Aggregate Bonus Word Length Distribution:');
  console.log(drawHistogram(computeLengthDistribution(allBonusWords), 40));

  // Puzzle generation requirements
  console.log('\n═'.repeat(60));
  console.log('🎮 PUZZLE GENERATION REQUIREMENTS');
  console.log('═'.repeat(60));
  console.log(`
  • Path words per puzzle: 4-6
  • Word length range: 3-7 characters
  • Grid sizes: 7×7 (default), 8×8 (fallback)
  • Coverage thresholds: 18 cells (7×7), 22 cells (8×8)
  • Constraints: No parallel adjacency (non-intersecting touching words)
  `);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
