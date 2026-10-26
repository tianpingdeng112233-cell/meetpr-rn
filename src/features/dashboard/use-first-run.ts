import { useCallback, useEffect, useState } from 'react';
import { useMineBindRequest } from '@/api/domains/bind';
import { firstRunStorage } from '@/features/onboarding/first-run-storage';

export function useFirstRun(studentId: string) {
  const binding = useMineBindRequest();
  const request = binding.data?.bind_request?.student_id === studentId ? binding.data.bind_request : null;
  const [dismissed, setDismissed] = useState<{ key: string; value: boolean } | null>(null);
  const bindingId = request?.id;
  const key = `${studentId}.${bindingId}`;
  useEffect(() => {
    let active = true;
    if (bindingId) void firstRunStorage.read(studentId, bindingId, 'firstPlanDismissed')
      .then(value => { if (active) setDismissed({ key, value }); })
      .catch(() => { /* Unknown storage state must not show a previously dismissed card. */ });
    return () => { active = false; };
  }, [studentId, bindingId, key]);
  const refetchBinding = binding.refetch;
  const reload = useCallback(async () => { await refetchBinding(); }, [refetchBinding]);
  return {
    request,
    firstPlanDismissed: dismissed?.key === key ? dismissed.value : null,
    dismiss: async () => {
      if (!bindingId) return;
      await firstRunStorage.mark(studentId, bindingId, 'firstPlanDismissed');
      setDismissed({ key, value: true });
    },
    reload,
  };
}
