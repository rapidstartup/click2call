import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Phone } from 'lucide-react-native';

import CallCard from '@/components/CallCard';
import { fetchCallHistory } from '@/services/api';
import type { CallData } from '@/types/widget';

export default function CallsScreen() {
  const [calls, setCalls] = useState<CallData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCalls = useCallback(async () => {
    try {
      setError(null);
      setCalls(await fetchCallHistory());
    } catch (loadError) {
      console.error('Error loading call history:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load call history');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadCalls();
  }, [loadCalls]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadCalls();
  };

  const completed = calls.filter((call) => call.status === 'completed').length;
  const minutes = Math.round(calls.reduce((total, call) => total + call.duration, 0) / 60);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>CALL LEDGER</Text>
        <Text style={styles.headerTitle}>Every conversation, accounted for.</Text>
        <Text style={styles.headerSubtitle}>
          Your latest Vapi calls from the same account as the web dashboard.
        </Text>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{calls.length}</Text>
          <Text style={styles.summaryLabel}>Recent calls</Text>
        </View>
        <View style={styles.summaryRule} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{completed}</Text>
          <Text style={styles.summaryLabel}>Completed</Text>
        </View>
        <View style={styles.summaryRule} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{minutes}</Text>
          <Text style={styles.summaryLabel}>Minutes</Text>
        </View>
      </View>

      <View style={styles.ledgerHeader}>
        <Text style={styles.sectionTitle}>Latest activity</Text>
        <Text style={styles.sectionMeta}>LAST 50</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size='large' color='#E86041' />
          <Text style={styles.loadingText}>Reading the call ledger…</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={(
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor='#E86041'
              colors={['#E86041']}
            />
          )}
        >
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => void loadCalls()}>
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          )}

          {calls.length === 0 && !error ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Phone size={24} color='#E86041' />
              </View>
              <Text style={styles.emptyTitle}>No calls recorded yet</Text>
              <Text style={styles.emptyText}>
                Completed web voice calls will appear here after Vapi reports them.
              </Text>
            </View>
          ) : (
            calls.map((call) => <CallCard key={call.id} call={call} />)
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#171B19' },
  header: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 20 },
  eyebrow: {
    color: '#E86041', fontFamily: 'Inter-SemiBold', fontSize: 10,
    letterSpacing: 2.2, marginBottom: 10,
  },
  headerTitle: { color: '#EDE8DD', fontFamily: 'Inter-Bold', fontSize: 27, lineHeight: 34 },
  headerSubtitle: {
    color: '#A7AAA5', fontFamily: 'Inter-Regular', fontSize: 14,
    lineHeight: 21, marginTop: 7, maxWidth: 350,
  },
  summary: {
    borderBottomColor: '#3A413D', borderBottomWidth: 1, borderTopColor: '#3A413D',
    borderTopWidth: 1, flexDirection: 'row', marginHorizontal: 20, paddingVertical: 16,
  },
  summaryItem: { flex: 1 },
  summaryRule: { backgroundColor: '#3A413D', marginHorizontal: 12, width: 1 },
  summaryValue: { color: '#EDE8DD', fontFamily: 'Inter-Bold', fontSize: 23 },
  summaryLabel: {
    color: '#777C77', fontFamily: 'Inter-Medium', fontSize: 9,
    letterSpacing: 1, marginTop: 4, textTransform: 'uppercase',
  },
  ledgerHeader: {
    alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12, paddingTop: 24,
  },
  sectionTitle: { color: '#EDE8DD', fontFamily: 'Inter-SemiBold', fontSize: 16 },
  sectionMeta: { color: '#777C77', fontFamily: 'Inter-SemiBold', fontSize: 9, letterSpacing: 1.5 },
  scrollContent: { paddingBottom: 30, paddingHorizontal: 20 },
  centered: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  loadingText: { color: '#A7AAA5', fontFamily: 'Inter-Regular', fontSize: 13, marginTop: 12 },
  errorContainer: {
    backgroundColor: '#2A201E', borderColor: '#6A362C', borderRadius: 10,
    borderWidth: 1, marginBottom: 12, padding: 14,
  },
  errorText: { color: '#F1B5A7', fontFamily: 'Inter-Regular', fontSize: 13, lineHeight: 19 },
  retryText: { color: '#E86041', fontFamily: 'Inter-SemiBold', fontSize: 13, marginTop: 8 },
  emptyContainer: {
    alignItems: 'center', borderColor: '#3A413D', borderRadius: 10,
    borderWidth: 1, paddingHorizontal: 28, paddingVertical: 36,
  },
  emptyIcon: {
    alignItems: 'center', backgroundColor: '#2A2E2B', borderRadius: 999,
    height: 52, justifyContent: 'center', marginBottom: 16, width: 52,
  },
  emptyTitle: { color: '#EDE8DD', fontFamily: 'Inter-SemiBold', fontSize: 17 },
  emptyText: {
    color: '#A7AAA5', fontFamily: 'Inter-Regular', fontSize: 13,
    lineHeight: 20, marginTop: 8, textAlign: 'center',
  },
});
