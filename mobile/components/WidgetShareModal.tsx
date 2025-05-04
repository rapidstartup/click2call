import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
  TextInput,
} from 'react-native';
import { Widget } from '@/types/widget';
import { X, Copy, Share2 } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

type WidgetShareModalProps = {
  visible: boolean;
  onClose: () => void;
  widget: Widget | null;
};

export default function WidgetShareModal({
  visible,
  onClose,
  widget,
}: WidgetShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!widget) return null;

  const handleCopyLink = async () => {
    try {
      if (widget.shareableUrl) {
        await Clipboard.setStringAsync(widget.shareableUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  const handleShare = async () => {
    try {
      if (widget.shareableUrl) {
        await Share.share({
          message: `Check out my widget: ${widget.shareableUrl}`,
          url: widget.shareableUrl,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to share the link');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Share Widget</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.widgetName}>{widget.name}</Text>
            
            <View style={styles.linkContainer}>
              <TextInput
                style={styles.linkInput}
                value={widget.shareableUrl}
                editable={false}
                selectTextOnFocus
              />
              <TouchableOpacity style={styles.copyButton} onPress={handleCopyLink}>
                <Copy size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            {copied && (
              <Text style={styles.copiedText}>Copied to clipboard!</Text>
            )}

            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                Share this link with anyone who wants to call you. When they open the link,
                you'll receive a call notification on your device.
              </Text>
            </View>

            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Share2 size={18} color="#FFFFFF" style={styles.shareIcon} />
              <Text style={styles.shareButtonText}>Share Link</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#323232',
  },
  title: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  widgetName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 20,
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  linkInput: {
    flex: 1,
    backgroundColor: '#323232',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontFamily: 'Inter-Regular',
  },
  copyButton: {
    backgroundColor: '#2563EB',
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginLeft: 8,
  },
  copiedText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#10B981',
    marginBottom: 16,
  },
  infoContainer: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.3)',
  },
  infoText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
  },
  shareButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  shareIcon: {
    marginRight: 8,
  },
  shareButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#FFFFFF',
  },
}); 