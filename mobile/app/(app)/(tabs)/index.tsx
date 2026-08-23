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
import { PhoneCall } from 'lucide-react-native';

import WidgetCard from '@/components/WidgetCard';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWidgets, setWidgetRoute } from '@/services/api';
import type { Widget } from '@/types/widget';

export default function DashboardScreen() {
  const { user } = useAuth();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadWidgets = useCallback(async () => {
    try {
      setError(null);
      setWidgets(await fetchWidgets());
    } catch (loadError) {
      console.error('Error loading widgets:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load widgets');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadWidgets();
  }, [loadWidgets]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadWidgets();
  };

  const handleToggleRouteToApp = async (id: string, routeToApp: boolean) => {
    setUpdatingId(id);
    setError(null);
    try {
      await setWidgetRoute(id, routeToApp);
      setWidgets((current) => current.map((widget) => (
        widget.id === id ? { ...widget, routeToApp } : widget
      )));
    } catch (routeError) {
      setError(routeError instanceof Error ? routeError.message : 'Failed to update route');
    } finally {
      setUpdatingId(null);
    }
  };

  const routedCount = widgets.filter((widget) => widget.routeToApp).length;
  const displayName = typeof user?.user_metadata?.name === 'string'
    ? user.user_metadata.name
    : user?.email?.split('@')[0] || 'there';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>THE EXCHANGE</Text>
        <Text style={styles.headerTitle}>Good to see you, {displayName}.</Text>
        <Text style={styles.headerSubtitle}>
          Choose which live call buttons should ring this device.
        </Text>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{widgets.length}</Text>
          <Text style={styles.summaryLabel}>Call buttons</Text>
        </View>
        <View style={styles.summaryRule} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, styles.liveValue]}>{routedCount}</Text>
          <Text style={styles.summaryLabel}>Ring here</Text>
        </View>
      </View>

      <View style={styles.ledgerHeader}>
        <Text style={styles.sectionTitle}>Your call buttons</Text>
        <Text style={styles.sectionMeta}>LIVE API</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size='large' color='#E86041' />
          <Text style={styles.loadingText}>Opening the exchange…</Text>
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
              <TouchableOpacity onPress={() => void loadWidgets()}>
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          )}

          {widgets.length === 0 && !error ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <PhoneCall size={24} color='#E86041' />
              </View>
              <Text style={styles.emptyTitle}>No call buttons yet</Text>
              <Text style={styles.emptyText}>
                Create a widget in the web dashboard, then pull down to refresh this ledger.
              </Text>
            </View>
          ) : (
            widgets.map((widget) => (
              <WidgetCard
                key={widget.id}
                widget={widget}
                isUpdating={updatingId === widget.id}
                onToggleRouteToApp={(id, value) => void handleToggleRouteToApp(id, value)}
              />
            ))
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
    lineHeight: 21, marginTop: 7, maxWidth: 340,
  },
  summary: {
    borderBottomColor: '#3A413D', borderBottomWidth: 1, borderTopColor: '#3A413D',
    borderTopWidth: 1, flexDirection: 'row', marginHorizontal: 20, paddingVertical: 16,
  },
  summaryItem: { flex: 1 },
  summaryRule: { backgroundColor: '#3A413D', marginHorizontal: 20, width: 1 },
  summaryValue: { color: '#EDE8DD', fontFamily: 'Inter-Bold', fontSize: 25 },
  liveValue: { color: '#3E9A77' },
  summaryLabel: {
    color: '#777C77', fontFamily: 'Inter-Medium', fontSize: 10,
    letterSpacing: 1.2, marginTop: 4, textTransform: 'uppercase',
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
