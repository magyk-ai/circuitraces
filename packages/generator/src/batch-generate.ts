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

interface DailyPuzzleMeta {
  id: string;
  title: string;
  difficulty: 'easy';
  grid: { width: number; height: number };
  estimatedMinutes: number;
  puzzlePath: string;
  tags: string[];
}

interface DailyScheduleEntry {
  date: string;
  puzzles: Record<string, DailyPuzzleMeta>;
}

const TOPIC_TITLES: Record<string, string[]> = {
  'product-management': ['Ship It', 'Launch Mode', 'Roadmap Ahead', 'Feature Sprint', 'Metric Mastery'],
  'devops': ['Deploy Day', 'Ops Quest', 'Pipeline Run', 'Build & Ship', 'Infra Hunt'],
  'personal-finance': ['Money Moves', 'Budget Quest', 'Wealth Path', 'Save Smart', 'Invest Now'],
  'design': ['Pixel Perfect', 'Design Sprint', 'Color Theory', 'Layout Lab', 'UX Quest'],
  'cybersecurity': ['Threat Hunt', 'Crypto Quest', 'Breach Alert', 'Secure Mode', 'Firewall Up'],
  'finance-accounting': ['Ledger Logic', 'Balance Sheet', 'Audit Trail', 'Number Crunch', 'Fiscal Flow'],
  'physiotherapy': ['Move Well', 'Rehab Road', 'Flex Quest', 'Motion Path', 'Strength Run']
};

function getFunTitle(topicId: string, dateStr: string): string {
  const titles = TOPIC_TITLES[topicId];
  if (!titles) return 'Daily Challenge';
  
  // Use day of year or hash of date to pick title
  const date = new Date(dateStr);
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  return titles[dayOfYear % titles.length];
}

async function main() {
  const constructor = new PuzzleConstructor(WORDLISTS_PATH);
  await constructor.loadWordlists(WORDLISTS_PATH);
  
  const scheduleEntries: DailyScheduleEntry[] = [];

  for (const date of DATES) {
    console.log(`\n📅 Generating date: ${date}`);
    const puzzleMap: Record<string, DailyPuzzleMeta> = {};

    for (const topic of TOPICS) {
      // Namespacing: daily-2026-01-18-devops.json
      const puzzleId = `daily-${date}-${topic.id}`;
      const funTitle = getFunTitle(topic.id, date);
      
      const config = {
        date,
        topicId: topic.id,
        topicTitle: topic.title,
        puzzleId,
        title: funTitle,
        tags: [],
        selectionModel: 'RAY_4DIR' as const // Forward-only placements (→ ↓)
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
          grid: { width: 6, height: 6 }, // Updated: 6x6 default grid
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
    contentVersion: "2026.01.17-v2",
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
