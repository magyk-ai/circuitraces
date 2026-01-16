import { useTopicIndex } from '../hooks/useTopicIndex';
import type { DailyPuzzleEntry } from '../types/content';
import './HomeScreen.css';

interface HomeScreenProps {
  todaysPuzzle: DailyPuzzleEntry | null;
  onPlayDaily: () => void;
  onSelectTopic: (topicId: string) => void;
}

export function HomeScreen({ todaysPuzzle, onPlayDaily, onSelectTopic }: HomeScreenProps) {
  const { index: topicIndex, loading, error } = useTopicIndex();

  if (loading) {
    return <div className="home-screen loading">Loading...</div>;
  }

  if (error) {
    return <div className="home-screen error">Error: {error}</div>;
  }

  return (
    <div className="home-screen">
      <header className="home-header">
        <h1>Circuit Races</h1>
        <p className="tagline">Daily word puzzles for professional topics</p>
      </header>

      {todaysPuzzle && (
        <section className="daily-card">
          <div className="daily-header">
            <span className="daily-label">Today's Puzzle</span>
            <span className="daily-date">{todaysPuzzle.date}</span>
          </div>
          <h2 className="daily-title">{todaysPuzzle.title}</h2>
          <div className="daily-meta">
            <span className="difficulty">{todaysPuzzle.difficulty}</span>
            <span className="grid-size">{todaysPuzzle.grid.width}×{todaysPuzzle.grid.height}</span>
            <span className="time-estimate">{todaysPuzzle.estimatedMinutes} min</span>
          </div>
          <button className="play-button" onClick={onPlayDaily}>
            Play Today's Puzzle →
          </button>
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
