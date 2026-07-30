import * as SecureStore from 'expo-secure-store';
import { Widget, CallData } from '@/types/widget';

const API_URL = 'https://io.click2call.ai';

// Helper to get auth token
const getToken = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync('token');
};

// Fetch widgets for the logged-in user
export const fetchWidgets = async (): Promise<Widget[]> => {
  try {
    const token = await getToken();
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_URL}/mobile/widgets`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to load widgets');
    }

    const widgets = await response.json() as Array<{
      id: string;
      name: string;
      type: string;
      routing?: { defaultRoute?: string };
      created_at: string;
      updated_at: string;
      widget_routes?: Array<{ status: string }>;
    }>;

    return widgets.map(widget => ({
      id: widget.id,
      name: widget.name,
      type: widget.type,
      isActive: widget.widget_routes?.some(route => route.status === 'active') ?? false,
      routeToApp: widget.routing?.defaultRoute === 'call2app',
      createdAt: widget.created_at,
      updatedAt: widget.updated_at,
    }));
  } catch (error) {
    console.error('Error fetching widgets:', error);
    throw error;
  }
};

// Fetch call history
export const fetchCallHistory = async (): Promise<CallData[]> => {
  const token = await getToken();

  if (!token) {
    throw new Error('Authentication required');
  }

  throw new Error('Call history is not available from the current backend');
};
