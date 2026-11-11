import AsyncStorage from '@/demo/storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
const storageKey = (id: string) => `meetpr.daily-weight.v1.${id}`;
export const readDailyWeight = async (id: string) => (await AsyncStorage.getItem(storageKey(id))) === 'true';
export const writeDailyWeight = (id: string, value: boolean) => AsyncStorage.setItem(storageKey(id), JSON.stringify(value));
export function useDailyWeight(id: string) {
  const client = useQueryClient();
  const queryKey = ['daily-weight', id] as const;
  const query = useQuery({ queryKey, queryFn: () => readDailyWeight(id), enabled: Boolean(id) });
  const save = useMutation({ mutationFn: (value: boolean) => writeDailyWeight(id, value), onSuccess: async (_, value) => {
    await client.cancelQueries({ queryKey }); client.setQueryData(queryKey, value);
  } });
  return { ...query, save };
}
