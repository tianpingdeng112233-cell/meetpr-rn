import type { E1RMIdFactory } from './types';

let fallbackSequence = 0;

export const createE1RMId: E1RMIdFactory = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  fallbackSequence += 1;
  return `e1rm-${Date.now().toString(36)}-${fallbackSequence.toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}`;
};
