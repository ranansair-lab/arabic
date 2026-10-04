import { LocalVowelEngine } from './localEngine';
import { RemotePronunciationEngine } from './remoteEngine';
import type { PronunciationService } from './types';

export * from './types';

let instance: PronunciationService | null = null;

/** Remote engine when VITE_PRONUNCIATION_ENDPOINT is set, otherwise on-device. */
export function getPronunciationService(): PronunciationService {
  if (!instance) {
    const endpoint = import.meta.env.VITE_PRONUNCIATION_ENDPOINT as string | undefined;
    instance = endpoint ? new RemotePronunciationEngine(endpoint) : new LocalVowelEngine();
  }
  return instance;
}

export function setPronunciationService(service: PronunciationService): void {
  instance = service;
}
