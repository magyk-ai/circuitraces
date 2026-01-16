// packages/generator/src/batch-generate.ts
import fs from 'fs/promises';
import path from 'path';
import { PuzzleConstructor } from './construct-puzzle.js';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.resolve(__dirname, '../../../apps/web/public/daily');
const WORDLISTS_PATH = path.resolve(__dirname, '../wordlists/week1.json');

const TOPICS = [
  { id: 'product-management', title: 'Product Management' },
  { id: 'devops', title: 'DevOps' },
  { id: 'personal-finance', title: 'Personal Finance' },
  { id: 'design', title: 'Design' },
  { id: 'cybersecurity', title: 'Cybersecurity' },
  { id: 'finance-accounting', title: 'Finance' },
  { id: 'physiotherapy', title: 'Physio' }
];

// Week 1 Schedule
const DATES = [
  '2026-01-17',
  '2026-01-18',
  '2026-01-19',
  '2026-01-20',
  '2026-01-21',
  '2026-01-22',
  '2026-01-23'
];

async function main() {
  const constructor = new PuzzleConstructor(WORDLISTS_PATH);
  await constructor.loadWordlists(WORDLISTS_PATH);
  
  const scheduleEntries = [];

  for (const date of DATES) {
    console.log(`\n📅 Generating date: ${date}`);
    const puzzleMap: Record<string, any> = {};

    for (const topic of TOPICS) {
      // Namespacing: daily-2026-01-18-devops.json
      const puzzleId = `daily-${date}-${topic.id}`;
      // Basic titles - we can randomize or rotate via LLM list later.
      // For now, consistent title per topic? Or generic?
      // "Daily DevOps", "Daily PM"? 
      // Plan said: "Ship It" etc.
      // Let's use generic titles for batch gen to ensure safety, or array of titles?
      
      const config = {
        date,
        topicId: topic.id,
        topicTitle: topic.title,
        puzzleId,
        title: `${topic.title} Daily`, // Generic safe title
        tags: []
      };

      try {
        await constructor.generate(config, OUTPUT_DIR);
        
        // Add to map
        // Note: Filename logic in constructor is: 2026-01-18-devops.json
        const filename = `${date}-${topic.id}.json`;
        
        puzzleMap[topic.id] = {
          id: puzzleId,
          title: config.title,
          difficulty: 'easy',
          grid: { width: 5, height: 5 },
          estimatedMinutes: 3,
          puzzlePath: `/daily/${filename}`,
          tags: []
        };
        
      } catch (e) {
        console.error(`❌ Failed ${topic.id}:`, e);
      }
    }

    scheduleEntries.push({
      date,
      puzzles: puzzleMap
    });
  }

  // Write index.json
  const index = {
    version: 2,
    contentVersion: "2026.01.17",
    timezone: "UTC",
    defaultMode: "DAILY",
    schedule: scheduleEntries
  };

  await fs.writeFile(
    path.join(OUTPUT_DIR, 'index.json'), 
    JSON.stringify(index, null, 2)
  );
  
  console.log("\n✅ Generation Complete! Updated index.json");
}

main().catch(console.error);
