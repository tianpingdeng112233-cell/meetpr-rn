import { useCallback } from 'react';
import { useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import type { NavigationProp } from 'expo-router/react-navigation';
import { MyProfileScreen } from '@/features/profile/MyProfileScreen';

type ProfileParams = { edit?: string };

export default function ProfileRoute() {
  const { edit } = useLocalSearchParams<ProfileParams>();
  const navigation = useNavigation<NavigationProp<{ profile: ProfileParams }, 'profile'>>();
  const section = edit === 'basics' || edit === 'competition' || edit === 'weight' || edit === 'note' ? edit : undefined;
  useFocusEffect(useCallback(() => () => {
    if (section) navigation.setParams({ edit: undefined });
  }, [navigation, section]));
  const close = () => {
    navigation.setParams({ edit: undefined });
  };
  return <MyProfileScreen editSection={section} onEditClose={close} />;
}
