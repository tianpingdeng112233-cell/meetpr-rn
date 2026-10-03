import { useCallback } from 'react';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import type { NavigationProp } from 'expo-router/react-navigation';
import { MyProfileScreen } from '@/features/profile/MyProfileScreen';

type ProfileParams = { edit?: string; returnTo?: string };

export default function ProfileRoute() {
  const { edit, returnTo } = useLocalSearchParams<ProfileParams>();
  const router = useRouter();
  const navigation = useNavigation<NavigationProp<{ profile: ProfileParams }, 'profile'>>();
  const section = edit === 'basics' || edit === 'competition' ? edit : undefined;
  useFocusEffect(useCallback(() => () => {
    if (section) navigation.setParams({ edit: undefined, returnTo: undefined });
  }, [navigation, section]));
  const close = () => {
    navigation.setParams({ edit: undefined, returnTo: undefined });
    if (returnTo === 'today') router.navigate('/(student)/today');
  };
  return <MyProfileScreen editSection={section} onEditClose={close} />;
}
