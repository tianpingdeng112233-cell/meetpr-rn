import { CodeChallengeMethod, ResponseType, exchangeCodeAsync, useAuthRequest } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { ApiError } from '@/api/client';

WebBrowser.maybeCompleteAuthSession();
const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

export function useGoogleOAuth() {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() ?? '';
  const prefix = clientId.match(/^([\w-]+)\.apps\.googleusercontent\.com$/)?.[1];
  const redirectUri = prefix ? `com.googleusercontent.apps.${prefix}:/oauth2redirect` : 'meetpr:/oauth2redirect';
  const [request, , promptAsync] = useAuthRequest({
    clientId: clientId || 'unconfigured',
    redirectUri,
    scopes: ['openid', 'email', 'profile'],
    responseType: ResponseType.Code,
    usePKCE: true,
    codeChallengeMethod: CodeChallengeMethod.S256,
  }, prefix ? discovery : null);

  return async (): Promise<string | null> => {
    if (!prefix || !request?.codeVerifier) {
      throw new ApiError('backend', 'Google sign-in is not configured', { code: 'AUTH_INVALID_IDENTITY_TOKEN' });
    }
    const result = await promptAsync();
    if (result.type === 'cancel' || result.type === 'dismiss') return null;
    if (result.type !== 'success' || !result.params.code) {
      throw new ApiError('backend', 'Google sign-in could not be verified', { code: 'AUTH_INVALID_IDENTITY_TOKEN' });
    }
    const token = await exchangeCodeAsync({
      clientId,
      code: result.params.code,
      redirectUri,
      extraParams: { code_verifier: request.codeVerifier },
    }, discovery);
    if (!token.idToken) {
      throw new ApiError('backend', 'Google did not return an identity token', { code: 'AUTH_INVALID_IDENTITY_TOKEN' });
    }
    return token.idToken;
  };
}
