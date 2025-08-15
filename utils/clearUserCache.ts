import AsyncStorage from '@react-native-async-storage/async-storage';

export async function clearUserCache(): Promise<void> {
  try {
    await AsyncStorage.clear();
  } catch (e) {
    console.warn('Failed to clear user cache', e);
  }
}