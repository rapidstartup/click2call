import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Lock, Mail, Phone } from 'lucide-react-native';

import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const { signIn, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }

    try {
      setError(null);
      await signIn(email.trim(), password);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login failed. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps='handled'>
        <View style={styles.container}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Phone color='#F5F1E8' size={18} />
            </View>
            <Text style={styles.brand}>Click2Call.ai</Text>
          </View>

          <View style={styles.intro}>
            <Text style={styles.eyebrow}>MOBILE EXCHANGE</Text>
            <Text style={styles.title}>Carry your call desk with you.</Text>
            <Text style={styles.subtitle}>
              Sign in with the same account you use on the web dashboard.
            </Text>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.form}>
            <Text style={styles.label}>EMAIL</Text>
            <View style={styles.inputContainer}>
              <Mail color='#777C77' size={18} />
              <TextInput
                style={styles.input}
                placeholder='you@company.com'
                placeholderTextColor='#777C77'
                keyboardType='email-address'
                autoCapitalize='none'
                autoComplete='email'
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.inputContainer}>
              <Lock color='#777C77' size={18} />
              <TextInput
                style={styles.input}
                placeholder='Your password'
                placeholderTextColor='#777C77'
                secureTextEntry
                autoComplete='current-password'
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={() => void handleLogin()}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={() => void handleLogin()}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color='#F5F1E8' />
              ) : (
                <>
                  <Phone color='#F5F1E8' size={17} />
                  <Text style={styles.buttonText}>Open the exchange</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.securityNote}>
            <View style={styles.securityDot} />
            <Text style={styles.securityText}>Your session is stored securely on this device.</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidContainer: { flex: 1, backgroundColor: '#171B19' },
  scrollContainer: { flexGrow: 1 },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  brandRow: { alignItems: 'center', flexDirection: 'row', marginBottom: 50 },
  brandMark: {
    alignItems: 'center', backgroundColor: '#E86041', borderRadius: 4,
    height: 34, justifyContent: 'center', marginRight: 10, width: 34,
  },
  brand: { color: '#EDE8DD', fontFamily: 'Inter-SemiBold', fontSize: 16, letterSpacing: -0.3 },
  intro: { marginBottom: 34 },
  eyebrow: {
    color: '#E86041', fontFamily: 'Inter-SemiBold', fontSize: 10,
    letterSpacing: 2.2, marginBottom: 12,
  },
  title: { color: '#EDE8DD', fontFamily: 'Inter-Bold', fontSize: 34, lineHeight: 41, maxWidth: 350 },
  subtitle: {
    color: '#A7AAA5', fontFamily: 'Inter-Regular', fontSize: 15,
    lineHeight: 23, marginTop: 12, maxWidth: 340,
  },
  form: { width: '100%' },
  label: {
    color: '#777C77', fontFamily: 'Inter-SemiBold', fontSize: 9,
    letterSpacing: 1.5, marginBottom: 7,
  },
  inputContainer: {
    alignItems: 'center', backgroundColor: '#1E2321', borderColor: '#3A413D',
    borderRadius: 4, borderWidth: 1, flexDirection: 'row', marginBottom: 18,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'web' ? 4 : 2,
  },
  input: {
    color: '#EDE8DD', flex: 1, fontFamily: 'Inter-Regular',
    fontSize: 15, marginLeft: 10, minHeight: 48,
  },
  button: {
    alignItems: 'center', backgroundColor: '#E86041', borderRadius: 4,
    flexDirection: 'row', justifyContent: 'center', marginTop: 8,
    minHeight: 52, paddingHorizontal: 18,
  },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: '#F5F1E8', fontFamily: 'Inter-SemiBold', fontSize: 15, marginLeft: 9 },
  errorContainer: {
    backgroundColor: '#2A201E', borderColor: '#6A362C', borderRadius: 4,
    borderWidth: 1, marginBottom: 20, padding: 13,
  },
  errorText: { color: '#F1B5A7', fontFamily: 'Inter-Regular', fontSize: 13, lineHeight: 19 },
  securityNote: { alignItems: 'center', flexDirection: 'row', marginTop: 24 },
  securityDot: { backgroundColor: '#3E9A77', borderRadius: 999, height: 7, marginRight: 8, width: 7 },
  securityText: { color: '#777C77', fontFamily: 'Inter-Regular', fontSize: 11 },
});
