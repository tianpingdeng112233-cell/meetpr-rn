import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PlanSummary } from '@/api/domains';

export type DashboardPlanSignature = {
  planId: string;
  publishedAt: string;
};

export function dashboardPlanSeenKey(studentId: string): string {
  return `dashboard.seenPlanId.${studentId}`;
}

export function dashboardPlanSignature(
  plan: Pick<PlanSummary, 'id' | 'created_at' | 'published_at'>,
): DashboardPlanSignature {
  return { planId: plan.id, publishedAt: plan.published_at ?? plan.created_at };
}

export function dashboardPlanSignatureKey(
  signature: DashboardPlanSignature,
): string {
  return `${signature.planId}.${signature.publishedAt}`;
}

export async function hasSeenDashboardPlan(
  studentId: string,
  signature: DashboardPlanSignature,
): Promise<boolean> {
  const stored = await AsyncStorage.getItem(dashboardPlanSeenKey(studentId));
  if (stored === null) return false;
  try {
    const value = JSON.parse(stored) as Partial<DashboardPlanSignature>;
    return value.planId === signature.planId && value.publishedAt === signature.publishedAt;
  } catch {
    return false;
  }
}

export async function markDashboardPlanSeen(
  studentId: string,
  signature: DashboardPlanSignature,
): Promise<void> {
  await AsyncStorage.setItem(
    dashboardPlanSeenKey(studentId),
    JSON.stringify(signature),
  );
}
