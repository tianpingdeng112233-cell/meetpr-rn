import { test, expect, jest } from '@jest/globals';
import {
  localRetentionRemovals,
  selectPlaybackSource,
  removedVideoUris,
} from '../local-retention';
const now = new Date(2026, 8, 5, 0, 30).getTime();
const today = new Date(2026, 8, 5, 0, 1).getTime();
const yesterday = new Date(2026, 8, 4, 23, 59).getTime();
test('keeps today by device calendar day and clears prior uploaded files only', () => {
  expect(
    localRetentionRemovals(
      [
        { key: 'today', createdAt: today, sizeBytes: 10, uploaded: true },
        {
          key: 'yesterday',
          createdAt: yesterday,
          sizeBytes: 10,
          uploaded: true,
        },
        {
          key: 'pending',
          createdAt: yesterday,
          sizeBytes: 10,
          uploaded: false,
        },
      ],
      now,
    ),
  ).toEqual(['yesterday']);
});
test('over 500 MiB evicts oldest first, including pending files', () => {
  expect(
    localRetentionRemovals(
      [
        {
          key: 'new',
          createdAt: today + 1,
          sizeBytes: 300 * 1024 * 1024,
          uploaded: true,
        },
        {
          key: 'old',
          createdAt: today,
          sizeBytes: 250 * 1024 * 1024,
          uploaded: false,
        },
      ],
      now,
    ),
  ).toEqual(['old']);
});
test('delete and replace reclaim both original and prepared file without duplicate deletion', () => {
  expect(
    removedVideoUris({
      localUri: 'file:///out',
      source: { uri: 'file:///in' },
    }),
  ).toEqual(['file:///out', 'file:///in']);
  expect(
    removedVideoUris({ localUri: 'file:///in', source: { uri: 'file:///in' } }),
  ).toEqual(['file:///in']);
});
test('playback chooses existing local file, otherwise fetches a fresh remote URL', async () => {
  const remote = jest.fn(async () => 'https://signed/new');
  await expect(
    selectPlaybackSource('file:///video', () => true, remote),
  ).resolves.toBe('file:///video');
  expect(remote).not.toHaveBeenCalled();
  await expect(
    selectPlaybackSource('file:///video', () => false, remote),
  ).resolves.toBe('https://signed/new');
  await selectPlaybackSource(null, () => false, remote);
  expect(remote).toHaveBeenCalledTimes(2);
});
