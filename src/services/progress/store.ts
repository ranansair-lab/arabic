import type { PronunciationAttempt } from '../../curriculum/types';
import { MAX_STORED_ATTEMPTS, emptyProgress, type ProgressState } from './model';
import type { ProgressRepository } from './repository';

type Listener = () => void;

/** Single source of truth for the child's progress. UI subscribes via useProgress(). */
export class ProgressStore {
  private state: ProgressState;
  private listeners = new Set<Listener>();

  constructor(private readonly repo: ProgressRepository, private readonly now: () => Date = () => new Date()) {
    this.state = repo.load();
  }

  getState = (): ProgressState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private update(mutator: (draft: ProgressState) => void): void {
    const draft = structuredClone(this.state);
    mutator(draft);
    draft.updatedAt = this.now().toISOString();
    this.state = draft;
    this.repo.save(draft);
    this.listeners.forEach((l) => l());
  }

  completeForm(formId: string): void {
    this.update((s) => {
      if (!s.completedForms[formId]) s.completedForms[formId] = this.now().toISOString();
    });
  }

  recordDiscrimination(correct: boolean): void {
    this.update((s) => {
      s.discrimination.attempts += 1;
      if (correct) s.discrimination.correct += 1;
    });
  }

  recordPronunciation(attempt: PronunciationAttempt): void {
    this.update((s) => {
      // Service outages are logged but do not count as a child's attempt.
      if (attempt.outcome !== 'unavailable') {
        s.pronunciation.attempts += 1;
        if (attempt.outcome === 'correct') s.pronunciation.correct += 1;
      }
      s.attempts.push(attempt);
      if (s.attempts.length > MAX_STORED_ATTEMPTS) s.attempts.splice(0, s.attempts.length - MAX_STORED_ATTEMPTS);
    });
  }

  recordWordBuilt(wordId: string): void {
    this.update((s) => {
      s.wordsBuilt[wordId] = (s.wordsBuilt[wordId] ?? 0) + 1;
    });
  }

  recordWordAnalysed(wordId: string): void {
    this.update((s) => {
      s.wordsAnalysed[wordId] = (s.wordsAnalysed[wordId] ?? 0) + 1;
    });
  }

  completeStory(letterId: string): void {
    this.update((s) => {
      s.storiesCompleted[letterId] ??= this.now().toISOString();
    });
  }

  completeSentence(sentenceId: string): void {
    this.update((s) => {
      s.sentencesRead[sentenceId] ??= this.now().toISOString();
    });
  }

  completeMiniStory(id: string): void {
    this.update((s) => {
      s.miniStoriesRead[id] ??= this.now().toISOString();
    });
  }

  reset(): void {
    const fresh = emptyProgress(this.state.profileId);
    this.state = fresh;
    this.repo.save(fresh);
    this.listeners.forEach((l) => l());
  }
}
