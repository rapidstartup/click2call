export interface Widget {
  id: string;
  name: string;
  type: string;
  routeToApp: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CallData {
  id: string;
  widgetId: string;
  widgetName?: string;
  status: 'started' | 'connected' | 'completed' | 'failed' | 'aborted' | 'capped';
  outcome?: 'lead_captured' | 'booked' | 'qualified' | 'unqualified' | 'no_contact';
  startTime: string;
  updatedAt: string;
  duration: number;
}

export interface MobileDevice {
  id: string;
  deviceToken: string;
  deviceName: string;
  platform: 'ios' | 'android' | 'web';
  appVersion: string;
}
