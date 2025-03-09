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
    
    // This would be a real API call in production
    // Mocking the response for demo purposes
    const mockWidgets: Widget[] = [
      {
        id: 'w1',
        name: 'Sales Widget',
        type: 'callButton',
        isActive: true,
        routeToApp: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'w2',
        name: 'Support Widget',
        type: 'callForm',
        isActive: true,
        routeToApp: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'w3',
        name: 'Contact Widget',
        type: 'callButton',
        isActive: false,
        routeToApp: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    
    return mockWidgets;
  } catch (error) {
    console.error('Error fetching widgets:', error);
    throw error;
  }
};

// Fetch call history
export const fetchCallHistory = async (): Promise<CallData[]> => {
  try {
    const token = await getToken();
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    // Mock call history data
    const mockCalls: CallData[] = [
      {
        id: 'c1',
        widgetId: 'w1',
        caller: {
          name: 'John Doe',
          phone: '+1234567890',
          email: 'john@example.com',
        },
        status: 'completed',
        startTime: '2023-04-01T10:30:00Z',
        endTime: '2023-04-01T10:35:00Z',
        duration: 300,
      },
      {
        id: 'c2',
        widgetId: 'w2',
        caller: {
          name: 'Jane Smith',
          phone: '+0987654321',
        },
        status: 'missed',
        startTime: '2023-04-02T14:20:00Z',
      },
      {
        id: 'c3',
        widgetId: 'w1',
        caller: {
          name: 'Alex Johnson',
          email: 'alex@example.com',
        },
        status: 'completed',
        startTime: '2023-04-03T09:15:00Z',
        endTime: '2023-04-03T09:22:00Z',
        duration: 420,
      },
    ];
    
    return mockCalls;
  } catch (error) {
    console.error('Error fetching call history:', error);
    throw error;
  }
};