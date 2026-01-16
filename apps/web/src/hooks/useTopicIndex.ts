/// <reference types="vite/client" />
import { useState, useEffect } from 'react';
import type { TopicMasterIndex, TopicCatalog } from '../types/content';

/**
 * Hook to load topic master index
 */
export function useTopicIndex() {
  const [index, setIndex] = useState<TopicMasterIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadIndex = async () => {
      try {
        setLoading(true);
        const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');
        const response = await fetch(`${baseUrl}/topics/index.json?v=${Date.now()}`);
        if (!response.ok) {
          throw new Error(`Failed to load topic index: ${response.statusText}`);
        }
        const data: TopicMasterIndex = await response.json();
        setIndex(data);
        setError(null);
      } catch (err) {
        console.error('Error loading topic index:', err);
        setError(err instanceof Error ? err.message : 'Failed to load topics');
      } finally {
        setLoading(false);
      }
    };

    loadIndex();
  }, []);

  return { index, loading, error };
}

/**
 * Hook to load a specific topic's puzzle catalog
 */
export function useTopicCatalog(topicId: string | null) {
  const [catalog, setCatalog] = useState<TopicCatalog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!topicId) {
      setCatalog(null);
      return;
    }

    const loadCatalog = async () => {
      try {
        setLoading(true);
        const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');
        const response = await fetch(`${baseUrl}/topics/${topicId}/index.json?v=${Date.now()}`);
        if (!response.ok) {
          throw new Error(`Failed to load topic catalog: ${response.statusText}`);
        }
        const data: TopicCatalog = await response.json();
        setCatalog(data);
        setError(null);
      } catch (err) {
        console.error(`Error loading topic catalog for ${topicId}:`, err);
        setError(err instanceof Error ? err.message : 'Failed to load catalog');
      } finally {
        setLoading(false);
      }
    };

    loadCatalog();
  }, [topicId]);

  return { catalog, loading, error };
}
