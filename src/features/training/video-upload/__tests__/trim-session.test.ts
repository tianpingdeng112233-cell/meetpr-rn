import { expect, jest, test } from '@jest/globals';
import { TrimSession } from '../trim-session';

test('save wins once and keeps only the delivered export', () => {
  const remove = jest.fn();
  const onOutcome = jest.fn();
  const session = new TrimSession({ remove, cancelExport: jest.fn(), onOutcome });
  session.own('working.mp4');
  session.own('thumb.jpg');
  session.saved({ uri: 'export.mp4', durationMs: 4000 });
  session.cancelled();
  session.failed();
  expect(onOutcome.mock.calls).toEqual([[{ type: 'saved', video: { uri: 'export.mp4', durationMs: 4000 } }]]);
  expect(remove.mock.calls).toEqual([['working.mp4'], ['thumb.jpg']]);
});

test('unmount cancels export once and a late export never invokes save', () => {
  const remove = jest.fn();
  const cancelExport = jest.fn();
  const onOutcome = jest.fn();
  const session = new TrimSession({ remove, cancelExport, onOutcome });
  session.own('working.mp4');
  session.dispose();
  session.dispose();
  session.saved({ uri: 'late.mp4', durationMs: 4000 });
  expect(cancelExport).toHaveBeenCalledTimes(1);
  expect(remove.mock.calls).toEqual([['working.mp4'], ['late.mp4']]);
  expect(onOutcome).not.toHaveBeenCalled();
});

test.each(['cancelled', 'failed'] as const)('%s clears temporary files including late thumbnails and exports', outcome => {
  const remove = jest.fn();
  const onOutcome = jest.fn();
  const session = new TrimSession({ remove, cancelExport: jest.fn(), onOutcome });
  session.own('working.mp4');
  session.own('abandoned.mp4');
  session[outcome]();
  session.own('late.jpg');
  session.saved({ uri: 'late.mp4', durationMs: 4000 });
  expect(remove.mock.calls).toEqual([['working.mp4'], ['abandoned.mp4'], ['late.jpg'], ['late.mp4']]);
  expect(onOutcome.mock.calls).toEqual([[{ type: outcome }]]);
});

test('failure during export cancels native work even when unmount follows immediately', () => {
  const cancelExport = jest.fn();
  const onOutcome = jest.fn();
  const session = new TrimSession({ remove: jest.fn(), cancelExport, onOutcome });
  session.failed();
  session.dispose();
  expect(cancelExport).toHaveBeenCalledTimes(1);
  expect(onOutcome.mock.calls).toEqual([[{ type: 'failed' }]]);
});
