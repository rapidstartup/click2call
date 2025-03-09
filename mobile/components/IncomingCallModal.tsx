import React from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { Phone, PhoneOff } from 'lucide-react-native';

type IncomingCallModalProps = {
  visible: boolean;
  callData: {
    id: string;
    caller: {
      name?: string;
      phone?: string;
    };
  } | null;
  onAnswer: (callId: string) => void;
  onReject: (callId: string) => void;
};

export default function IncomingCallModal({ 
  visible, 
  callData, 
  onAnswer, 
  onReject 
}: IncomingCallModalProps) {
  if (!callData) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => onReject(callData.id)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.callCard}>
          <View style={styles.callerInfo}>
            <Text style={styles.callStatus}>Incoming Call</Text>
            <Text style={styles.callerName}>
              {callData.caller.name || 'Unknown Caller'}
            </Text>
            {callData.caller.phone && (
              <Text style={styles.callerPhone}>{callData.caller.phone}</Text>
            )}
          </View>
          
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => onReject(callData.id)}
            >
              <View style={[styles.iconContainer, styles.rejectIconContainer]}>
                <PhoneOff size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.actionText}>Decline</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.answerButton]}
              onPress={() => onAnswer(callData.id)}
            >
              <View style={[styles.iconContainer, styles.answerIconContainer]}>
                <Phone size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.actionText}>Answer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callCard: {
    width: width * 0.9,
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  callerInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  callStatus: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#2563EB',
    marginBottom: 8,
  },
  callerName: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  callerPhone: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#D1D5DB',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  actionButton: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  rejectIconContainer: {
    backgroundColor: '#EF4444',
  },
  answerIconContainer: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    marginRight: 24,
  },
  answerButton: {
    marginLeft: 24,
  },
  actionText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#FFFFFF',
  },
});