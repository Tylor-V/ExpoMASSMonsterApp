import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { NavigationContainer, StackActions, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as NativeSplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ForgotPasswordScreen from './LoginScreens/ForgotPasswordScreen';
import LoginScreen from './LoginScreens/LoginScreen';
import SignUpScreen from './LoginScreens/SignUpScreen';
import MainAppScreen from './MainScreens/MainAppScreen';
import { AppContextProvider } from './firebase/AppContext';
import { CartProvider } from './hooks/useCart';
import AccountScreen from './screens/AccountScreen';
import AccountabilityFormScreen from './screens/AccountabilityFormScreen';
import DMChatScreen from './screens/DMChatScreen';
import DMInboxScreen from './screens/DMInboxScreen';
import DonateSupportScreen from './screens/DonateSupportScreen';
import GymVideoFeed from './screens/GymVideoFeed';
import HelpFaqScreen from './screens/HelpFaqScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import OnlineStatusScreen from './screens/OnlineStatusScreen';
import ModerationQueueScreen from './screens/ModerationQueueScreen';
import RewardsScreen from './screens/RewardsScreen';
import SettingsScreen from './screens/SettingsScreen';
import SplashScreen from './screens/SplashScreen';
import SplitEditorScreen from './screens/SplitEditorScreen';
import AcceptanceGateScreen from './screens/AcceptanceGateScreen';
import InAppWebViewScreen from './screens/InAppWebViewScreen';
import TermsPrivacyScreen from './screens/TermsPrivacyScreen';
import WorkoutHistoryScreen from './screens/WorkoutHistoryScreen';
import { preloadGlobals } from './utils/preloadTools';
import { useNews } from './hooks/useNews';
import { useAppContext } from './firebase/AppContext';
import { hasAcceptedLatest } from './utils/acceptance';

// Keep the native splash screen visible until the first render
NativeSplashScreen.preventAutoHideAsync().catch(err =>
  console.error('Failed to prevent auto hide', err)
);

const RootStack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();

function AuthStackScreen() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

function AppStackScreen({ news, newsLoaded, newsOpen, setNewsOpen }) {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="MainApp">
        {(props) => (
          <MainAppScreen
            {...props}
            news={news}
            newsLoaded={newsLoaded}
            newsOpen={newsOpen}
            setNewsOpen={setNewsOpen}
          />
        )}
      </AppStack.Screen>
      <AppStack.Screen name="DMInbox" component={DMInboxScreen} />
      <AppStack.Screen name="DMChat" component={DMChatScreen} />
      <AppStack.Screen name="GymVideoFeed" component={GymVideoFeed} />
      <AppStack.Screen name="Rewards" component={RewardsScreen} />
      <AppStack.Screen name="Settings" component={SettingsScreen} />
      <AppStack.Screen name="Account" component={AccountScreen} />
      <AppStack.Screen name="OnlineStatus" component={OnlineStatusScreen} />
      <AppStack.Screen name="WorkoutHistory" component={WorkoutHistoryScreen} />
      <AppStack.Screen name="NotificationsScreen" component={NotificationsScreen} />
      <AppStack.Screen name="HelpFAQ" component={HelpFaqScreen} />
      <AppStack.Screen name="TermsPrivacy" component={TermsPrivacyScreen} />
      <AppStack.Screen name="DonateSupport" component={DonateSupportScreen} />
      <AppStack.Screen name="SplitEditor" component={SplitEditorScreen} />
      <AppStack.Screen name="AccountabilityForm" component={AccountabilityFormScreen} />
      <AppStack.Screen name="ModerationQueue" component={ModerationQueueScreen} />
    </AppStack.Navigator>
  );
}

function GuardedAppStackScreen({ news, newsLoaded, newsOpen, setNewsOpen }) {
  const { appReady, authUser, user, userError, retryUserLoad, signOut } = useAppContext();
  const navigation = useNavigation();
  const hasRedirected = useRef<string | null>(null);

  const hasAuthUser = Boolean(authUser);
  const hasUserDataLoadError =
    hasAuthUser && userError?.code === 'USER_DATA_LOAD_FAILED';

  const targetRoute = !appReady
    ? null
    : hasUserDataLoadError
      ? null
      : !user
        ? 'AuthStack'
        : !hasAcceptedLatest(user)
          ? 'AcceptanceGate'
          : null;

  useEffect(() => {
    if (!targetRoute) {
      hasRedirected.current = null;
      return;
    }

    if (hasRedirected.current === targetRoute) {
      return;
    }

    hasRedirected.current = targetRoute;
    navigation.dispatch(StackActions.replace(targetRoute));
  }, [navigation, targetRoute]);

  if (!appReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (hasUserDataLoadError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Can’t load account data</Text>
        <Text style={styles.errorBody}>
          We couldn’t load your account details right now. Check your connection and try again.
        </Text>
        <View style={styles.errorActions}>
          <Pressable style={styles.retryButton} onPress={() => retryUserLoad()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
          <Pressable style={styles.signOutButton} onPress={() => signOut()}>
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (targetRoute) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  return (
    <AppStackScreen
      news={news}
      newsLoaded={newsLoaded}
      newsOpen={newsOpen}
      setNewsOpen={setNewsOpen}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontFamily: 'Inter',
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  errorTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    color: '#111827',
    textAlign: 'center',
  },
  errorBody: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 22,
  },
  errorActions: {
    marginTop: 8,
    gap: 10,
  },
  retryButton: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#111827',
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
  },
});

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter: Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });
  const { news, loading } = useNews();
  const [newsOpen, setNewsOpen] = useState(true);
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  useEffect(() => {
    preloadGlobals().finally(() => setAssetsLoaded(true));
  }, []);

  useEffect(() => {
    if (fontsLoaded && assetsLoaded) {
      NativeSplashScreen.hideAsync().catch(err =>
        console.error('Failed to hide splash', err)
      );
    }
  }, [fontsLoaded, assetsLoaded]);

  if (!fontsLoaded || !assetsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppContextProvider>
        <CartProvider>
          <NavigationContainer>
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
              <RootStack.Screen name="Splash" component={SplashScreen} />
              <RootStack.Screen name="AuthStack" component={AuthStackScreen} />
              <RootStack.Screen
                name="AcceptanceGate"
                component={AcceptanceGateScreen}
              />
              <RootStack.Screen
                name="AcceptanceWebView"
                component={InAppWebViewScreen}
              />
              <RootStack.Screen name="AppStack">
                {() => (
                  <GuardedAppStackScreen
                    news={news}
                    newsLoaded={!loading}
                    newsOpen={newsOpen}
                    setNewsOpen={setNewsOpen}
                  />
                )}
              </RootStack.Screen>
            </RootStack.Navigator>
          </NavigationContainer>
        </CartProvider>
      </AppContextProvider>
    </GestureHandlerRootView>
  );
}
