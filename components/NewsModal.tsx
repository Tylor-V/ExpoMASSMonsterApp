import React, { useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, radius } from '../theme';

import { getUserBadgeProgress } from '../badges/progressHelpers';

const NewsModal = ({ visible, onClose, news, loading, user }) => {
  const badgeProgress = getUserBadgeProgress(user);
  const renderItem = useCallback(
    ({ item }) => (
      <View style={styles.newsCard}>
        <Text style={styles.newsMsg}>{item.message}</Text>
      </View>
    ),
    []
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.modalBox}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Icon
                name="megaphone-outline"
                size={24}
                color="#000"
                style={{ marginRight: 16 }}
              />
              <Text style={styles.headerText}>MASS News</Text>
            </View>
          </View>
          {loading ? (
            <ActivityIndicator color={colors.accent} size="large" style={{ marginTop: 30 }} />
          ) : (
            <FlatList
              data={[...(news ?? []), ...(badgeProgress as any)]}
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
                        <View style={[styles.progressBar, { width: `${Math.round(item.progress * 100)}%` }]} />
                      </View>
                      <Text style={styles.badgePercent}>{Math.round(item.progress * 100)}%</Text>
                    </View>
                    <Text style={styles.requirements}>{item.requirements}</Text>
                  </View>
                )
              }
              ListEmptyComponent={<Text style={styles.emptyText}>No new announcements.</Text>}
              initialNumToRender={5}
            />
          )}
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(13,13,13,0.93)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 14,
    width: '94%',
    maxWidth: 390,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 13,
    maxHeight: '85%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.accent,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginHorizontal: -24,
    marginTop: -24,
    marginBottom: 20,
  },
  headerText: {
    color: colors.black,
    fontWeight: 'bold',
    fontSize: 21,
    letterSpacing: 0.7,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
});

export default React.memo(NewsModal);