export type WidgetType = 'call2app' | 'siptrunk' | 'aibot' | 'email' | 'vapi';

export interface Widget {
  id: string;
  name: string;
  isActive?: boolean;
  routeToApp?: boolean;
  user_id: string;
  type: WidgetType;
  destination: string;
  routing: Record<string, any>;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
  shareableUrl?: string;
}

export interface CallData {
  id: string;
  widgetId: string;
  caller?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  timestamp?: number;
  status?: 'incoming' | 'active' | 'ended';
  startTime?: string | Date;
  endTime?: string | Date;
}

export interface IncomingCallData extends CallData {
  status: 'incoming';
}