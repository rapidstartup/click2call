export interface Widget {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  routeToApp: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CallData {
  id: string;
  widgetId: string;
  caller: {
    name?: string;
    phone?: string;
    email?: string;
  };
  status: 'incoming' | 'ongoing' | 'completed' | 'missed';
  startTime?: string;
  endTime?: string;
  duration?: number;
}