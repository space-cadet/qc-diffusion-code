/**
 * TimeSeriesStore Interface
 * Unified data recording and replay for simulation states
 */

export interface TimeSeriesStore<T> {
  // Recording
  record(state: T, timestamp: number): void;
  clear(): void;

  // Replay
  seek(step: number): T | null;
  getRange(start: number, end: number): T[];

  // Export
  toArray(): { timestamp: number; state: T }[];
  toCSV(columns: string[]): string;

  // Diagnostics
  size(): number;
}
