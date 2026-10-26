import AsyncStorage from '@react-native-async-storage/async-storage';

type Milestone = 'welcomeSeen' | 'firstPlanDismissed';
const key = (studentId: string, bindingId: string, milestone: Milestone) =>
  `onboarding.${milestone}.${studentId}.${bindingId}`;

export const firstRunStorage = {
  async read(studentId: string, bindingId: string, milestone: Milestone): Promise<boolean> {
    return (await AsyncStorage.getItem(key(studentId, bindingId, milestone))) === 'true';
  },
  async mark(studentId: string, bindingId: string, milestone: Milestone): Promise<void> {
    await AsyncStorage.setItem(key(studentId, bindingId, milestone), 'true');
  },
};
