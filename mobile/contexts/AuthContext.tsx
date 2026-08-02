import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';

type User = {
  id: string;
  email: string;
  name: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for stored credentials on app start
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userJson = await SecureStore.getItemAsync('user');
        const tokenStr = await SecureStore.getItemAsync('token');
        
        if (userJson && tokenStr) {
          const { data: { user: authUser }, error } = await supabase.auth.getUser(tokenStr);
          if (error || !authUser) throw new Error('Stored session is no longer valid');
          setUser(JSON.parse(userJson));
          router.replace('/(app)/(tabs)/');
        } else {
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('Failed to load auth state:', error);
        await SecureStore.deleteItemAsync('user');
        await SecureStore.deleteItemAsync('token');
        setUser(null);
        router.replace('/(auth)/login');
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user || !data.session) throw error || new Error('Authentication failed');
      const authenticatedUser: User = {
        id: data.user.id,
        email: data.user.email || email,
        name: typeof data.user.user_metadata?.name === 'string'
          ? data.user.user_metadata.name
          : data.user.email?.split('@')[0] || 'User',
      };
      
      // Store the user data and token in secure storage
      await SecureStore.setItemAsync('user', JSON.stringify(authenticatedUser));
      await SecureStore.setItemAsync('token', data.session.access_token);
      
      setUser(authenticatedUser);
      router.replace('/(app)/(tabs)/');
    } catch (error) {
      console.error('Sign in failed:', error);
      throw new Error('Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await SecureStore.deleteItemAsync('user');
      await SecureStore.deleteItemAsync('token');
      await supabase.auth.signOut();
      setUser(null);
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Sign out failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
