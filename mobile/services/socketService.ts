import { io, Socket } from 'socket.io-client';
import { supabase } from '@/lib/supabase';
import type {
  CallSignal,
  ClientToServerEvents,
  ServerToClientEvents,
} from '../../shared/socketProtocol';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'https://io.click2call.ai';

class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private callbacks: {
    onCallEnded?: (callId: string) => void;
    onError?: (error: any) => void;
  } = {};

  async init() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session?.access_token) {
        throw new Error('No authenticated Supabase session found');
      }

      this.socket = io(SOCKET_URL, {
        auth: { token: session.access_token },
        transports: ['websocket'],
      });

      this.socket.on('connect', () => {
        console.log('Socket connected');
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      this.socket.on('connect_error', (error: Error) => {
        console.error('Socket error:', error);
        this.callbacks.onError?.(error);
      });

      this.socket.on('call-ended', (callId) => {
        console.log('Call ended:', callId);
        if (callId) {
          this.callbacks.onCallEnded?.(callId);
        }
      });

      this.socket.on('call-status', (status) => {
        if (status.status === 'error') {
          this.callbacks.onError?.(new Error(status.message));
        }
      });

    } catch (error) {
      console.error('Socket initialization error:', error);
      throw error;
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  onCallEnded(callback: (callId: string) => void) {
    this.callbacks.onCallEnded = callback;
  }

  onError(callback: (error: any) => void) {
    this.callbacks.onError = callback;
  }

  private sendSignal(signal: CallSignal) {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('signal', signal);
  }

  answerCall(callId: string) {
    this.sendSignal({ type: 'call-answer', callId, timestamp: Date.now() });
  }

  rejectCall(callId: string) {
    this.sendSignal({ type: 'call-reject', callId, timestamp: Date.now() });
  }

  endCall(callId: string) {
    this.sendSignal({ type: 'call-end', callId, timestamp: Date.now() });
  }

  muteCall(callId: string, muted: boolean) {
    this.sendSignal({ type: 'call-mute', callId, muted, timestamp: Date.now() });
  }
}

export default new SocketService();
