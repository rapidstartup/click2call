import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import type { CallData, MobileDevice, Widget } from '@/types/widget';

const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://io.click2call.ai').replace(/\/$/, '');
const INSTALL_TOKEN_KEY = 'click2call.mobile.install-token';
const DEVICE_ID_KEY = 'click2call.mobile.device-id';

type ApiDevice = {
  id: string;
  device_token: string;
  device_name: string | null;
  platform: 'ios' | 'android' | 'web';
  app_version: string | null;
};

type ApiWidget = {
  id: string;
  name: string;
  type: string;
  created_at?: string;
  updated_at?: string;
  widget_routes?: Array<{
    device_id: string;
    status: 'active' | 'inactive';
  }>;
};

type ApiCall = {
  id: string;
  widget_id: string;
  widget_name?: string;
  status: CallData['status'];
  outcome?: CallData['outcome'] | null;
  duration_s?: number | null;
  started_at: string;
  updated_at: string;
};

async function getAccessToken(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) throw new Error('Authentication required');
  return session.access_token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
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

  const payload = await response.json().catch(() => null) as (T & { error?: string }) | null;
  if (!response.ok) {
    throw new Error(payload?.error || `Request failed with status ${response.status}`);
  }
  if (payload === null) throw new Error('The server returned an invalid response');
  return payload;
}

function createInstallToken(): string {
  const random = Math.random().toString(36).slice(2);
  return `install-${Date.now().toString(36)}-${random}`;
}

async function readLocalValue(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

async function writeLocalValue(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getInstallToken(): Promise<string> {
  const existing = await readLocalValue(INSTALL_TOKEN_KEY);
  if (existing) return existing;
  const created = createInstallToken();
  await writeLocalValue(INSTALL_TOKEN_KEY, created);
  return created;
}

function normalizeDevice(device: ApiDevice): MobileDevice {
  return {
    id: device.id,
    deviceToken: device.device_token,
    deviceName: device.device_name || 'This device',
    platform: device.platform,
    appVersion: device.app_version || Constants.expoConfig?.version || '1.0.0',
  };
}

export async function ensureDeviceRegistration(): Promise<MobileDevice> {
  const deviceToken = await getInstallToken();
  const platform: MobileDevice['platform'] = Platform.OS === 'ios'
    ? 'ios'
    : Platform.OS === 'android'
      ? 'android'
      : 'web';
  const device = await request<ApiDevice>('/mobile/devices', {
    method: 'POST',
    body: JSON.stringify({
      deviceToken,
      deviceName: `${Constants.expoConfig?.name || 'Click2Call'} on ${platform}`,
      platform,
      appVersion: Constants.expoConfig?.version || '1.0.0',
    }),
  });
  await writeLocalValue(DEVICE_ID_KEY, device.id);
  return normalizeDevice(device);
}

export async function fetchWidgets(): Promise<Widget[]> {
  const device = await ensureDeviceRegistration();
  const widgets = await request<ApiWidget[]>('/mobile/widgets');

  return widgets.map((widget) => ({
    id: widget.id,
    name: widget.name,
    type: widget.type,
    routeToApp: widget.widget_routes?.some((route) => (
      route.device_id === device.id && route.status === 'active'
    )) ?? false,
    createdAt: widget.created_at || '',
    updatedAt: widget.updated_at || '',
  }));
}

export async function setWidgetRoute(widgetId: string, enabled: boolean): Promise<void> {
  const device = await ensureDeviceRegistration();
  await request(`/mobile/widgets/${encodeURIComponent(widgetId)}/route`, {
    method: 'POST',
    body: JSON.stringify({
      deviceId: device.id,
      status: enabled ? 'active' : 'inactive',
    }),
  });
}

export async function fetchCallHistory(): Promise<CallData[]> {
  const calls = await request<ApiCall[]>('/mobile/calls');
  return calls.map((call) => ({
    id: call.id,
    widgetId: call.widget_id,
    widgetName: call.widget_name,
    status: call.status,
    outcome: call.outcome || undefined,
    startTime: call.started_at,
    updatedAt: call.updated_at,
    duration: call.duration_s || 0,
  }));
}
