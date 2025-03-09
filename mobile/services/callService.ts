import { Audio } from 'expo-av';
import socketService from './socketService';
import { Platform } from 'react-native';

class CallService {
  private sound: Audio.Sound | null = null;
  private currentCallId: string | null = null;
  private ringtone: Audio.Sound | null = null;

  async init() {
    try {
      // Initialize socketService
      await socketService.init();
      
      // Set up audio mode for calls
      if (Platform.OS !== 'web') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
          playThroughEarpieceAndroid: false,
        });
      }

      // Pre-load ringtone
      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/ringtone.mp3')
      );
      this.ringtone = sound;

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
        await this.ringtone.playAsync();
        // Loop the ringtone
        this.ringtone.setIsLoopingAsync(true);
      }
    } catch (error) {
      console.error('Error playing ringtone:', error);
    }
  };

  private handleCallEnded = async (callId: string) => {
    if (this.currentCallId === callId) {
      this.currentCallId = null;
      
      // Stop ringtone if playing
      if (this.ringtone) {
        try {
          await this.ringtone.stopAsync();
        } catch (error) {
          console.error('Error stopping ringtone:', error);
        }
      }
      
      // Clean up audio session
      if (this.sound) {
        try {
          await this.sound.unloadAsync();
          this.sound = null;
        } catch (error) {
          console.error('Error unloading sound:', error);
        }
      }
    }
  };

  async answerCall(callId: string) {
    if (this.ringtone) {
      await this.ringtone.stopAsync();
    }
    socketService.answerCall(callId);
  }

  async rejectCall(callId: string) {
    if (this.ringtone) {
      await this.ringtone.stopAsync();
    }
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
      this.ringtone.unloadAsync();
      this.ringtone = null;
    }
    
    if (this.sound) {
      this.sound.unloadAsync();
      this.sound = null;
    }
    
    socketService.disconnect();
  }
}

export default new CallService();