import { useQuery, useQueryClient } from '@tanstack/react-query';
import { coachRepository } from '@/api/domains/coach';
import { exercisesRepository, exerciseKeys } from '@/api/domains/exercises';
import { plansRepository } from '@/api/domains/plans';
import { setsRepository } from '@/api/domains/sets';
import { feedbackRepository } from '@/api/domains/feedback';
import { readinessRepository } from '@/api/domains/readiness';
import { onboardingRepository } from '@/api/domains/onboarding';
import { videosRepository } from '@/api/domains/videos';
import { selectCurrentPlan } from '@/domain/plan/sequence';
import { addDays, localDay, weekStart, makeExecutionDays, makeOverview } from '@/domain/coach/detail-week';
import { readinessRowState, type DetailLoadState } from './plan-card-state';

export function useStudentDetail(studentId: string, now: Date, growthSelected: boolean) {
  const client = useQueryClient();
  const today = localDay(now);
  // A changed local day or timezone must replace the log/readiness window.
  const calendarKey = `${today}:${now.getTimezoneOffset()}`;
  const enabled = Boolean(studentId);
  const student = useQuery({
    queryKey: ['coach', 'detail-student', studentId, calendarKey],
    queryFn: async () => (await coachRepository.students()).find((entry) => entry.id === studentId) ?? null,
    enabled, staleTime: 0, gcTime: 0,
  });
  const main = useQuery({
    queryKey: ['coach', 'student-detail', studentId, calendarKey],
    queryFn: async () => {
      const current = selectCurrentPlan((await plansRepository.list(studentId)).plans);
      const plan = current ? await plansRepository.detail(current.id) : null;
      const start = weekStart(plan, now);
      const [logs, feedback, catalog] = await Promise.all([
        setsRepository.range(studentId, { from: localDay(start), to: localDay(addDays(start, 7)), scope: 'plan' }),
        feedbackRepository.list(studentId),
        client.fetchQuery({ queryKey: exerciseKeys.all, queryFn: exercisesRepository.list, staleTime: Infinity }),
      ]);
      return { plan, logs: logs.logs, feedback: feedback.items.sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime()), exercises: catalog.exercises };
    }, enabled, staleTime: 0,
  });
  const auxiliaryEnabled = enabled && main.isSuccess;
  const videos = useQuery({ queryKey: ['coach', 'detail-videos', studentId, calendarKey], queryFn: () => videosRepository.list(studentId), enabled: auxiliaryEnabled, staleTime: 0, gcTime: 0 });
  const readiness = useQuery({ queryKey: ['coach', 'detail-readiness', studentId, calendarKey], queryFn: () => readinessRepository.get(studentId, today), enabled: auxiliaryEnabled, staleTime: 0, gcTime: 0 });
  const profile = useQuery({ queryKey: ['coach', 'detail-profile', studentId, calendarKey], queryFn: () => onboardingRepository.get(studentId), enabled: auxiliaryEnabled, staleTime: 0, gcTime: 0 });
  const growth = useQuery({ queryKey: ['coach', 'exercise-stats', studentId], queryFn: () => coachRepository.exerciseStats(studentId), enabled: auxiliaryEnabled && growthSelected, staleTime: 0, gcTime: 0 });
  const days = makeExecutionDays(main.data?.plan ?? null, main.data?.logs ?? [], now);
  const state: DetailLoadState = main.isPending || student.isPending ? 'loading' : main.isError || student.isError || !student.data ? 'failed' : 'loaded';
  return {
    student: student.data, main, state, days, overview: makeOverview(days, main.data?.feedback ?? []),
    videos, readiness: readinessRowState(readiness), profile, growth,
    refresh: async () => {
      if (growthSelected) { await growth.refetch(); return; }
      await Promise.all([student.refetch(), main.refetch(), videos.refetch(), readiness.refetch(), profile.refetch()]);
    },
  };
}
