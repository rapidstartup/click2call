import { CallData } from '../types/widget';

export interface CallService {
  initialize(): Promise<void>;
  getCallHistory(): CallData[];
  on(event: 'incomingCall' | 'callEnded', handler: (data: any) => void): void;
  off(event: 'incomingCall' | 'callEnded', handler: (data: any) => void): void;
}

class CallServiceImpl implements CallService {
  private callHistory: CallData[] = [];
  private eventHandlers: { [key: string]: ((data: any) => void)[] } = {
    incomingCall: [],
    callEnded: [],
  };

  async initialize(): Promise<void> {
    // Initialize the call service
    console.log('Call service initialized');
  }

  getCallHistory(): CallData[] {
    return this.callHistory;
  }

  on(event: 'incomingCall' | 'callEnded', handler: (data: any) => void): void {
    this.eventHandlers[event].push(handler);
  }

  off(event: 'incomingCall' | 'callEnded', handler: (data: any) => void): void {
    this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler);
  }
}

export const callService = new CallServiceImpl(); 