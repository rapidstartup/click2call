import {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { router, useSegments, useRootNavigationState } from 'expo-router';

type User = {
  id: string;
  email: string;
  name: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  const checkAuth = useCallback(async () => {
    try {
      const userJson = await SecureStore.getItemAsync('user');
      const tokenStr = await SecureStore.getItemAsync('token');

      if (userJson && tokenStr) {
        setUser(JSON.parse(userJson));
      }
    } catch (error) {
      console.error('Failed to load auth state:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!navigationState?.key) return;
    checkAuth();
  }, [navigationState?.key, checkAuth]);

  useEffect(() => {
    if (!navigationState?.key || isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!inAuthGroup && !user) {
      router.replace('/(auth)/login');
    } else if (inAuthGroup && user) {
      router.replace('/(app)/(tabs)/calls');
    }
  }, [user, segments, navigationState?.key, isLoading]);

  const signIn = async (email: string) => {
    try {
      setIsLoading(true);
      const mockResponse = {
        user: {
          id: '123456',
          email: email,
          name: 'Demo User',
        },
        token: 'mock-jwt-token',
      };

      await SecureStore.setItemAsync('user', JSON.stringify(mockResponse.user));
      await SecureStore.setItemAsync('token', mockResponse.token);
      setUser(mockResponse.user);
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
