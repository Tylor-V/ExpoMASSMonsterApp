import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';

interface Props {
  image?: any;
  videoUrl?: string;
  anatomyLabel?: string;
  showVideo?: boolean;
  onPressImage?: () => void;
}

const {width} = Dimensions.get('window');

const MediaBlock = ({image, videoUrl, anatomyLabel, showVideo, onPressImage}: Props) => (
  <View>
    {image && (
      <TouchableOpacity onPress={onPressImage}>
        <View style={styles.heroContainer}>
          <Image source={image} style={styles.heroImg} contentFit="contain" />
          {anatomyLabel && <Text style={styles.anatomyLabel}>{anatomyLabel}</Text>}
        </View>
      </TouchableOpacity>
    )}
    {videoUrl && showVideo && (
      <WebView
        source={{uri: videoUrl}}
        style={styles.heroVideo}
        allowsFullscreenVideo={false}
        mediaPlaybackRequiresUserAction={false}
      />
    )}
  </View>
);

export default React.memo(MediaBlock);

const styles = StyleSheet.create({
  heroContainer: {alignItems: 'center', marginBottom: 10},
  heroImg: {
    width: width - 48,
    height: 260,
    borderRadius: 20,
    marginBottom: 3,
    backgroundColor: '#101010',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: {width: 0, height: 8},
    shadowRadius: 16,
    elevation: 8,
  },
  anatomyLabel: {
    color: '#FFCC00',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 1,
    marginBottom: 2,
  },
  heroVideo: {
    width: width - 40,
    aspectRatio: 9 / 16,
    borderRadius: 18,
    marginBottom: 12,
    backgroundColor: '#222',
    alignSelf: 'center',
  },
});