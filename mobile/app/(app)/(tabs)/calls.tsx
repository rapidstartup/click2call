import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, ActivityIndicator, Modal } from 'react-native';
import { fetchCallHistory } from '@/services/api';
import { CallData } from '@/types/widget';
import CallCard from '@/components/CallCard';
import IncomingCallModal from '@/components/IncomingCallModal';
import ActiveCallPanel from '@/components/ActiveCallPanel';
import callService from '@/services/callService';
import { PhoneMissed } from 'lucide-react-native';

export default function CallsScreen() {
  const [calls, setCalls] = useState<CallData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // VOIP call states
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [activeCall, setActiveCall] = useState<any>(null);

  // Initialize call service
  useEffect(() => {
    const initCallService = async () => {
      try {
        await callService.init();
        
        // Set up socket event handlers
        const socketService = require('@/services/socketService').default;
        
        socketService.onIncomingCall((callData: any) => {
          console.log('Incoming call received', callData);
          setIncomingCall(callData);
          setShowIncomingCall(true);
        });
        
        socketService.onCallEnded((callId: string) => {
          if (activeCall && activeCall.id === callId) {
            setActiveCall(null);
          }
          if (incomingCall && incomingCall.id === callId) {
            setIncomingCall(null);
            setShowIncomingCall(false);
          }
          // Refresh call history
          loadCalls();
        });
        
        socketService.onError((error: any) => {
          console.error('Socket error:', error);
        });
      } catch (error) {
        console.error('Error initializing call service:', error);
      }
    };

    initCallService();
    loadCalls();

    // Clean up on unmount
    return () => {
      callService.disconnect();
    };
  }, []);

  // Load call history
  const loadCalls = async () => {
    try {
      setError(null);
      const data = await fetchCallHistory();
      setCalls(data);
    } catch (error) {
      console.error('Error loading call history:', error);
      setError('Failed to load call history. Please try again.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadCalls();
  };

  // Handle answering an incoming call
  const handleAnswerCall = async (callId: string) => {
    try {
      await callService.answerCall(callId);
      setActiveCall(incomingCall);
      setIncomingCall(null);
      setShowIncomingCall(false);
    } catch (error) {
      console.error('Error answering call:', error);
    }
  };

  // Handle rejecting an incoming call
  const handleRejectCall = async (callId: string) => {
    try {
      await callService.rejectCall(callId);
      setIncomingCall(null);
      setShowIncomingCall(false);
    } catch (error) {
      console.error('Error rejecting call:', error);
    }
  };

  // Handle ending an active call
  const handleEndCall = async (callId: string) => {
    try {
      await callService.endCall(callId);
      setActiveCall(null);
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  // Handle toggling mute state
  const handleToggleMute = async (callId: string, muted: boolean) => {
    try {
      await callService.toggleMute(callId, muted);
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calls</Text>
        <Text style={styles.headerSubtitle}>
          Call history and incoming calls
        </Text>
      </View>

      {/* Call history list */}
      <View style={styles.callsContainer}>
        <Text style={styles.sectionTitle}>Recent Calls</Text>
        
        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : calls.length === 0 ? (
          <View style={styles.emptyContainer}>
            <PhoneMissed size={48} color="#6B7280" />
            <Text style={styles.emptyText}>No call history</Text>
            <Text style={styles.emptySubtext}>
              Your call history will appear here
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#2563EB"
                colors={['#2563EB']}
              />
            }
          >
            {calls.map(call => (
              <CallCard
                key={call.id}
                call={call}
                onCallBack={() => {}} // Implement call back functionality if needed
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Incoming call modal */}
      <IncomingCallModal
        visible={showIncomingCall}
        callData={incomingCall}
        onAnswer={handleAnswerCall}
        onReject={handleRejectCall}
      />

      {/* Active call panel */}
      {activeCall && (
        <ActiveCallPanel
          callData={activeCall}
          onEndCall={handleEndCall}
          onToggleMute={handleToggleMute}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#323232',
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#9CA3AF',
  },
  callsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 16,
  },
  emptySubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
});