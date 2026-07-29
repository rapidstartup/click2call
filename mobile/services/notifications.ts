import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { registerDevice } from '@/services/api';

export const registerDeviceForPushNotifications = async (): Promise<void> => {
  if (Platform.OS === 'web' || !Device.isDevice) {
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let status = existingStatus;

  if (status !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
  }

  if (status !== 'granted') {
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('calls', {
      name: 'Calls',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
  const pushToken = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );

  await registerDevice({
    deviceToken: pushToken.data,
    deviceName: Device.modelName || 'Unknown device',
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    appVersion: Constants.expoConfig?.version || '1.0.0',
  });
};
