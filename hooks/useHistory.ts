
import { useState, useCallback } from 'react';

export function useHistory<T>(initialState: T) {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const saveSnapshot = useCallback((newState: T) => {
    setHistory(prev => {
      const currentHistory = prev.slice(0, historyIndex + 1);
      // Simple deep compare to avoid duplicate states
      if (currentHistory.length > 0 && JSON.stringify(currentHistory[currentHistory.length - 1]) === JSON.stringify(newState)) {
        return currentHistory;
      }
      return [...currentHistory, newState];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const undo = useCallback((): T | null => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      return history[prevIndex];
    }
    return null;
  }, [historyIndex, history]);

  // Future-proof: Redo logic ready if needed
  const redo = useCallback((): T | null => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      return history[nextIndex];
    }
    return null;
  }, [historyIndex, history]);

  return {
    saveSnapshot,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1
  };
}
