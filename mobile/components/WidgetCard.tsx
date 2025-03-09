import React from 'react';
import { StyleSheet, View, Text, Switch, TouchableOpacity } from 'react-native';
import { Widget } from '@/types/widget';
import { PhoneCall, Power } from 'lucide-react-native';

type WidgetCardProps = {
  widget: Widget;
  onToggleActive: (id: string, isActive: boolean) => void;
  onToggleRouteToApp: (id: string, routeToApp: boolean) => void;
};

export default function WidgetCard({ widget, onToggleActive, onToggleRouteToApp }: WidgetCardProps) {
  return (
    <View style={[styles.card, !widget.isActive && styles.inactiveCard]}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <PhoneCall size={20} color="#2563EB" />
        </View>
        <Text style={styles.title}>{widget.name}</Text>
      </View>
      
      <View style={styles.details}>
        <Text style={styles.type}>Type: {widget.type}</Text>
        <Text style={styles.date}>Created: {new Date(widget.createdAt).toLocaleDateString()}</Text>
      </View>
      
      <View style={styles.actions}>
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Active</Text>
          <Switch
            trackColor={{ false: '#555', true: '#2563EB' }}
            thumbColor="#ffffff"
            ios_backgroundColor="#555"
            onValueChange={(value) => onToggleActive(widget.id, value)}
            value={widget.isActive}
          />
        </View>
        
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Route to app</Text>
          <Switch
            trackColor={{ false: '#555', true: '#2563EB' }}
            thumbColor="#ffffff"
            ios_backgroundColor="#555"
            onValueChange={(value) => onToggleRouteToApp(widget.id, value)}
            value={widget.routeToApp}
            disabled={!widget.isActive}
          />
        </View>
      </View>
      
      <TouchableOpacity 
        style={[
          styles.powerButton, 
          widget.isActive ? styles.powerActive : styles.powerInactive
        ]}
        onPress={() => onToggleActive(widget.id, !widget.isActive)}
      >
        <Power size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  inactiveCard: {
    borderLeftColor: '#6B7280',
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#FFFFFF',
    flex: 1,
  },
  details: {
    marginBottom: 16,
  },
  type: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  date: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#D1D5DB',
    marginRight: 8,
  },
  powerButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  powerActive: {
    backgroundColor: '#2563EB',
  },
  powerInactive: {
    backgroundColor: '#6B7280',
  },
});