import * as SecureStore from 'expo-secure-store';

import { UserSchema, type User } from './auth';

export const TOKEN_STORE_KEYS = {
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
  cachedUser: 'cachedUser',
} as const;

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_STORE_KEYS.accessToken);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_STORE_KEYS.refreshToken);
}

export async function getCachedUser(): Promise<User | null> {
  const rawUser = await SecureStore.getItemAsync(TOKEN_STORE_KEYS.cachedUser);
  if (!rawUser) {
    return null;
  }

  try {
    const parsed = UserSchema.safeParse(JSON.parse(rawUser));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_STORE_KEYS.accessToken, accessToken),
    SecureStore.setItemAsync(TOKEN_STORE_KEYS.refreshToken, refreshToken),
  ]);
}

export async function setSession(
  accessToken: string,
  refreshToken: string,
  user: User,
): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_STORE_KEYS.accessToken, accessToken),
    SecureStore.setItemAsync(TOKEN_STORE_KEYS.refreshToken, refreshToken),
    SecureStore.setItemAsync(TOKEN_STORE_KEYS.cachedUser, JSON.stringify(user)),
  ]);
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_STORE_KEYS.accessToken),
    SecureStore.deleteItemAsync(TOKEN_STORE_KEYS.refreshToken),
    SecureStore.deleteItemAsync(TOKEN_STORE_KEYS.cachedUser),
  ]);
}
