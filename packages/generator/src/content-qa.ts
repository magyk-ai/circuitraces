
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DAILY_DIR = path.resolve(__dirname, '../../../apps/web/public/daily');

interface DailyIndex {
  schedule: {
    date: string;
    puzzles: Record<string, DailyPuzzleMeta>; // topicId -> puzzle metadata
  }[];
}

interface DailyPuzzleMeta {
  puzzlePath: string;
}

interface PuzzleWordEntry {
  wordId: string;
}

interface PuzzleContent {
  words: {
    path: PuzzleWordEntry[];
    additional: PuzzleWordEntry[];
  };
}

async function main() {
  console.log("🔍 Starting Content QA Scan...");
  
  const indexPath = path.join(DAILY_DIR, 'index.json');
  const indexContent = await fs.readFile(indexPath, 'utf-8');
  const index: DailyIndex = JSON.parse(indexContent);

  let totalPuzzles = 0;
  let totalPathWords = 0;
  let totalBonusWords = 0;
  let minPathLen = 999;
  let maxPathLen = 0;
  
  console.log(`\nFound ${index.schedule.length} days in schedule.\n`);

  for (const entry of index.schedule) {
    console.log(`📅 Date: ${entry.date}`);
    const topics = Object.keys(entry.puzzles);
    
    for (const topic of topics) {
      // The puzzle metadata object contains puzzlePath
      const meta = entry.puzzles[topic];
      // puzzlePath is relative e.g. "/daily/..."
      // strip leading slash
      const relPath = meta.puzzlePath.startsWith('/') ? meta.puzzlePath.slice(1) : meta.puzzlePath;
      // DAILY_DIR is .../public/daily. Parent is .../public.
      // relPath is daily/xxxx.json.
      // So we want to resolve from DAILY_DIR/.. (public)
      const puzzlePath = path.resolve(DAILY_DIR, '..', relPath); 
      
      const filename = path.basename(meta.puzzlePath);
      // const fullPath = path.join(DAILY_DIR, filename); // Unused
      
      try {
        const content = await fs.readFile(puzzlePath, 'utf-8');
        const puzzle: PuzzleContent = JSON.parse(content);
        
        // Metrics
        const pathWordCount = puzzle.words.path.length;
        const bonusWordCount = puzzle.words.additional.length;
        const pathTotalLen = puzzle.words.path.reduce((acc, w) => acc + w.wordId.length, 0); // tokens are better but wordId length is proxy

        
        totalPuzzles++;
        totalPathWords += pathWordCount;
        totalBonusWords += bonusWordCount;
        minPathLen = Math.min(minPathLen, pathTotalLen);
        maxPathLen = Math.max(maxPathLen, pathTotalLen);
        
        // Validation Checks
        const warnings: string[] = [];
        if (pathWordCount < 3) warnings.push("Low Path Count (<3)");
        if (bonusWordCount < 1) warnings.push("No Bonus Words");
        
        const status = warnings.length > 0 ? `⚠️ ${warnings.join(',')}` : "✅ OK";
        
        console.log(`  - [${topic.padEnd(20)}] Path: ${pathWordCount} words (${pathTotalLen} chars) | Bonus: ${bonusWordCount} | ${status}`);
        
      } catch (e) {
        console.error(`  ❌ Failed to load ${filename}: ${(e as Error).message}`);
      }
    }
  }

  console.log("\n📊 Summary Stats");
  console.log("----------------");
  console.log(`Total Puzzles: ${totalPuzzles}`);
  console.log(`Avg Path Words: ${(totalPathWords / totalPuzzles).toFixed(1)}`);
  console.log(`Avg Bonus Words: ${(totalBonusWords / totalPuzzles).toFixed(1)}`);
  console.log(`Path Length Range: ${minPathLen} - ${maxPathLen} chars`);
}

main().catch(console.error);
