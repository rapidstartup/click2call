export type CallSignal =
  | {
      type: 'call-start';
      timestamp?: number;
      widgetId: string;
    }
  | {
      type: 'call-end';
      timestamp?: number;
      callId?: string;
      widgetId?: string;
    }
  | {
      type: 'call-answer' | 'call-reject';
      timestamp?: number;
      callId: string;
    }
  | {
      type: 'call-mute';
      timestamp?: number;
      callId: string;
      muted: boolean;
    };

export type CallStatus = {
  status: 'error' | 'answered' | 'rejected' | 'muted';
  message: string;
};

export interface ClientToServerEvents {
  signal: (data: CallSignal) => void;
}

export interface ServerToClientEvents {
  'call-established': () => void;
  'call-ended': (callId?: string) => void;
  'call-status': (data: CallStatus) => void;
  'vapi-config': (data: { apiKey: string; assistantId: string }) => void;
}
