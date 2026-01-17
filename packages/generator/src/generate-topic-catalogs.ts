import fs from 'fs/promises';
import path from 'path';

type DailySchedule = {
  contentVersion: string;
  schedule: Array<{
    date: string;
    puzzles: Record<string, {
      id: string;
      title: string;
      difficulty: 'easy' | 'medium' | 'hard';
      grid: { width: number; height: number };
      estimatedMinutes: number;
      puzzlePath: string;
      tags: string[];
    }>;
  }>;
};

type TopicMasterIndex = {
  topics: Array<{
    topicId: string;
    title: string;
    description: string;
    icon?: string;
  }>;
};

type TopicPuzzleEntry = {
  id: string;
  revision: number;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  grid: { width: number; height: number };
  estimatedMinutes: number;
  tags: string[];
  puzzlePath: string;
  createdAt: string;
};

type TopicCatalog = {
  version: number;
  contentVersion: string;
  topicId: string;
  title: string;
  description: string;
  icon?: string;
  puzzles: TopicPuzzleEntry[];
};

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const rootDir = path.resolve(__dirname, '../../..');
  const dailyPath = path.join(rootDir, 'apps/web/public/daily/index.json');
  const topicsPath = path.join(rootDir, 'apps/web/public/topics/index.json');

  const dailyRaw = await fs.readFile(dailyPath, 'utf-8');
  const topicsRaw = await fs.readFile(topicsPath, 'utf-8');

  const dailyIndex = JSON.parse(dailyRaw) as DailySchedule;
  const topicsIndex = JSON.parse(topicsRaw) as TopicMasterIndex;

  for (const topic of topicsIndex.topics) {
    const puzzles: TopicPuzzleEntry[] = [];

    for (const entry of dailyIndex.schedule) {
      const meta = entry.puzzles[topic.topicId];
      if (!meta) continue;

      puzzles.push({
        id: meta.id,
        revision: 1,
        title: meta.title,
        difficulty: meta.difficulty,
        grid: meta.grid,
        estimatedMinutes: meta.estimatedMinutes,
        tags: meta.tags,
        puzzlePath: meta.puzzlePath,
        createdAt: entry.date
      });
    }

    const catalog: TopicCatalog = {
      version: 1,
      contentVersion: dailyIndex.contentVersion,
      topicId: topic.topicId,
      title: topic.title,
      description: topic.description,
      icon: topic.icon,
      puzzles
    };

    const outDir = path.join(rootDir, 'apps/web/public/topics', topic.topicId);
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(path.join(outDir, 'index.json'), JSON.stringify(catalog, null, 2));
  }

  console.log('✅ Topic catalogs generated.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
