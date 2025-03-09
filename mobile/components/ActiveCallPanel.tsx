import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Mic, MicOff, PhoneOff, Volume2 } from 'lucide-react-native';

type ActiveCallPanelProps = {
  callData: {
    id: string;
    caller: {
      name?: string;
      phone?: string;
    };
  };
  onEndCall: (callId: string) => void;
  onToggleMute: (callId: string, muted: boolean) => void;
};

export default function ActiveCallPanel({ 
  callData, 
  onEndCall, 
  onToggleMute 
}: ActiveCallPanelProps) {
  const [muted, setMuted] = useState(false);
  const [callTimer, setCallTimer] = useState(0);
  const [speakerOn, setSpeakerOn] = useState(false);

  // Start call timer
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCallTimer(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Format timer display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleMute = () => {
    const newMuteState = !muted;
    setMuted(newMuteState);
    onToggleMute(callData.id, newMuteState);
  };

  const handleToggleSpeaker = () => {
    setSpeakerOn(!speakerOn);
    // In a real implementation, this would toggle the speaker mode
  };

  return (
    <View style={styles.container}>
      <View style={styles.callerContainer}>
        <Text style={styles.callerName}>
          {callData.caller.name || 'Unknown Caller'}
        </Text>
        <Text style={styles.callerPhone}>
          {callData.caller.phone || ''}
        </Text>
        <Text style={styles.callStatus}>In call</Text>
        <Text style={styles.callTimer}>{formatTime(callTimer)}</Text>
      </View>
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleToggleMute}
        >
          <View style={[
            styles.iconContainer, 
            muted ? styles.activeIconContainer : styles.inactiveIconContainer
          ]}>
            {muted ? (
              <MicOff size={24} color="#FFFFFF" />
            ) : (
              <Mic size={24} color="#FFFFFF" />
            )}
          </View>
          <Text style={styles.actionText}>
            {muted ? 'Unmute' : 'Mute'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onEndCall(callData.id)}
        >
          <View style={[styles.iconContainer, styles.endCallIconContainer]}>
            <PhoneOff size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.actionText}>End</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleToggleSpeaker}
        >
          <View style={[
            styles.iconContainer, 
            speakerOn ? styles.activeIconContainer : styles.inactiveIconContainer
          ]}>
            <Volume2 size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.actionText}>
            {speakerOn ? 'Speaker Off' : 'Speaker'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    width: width,
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20,
    position: 'absolute',
    bottom: 0,
  },
  callerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  callerName: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  callerPhone: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  callStatus: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#2563EB',
    marginBottom: 4,
  },
  callTimer: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  actionButton: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeIconContainer: {
    backgroundColor: '#2563EB',
  },
  inactiveIconContainer: {
    backgroundColor: '#3F3F46',
  },
  endCallIconContainer: {
    backgroundColor: '#EF4444',
  },
  actionText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#D1D5DB',
  },
});