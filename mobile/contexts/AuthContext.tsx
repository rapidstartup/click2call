import React, { createContext, useState, useContext, useEffect } from 'react';
import { router } from 'expo-router';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

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

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) throw error;
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setIsLoading(false);
      router.replace(data.session ? '/' : '/(auth)/login');
    }).catch((error: unknown) => {
      console.error('Failed to load auth state:', error);
      if (!mounted) return;
      setUser(null);
      setIsLoading(false);
      router.replace('/(auth)/login');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user || !data.session) throw error || new Error('Authentication failed');
      setUser(data.user);
      router.replace('/');
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
