import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppContext } from '../firebase/AppContext';
import { redeemReward, RewardInfo } from '../firebase/rewardsHelpers';
import { useRewardHistory } from '../hooks/useRewardHistory';
import { colors, fonts, radius } from '../theme';

const REWARDS: RewardInfo[] = [
  { id: 'coupon5', name: '$5 Shop Coupon', points: 30 },
  { id: 'mindset', name: 'Coral Club Mindset Pack', points: 200 },
];

export default function RewardsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { points } = useAppContext();
  const history = useRewardHistory();
  const [showFAQ, setShowFAQ] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const progress = Math.min(1, (points % 50) / 50);

  const handleRedeem = async (reward: RewardInfo) => {
    Alert.alert(
      'Redeem Reward',
      `Redeem ${reward.points} points for ${reward.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Redeem',
          onPress: async () => {
            try {
              await redeemReward(reward);
              setConfetti(true);
              setTimeout(() => setConfetti(false), 3000);
            } catch (err) {
              console.error('Failed to redeem reward', err);
              Alert.alert('Error', 'Could not redeem reward.');
            }
          },
        },
      ],
    );
  };

  const renderReward = ({ item }: { item: RewardInfo }) => (
    <View style={styles.rewardCard}>
      <Text style={styles.rewardName}>{item.name}</Text>
      <View style={styles.rewardFooter}>
        <Text style={styles.rewardPoints}>{item.points} pts</Text>
        <Pressable
          style={[
            styles.redeemBtn,
            { opacity: points >= item.points ? 1 : 0.5 },
          ]}
          disabled={points < item.points}
          onPress={() => handleRedeem(item)}
        >
          <Text style={styles.redeemTxt}>Redeem</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={28} color={colors.white} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Ionicons name="gift" size={26} color={colors.gold} />
          <Text style={styles.headerTitle}>Rewards</Text>
        </View>
        <View style={styles.iconPlaceholder} />
      </View>
      <FlatList
        data={REWARDS}
        keyExtractor={i => i.id}
        renderItem={renderReward}
        ListHeaderComponent={() => (
          <View>
            <View style={styles.pointsCard}>
              <Text style={styles.points}>{points}</Text>
              <Text style={styles.pointsLabel}>Points Available</Text>
              <Pressable style={styles.howBtn} onPress={() => setShowFAQ(true)}>
                <Text style={styles.howTxt}>How it works</Text>
              </Pressable>
            </View>
            <View style={styles.progressWrap}>
              <Text style={styles.progressLabel}>Points until next reward</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { flex: progress }]} />
                <View style={{ flex: 1 - progress }} />
              </View>
            </View>
            <Text style={styles.sectionTitle}>Available Rewards</Text>
          </View>
        )}
        ListFooterComponent={() => (
          <View>
            <Text style={styles.sectionTitle}>Your Redemptions</Text>
            {history.map(h => (
              <View key={h.id} style={styles.historyRow}>
                <Text style={styles.historyName}>{h.name}</Text>
                <Text style={styles.historyStatus}>{h.status || 'pending'}</Text>
              </View>
            ))}
          </View>
        )}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 20,
        }}
      />
      {confetti && (
        <ConfettiCannon count={40} origin={{ x: 200, y: 0 }} fadeOut />
      )}
      <Modal visible={showFAQ} transparent animationType="fade">
        <Pressable style={styles.modalBg} onPress={() => setShowFAQ(false)}>
          <View style={styles.faqCard}>
            <Text style={styles.faqTitle}>Rewards FAQ</Text>
            <Text style={styles.faqText}>Earn accountability points from daily check-ins and redeem them for exclusive rewards.</Text>
            <Pressable
              style={[styles.couponBtn, { alignSelf: 'center', marginTop: 12 }]}
              onPress={() => setShowFAQ(false)}
            >
              <Text style={styles.couponTxt}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.grayLight },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
    zIndex: 1000,
    elevation: 2,
    borderBottomWidth: 2,
    borderBottomColor: colors.grayOutline,
  },
  headerTitleWrap: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: {
    fontWeight: 'bold',
    fontSize: 24,
    color: colors.black,
    marginLeft: 8,
  },
  iconBtn: { padding: 6 },
  iconPlaceholder: { width: 34 },
  pointsCard: {
    backgroundColor: colors. translucentWhite,
    marginHorizontal: 32,
    borderRadius: 18,
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    marginVertical: 16,
  },
  points: {
    fontWeight: 'bold',
    fontSize: 60,
    color: colors.textDark,
  },
  pointsLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.textDark,
    marginBottom: 8,
  },
  howBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.button,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  howTxt: { fontWeight: 'bold', color: colors.black, fontSize: 13 },
  progressLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.black,
    marginBottom: 4,
  },
  progressWrap: { marginHorizontal: 16, marginBottom: 20 },
  progressBar: {
    height: 8,
    backgroundColor: colors.white,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 2,
  },
  progressFill: { backgroundColor: colors.gold },
  couponBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.button,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 4,
  },
  couponTxt: { fontWeight: 'bold', color: colors.black },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 20,
    color: colors.black,
    marginVertical: 6,
    marginLeft: 8,
  },
  rewardCard: {
    backgroundColor: colors.translucentWhite,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayOutline,
  },
  rewardName: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.black },
  rewardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  rewardPoints: {
    fontWeight: 'bold',
    fontSize: 14,
    color: colors.gold,
    flex: 1,
  },
  redeemBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.button,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  redeemTxt: { fontWeight: 'bold', fontSize: 13, color: colors.black },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.translucentWhite,
    padding: 12,
    marginBottom: 8,
  },
  historyName: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.black },
  historyStatus: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  faqCard: { backgroundColor: colors.white, padding: 20, borderRadius: 16, width: '80%' },
  faqTitle: { fontWeight: 'bold', fontSize: 18, marginBottom: 8, color: colors.black, textAlign: 'center' },
  faqText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textDark, textAlign: 'center' },
});