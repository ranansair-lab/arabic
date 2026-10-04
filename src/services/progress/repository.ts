import { normaliseProgress, type ProgressState } from './model';

/**
 * Storage boundary. The prototype uses localStorage; a cloud implementation
 * (authenticated profile + sync) only needs to implement this interface.
 * See docs/ARCHITECTURE.md → "Cloud sync".
 */
export interface ProgressRepository {
  load(): ProgressState;
  save(state: ProgressState): void;
}

export const STORAGE_KEY = 'arabic-reading:progress:v1';

export class LocalStorageRepository implements ProgressRepository {
  constructor(private readonly key = STORAGE_KEY) {}

  load(): ProgressState {
    try {
      const raw = globalThis.localStorage?.getItem(this.key);
      return normaliseProgress(raw ? JSON.parse(raw) : null);
    } catch {
      return normaliseProgress(null);
    }
  }

  save(state: ProgressState): void {
    try {
      globalThis.localStorage?.setItem(this.key, JSON.stringify(state));
    } catch {
      // Storage full or blocked (private mode). Progress stays in memory for
      // this session; the UI keeps working.
    }
  }
}

export class MemoryRepository implements ProgressRepository {
  private state: ProgressState | null = null;
  load(): ProgressState {
    return normaliseProgress(this.state ? structuredClone(this.state) : null);
  }
  save(state: ProgressState): void {
    this.state = structuredClone(state);
  }
}
