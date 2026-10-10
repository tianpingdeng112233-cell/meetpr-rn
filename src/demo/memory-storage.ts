/** Lives only in this JS runtime; a cold launch starts with an empty map. */
const values = new Map<string, string>();
export const memoryStorage = {
  async getItem(key: string): Promise<string | null> { return values.get(key) ?? null; },
  async setItem(key: string, value: string): Promise<void> { values.set(key, value); },
};
