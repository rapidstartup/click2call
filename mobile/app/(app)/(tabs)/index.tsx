import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { fetchWidgets } from '@/services/api';
import { Widget } from '@/types/widget';
import WidgetCard from '@/components/WidgetCard';
import { LayoutGrid } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardScreen() {
  const { user } = useAuth();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load widgets on component mount
  useEffect(() => {
    loadWidgets();
  }, []);

  // Function to load widgets
  const loadWidgets = async () => {
    try {
      setError(null);
      const data = await fetchWidgets();
      setWidgets(data);
    } catch (error) {
      console.error('Error loading widgets:', error);
      setError('Failed to load widgets. Please try again.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadWidgets();
  };

  // Toggle widget active state
  const handleToggleActive = (id: string, isActive: boolean) => {
    setWidgets(prevWidgets =>
      prevWidgets.map(widget =>
        widget.id === id ? { ...widget, isActive } : widget
      )
    );
  };

  // Toggle widget route to app setting
  const handleToggleRouteToApp = (id: string, routeToApp: boolean) => {
    setWidgets(prevWidgets =>
      prevWidgets.map(widget =>
        widget.id === id ? { ...widget, routeToApp } : widget
      )
    );
  };

  // Calculate summary statistics
  const activeWidgets = widgets.filter(w => w.isActive).length;
  const routedToAppWidgets = widgets.filter(w => w.routeToApp && w.isActive).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSubtitle}>
          Welcome back, {user?.name || 'User'}
        </Text>
      </View>

      {/* Summary cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{widgets.length}</Text>
          <Text style={styles.summaryLabel}>Total Widgets</Text>
        </View>
        
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{activeWidgets}</Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
        
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{routedToAppWidgets}</Text>
          <Text style={styles.summaryLabel}>Routed to App</Text>
        </View>
      </View>

      {/* Widgets list */}
      <View style={styles.widgetsContainer}>
        <Text style={styles.sectionTitle}>Your Widgets</Text>
        
        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : widgets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <LayoutGrid size={48} color="#6B7280" />
            <Text style={styles.emptyText}>No widgets found</Text>
            <Text style={styles.emptySubtext}>
              Your widgets will appear here once created
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
            {widgets.map(widget => (
              <WidgetCard
                key={widget.id}
                widget={widget}
                onToggleActive={handleToggleActive}
                onToggleRouteToApp={handleToggleRouteToApp}
              />
            ))}
          </ScrollView>
        )}
      </View>
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
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  summaryValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#2563EB',
    marginBottom: 4,
  },
  summaryLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#D1D5DB',
  },
  widgetsContainer: {
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