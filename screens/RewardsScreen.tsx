import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  FlatList,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ConfettiCannon from 'react-native-confetti-cannon';
import { colors, fonts, radius } from '../theme';
import { useAppContext } from '../firebase/AppContext';
import { redeemReward, RewardInfo } from '../firebase/rewardsHelpers';
import { useRewardHistory } from '../hooks/useRewardHistory';
import ComingSoonOverlay from '../components/ComingSoonOverlay';

const REWARDS: RewardInfo[] = [
  { id: 'coupon5', name: '$5 Shop Coupon', points: 50 },
  { id: 'shaker', name: 'MASS Monster Shaker Bottle', points: 150 },
  { id: 'discord', name: 'Exclusive Discord Role', points: 80 },
  { id: 'sample', name: 'Supplement Sample Pack', points: 300 },
  { id: 'tee', name: 'MASS Monster Tee', points: 200 },
];

export default function RewardsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { points } = useAppContext();
  const history = useRewardHistory();
  const [showFAQ, setShowFAQ] = useState(false);
  const [confetti, setConfetti] = useState(false);

  const canRedeemCoupon = points >= 50;
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
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
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
              <Pressable
                style={[
                  styles.couponBtn,
                  { opacity: canRedeemCoupon ? 1 : 0.5 },
                ]}
                disabled={!canRedeemCoupon}
                onPress={() =>
                  handleRedeem({ id: 'coupon5', name: '$5 Shop Coupon', points: 50 })
                }
              >
                <Text style={styles.couponTxt}>Redeem 50 Accountability Points for $5 Coupon</Text>
              </Pressable>
              <Text style={styles.remainingTxt}>You'll have {points - 50} accountability points left.</Text>
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
          paddingHorizontal: 16,
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
      <ComingSoonOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 10,
    zIndex: 1000,
    elevation: 2,
  },
  headerTitleWrap: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: {
    fontWeight: 'bold',
    fontSize: 24,
    color: colors.white,
    marginLeft: 8,
  },
  iconBtn: { padding: 6 },
  iconPlaceholder: { width: 34 },
  pointsCard: {
    backgroundColor: 'rgba(255,255,255,0.93)',
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: 16,
  },
  points: {
    fontWeight: 'bold',
    fontSize: 36,
    color: colors.gold,
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
    color: colors.white,
    marginBottom: 4,
  },
  progressWrap: { marginHorizontal: 16, marginBottom: 20 },
  progressBar: {
    height: 8,
    backgroundColor: colors.grayLight,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 8,
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
  remainingTxt: {
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textLight,
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    color: colors.white,
    marginTop: 10,
    marginBottom: 6,
    marginHorizontal: 16,
  },
  rewardCard: {
    width: '48%',
    backgroundColor: colors.translucentWhite,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
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
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  historyName: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.black },
  historyStatus: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  faqCard: { backgroundColor: colors.white, padding: 20, borderRadius: 16, width: '80%' },
  faqTitle: { fontWeight: 'bold', fontSize: 18, marginBottom: 8, color: colors.black, textAlign: 'center' },
  faqText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textDark, textAlign: 'center' },
});