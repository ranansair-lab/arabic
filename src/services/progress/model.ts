import type { PronunciationAttempt } from '../../curriculum/types';

export const PROGRESS_VERSION = 1;
export const MAX_STORED_ATTEMPTS = 300;

export interface Counter {
  attempts: number;
  correct: number;
}

export interface ProgressState {
  version: typeof PROGRESS_VERSION;
  profileId: string;
  /** Vowelled form id (e.g. "meem_a", "meem_aa") → ISO date completed. */
  completedForms: Record<string, string>;
  discrimination: Counter;
  pronunciation: Counter;
  /** Most recent pronunciation attempts (capped). */
  attempts: PronunciationAttempt[];
  /** Word id → times built correctly. */
  wordsBuilt: Record<string, number>;
  /** Word id → times analysed correctly. */
  wordsAnalysed: Record<string, number>;
  /** Letter id → ISO date story question answered correctly. */
  storiesCompleted: Record<string, string>;
  /** Sentence id → ISO date read with correct comprehension answer. */
  sentencesRead: Record<string, string>;
  miniStoriesRead: Record<string, string>;
  updatedAt: string;
}

export function emptyProgress(profileId = 'default'): ProgressState {
  return {
    version: PROGRESS_VERSION,
    profileId,
    completedForms: {},
    discrimination: { attempts: 0, correct: 0 },
    pronunciation: { attempts: 0, correct: 0 },
    attempts: [],
    wordsBuilt: {},
    wordsAnalysed: {},
    storiesCompleted: {},
    sentencesRead: {},
    miniStoriesRead: {},
    updatedAt: new Date(0).toISOString(),
  };
}

/** Accepts unknown stored data and returns a valid state (never throws). */
export function normaliseProgress(raw: unknown, profileId = 'default'): ProgressState {
  const base = emptyProgress(profileId);
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<ProgressState>;
  const rec = <T,>(v: unknown, fallback: Record<string, T>): Record<string, T> =>
    v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, T>) : fallback;
  const counter = (v: unknown): Counter =>
    v && typeof v === 'object' && typeof (v as Counter).attempts === 'number' && typeof (v as Counter).correct === 'number'
      ? (v as Counter)
      : { attempts: 0, correct: 0 };
  return {
    ...base,
    profileId: typeof r.profileId === 'string' ? r.profileId : profileId,
    completedForms: rec(r.completedForms, {}),
    discrimination: counter(r.discrimination),
    pronunciation: counter(r.pronunciation),
    attempts: Array.isArray(r.attempts) ? r.attempts.slice(-MAX_STORED_ATTEMPTS) : [],
    wordsBuilt: rec(r.wordsBuilt, {}),
    wordsAnalysed: rec(r.wordsAnalysed, {}),
    storiesCompleted: rec(r.storiesCompleted, {}),
    sentencesRead: rec(r.sentencesRead, {}),
    miniStoriesRead: rec(r.miniStoriesRead, {}),
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : base.updatedAt,
  };
}
