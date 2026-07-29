import { Widget, CallData } from '@/types/widget';
import { supabase } from '@/lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://io.click2call.ai';

type DeviceRegistration = {
  deviceToken: string;
  deviceName: string;
  platform: 'ios' | 'android';
  appVersion: string;
};

type MobileWidgetResponse = {
  id: string;
  name: string;
  type: string;
  created_at?: string;
  updated_at?: string;
  widget_routes?: Array<{ status: 'active' | 'inactive' }>;
};

const getAccessToken = async (): Promise<string> => {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error('Authentication required');
  }

  return session.access_token;
};

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const token = await getAccessToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
};

export const registerDevice = async (device: DeviceRegistration): Promise<void> => {
  await request('/mobile/devices', {
    method: 'POST',
    body: JSON.stringify(device),
  });
};

// Fetch widgets for the logged-in user.
export const fetchWidgets = async (): Promise<Widget[]> => {
  const widgets = await request<MobileWidgetResponse[]>('/mobile/widgets');

  return widgets.map((widget) => ({
    id: widget.id,
    name: widget.name,
    type: widget.type,
    isActive: widget.widget_routes?.some((route) => route.status === 'active') ?? false,
    routeToApp: (widget.widget_routes?.length ?? 0) > 0,
    createdAt: widget.created_at || '',
    updatedAt: widget.updated_at || '',
  }));
};

// Fetch call history
export const fetchCallHistory = async (): Promise<CallData[]> => {
  await getAccessToken();
  return [];
};
