import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SOCKET_URL = 'https://io.click2call.ai';

class SocketService {
  private socket: Socket | null = null;
  private callbacks: {
    onIncomingCall?: (callData: any) => void;
    onCallEnded?: (callId: string) => void;
    onError?: (error: any) => void;
  } = {};

  async init() {
    try {
      const token = await SecureStore.getItemAsync('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      this.socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
      });

      this.socket.on('connect', () => {
        console.log('Socket connected');
        // Register device for VOIP
        if (Platform.OS !== 'web') {
          this.socket.emit('register_device', { 
            deviceType: Platform.OS,
            deviceToken: 'device-token-placeholder' // In production, this would be an actual device token
          });
        }
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
        this.callbacks.onError?.(error);
      });

      this.socket.on('incoming_call', (callData) => {
        console.log('Incoming call:', callData);
        this.callbacks.onIncomingCall?.(callData);
      });

      this.socket.on('call_ended', (callId) => {
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

  onIncomingCall(callback: (callData: any) => void) {
    this.callbacks.onIncomingCall = callback;
  }

  onCallEnded(callback: (callId: string) => void) {
    this.callbacks.onCallEnded = callback;
  }

  onError(callback: (error: any) => void) {
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