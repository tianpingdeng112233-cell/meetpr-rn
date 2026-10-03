import { Redirect } from 'expo-router';

import { useSessionStore } from '@/api/session';

export default function SessionRouter() {
  const status = useSessionStore((state) => state.status);
  const user = useSessionStore((state) => state.user);
  const bootstrapped = useSessionStore((state) => state.bootstrapped);

  // Cold start: stay on the loading route until bootstrap settles so the login
  // screen never flashes for a user with a valid cached session.
  if (!bootstrapped || status === 'authenticating') {
    return <Redirect href="/validating" />;
  }

  if (status === 'anonymous' || !user) {
    return <Redirect href="/login" />;
  }

  if (user.role === 'coach') {
    return <Redirect href="/(coach)/(tabs)/today" />;
  }

  return <Redirect href="/(student)/today" />;
}
