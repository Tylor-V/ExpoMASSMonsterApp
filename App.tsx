import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as NativeSplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
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
import RewardsScreen from './screens/RewardsScreen';
import SettingsScreen from './screens/SettingsScreen';
import SplashScreen from './screens/SplashScreen';
import SplitEditorScreen from './screens/SplitEditorScreen';
import TermsPrivacyScreen from './screens/TermsPrivacyScreen';
import WorkoutHistoryScreen from './screens/WorkoutHistoryScreen';
import { preloadGlobals } from './utils/preloadTools';
import { useNews } from './hooks/useNews';

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
    </AppStack.Navigator>
  );
}

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

  if (!fontsLoaded) {
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
              <RootStack.Screen name="AppStack">
                {() => (
                  <AppStackScreen
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