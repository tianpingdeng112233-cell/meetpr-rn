export function studentTabs(role: string | undefined) {
  return role === 'self_train_student'
    ? ['training', 'growth', 'profile'] as const
    : ['training', 'chat', 'growth', 'profile'] as const;
}
