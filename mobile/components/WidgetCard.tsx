import React from 'react';
import { StyleSheet, View, Text, Switch, TouchableOpacity, Alert } from 'react-native';
import { Widget } from '@/types/widget';
import { PhoneCall, Power, Share2, Link } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '@/lib/superbase';

type WidgetCardProps = {
  widget: Widget;
  onToggleActive: (id: string, isActive: boolean) => void;
  onToggleRouteToApp: (id: string, routeToApp: boolean) => void;
  onShare: (widget: Widget) => void;
};

export default function WidgetCard({ widget, onToggleActive, onToggleRouteToApp, onShare }: WidgetCardProps) {
  const isActive = widget.settings?.isActive ?? true;
  const routeToApp = widget.settings?.routeToApp ?? true;
  let shareableUrl = `http://localhost:5173/widget/${widget.id}`;


  const handleCopyUrl = async () => {
    if (shareableUrl) {
      await Clipboard.setStringAsync(shareableUrl);
      Alert.alert('Success', 'Shareable URL copied to clipboard!');
    }
  };

  const handleToggleActive = async (value: boolean) => {
    try {
      

      const newSettings = {
        ...widget.settings,
        isActive: value
      };

      const { error } = await supabase
        .from('widgets')
        .update({
          settings: newSettings
        })
        .eq('id', widget.id);

      if (error) throw error;
      
      console.log(`Widget active state updated successfully:`, {
        widgetId: widget.id,
        newSettings
      });
      
      onToggleActive(widget.id, value);
    } catch (error) {
      console.error('Error updating widget active state:', error);
      Alert.alert('Error', 'Failed to update widget status');
    }
  };

  const handleToggleRouteToApp = async (value: boolean) => {
    try {
      

      const newSettings = {
        ...widget.settings,
        routeToApp: value
      };

      const { error } = await supabase
        .from('widgets')
        .update({
          settings: newSettings
        })
        .eq('id', widget.id);

      if (error) throw error;
      
      onToggleRouteToApp(widget.id, value);
    } catch (error) {
      console.error('Error updating widget route setting:', error);
      Alert.alert('Error', 'Failed to update routing settings');
    }
  };

  return (
    <View style={[styles.card, !isActive && styles.inactiveCard]}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <PhoneCall size={20} color="#2563EB" />
        </View>
        <Text style={styles.title}>{widget.name}</Text>
      </View>
      
      <View style={styles.details}>
        <Text style={styles.type}>Type: {widget.type}</Text>
        <Text style={styles.date}>Created: {new Date(widget.created_at).toLocaleDateString()}</Text>
        {widget.destination && (
          <Text style={styles.url} numberOfLines={1} ellipsizeMode="middle">
            Destination: {widget.destination}
          </Text>
        )}
      
          <TouchableOpacity onPress={handleCopyUrl}>
            <View style={styles.shareableUrlContainer}>
              <Link size={14} color="#2563EB" style={styles.linkIcon} />
              <Text style={styles.shareableUrl} numberOfLines={1} ellipsizeMode="middle">
                {shareableUrl}
              </Text>
            </View>
          </TouchableOpacity>
        
      </View>
      
      <View style={styles.actions}>
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Active</Text>
          <Switch
            trackColor={{ false: '#555', true: '#2563EB' }}
            thumbColor="#ffffff"
            ios_backgroundColor="#555"
            onValueChange={handleToggleActive}
            value={isActive}
          />
        </View>
        
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Route to app</Text>
          <Switch
            trackColor={{ false: '#555', true: '#2563EB' }}
            thumbColor="#ffffff"
            ios_backgroundColor="#555"
            onValueChange={handleToggleRouteToApp}
            value={routeToApp}
            disabled={!isActive}
          />
        </View>
      </View>
      
      <TouchableOpacity 
        style={[
          styles.powerButton, 
          isActive ? styles.powerActive : styles.powerInactive
        ]}
        onPress={() => handleToggleActive(!isActive)}
      >
        <Power size={16} color="#FFFFFF" />
      </TouchableOpacity>

      {widget.shareableUrl && (
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={() => onShare(widget)}
          disabled={!isActive}
        >
          <Share2 size={16} color="#FFFFFF" />
        </TouchableOpacity>
      )}
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
    marginBottom: 4,
  },
  url: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#2563EB',
    marginBottom: 4,
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
  shareButton: {
    position: 'absolute',
    top: 12,
    right: 50,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2563EB',
  },
  shareableUrlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  linkIcon: {
    marginRight: 6,
  },
  shareableUrl: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#2563EB',
    flex: 1,
  },
});