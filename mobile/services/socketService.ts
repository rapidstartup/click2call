import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SOCKET_URL = 'https://io.click2call.ai';

interface IncomingCallData {
  callId: string;
  [key: string]: unknown;
}

class SocketService {
  private socket: Socket | null = null;
  private callbacks: {
    onIncomingCall?: (callData: IncomingCallData) => void;
    onCallEnded?: (callId: string) => void;
    onError?: (error: unknown) => void;
  } = {};

  async init() {
    try {
      const token = await SecureStore.getItemAsync('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
      });
      this.socket = socket;

      socket.on('connect', () => {
        console.log('Socket connected');
        // Register device for VOIP
        if (Platform.OS !== 'web') {
          socket.emit('register_device', {
            deviceType: Platform.OS,
            deviceToken: 'device-token-placeholder' // In production, this would be an actual device token
          });
        }
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      socket.on('error', (error: unknown) => {
        console.error('Socket error:', error);
        this.callbacks.onError?.(error);
      });

      socket.on('incoming_call', (callData) => {
        console.log('Incoming call:', callData);
        this.callbacks.onIncomingCall?.(callData);
      });

      socket.on('call_ended', (callId) => {
        console.log('Call ended:', callId);
        this.callbacks.onCallEnded?.(callId);
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

  onIncomingCall(callback: (callData: IncomingCallData) => void) {
    this.callbacks.onIncomingCall = callback;
  }

  onCallEnded(callback: (callId: string) => void) {
    this.callbacks.onCallEnded = callback;
  }

  onError(callback: (error: unknown) => void) {
    this.callbacks.onError = callback;
  }

  answerCall(callId: string) {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }
    this.socket.emit('answer_call', { callId });
  }

  rejectCall(callId: string) {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }
    this.socket.emit('reject_call', { callId });
  }

  endCall(callId: string) {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }
    this.socket.emit('end_call', { callId });
  }

  muteCall(callId: string, muted: boolean) {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }
    this.socket.emit('mute_call', { callId, muted });
  }
}

export default new SocketService();
