import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Widget } from '@/types/widget';
import WidgetCard from '@/components/WidgetCard';
import CreateWidgetModal from '@/components/CreateWidgetModal';
import WidgetShareModal from '@/components/WidgetShareModal';
import { LayoutGrid, Plus } from 'lucide-react-native';
import { useAuth } from '@/lib/context/AuthContext';
import { fetchWidgets, createWidget } from '@/lib/api/widgets';

export default function DashboardScreen() {
  const { user } = useAuth();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<Widget | null>(null);

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

  // Handle widget creation
  const handleCreateWidget = async (widgetData: Partial<Widget>) => {
    try {
      setError(null);
      const newWidget = await createWidget(widgetData);
      setWidgets(prevWidgets => [...prevWidgets, newWidget]);
      setCreateModalVisible(false);
    } catch (error) {
      console.error('Error creating widget:', error);
      setError('Failed to create widget. Please try again.');
    }
  };

  // Handle widget sharing
  const handleShareWidget = (widget: Widget) => {
    setSelectedWidget(widget);
    setShareModalVisible(true);
  };

  // Calculate summary statistics
  const activeWidgets = widgets.filter(w => w.isActive).length;
  const routedToAppWidgets = widgets.filter(w => w.routeToApp && w.isActive).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSubtitle}>
          Welcome back, {user?.email}
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
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Widgets</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setCreateModalVisible(true)}
          >
            <Plus size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
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
              Create a widget to get started
            </Text>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => setCreateModalVisible(true)}
            >
              <Text style={styles.createButtonText}>Create Widget</Text>
            </TouchableOpacity>
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
                onShare={handleShareWidget}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Create Widget Modal */}
      <CreateWidgetModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSave={handleCreateWidget}
      />

      {/* Share Widget Modal */}
      <WidgetShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        widget={selectedWidget}
      />
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#FFFFFF',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  createButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#FFFFFF',
  },
});