import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Switch, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  Platform
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Bell, 
  Moon, 
  Settings as SettingsIcon, 
  Headphones, 
  Info, 
  ChevronRight, 
  User
} from 'lucide-react-native';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(true);
  const [autoAnswerEnabled, setAutoAnswerEnabled] = useState(false);
  const [useSpeakerphoneEnabled, setUseSpeakerphoneEnabled] = useState(false);

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      signOut();
    } else {
      Alert.alert(
        'Sign Out', 
        'Are you sure you want to sign out?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Out', style: 'destructive', onPress: () => signOut() }
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* User Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0) || 'U'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name || 'User'}</Text>
              <Text style={styles.profileEmail}>{user?.email || 'user@example.com'}</Text>
            </View>
            <TouchableOpacity style={styles.profileButton}>
              <User size={20} color="#2563EB" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={styles.iconContainer}>
                <Bell size={20} color="#2563EB" />
              </View>
              <Text style={styles.settingTitle}>Push Notifications</Text>
            </View>
            <Switch
              trackColor={{ false: '#555', true: '#2563EB' }}
              thumbColor="#ffffff"
              ios_backgroundColor="#555"
              onValueChange={setNotificationsEnabled}
              value={notificationsEnabled}
            />
          </View>
        </View>

        {/* Appearance Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={styles.iconContainer}>
                <Moon size={20} color="#2563EB" />
              </View>
              <Text style={styles.settingTitle}>Dark Mode</Text>
            </View>
            <Switch
              trackColor={{ false: '#555', true: '#2563EB' }}
              thumbColor="#ffffff"
              ios_backgroundColor="#555"
              onValueChange={setDarkModeEnabled}
              value={darkModeEnabled}
            />
          </View>
        </View>

        {/* Call Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Call Settings</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={styles.iconContainer}>
                <Headphones size={20} color="#2563EB" />
              </View>
              <Text style={styles.settingTitle}>Auto-Answer Calls</Text>
            </View>
            <Switch
              trackColor={{ false: '#555', true: '#2563EB' }}
              thumbColor="#ffffff"
              ios_backgroundColor="#555"
              onValueChange={setAutoAnswerEnabled}
              value={autoAnswerEnabled}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={styles.iconContainer}>
                <Headphones size={20} color="#2563EB" />
              </View>
              <Text style={styles.settingTitle}>Use Speakerphone</Text>
            </View>
            <Switch
              trackColor={{ false: '#555', true: '#2563EB' }}
              thumbColor="#ffffff"
              ios_backgroundColor="#555"
              onValueChange={setUseSpeakerphoneEnabled}
              value={useSpeakerphoneEnabled}
            />
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <TouchableOpacity style={styles.linkItem}>
            <View style={styles.settingInfo}>
              <View style={styles.iconContainer}>
                <Info size={20} color="#2563EB" />
              </View>
              <Text style={styles.settingTitle}>About Click2Call.ai</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkItem}>
            <View style={styles.settingInfo}>
              <View style={styles.iconContainer}>
                <SettingsIcon size={20} color="#2563EB" />
              </View>
              <Text style={styles.settingTitle}>Privacy Policy</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkItem}>
            <View style={styles.settingInfo}>
              <View style={styles.iconContainer}>
                <SettingsIcon size={20} color="#2563EB" />
              </View>
              <Text style={styles.settingTitle}>Terms of Service</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity 
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Click2Call.ai Mobile v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#323232',
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  scrollView: {
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#2563EB',
    marginBottom: 12,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontFamily: 'Inter-Bold',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileEmail: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#9CA3AF',
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#FFFFFF',
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  signOutButton: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 12,
  },
  signOutText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  versionContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  versionText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
  },
});