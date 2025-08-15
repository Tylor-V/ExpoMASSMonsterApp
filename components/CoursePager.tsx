import React, {useRef, useState, forwardRef, useImperativeHandle} from 'react';
import {View, StyleSheet, TouchableOpacity, ViewStyle, Text} from 'react-native';
import { radius } from '../theme';
import PagerView from 'react-native-pager-view';
import Icon from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import { TAB_BAR_HEIGHT } from './SwipeableTabs';

interface CoursePagerProps {
  pages: React.ReactNode[];
  // eslint-disable-next-line no-unused-vars
  onPageChange?: (pageIndex: number) => void;
  onBack?: () => void;
  onFinish?: () => void;
  finishLabel?: string;
  style?: ViewStyle | ViewStyle[];
  /**
   * Override dots. When provided, dotsCount will determine the
   * number of dots rendered and dotIndex will be used for the active
   * dot. If hideDots is true, dots will not be shown.
   */
  dotsCount?: number;
  dotIndex?: number;
  hideDots?: boolean;
  /**
   * Optional progress bar at the top of the pager. Value should be
   * between 0 and 1.
   */
  progress?: number;
  progressColor?: string;
  /**
   * Pages that should hide the header, dots, and progress bar.
   */
  fullScreenPages?: number[];
}

export interface CoursePagerHandle {
  goToPage: (index: number) => void;
  goToPageWithoutAnimation: (index: number) => void;
}

const CoursePager = forwardRef<CoursePagerHandle, CoursePagerProps>(function CoursePager({
  pages,
  onPageChange,
  onBack,
  onFinish,
  finishLabel = 'Finish',
  style,
  dotsCount,
  dotIndex,
  hideDots,
  progress,
  progressColor = '#FFCC00',
  fullScreenPages,
}, ref) {
  const pagerRef = useRef<PagerView>(null);
  const [page, setPage] = useState(0);
  const insets = useSafeAreaInsets();

  const goToPage = (idx: number) => {
    pagerRef.current?.setPage(idx);
    setPage(idx);
    onPageChange?.(idx);
  };

  const goToPageWithoutAnimation = (idx: number) => {
    pagerRef.current?.setPageWithoutAnimation(idx);
    setPage(idx);
    onPageChange?.(idx);
  };

  useImperativeHandle(ref, () => ({goToPage, goToPageWithoutAnimation}));

  const handlePageSelected = (e: any) => {
    const pos = e.nativeEvent.position;
    setPage(pos);
    onPageChange?.(pos);
  };

  const isFullScreen = fullScreenPages?.includes(page);
  
  return (
    <View style={{flex: 1, backgroundColor: '#FFFFFF'}}>
      <View
        style={[
          styles.root,
          style,
          {paddingTop: 0, paddingBottom: 0},
        ]}>
        {!isFullScreen && (
          <>
            <View style={[styles.headerBg, {height: insets.top + 40}]} />
            {onBack && (
              <TouchableOpacity
                onPress={onBack}
                style={[styles.backBtn, {top: insets.top}]}
                accessibilityLabel="Home">
                <Icon name="home-outline" size={28} color="#FFF" />
              </TouchableOpacity>
            )}
          </>
        )}
      <PagerView
        style={{flex: 1}}
        initialPage={0}
        ref={pagerRef}
        onPageSelected={handlePageSelected}
        scrollEnabled={false}
        orientation="horizontal">
        {pages.map((content, idx) => (
          <View key={idx} style={{flex: 1}}>
            {typeof content === 'string' ? <Text>{content}</Text> : content}
          </View>
        ))}
      </PagerView>
      {!hideDots && !isFullScreen && (
        <View style={[styles.dots, {top: insets.top + 14}]}>
          {(dotsCount ? Array.from({length: dotsCount}) : pages).map((_, i) => (
            <View
              key={i}
              style={[styles.dot, (dotIndex ?? page) === i && styles.dotActive]}
            />
          ))}
        </View>
      )}
      {typeof progress === 'number' && !isFullScreen && (
        <View style={[styles.progressTrack, {top: insets.top + 40}]}>
          <View
            style={[
              styles.progressBar,
              {width: `${Math.min(1, Math.max(0, progress)) * 100}%`, backgroundColor: progressColor},
            ]}
          />
        </View>
      )}
    </View>
  </View>
  );
});

const styles = StyleSheet.create({
  root: {flex: 1, position: 'relative'},
  backBtn: {
    position: 'absolute',
    top: 24,
    left: 16,
    zIndex: 20,
    padding: 5,
  },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e2e2e2',
    marginHorizontal: 5,
    borderWidth: 1.2,
    borderColor: '#444',
  },
  dotActive: {
    backgroundColor: '#FFCC00',
    borderColor: '#FFCC00',
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#e2e2e2',
    zIndex: 15,
  },
  progressBar: {
    height: 3,
  },
  headerBg: {
    position: 'absolute',
    borderBottomColor: '#E2E2E2',
    borderBottomWidth: 2,
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000',
    opacity: 0.8,
    zIndex: 10,
  },
});

export default React.memo(CoursePager);