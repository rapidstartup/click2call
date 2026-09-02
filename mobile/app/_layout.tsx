import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { SplashScreen } from 'expo-router';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { AuthProvider } from '@/contexts/AuthContext';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

const appTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#E86041',
    background: '#171B19',
    card: '#1E2321',
    text: '#EDE8DD',
    border: '#3A413D',
    notification: '#E86041',
  },
};

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider value={appTheme}>
      <AuthProvider>
        <Stack screenOptions={{ 
          headerShown: false,
          contentStyle: { backgroundColor: '#171B19' },
        }}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" options={{ title: 'Not Found' }} />
        </Stack>
        <StatusBar style="light" />
      </AuthProvider>
    </ThemeProvider>
  );
}
