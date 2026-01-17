import { useTopicIndex } from '../hooks/useTopicIndex';
import type { DailyPuzzleEntry } from '../types/content';
import './HomeScreen.css';

interface HomeScreenProps {
  todaysEntry: DailyPuzzleEntry | null;
  onPlayDaily: (topicId: string) => void;
  onSelectTopic: (topicId: string) => void;
}

export function HomeScreen({ todaysEntry, onPlayDaily, onSelectTopic }: HomeScreenProps) {
  const { index: topicIndex, loading, error } = useTopicIndex();

  if (loading) {
    return <div className="home-screen loading">Loading...</div>;
  }

  if (error) {
    return <div className="home-screen error">Error: {error}</div>;
  }

  const dailyTopics = todaysEntry ? Object.keys(todaysEntry.puzzles) : [];

  return (
    <div className="home-screen">
      <header className="home-header">
        <h1>Circuit Races</h1>
        <p className="tagline">Daily word puzzles for professional topics</p>
      </header>

      {todaysEntry && (
        <section className="daily-section">
          <div className="section-header">
            <h2>Today's Puzzles</h2>
            <span className="date-badge">{todaysEntry.date}</span>
          </div>
          
          <div className="daily-grid">
            {dailyTopics.map(topicId => {
              const puzzle = todaysEntry.puzzles[topicId];
              // Try to find topic metadata for icon, fallback to puzzle title
              const topicMeta = topicIndex?.topics.find(t => t.topicId === topicId);
              
              return (
                <button 
                  key={topicId} 
                  className="daily-card" 
                  onClick={() => onPlayDaily(topicId)}
                >
                  <div className="card-header">
                    <span className="topic-icon">{topicMeta?.icon || '🧩'}</span>
                    <span className="difficulty-badge {puzzle.difficulty}">{puzzle.difficulty}</span>
                  </div>
                  <h3>{topicMeta?.title || puzzle.title}</h3>
                  <div className="card-meta">
                    <span>{puzzle.grid.width}×{puzzle.grid.height}</span>
                    <span>~{puzzle.estimatedMinutes}m</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="topics-section">
        <h2>Browse by Topic</h2>
        <div className="topics-grid">
          {topicIndex?.topics.map(topic => (
            <button
              key={topic.topicId}
              className="topic-tile"
              onClick={() => onSelectTopic(topic.topicId)}
            >
              <div className="topic-icon">{topic.icon}</div>
              <h3>{topic.title}</h3>
              <p>{topic.description}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
