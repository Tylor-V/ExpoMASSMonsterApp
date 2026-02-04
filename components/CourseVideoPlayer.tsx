import React, {memo, useEffect, useMemo, useState} from 'react';
import {AppState, AppStateStatus, StyleProp, View, ViewStyle} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import {WebView} from 'react-native-webview';

interface CourseVideoPlayerProps {
  uri: string;
  containerStyle?: StyleProp<ViewStyle>;
  webViewStyle?: StyleProp<ViewStyle>;
  allowFullscreen?: boolean;
  active?: boolean;
  renderLoading?: () => React.ReactNode;
}

const CourseVideoPlayer = ({
  uri,
  containerStyle,
  webViewStyle,
  allowFullscreen = false,
  active = true,
  renderLoading,
}: CourseVideoPlayerProps) => {
  const isFocused = useIsFocused();
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  const shouldRender = active && isFocused && appState === 'active';
  const source = useMemo(() => ({uri}), [uri]);

  if (!shouldRender) {
    return <View style={containerStyle} />;
  }

  return (
    <View style={containerStyle}>
      <WebView
        source={source}
        style={webViewStyle}
        allowsFullscreenVideo={allowFullscreen}
        mediaPlaybackRequiresUserAction={false}
        startInLoadingState={!!renderLoading}
        renderLoading={renderLoading}
      />
    </View>
  );
};

export default memo(CourseVideoPlayer);
