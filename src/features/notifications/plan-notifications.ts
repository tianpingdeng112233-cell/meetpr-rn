import { z } from 'zod';

const payload = z.object({
  kind: z.enum(['plan_shifted', 'plan_shift_undone', 'plan_updated', 'plan_published']),
  student_id: z.string().uuid(),
  plan_id: z.string().uuid(),
});
type Response = { id: string; data: unknown };
export type PlanNotificationTransport = {
  onReceive(listener: (data: unknown) => void): () => void;
  onResponse(listener: (id: string, data: unknown) => void): () => void;
  lastResponse(): Promise<Response | null>;
  clearResponse(): Promise<void>;
};
/** Consumer only: FCM provisioning/token registration stays in the distribution gate. */
export function startPlanNotifications({ studentId, currentStudent, refresh, openTraining, transport }: {
  studentId: string; currentStudent: () => string | null;
  refresh: (planId: string) => void; openTraining: () => void;
  transport: PlanNotificationTransport;
}) {
  let active = true;
  const handled = new Set<string>();
  const read = (data: unknown) => {
    if (!active || currentStudent() !== studentId) return null;
    const parsed = payload.safeParse(data);
    return parsed.success && parsed.data.student_id.toLowerCase() === studentId.toLowerCase() ? parsed.data : null;
  };
  const receive = (data: unknown) => { const value = read(data); if (value) refresh(value.plan_id); };
  const respond = (id: string, data: unknown) => {
    const value = read(data);
    if (!value || handled.has(id)) return;
    handled.add(id);
    refresh(value.plan_id);
    openTraining();
    void transport.clearResponse().catch(() => undefined);
  };
  const removeReceive = transport.onReceive(receive);
  const removeResponse = transport.onResponse(respond);
  void transport.lastResponse().then(response => { if (response) respond(response.id, response.data); }).catch(() => undefined);
  return () => { active = false; removeReceive(); removeResponse(); };
}
