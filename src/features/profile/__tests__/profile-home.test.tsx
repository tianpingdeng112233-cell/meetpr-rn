import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Alert, Text } from 'react-native';
import { onboardingRepository, OnboardingProfileSchema, type OnboardingProfile } from '@/api/domains/onboarding';
import { bindRepository } from '@/api/domains/bind';
import { useSessionStore } from '@/api/session';
import { setLocaleOverride, t } from '@/i18n';
import { MyProfileScreen } from '../MyProfileScreen';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { resolveColors } from '@/design';
import { ProfileIdentityCard } from '../ProfileIdentityCard';
import { ProfileEditor } from '../ProfileEditor';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@react-native-community/netinfo', () => jest.requireActual('@react-native-community/netinfo/jest/netinfo-mock'));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/features/chat/open-coach-chat', () => ({ useOpenCoachChat: () => ({ totalUnread: 0, openCoachChat: jest.fn() }) }));
let renderer: ReactTestRenderer;
let client: QueryClient;
let profile: OnboardingProfile;
const studentId = '10000000-0000-4000-8000-000000000000';
beforeEach(() => {
  setLocaleOverride('en');
  mockPush.mockClear();
  profile = OnboardingProfileSchema.parse({ ...Object.fromEntries(Object.keys(OnboardingProfileSchema.shape).map(key => [key, null])), upload_attachment_ids: [], user_id: studentId, created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z', height_cm: '178', weight_kg: '83.5', squat_1rm_kg: '302.5', bench_1rm_kg: '115', deadlift_1rm_kg: '225', injury_areas: ['knee'], note_to_coach: 'Goal' });
  useSessionStore.setState({ user: { id: studentId, email: 'student@example.test', phone: '', role: 'coached_student', created_at: profile.created_at } });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
  jest.spyOn(onboardingRepository, 'get').mockImplementation(async () => profile);
  jest.spyOn(bindRepository, 'mine').mockResolvedValue({ bind_request: null });
});
afterEach(() => { act(() => renderer?.unmount()); client.clear(); jest.restoreAllMocks(); setLocaleOverride(null); useSessionStore.setState({ user: null }); });
async function mount(props: Parameters<typeof MyProfileScreen>[0] = {}) {
  await act(async () => { renderer = create(<QueryClientProvider client={client}><MyProfileScreen {...props} /></QueryClientProvider>); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
}
const texts = () => renderer.root.findAllByType(Text).map(node => node.props.children);
async function press(label: string) {
  const node = renderer.root.findAll(node => typeof node.props.onPress === 'function').find(node => node.props.accessibilityLabel === label || node.findAllByType(Text).some(text => text.props.children === label));
  expect(node).toBeDefined();
  await act(async () => { node!.props.onPress(); });
}
test('home shows identity and exactly five ordered entries without old groups or sign out', async () => {
  await mount();
  const titles = ['About me', 'Health & recovery', 'Meet', 'Note to coach', 'Settings'];
  expect(texts().filter(text => titles.includes(text))).toEqual(titles);
  expect(texts()).toEqual(expect.arrayContaining(['student@example.test', 'S', '302.5', '115', '225', '642.5', '178 cm · 83.50 kg', '1 injury', 'Added']));
  for (const key of ['copy003', 'copy006', 'copy010', 'copy014', 'copy017', 'copy018', 'copy021', 'copy022', 'copy023', 'copy013'] as const) expect(texts()).not.toContain(t(`student.myProfileView.${key}`));
});
test.each([['About me', '/profile/about'], ['Health & recovery', '/profile/health'], ['Settings', '/profile/settings']])('%s opens its full-screen route', async (label, path) => {
  await mount(); await press(label); expect(mockPush).toHaveBeenCalledWith(path);
});
test.each([['Meet', 'competition'], ['Note to coach', 'note']])('%s opens the existing editor', async (label, section) => {
  await mount(); await press(label); expect(renderer.root.findByType(ProfileEditor).props.section).toBe(section);
});
test.each(['basics', 'competition', 'weight', 'note'] as const)('direct editSection %s opens and closes without a secondary page', async section => {
  const close = jest.fn(); await mount({ editSection: section, onEditClose: close });
  expect(renderer.root.findByType(ProfileEditor).props.section).toBe(section);
  await press(t('student.accountSecuritySheets.copy013')); expect(close).toHaveBeenCalled(); expect(mockPush).not.toHaveBeenCalled();
});
test.each(['pending', 'error', 'empty'] as const)('Settings remains available when profile is %s', async state => {
  if (state === 'pending') jest.mocked(onboardingRepository.get).mockReturnValue(new Promise(() => {}));
  if (state === 'error') jest.mocked(onboardingRepository.get).mockRejectedValue(new Error('offline'));
  if (state === 'empty') jest.mocked(onboardingRepository.get).mockResolvedValue(null);
  await mount(); await press('Settings'); expect(mockPush).toHaveBeenCalledWith('/profile/settings');
  expect(texts()).not.toContain('302.5');
  if (state === 'empty') { expect(texts()).toContain(t('student.myProfileView.copy001')); expect(texts()).not.toContain('About me'); }
  else { expect(texts()).toContain('About me'); expect(texts()).not.toContain('—'); }
  if (state === 'error') { await press(t('student.myProfileView.copy002')); expect(onboardingRepository.get).toHaveBeenCalledTimes(2); }
});
test('training grid opens the unchanged 1RM explanation', async () => {
  const alert = jest.spyOn(Alert, 'alert'); await mount(); await press('Training 1RM in kg · set by your coach');
  expect(alert).toHaveBeenCalledWith(t('student.myProfileView.copy019'), t('student.myProfileView.copy020'));
});

test.each(['pending', 'accepted', 'empty', 'failed'] as const)('identity exposes only a named accepted coach (%s) and no avatar action', async state => {
  if (state === 'failed') jest.mocked(bindRepository.mine).mockRejectedValue(new Error('offline'));
  else jest.mocked(bindRepository.mine).mockResolvedValue({ bind_request: { status: state === 'pending' ? 'pending' : 'accepted', coach_display_name: state === 'empty' ? ' ' : 'Coach Example' } } as never);
  await mount();
  expect(texts().includes('Coach · Coach Example')).toBe(state === 'accepted');
  const initial = renderer.root.findAllByType(Text).find(node => node.props.children === 'S')!;
  let parent = initial.parent;
  while (parent) { expect(parent.props.onPress).toBeUndefined(); parent = parent.parent; }
});
test('a failed refresh retains cached values and shows retry with every destination available', async () => {
  await mount(); jest.mocked(onboardingRepository.get).mockRejectedValue(new Error('offline'));
  await act(async () => { await client.refetchQueries(); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
  expect(texts()).toContain('student@example.test'); expect(texts()).toContain('302.5'); expect(texts()).toContain('178 cm · 83.50 kg'); expect(texts()).toContain(t('student.myProfileView.copy002'));
  await press('Meet'); expect(renderer.root.findByType(ProfileEditor).props.section).toBe('competition');
});

test.each(['+0 000 000 0000', ''])('phone or empty identity %s uses a noninteractive account icon', async phone => {
  useSessionStore.setState(state => ({ user: { ...state.user!, email: null, phone } }));
  await mount();
  const card = renderer.root.findByType(ProfileIdentityCard);
  expect(card.findAllByType(MaterialCommunityIcons).filter(node => node.props.name === 'account-outline')).toHaveLength(1);
  expect(card.findAllByType(MaterialCommunityIcons).find(node => node.props.name === 'account-outline')!.props.color).toBe(resolveColors('light').textMuted);
  expect(card.findAllByType(Text).map(node => node.props.children)).not.toContain('+');
});
