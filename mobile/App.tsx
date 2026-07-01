import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { useAuthStore } from './src/store/authStore';
import { restoreToken } from './src/api/auth';

export default function App() {
  const setUser = useAuthStore((s) => s.login);

  useEffect(() => {
    (async () => {
      const token = await restoreToken();
      if (token) {
        try {
          const { login } = useAuthStore.getState();
          // We can't auto-login without password, but we can check if token works
          // For now, just redirect to login if token can't be validated
        } catch {
          // token invalid, user stays on login
        }
      }
    })();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
