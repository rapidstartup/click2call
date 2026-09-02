import { Tabs } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Home, Phone, Settings, LogOut } from 'lucide-react-native';

export default function TabLayout() {
  const { signOut } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1E2321',
        },
        headerTitleStyle: {
          fontFamily: 'Inter-SemiBold',
          color: '#EDE8DD',
        },
        tabBarStyle: {
          backgroundColor: '#1E2321',
          borderTopColor: '#3A413D',
        },
        tabBarActiveTintColor: '#E86041',
        tabBarInactiveTintColor: '#777C77',
        tabBarLabelStyle: {
          fontFamily: 'Inter-Medium',
        },
        headerRight: () => (
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={signOut}
            accessibilityLabel="Sign out"
          >
            <LogOut size={20} color="#EDE8DD" />
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calls"
        options={{
          title: 'Calls',
          tabBarIcon: ({ color, size }) => <Phone size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  logoutButton: {
    marginRight: 16,
    padding: 8,
  },
});
