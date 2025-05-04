import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: '#121212' },
      }}
    >
      <Stack.Screen 
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="login"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="signup"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}