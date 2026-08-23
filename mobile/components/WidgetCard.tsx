import React from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native';
import { PhoneCall } from 'lucide-react-native';

import type { Widget } from '@/types/widget';

type WidgetCardProps = {
  widget: Widget;
  isUpdating: boolean;
  onToggleRouteToApp: (id: string, routeToApp: boolean) => void;
};

function labelForType(type: string): string {
  const labels: Record<string, string> = {
    call2app: 'Mobile route',
    siptrunk: 'SIP trunk',
    aibot: 'AI bot',
    voicemail: 'Voicemail',
    vapi: 'Vapi voice',
  };
  return labels[type] || type;
}

function formatDate(value: string): string {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString();
}

export default function WidgetCard({
  widget,
  isUpdating,
  onToggleRouteToApp,
}: WidgetCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <PhoneCall size={20} color='#E86041' />
        </View>
        <View style={styles.titleGroup}>
          <Text style={styles.title}>{widget.name}</Text>
          <Text style={styles.type}>{labelForType(widget.type)}</Text>
        </View>
        <View style={[styles.status, widget.routeToApp && styles.statusLive]}>
          <View style={[styles.statusDot, widget.routeToApp && styles.statusDotLive]} />
          <Text style={[styles.statusText, widget.routeToApp && styles.statusTextLive]}>
            {widget.routeToApp ? 'Ringing here' : 'Not routed'}
          </Text>
        </View>
      </View>

      <View style={styles.rule} />

      <View style={styles.footer}>
        <View>
          <Text style={styles.routeLabel}>Ring this device</Text>
          <Text style={styles.date}>Created {formatDate(widget.createdAt)}</Text>
        </View>
        {isUpdating ? (
          <ActivityIndicator color='#E86041' />
        ) : (
          <Switch
            accessibilityLabel={`Ring this device for ${widget.name}`}
            trackColor={{ false: '#3A413D', true: '#3E9A77' }}
            thumbColor='#EDE8DD'
            ios_backgroundColor='#3A413D'
            onValueChange={(value) => onToggleRouteToApp(widget.id, value)}
            value={widget.routeToApp}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E2321',
    borderColor: '#3A413D',
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: '#2A2E2B',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    marginRight: 12,
    width: 40,
  },
  titleGroup: {
    flex: 1,
  },
  title: {
    color: '#EDE8DD',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  type: {
    color: '#A7AAA5',
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginTop: 3,
  },
  status: {
    alignItems: 'center',
    borderColor: '#3A413D',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusLive: {
    backgroundColor: '#203B31',
    borderColor: '#315E4B',
  },
  statusDot: {
    backgroundColor: '#777C77',
    borderRadius: 999,
    height: 6,
    marginRight: 6,
    width: 6,
  },
  statusDotLive: {
    backgroundColor: '#3E9A77',
  },
  statusText: {
    color: '#A7AAA5',
    fontFamily: 'Inter-Medium',
    fontSize: 10,
  },
  statusTextLive: {
    color: '#B9D9CC',
  },
  rule: {
    backgroundColor: '#3A413D',
    height: 1,
    marginVertical: 14,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  routeLabel: {
    color: '#EDE8DD',
    fontFamily: 'Inter-Medium',
    fontSize: 13,
  },
  date: {
    color: '#777C77',
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 3,
  },
});
