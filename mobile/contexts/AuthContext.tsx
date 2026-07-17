import React, { createContext, useState, useContext, useEffect } from 'react';
import { router } from 'expo-router';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { registerDeviceForPushNotifications } from '@/services/notifications';

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
    if (!user) return;

    registerDeviceForPushNotifications().catch((error) => {
      console.error('Failed to register push notifications:', error);
    });
  }, [user?.id]);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        throw error;
      }

      if (!isMounted) return;

      setUser(session?.user ?? null);
      setIsLoading(false);

      router.replace(session ? '/(app)/(tabs)/' : '/(auth)/login');
    }).catch((error) => {
      console.error('Failed to load auth state:', error);
      if (isMounted) {
        setUser(null);
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUser(session?.user ?? null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      setUser(data.user);
      router.replace('/(app)/(tabs)/');
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error instanceof Error
        ? error
        : new Error('Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

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
