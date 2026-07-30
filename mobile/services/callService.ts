import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import socketService from './socketService';
import { Platform } from 'react-native';

class CallService {
  private currentCallId: string | null = null;
  private ringtone: ReturnType<typeof createAudioPlayer> | null = null;

  async init() {
    try {
      // Initialize socketService
      await socketService.init();
      
      // Set up audio mode for calls
      if (Platform.OS !== 'web') {
        await setAudioModeAsync({
          allowsRecording: true,
          interruptionMode: 'doNotMix',
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          shouldRouteThroughEarpiece: false,
        });
      }

      // Pre-load ringtone
      this.ringtone?.remove();
      this.ringtone = createAudioPlayer(require('@/assets/sounds/ringtone.mp3'));
      this.ringtone.loop = true;

      // Set up socket event handlers
      socketService.onIncomingCall(this.handleIncomingCall);
      socketService.onCallEnded(this.handleCallEnded);

    } catch (error) {
      console.error('Error initializing call service:', error);
      throw error;
    }
  }

  private handleIncomingCall = async (callData: any) => {
    this.currentCallId = callData.id;
    
    // Play ringtone
    try {
      if (this.ringtone) {
        this.ringtone.play();
      }
    } catch (error) {
      console.error('Error playing ringtone:', error);
    }
  };

  private handleCallEnded = async (callId: string) => {
    if (this.currentCallId === callId) {
      this.currentCallId = null;
      
      await this.stopRingtone();
    }
  };

  async answerCall(callId: string) {
    await this.stopRingtone();
    socketService.answerCall(callId);
  }

  async rejectCall(callId: string) {
    await this.stopRingtone();
    socketService.rejectCall(callId);
    this.currentCallId = null;
  }

  async endCall(callId: string) {
    socketService.endCall(callId);
    this.currentCallId = null;
  }

  async toggleMute(callId: string, muted: boolean) {
    socketService.muteCall(callId, muted);
  }

  disconnect() {
    if (this.ringtone) {
      this.ringtone.remove();
      this.ringtone = null;
    }

    socketService.disconnect();
  }

  private async stopRingtone() {
    if (!this.ringtone) {
      return;
    }

    this.ringtone.pause();
    await this.ringtone.seekTo(0);
  }
}

export default new CallService();
