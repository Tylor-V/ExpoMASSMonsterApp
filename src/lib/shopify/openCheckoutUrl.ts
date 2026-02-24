import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

export async function openCheckoutUrl(url: string): Promise<void> {
  if (!url) {
    throw new Error('Missing checkout URL.');
  }

  try {
    await Linking.openURL(url);
    return;
  } catch (linkingError) {
    try {
      await WebBrowser.openBrowserAsync(url);
      return;
    } catch {
      throw linkingError instanceof Error
        ? linkingError
        : new Error('Could not open checkout URL.');
    }
  }
}
