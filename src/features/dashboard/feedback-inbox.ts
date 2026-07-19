import { useMemo } from 'react';

import { useFeedback, type FeedbackItem } from '@/api/domains';

import { unreadFeedbackCount } from './model';

export type FeedbackInboxViewModel = {
  items: FeedbackItem[];
  latest: FeedbackItem | null;
  unreadCount: number;
  isLoading: boolean;
  isError: boolean;
  reload: () => Promise<unknown>;
};

/** Shared unread selector for Dashboard and the later Growth feedback section. */
export { unreadFeedbackCount as selectUnreadFeedbackCount } from './model';

/** One feedback query/view-model shared by every student feedback exposure. */
export function useFeedbackInboxViewModel(
  studentId: string,
): FeedbackInboxViewModel {
  const query = useFeedback(studentId);
  return useMemo(() => {
    const items = query.data?.items ?? [];
    return {
      items,
      latest: items[0] ?? null,
      unreadCount: unreadFeedbackCount(items),
      isLoading: query.isPending,
      isError: query.isError,
      reload: query.refetch,
    };
  }, [query.data, query.isError, query.isPending, query.refetch]);
}
