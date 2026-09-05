import { localDayString } from '@/domain/coach/calendar';
import { triageSignals } from '@/domain/coach/triage';
import { ApiError } from '@/api/client';
import type { CoachApplication } from '@/api/domains/coach';
import type { RosterRow } from '@/domain/coach/week-overview';
import { bindErrorKey, type RosterLoadState } from './roster/roster-state';
type Sources = { roster(now: Date, onCached: (rows: RosterRow[]) => void): Promise<RosterRow[]>; queue(): Promise<CoachApplication[]>; accept(id: string): Promise<void>; reject(id: string): Promise<void> };
type Snapshot = { rows: RosterRow[]; rosterState: RosterLoadState; applications: CoachApplication[]; queueState: RosterLoadState; refreshing: boolean; busy: boolean; acceptedStudentName: string | null; banner: ReturnType<typeof bindErrorKey> | null };
/** Shell-owned snapshot; mutations invalidate in-flight queue generations. No persisted queue cache. */
export class CoachDataModel {
  private snapshot: Snapshot = { rows: [], rosterState: 'idle', applications: [], queueState: 'idle', refreshing: false, busy: false, acceptedStudentName: null, banner: null };
  private listeners = new Set<() => void>();
  private queueGeneration = 0;
  private rosterTask: Promise<void> | null = null;
  constructor(private sources: Sources, private now: Date) { this.dayRevision = this.revision(now); }
  private dayRevision: string;
  private revision(now: Date) { return `${localDayString(now)}:${now.getTimezoneOffset()}`; }
  advanceClock = (now: Date) => {
    const changedDay = this.dayRevision !== this.revision(now);
    this.now = now;
    this.dayRevision = this.revision(now);
    this.update({ rows: this.snapshot.rows });
    if (changedDay) {
      const pending = this.rosterTask;
      if (pending) void pending.then(() => this.refreshRoster());
      else void this.refreshRoster();
    }
  };
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<Snapshot>) {
    const rows = (patch.rows ?? this.snapshot.rows).map(row => row.triageInput ? { ...row, triageSignals: triageSignals({ ...row.triageInput, now: this.now }) } : row);
    this.snapshot = { ...this.snapshot, ...patch, rows };
    this.listeners.forEach(listener => listener());
  }
  clearBanner = () => this.update({ banner: null });
  async loadIfNeeded() {
    await Promise.all([this.snapshot.rosterState === 'idle' || this.snapshot.rosterState === 'failed' ? this.refreshRoster() : undefined, this.snapshot.queueState === 'idle' ? this.refreshQueue() : undefined]);
  }
  refreshRoster = (): Promise<void> => {
    if (this.rosterTask) return this.rosterTask;
    this.update({ rosterState: 'loading' });
    this.rosterTask = this.sources.roster(this.now, rows => this.update({ rows, rosterState: 'loaded' })).then(rows => this.update({ rows, rosterState: 'loaded' }), () => this.update({ rows: [], rosterState: 'failed' })).finally(() => { this.rosterTask = null; });
    return this.rosterTask;
  };
  refreshQueue = async () => {
    const generation = ++this.queueGeneration;
    this.update({ queueState: 'loading' });
    try {
      const applications = await this.sources.queue();
      if (generation === this.queueGeneration) this.update({ applications, queueState: 'loaded' });
    } catch {
      if (generation === this.queueGeneration) this.update({ queueState: 'failed', banner: 'coach.bind.error.network' });
    }
  };
  refresh = async () => {
    this.update({ refreshing: true });
    await Promise.all([this.refreshRoster(), this.refreshQueue()]);
    this.update({ refreshing: false });
  };
  accept = (item: CoachApplication) => this.mutate(item, 'accept');
  reject = (item: CoachApplication) => this.mutate(item, 'reject');
  private async mutate(item: CoachApplication, action: 'accept' | 'reject'): Promise<boolean> {
    if (this.snapshot.busy) return false;
    this.update({ busy: true, banner: null });
    try {
      await this.sources[action](item.id);
      ++this.queueGeneration;
      this.update({ applications: this.snapshot.applications.filter(application => application.id !== item.id), queueState: 'loaded', ...(action === 'accept' ? { acceptedStudentName: item.displayName } : {}) });
      if (action === 'accept') {
        if (this.rosterTask) await this.rosterTask;
        await this.refreshRoster();
      }
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status && error.status >= 400 && error.status < 500) await this.refreshQueue();
      this.update({ banner: bindErrorKey(error) });
      return false;
    } finally { this.update({ busy: false }); }
  }
}
