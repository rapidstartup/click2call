import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@/lib/context/AuthContext';

export default function AppIndexScreen() {
  const { session, loading } = useAuth();

  // Show a loading indicator while checking authentication
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // Redirect if user is not authenticated
  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  // Otherwise, redirect to the calls tab
  return <Redirect href="/(app)/(tabs)/calls" />;
}