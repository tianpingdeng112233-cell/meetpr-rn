import { test, expect } from '@jest/globals';
import { ConversationSchema, inboxConversation } from '../chat';
import { inboxRows } from '@/domain/coach/inbox';

const now = new Date('2026-09-23T12:00:00Z');
function preview(metadata: Record<string, unknown>, text = '[训练计划]') {
  const conversation = ConversationSchema.parse({
    id: '00000000-0000-4000-8000-000000000001',
    other_party: { id: '00000000-0000-4000-8000-000000000002', display_name: 'Alex' },
    unread_count: 1, last_message_at: now.toISOString(),
    last_message: {
      id: '00000000-0000-4000-8000-000000000003', seq: 1, kind: 'text',
      sender_id: '00000000-0000-4000-8000-000000000002',
      preview: text, created_at: now.toISOString(), ...metadata,
    },
  });
  return inboxRows({ conversations: [inboxConversation(conversation)], videoGroups: [], now })[0].lastPreview;
}

test('explicit planned-set previews localize through the conversation response into the inbox', () => {
  expect(preview({ preview_kind: 'training_plan' })).toBe('[Training plan]');
});

test.each([
  ['training_share', '[训练分享]', '[Training share]'],
  ['image', '[图片]', '[Image]'],
])('explicit %s system previews localize without inspecting body text', (kind, wire, expected) => {
  expect(preview({ preview_kind: kind }, wire)).toBe(expected);
});

test.each([{}, { preview_kind: 'text' }, { preview_kind: null }, { preview_kind: 'future_kind' }])(
  'ordinary text and legacy/unknown metadata preserve the exact preview: %j', metadata => {
    for (const text of ['[训练计划]', '[训练分享]', '[图片]', 'My next session']) {
      expect(preview(metadata, text)).toBe(text);
    }
  },
);
