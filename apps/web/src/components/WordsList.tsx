import React from 'react';
import type { WaywordsPuzzle } from '@circuitraces/engine';
import './WordsList.css';

interface WordsListProps {
  puzzle: WaywordsPuzzle;
  foundPathWords: Record<string, true>;
  foundAdditionalWords: Record<string, true>;
  onClose: () => void;
}

export function WordsList({ puzzle, foundPathWords, foundAdditionalWords, onClose }: WordsListProps) {
  const pathWords = puzzle.words.path;
  const additionalWords = puzzle.words.additional || [];

  const renderWord = (wordId: string, isFound: boolean) => {
    if (isFound) {
      return (
        <div key={wordId} className="word-item found">
          <span className="word-check">✓</span>
          <span className="word-text">{wordId}</span>
        </div>
      );
    } else {
      // Show size placeholder for unfound words
      const placeholders = '_ '.repeat(wordId.length).trim();
      return (
        <div key={wordId} className="word-item unfound">
          <span className="word-check"></span>
          <span className="word-placeholder">{placeholders}</span>
          <span className="word-size">({wordId.length} letters)</span>
        </div>
      );
    }
  };

  return (
    <div className="words-overlay" onClick={onClose}>
      <div className="words-modal" data-testid="words-modal" onClick={(e) => e.stopPropagation()}>
        <div className="words-header">
          <h2>Words</h2>
          <button className="words-close" data-testid="words-close" onClick={onClose}>×</button>
        </div>

        <div className="words-section">
          <h3 className="section-title">Theme Words</h3>
          <div className="words-list">
            {pathWords.map(word => renderWord(word.wordId, !!foundPathWords[word.wordId]))}
          </div>
        </div>

        {additionalWords.length > 0 && (
          <div className="words-section">
            <h3 className="section-title">Bonus Words</h3>
            <div className="words-list">
              {additionalWords.map(word => renderWord(word.wordId, !!foundAdditionalWords[word.wordId]))}
            </div>
          </div>
        )}

        <div className="words-footer">
          <div className="progress-stat">
            Path: {Object.keys(foundPathWords).length}/{pathWords.length}
          </div>
          {additionalWords.length > 0 && (
            <div className="progress-stat">
              Bonus: {Object.keys(foundAdditionalWords).length}/{additionalWords.length}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
