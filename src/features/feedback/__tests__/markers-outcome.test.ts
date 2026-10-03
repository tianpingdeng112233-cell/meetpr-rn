import { expect, test } from '@jest/globals';
import { z } from 'zod';
import { ApiError } from '@/api/client';
import { applyMarkersOutcome, markerLoadError, markerPanelVisible } from '../markers-outcome';
test('optional markers hide on 404, transport failure or cancellation; all other errors show failed', () => {
  expect(markerLoadError(new ApiError('backend', '', { status: 404 }))).toEqual({ kind: 'hidden' });
  expect(markerLoadError(new ApiError('network', ''))).toEqual({ kind: 'hidden' });
  expect(markerLoadError(Object.assign(new Error(), { name: 'AbortError' }))).toEqual({ kind: 'hidden' });
  expect(markerLoadError(new ApiError('server', '', { status: 503 }))).toEqual({ kind: 'failed' });
  expect(markerLoadError(new ApiError('network', '', { status: 403 }))).toEqual({ kind: 'failed' });
  expect(markerLoadError(new Error('decode failed'))).toEqual({ kind: 'failed' });
});
test('panel visibility follows the full null/empty/failed/nonempty truth table', () => {
  const marker = { id: 'm', timeMs: 1000, note: '' };
  expect([markerPanelVisible(null, false), markerPanelVisible([], false), markerPanelVisible(null, true), markerPanelVisible([], true), markerPanelVisible([marker], false)]).toEqual([false, false, true, true, true]);
});
test('marker responses cannot fill a different or closed player', () => {
  const item = { id: 'b', url: 'https://video', markers: null, markersFailed: false };
  const outcome = { kind: 'loaded' as const, markers: [{ id: 'm', timeMs: 1000, note: '' }] };
  expect(applyMarkersOutcome(item, 'a', outcome)).toBe(item);
  expect(applyMarkersOutcome(null, 'a', outcome)).toBeNull();
  expect(applyMarkersOutcome(item, 'b', outcome)?.markers).toEqual(outcome.markers);
  expect(applyMarkersOutcome(item, 'b', { kind: 'failed' })).toMatchObject({ markers: null, markersFailed: true });
});

test('response-body transport failures hide, while malformed DTOs and HTTP errors remain failed', () => {
  expect(markerLoadError(new ApiError('network', 'Could not read the server response', { status: 200, cause: new Error('Connection lost') }))).toEqual({ kind: 'hidden' });
  const malformed = z.string().safeParse(12);
  expect(markerLoadError(new ApiError('network', 'DTO mismatch', { status: 200, cause: malformed.error }))).toEqual({ kind: 'failed' });
});
