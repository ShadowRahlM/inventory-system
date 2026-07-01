import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, TOKEN_KEY } from './client';

export interface UserInfo {
  username: string;
  role: 'admin' | 'manager' | 'viewer';
}

export async function login(username: string, password: string): Promise<UserInfo> {
  const tokenRes = await api.post('/auth/token/', { username, password });
  const { access } = tokenRes.data;
  await AsyncStorage.setItem(TOKEN_KEY, access);

  const meRes = await api.get<UserInfo>('/auth/me/');
  return meRes.data;
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function restoreToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}
