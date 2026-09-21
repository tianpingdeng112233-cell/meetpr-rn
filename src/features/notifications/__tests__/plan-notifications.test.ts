import { expect, jest, test } from '@jest/globals';
import { startPlanNotifications } from '../plan-notifications';
const student = '10000000-0000-4000-8000-000000000000';
const plan = '20000000-0000-4000-8000-000000000000';
function setup() {
  let received: (data: unknown) => void = () => {};
  let tapped: (id: string, data: unknown) => void = () => {};
  let session = student;
  let resolveLast!: (value: { id: string; data: unknown } | null) => void;
  const remove = jest.fn(); const refresh = jest.fn(); const openTraining = jest.fn();
  const stop = startPlanNotifications({ studentId: student, currentStudent: () => session, refresh, openTraining,
    transport: { onReceive: listener => { received = listener; return remove; }, onResponse: listener => { tapped = listener; return remove; }, lastResponse: () => new Promise(resolve => { resolveLast = resolve; }), clearResponse: async () => {} } });
  return { received, tapped, refresh, openTraining, stop, remove, resolveLast, changeAccount: () => { session = 'other'; } };
}
const data = (kind: string) => ({ kind, student_id: student, plan_id: plan });
test.each(['plan_shifted', 'plan_shift_undone', 'plan_updated', 'plan_published'])('%s refreshes on arrival and opens training only on tap', kind => {
  const s = setup(); s.received(data(kind)); expect(s.refresh).toHaveBeenCalledWith(plan); expect(s.openTraining).not.toHaveBeenCalled();
  s.tapped('request', data(kind)); expect(s.openTraining).toHaveBeenCalledTimes(1);
  s.tapped('request', data(kind)); expect(s.openTraining).toHaveBeenCalledTimes(1); s.stop();
});
test('cold-start response drains once and ignores payloads belonging to another student or kind', async () => {
  const s = setup(); s.received({ ...data('plan_shifted'), student_id: 'other' }); s.received(data('chat')); s.received({ ...data('plan_shifted'), plan_id: 'bad' });
  expect(s.refresh).not.toHaveBeenCalled();
  s.tapped('cold', data('plan_shifted')); s.resolveLast({ id: 'cold', data: data('plan_shifted') }); await Promise.resolve();
  expect(s.openTraining).toHaveBeenCalledTimes(1); s.stop();
});
test('logout and disposal cannot route delayed responses into a different session', async () => {
  const s = setup(); s.changeAccount(); s.tapped('old', data('plan_shifted')); expect(s.refresh).not.toHaveBeenCalled();
  s.stop(); s.resolveLast({ id: 'cold', data: data('plan_shifted') }); await Promise.resolve();
  s.received(data('plan_shifted')); expect(s.openTraining).not.toHaveBeenCalled(); expect(s.remove).toHaveBeenCalledTimes(2);
});
