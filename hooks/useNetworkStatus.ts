import * as Network from 'expo-network';
import { useEffect, useState } from 'react';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    let subscription: Network.NetworkStateSubscription | undefined;

    const updateStatus = async () => {
      const state = await Network.getNetworkStateAsync();
      setIsConnected(state.isConnected);
    };

    updateStatus();

    subscription = Network.addNetworkStateListener(state => {
      setIsConnected(state.isConnected);
    });

    return () => {
      subscription && subscription.remove();
    };
  }, []);

  return isConnected;
}