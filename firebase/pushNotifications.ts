import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import { firestore, FieldValue } from './firebase';

type EnsurePushRegisteredArgs = {
  uid: string;
  accepted: boolean;
  notificationPrefs?: Record<string, boolean>;
};

const getProjectId = (): string | undefined => {
  const expoProjectId = Constants.expoConfig?.extra?.eas?.projectId;
  const easProjectId = (Constants as any).easConfig?.projectId;
  return expoProjectId ?? easProjectId;
};

const getDeviceKey = async (expoPushToken: string): Promise<string> => {
  try {
    const installationIdGetter = (Application as any).getInstallationIdAsync as
      | (() => Promise<string>)
      | undefined;
    const installationId = installationIdGetter
      ? await installationIdGetter()
      : null;
    if (installationId) {
      return installationId;
    }
  } catch (error) {
    console.warn('Unable to get installation id for push token device key', error);
  }
  return expoPushToken;
};

export async function ensurePushRegisteredAndSaved({
  uid,
  accepted,
  notificationPrefs,
}: EnsurePushRegisteredArgs): Promise<(() => void) | undefined> {
  if (!uid || !accepted || !Device.isDevice) {
    return;
  }

  const existingPermissions = await Notifications.getPermissionsAsync();
  let status = existingPermissions.status;
  if (status !== 'granted') {
    const requestedPermissions = await Notifications.requestPermissionsAsync();
    status = requestedPermissions.status;
  }

  if (status !== 'granted') {
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId = getProjectId();
  if (!projectId) {
    console.warn('Unable to register push notifications: missing EAS projectId.');
    return;
  }

  let expoPushToken: string;
  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    expoPushToken = tokenResponse.data;
  } catch (error) {
    console.warn('Unable to fetch Expo push token', error);
    return;
  }

  const deviceKey = await getDeviceKey(expoPushToken);
  const payload: Record<string, unknown> = {
    expoPushToken,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (notificationPrefs) {
    payload.notificationPrefs = notificationPrefs;
  }

  await firestore()
    .collection('users')
    .doc(uid)
    .collection('devices')
    .doc(deviceKey)
    .set(payload, { merge: true });

  const receivedSubscription = Notifications.addNotificationReceivedListener(
    notification => {
      console.log('Notification received in foreground', notification.request.identifier);
    },
  );

  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    response => {
      console.log('Notification response received', response.notification.request.identifier);
    },
  );

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}
