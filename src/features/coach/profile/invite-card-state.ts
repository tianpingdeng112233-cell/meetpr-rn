import type { CreateInviteCodeRequest, InviteCode, InviteCodesRepository } from '@/api/domains/invite-codes';
import { inviteCodeStatus, isDefunct } from '@/domain/coach/invite-code-status';
import { inviteClipboard, type InviteClipboard } from './clipboard';

export type InviteCodesSnapshot = {
  state: 'idle' | 'loading' | 'loaded' | 'failed';
  codes: readonly InviteCode[];
  refreshing: boolean;
  copiedCodeID: string | null;
  copyRevision: number;
  actionError: boolean;
  mutating: boolean;
};

export function inviteCardState(snapshot: InviteCodesSnapshot) {
  const code = snapshot.codes.find(item => item.type === 'personal_permanent' && item.revoked_at == null);
  const subtitle = snapshot.state === 'failed' ? 'coach.profile.inviteFailed'
    : snapshot.state === 'loaded' ? 'coach.profile.inviteEmpty' : 'coach.profile.inviteLoading';
  return { code, subtitle } as const;
}

/** Screen-scoped, no persistent cache. A failed refresh retains the last good list. */
export class InviteCodesModel {
  private snapshot: InviteCodesSnapshot = { state: 'idle', codes: [], refreshing: false, copiedCodeID: null, copyRevision: 0, actionError: false, mutating: false };
  private listeners = new Set<() => void>();
  private generation = 0;

  constructor(private readonly repository: InviteCodesRepository, private readonly clipboard: InviteClipboard = inviteClipboard) {}

  createCode = (input: CreateInviteCodeRequest) => {
    const label = input.label?.trim().slice(0, 100);
    return this.mutate(() => this.repository.createCode({ ...input, label: label || undefined }));
  };
  revokeCode = (id: string) => this.mutate(() => this.repository.revokeCode(id));
  private async mutate(operation: () => Promise<unknown>): Promise<boolean> {
    if (this.snapshot.mutating) return false;
    ++this.generation; // Discard any pre-mutation GET still in flight.
    this.update({ mutating: true, actionError: false, copiedCodeID: null, refreshing: false });
    let succeeded = false;
    try {
      await operation();
      succeeded = true;
    } catch {
      this.update({ actionError: true });
    } finally {
      // Even a lost mutation response may have changed server state.
      await this.performReload();
      this.update({ mutating: false });
    }
    return succeeded;
  }

  clearCopied = () => { this.update({ copiedCodeID: null }); };
  copyCode = async (id: string, now: number) => {
    const code = this.snapshot.codes.find(item => item.id === id);
    if (!code || isDefunct(inviteCodeStatus(code, now))) return;
    this.update({ copiedCodeID: null, actionError: false });
    try {
      await this.clipboard.setString(code.code);
      this.update({ copiedCodeID: id, copyRevision: this.snapshot.copyRevision + 1 });
    } catch {
      this.update({ actionError: true });
    }
  };

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private update(patch: Partial<InviteCodesSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach(listener => listener());
  }
  reload = async (): Promise<void> => {
    if (!this.snapshot.mutating) await this.performReload();
  };
  private performReload = async (): Promise<void> => {
    const generation = ++this.generation;
    this.update({ refreshing: true, state: this.snapshot.state === 'loaded' ? 'loaded' : 'loading' });
    try {
      const codes = await this.repository.listCodes();
      if (generation === this.generation) this.update({ state: 'loaded', codes, refreshing: false });
    } catch {
      if (generation === this.generation) this.update({ state: this.snapshot.state === 'loaded' ? 'loaded' : 'failed', refreshing: false });
    }
  };
}
