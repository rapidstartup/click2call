import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import type { CallData } from '@/types/widget';

type CallCardProps = { call: CallData };

const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown time' : date.toLocaleString();
}

function formatLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase());
}

function statusColors(status: CallData['status']) {
  if (status === 'completed') return { ink: '#8FD0B3', surface: '#203B31', border: '#315E4B' };
  if (status === 'connected' || status === 'started') {
    return { ink: '#EBC783', surface: '#3A3020', border: '#66522D' };
  }
  return { ink: '#F1B5A7', surface: '#3B2622', border: '#6A362C' };
}

export default function CallCard({ call }: CallCardProps) {
  const colors = statusColors(call.status);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.status, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.statusDot, { backgroundColor: colors.ink }]} />
          <Text style={[styles.statusText, { color: colors.ink }]}>{formatLabel(call.status)}</Text>
        </View>
        <Text style={styles.time}>{formatDuration(call.duration)}</Text>
      </View>

      <Text style={styles.title}>{call.widgetName || 'Voice widget'}</Text>
      <Text style={styles.started}>{formatDate(call.startTime)}</Text>

      <View style={styles.rule} />

      <View style={styles.footer}>
        <View>
          <Text style={styles.metaLabel}>OUTCOME</Text>
          <Text style={styles.metaValue}>{call.outcome ? formatLabel(call.outcome) : 'Not recorded'}</Text>
        </View>
        <View style={styles.idGroup}>
          <Text style={styles.metaLabel}>CALL ID</Text>
          <Text style={styles.callId}>{call.id.slice(0, 8)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E2321', borderColor: '#3A413D', borderRadius: 10,
    borderWidth: 1, marginBottom: 12, padding: 16,
  },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  status: {
    alignItems: 'center', borderRadius: 999, borderWidth: 1,
    flexDirection: 'row', paddingHorizontal: 9, paddingVertical: 5,
  },
  statusDot: { borderRadius: 999, height: 6, marginRight: 6, width: 6 },
  statusText: { fontFamily: 'Inter-Medium', fontSize: 10 },
  time: { color: '#EDE8DD', fontFamily: mono, fontSize: 16 },
  title: { color: '#EDE8DD', fontFamily: 'Inter-SemiBold', fontSize: 17, marginTop: 16 },
  started: { color: '#A7AAA5', fontFamily: 'Inter-Regular', fontSize: 12, marginTop: 4 },
  rule: { backgroundColor: '#3A413D', height: 1, marginVertical: 14 },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
  idGroup: { alignItems: 'flex-end' },
  metaLabel: {
    color: '#777C77', fontFamily: 'Inter-SemiBold', fontSize: 9,
    letterSpacing: 1.2, marginBottom: 4,
  },
  metaValue: { color: '#A7AAA5', fontFamily: 'Inter-Regular', fontSize: 12 },
  callId: { color: '#A7AAA5', fontFamily: mono, fontSize: 12 },
});
