import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { CallData } from '@/types/widget';
import { Phone, PhoneOff, PhoneOutgoing } from 'lucide-react-native';

type CallCardProps = {
  call: CallData;
  onCallBack?: (call: CallData) => void;
};

export default function CallCard({ call, onCallBack }: CallCardProps) {
  // Format duration (in seconds) to mm:ss
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format date to display in a readable format
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Get icon and color based on call status
  const getStatusDisplay = () => {
    switch (call.status) {
      case 'completed':
        return { 
          icon: <Phone size={20} color="#10B981" />,
          color: '#10B981',
          text: 'Completed'
        };
      case 'missed':
        return { 
          icon: <PhoneOff size={20} color="#EF4444" />,
          color: '#EF4444',
          text: 'Missed'
        };
      case 'incoming':
        return { 
          icon: <Phone size={20} color="#2563EB" />,
          color: '#2563EB',
          text: 'Incoming'
        };
      case 'ongoing':
        return { 
          icon: <Phone size={20} color="#F59E0B" />,
          color: '#F59E0B',
          text: 'Ongoing'
        };
      default:
        return { 
          icon: <Phone size={20} color="#6B7280" />,
          color: '#6B7280',
          text: 'Unknown'
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.statusBadge, { backgroundColor: `${statusDisplay.color}20` }]}>
          {statusDisplay.icon}
          <Text style={[styles.statusText, { color: statusDisplay.color }]}>
            {statusDisplay.text}
          </Text>
        </View>
        
        {call.status === 'missed' && onCallBack && (
          <TouchableOpacity
            style={styles.callBackButton}
            onPress={() => onCallBack(call)}
          >
            <PhoneOutgoing size={16} color="#FFFFFF" />
            <Text style={styles.callBackText}>Call Back</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.callerInfo}>
        <Text style={styles.callerName}>
          {call.caller.name || 'Unknown Caller'}
        </Text>
        {call.caller.phone && (
          <Text style={styles.callerDetail}>{call.caller.phone}</Text>
        )}
        {call.caller.email && (
          <Text style={styles.callerDetail}>{call.caller.email}</Text>
        )}
      </View>
      
      <View style={styles.callDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Time:</Text>
          <Text style={styles.detailValue}>{formatDate(call.startTime)}</Text>
        </View>
        
        {call.duration && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Duration:</Text>
            <Text style={styles.detailValue}>{formatDuration(call.duration)}</Text>
          </View>
        )}
        
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Widget:</Text>
          <Text style={styles.detailValue}>{call.widgetId}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    marginLeft: 6,
  },
  callBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  callBackText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 4,
  },
  callerInfo: {
    marginBottom: 16,
  },
  callerName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  callerDetail: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#9CA3AF',
  },
  callDetails: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12,
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#D1D5DB',
    width: 80,
  },
  detailValue: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
  },
});