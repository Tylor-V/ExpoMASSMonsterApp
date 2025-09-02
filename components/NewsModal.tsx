import { Ionicons as Icon } from '@expo/vector-icons';
import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

import { getUserBadgeProgress } from '../badges/progressHelpers';

const NewsModal = ({ visible, onClose, news, loading, user }) => {
  const insets = useSafeAreaInsets();
  const badgeProgress = useMemo(() => {
    if (!visible) return [];
    return getUserBadgeProgress(user);
  }, [visible, user]);

  const hasNews = (news?.length ?? 0) > 0;
  const hasBadges = (badgeProgress?.length ?? 0) > 0;

  const data = useMemo(
    () => [...(news ?? []), ...(badgeProgress as any)],
    [news, badgeProgress]
  );

  const renderItem = useCallback(
    ({ item }) => (
      <View style={styles.newsCard}>
        <Text style={styles.newsMsg}>{item.message}</Text>
      </View>
    ),
    []
  );

  const renderNoNews = useCallback(
    () => (
      <Text style={styles.emptyText}>
        No News... Stay tuned for important updates!
      </Text>
    ),
    []
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.container,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Icon name="chevron-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>MASS NEWS</Text>
        </View>
        {loading ? (
          <View style={styles.loaderWrapper}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        ) : (
          <FlatList
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 24 }}
            data={data}
            keyExtractor={(item, idx) => item.id || `badge-${idx}`}
            renderItem={({ item }) =>
              item.message ? (
                renderItem({ item })
              ) : (
                <View style={styles.badgeCard}>
                  <View style={styles.badgeRow}>
                    <Image source={item.image} style={styles.badgeImage} />
                    <Text style={styles.badgeTitle}>{item.id} Badge</Text>
                  </View>
                  <View style={styles.badgeContent}>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressBar,
                          { width: `${Math.round(item.progress * 100)}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.badgePercent}>
                      {Math.round(item.progress * 100)}%
                    </Text>
                  </View>
                  <Text style={styles.requirements}>{item.requirements}</Text>
                </View>
              )
            }
            ListHeaderComponent={!hasNews && hasBadges ? renderNoNews() : null}
            ListEmptyComponent={!hasNews && !hasBadges ? renderNoNews() : null}
            initialNumToRender={5}
          />
        )}

        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>MASS MONSTER LLC</Text>
            <Image
              source={require('../assets/mass-logo.png')}
              style={styles.footerLogo}
              contentFit="contain"
            />
          </View>
          <Text style={styles.versionText}>App Version 0.3</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  headerBar: {
    height: 56,
    backgroundColor: colors.textDark,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backBtn: {
    marginRight: 16,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  newsCard: {
    backgroundColor: colors.purple,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.09,
    shadowRadius: 7,
  },
  newsMsg: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 15,
  },
  badgeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  badgeImage: { width: 28, height: 28, marginRight: 8 },
  badgeTitle: { color: colors.textDark, fontWeight: 'bold', fontSize: 16 },
  badgeContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  progressTrack: {
    height: 8,
    flex: 1,
    backgroundColor: colors.gray,
    borderRadius: 4,
    marginRight: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 4,
  },
  badgePercent: {
    color: colors.accent,
    fontWeight: 'bold',
    fontSize: 14,
  },
  requirements: {
    color: colors.textDark,
    fontSize: 13,
  },
  emptyText: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 28,
    fontSize: 15,
  },
  loaderWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  footerText: {
    color: colors.textDark,
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 8,
  },
  footerLogo: {
    height: 24,
    aspectRatio: 1024 / 650,
  },
  versionText: {
    color: colors.textMuted,
    fontSize: 12,
  },
});

export default React.memo(NewsModal);