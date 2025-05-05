import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { SplashScreen } from 'expo-router';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { AuthProvider, useAuth } from '@/lib/context/AuthContext';
import {
  StreamVideoClient,
  StreamVideoEvent
} from "@stream-io/video-react-native-sdk";
import { Alert, Platform } from 'react-native';

const apiKey = process.env.EXPO_PUBLIC_GET_STREAM_API_KEY!;
console.log("API Key:", apiKey);

if (!apiKey) {
  throw new Error('Missing GetStream API key');
}

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

const appTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#2563EB',
    background: '#121212',
    card: '#1E1E1E',
    text: '#FFFFFF',
    border: '#323232',
    notification: '#2563EB',
  },
};

function RootLayoutNav() {
  const { session, loading, user } = useAuth();
  const router = useRouter();
  
  console.log("Auth user:", user);
  
  const userData = {
    id: user?.id! ?? "1",
    name: user?.email! ?? "John Doe",
    image: '',
    type: 'authenticated' as const
  };
  
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

  useEffect(() => {
    if (!session?.user) return;

    let client: StreamVideoClient | null = null;

    const setupClient = async () => {
      // First get the token
      try {
        const response = await fetch(`http://localhost:3002/generateUserToken`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userData.id, name: userData.name }),
        });

        if (!response.ok) throw new Error('Failed to fetch token');
        const { token } = await response.json();
        console.log("Got token for user:", userData.id);

        // Initialize client with token
        client = StreamVideoClient.getOrCreateInstance({
          apiKey,
          user: userData,
          token, // Pass token directly
        });

        if (!client) {
          console.error("Failed to initialize Stream client");
          return;
        }

        console.log("Setting up call handlers for user:", userData.id);

        // Handle incoming calls
        client.on('call.notification', event => {
          console.log("Call notification received:", event);
          
          Alert.alert(
            'Incoming Call',
            `Incoming call`,
            [
              {
                text: 'Decline',
                onPress: async () => {
                  const callId = event.call_cid.split(':')[1];
                  const call = client!.call('default', callId);
                  await call.reject();
                },
                style: 'cancel',
              },
              {
                text: 'Accept',
                onPress: async () => {
                  try {
                    if (!client) {
                      throw new Error('Video client not initialized');
                    }
                    
                    const callId = event.call_cid.split(':')[1];
                    console.log('Accepting call with ID:', callId);
                    
                    const call = client.call('default', callId);
                    await call.accept();
                    console.log('Call accepted successfully');
                    
                    router.push({
                      pathname: `/call/${callId}`,
                    });
                  } catch (error) {
                    console.error('Error accepting call:', error);
                    Alert.alert(
                      'Error',
                      'Failed to accept the call. Please try again.',
                      [{ text: 'OK' }]
                    );
                  }
                },
              },
            ],
            { cancelable: false }
          );
        });

        // Debug all events with full details
        client.on('all', (event: StreamVideoEvent) => {
          if (event.type !== 'health.check') {
            console.log("Stream event:", event.type, JSON.stringify(event, null, 2));
          }
        });

      } catch (err) {
        console.error("Error setting up client:", err);
      }
    };

    setupClient();

    return () => {
      if (client) {
        client.disconnectUser();
        console.log("Client disconnected");
      }
    };
  }, [session?.user, router, userData]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  if (loading) {
    return null;
  }

  return (
    <ThemeProvider value={appTheme}>
      {session && session.user ? (
        <>
          <Stack screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#121212' },
          }}>
            <Stack.Screen name="(app)/(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="call/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" options={{ title: 'Not Found' }} />
          </Stack>
          <StatusBar style="light" />
        </>
      ) : (
        <Stack>
          <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/signup" options={{ headerShown: false }} />
        </Stack>
      )}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}