import AsyncStorage from '@react-native-async-storage/async-storage';
import { isDemoMode } from './mode';

function storage(): Pick<typeof AsyncStorage, 'getItem' | 'setItem'> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return isDemoMode() ? (require('./memory-storage') as typeof import('./memory-storage')).memoryStorage : AsyncStorage;
}
export default {
  getItem: (key: string) => storage().getItem(key),
  setItem: (key: string, value: string) => storage().setItem(key, value),
};
