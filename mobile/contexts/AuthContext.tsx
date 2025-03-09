import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

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
          setUser(JSON.parse(userJson));
          router.replace('/(app)/(tabs)/');
        } else {
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('Failed to load auth state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // Normally we'd make an API call here
      // For now, we'll simulate a successful login with mock data
      const mockResponse = {
        user: {
          id: '123456',
          email: email,
          name: 'Demo User',
        },
        token: 'mock-jwt-token',
      };
      
      // Store the user data and token in secure storage
      await SecureStore.setItemAsync('user', JSON.stringify(mockResponse.user));
      await SecureStore.setItemAsync('token', mockResponse.token);
      
      setUser(mockResponse.user);
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