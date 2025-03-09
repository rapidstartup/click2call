import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function AppLayout() {
  const { user, isLoading } = useAuth();

  // Show a loading indicator while checking authentication
  if (isLoading) {
    return null;
  }

  // If user is not authenticated, redirect to login
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  // Otherwise, render the app content
  return <Redirect href="/(app)/(tabs)/" />;
}