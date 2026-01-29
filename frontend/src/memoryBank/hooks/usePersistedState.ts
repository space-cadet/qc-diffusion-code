/**
 * Simple persisted state hook using localStorage
 * Replaces the usePersistedState hook from arxivite
 */

import { useState, useEffect } from 'react';

export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => void] {
  // Get initial value from localStorage or use default
  const [state, setState] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  // Update localStorage when state changes
  const setPersistedState = (value: T) => {
    try {
      setState(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [state, setPersistedState];
}