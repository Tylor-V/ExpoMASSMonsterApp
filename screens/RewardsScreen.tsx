import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
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
import { auth, firestore } from '../firebase/firebase';
import { redeemReward, RewardInfo } from '../firebase/rewardsHelpers';
import { useRewardHistory } from '../hooks/useRewardHistory';
import { colors, fonts } from '../theme';

const REWARDS: RewardInfo[] = [
  { id: 'coupon5', name: '$5 Shop Coupon', points: 5 },
  { id: 'mindset', name: 'Coral Club Mindset Pack', points: 200 },
];

const REWARD_NAME_BY_ID = REWARDS.reduce<Record<string, string>>((acc, reward) => {
  acc[reward.id] = reward.name;
  return acc;
}, {});

const toMillis = (value: any): number | null => {
  if (!value) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value?.toDate === 'function') {
    const date = value.toDate();
    return date instanceof Date ? date.getTime() : null;
  }
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  return null;
};

export default function RewardsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { points, user } = useAppContext();
  const history = useRewardHistory();
  const [showFAQ, setShowFAQ] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [couponConfirmReward, setCouponConfirmReward] = useState<RewardInfo | null>(null);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const progress = Math.min(1, (points % 50) / 50);

  useEffect(() => {
    const uid = user?.uid || auth().currentUser?.uid;
    if (!uid) {
      setRecentRequests([]);
      return;
    }

    const unsub = firestore()
      .collection('users')
      .doc(uid)
      .collection('redemptionRequests')
      .orderBy('requestedAt', 'desc')
      .limit(10)
      .onSnapshot(
        snap => {
          const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          setRecentRequests(list);
        },
        () => setRecentRequests([]),
      );

    return () => unsub();
  }, [user?.uid]);

  const getRejectedReason = (reason?: string) => {
    switch (reason) {
      case 'insufficient_points':
        return 'Not enough points';
      case 'invalid_reward':
        return 'Invalid reward';
      case 'already_has_active_reward':
        return 'You already have an active discount';
      case 'issue_failed':
        return "We couldn't issue the discount. Try again later.";
      default:
        return 'Could not process';
    }
  };

  const getRequestStatusLabel = (status?: string) => {
    switch (status) {
      case 'processing':
        return 'Processing';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Pending';
    }
  };

  const getRewardNameById = (rewardId?: string) => {
    if (!rewardId) return 'Unknown reward';
    return REWARD_NAME_BY_ID[rewardId] || rewardId;
  };

  const getRedemptionStatusLabel = (redemption: {
    status?: string;
    fulfillmentStatus?: string;
    expiresAt?: any;
    usedAt?: any;
  }) => {
    if (redemption.usedAt) return 'Used';

    const expiresAtMillis = toMillis(redemption.expiresAt);
    if (expiresAtMillis !== null && expiresAtMillis <= Date.now()) return 'Expired';

    if (redemption.fulfillmentStatus === 'issued') return 'Issued';
    if (redemption.status === 'approved') return 'Approved';
    if (redemption.status === 'rejected') return 'Rejected';
    if (redemption.status === 'processing') return 'Processing';
    return 'Pending';
  };

  const isCouponReward = (reward: RewardInfo) =>
    reward.id === 'coupon5' || (reward as RewardInfo & { type?: string }).type === 'shopify_discount';

  const submitRewardRequest = async (reward: RewardInfo) => {
    if (isRedeeming) return;

    setIsRedeeming(true);
    setRedeemingId(reward.id);
    try {
      await redeemReward(reward);
      Alert.alert('Request submitted', 'Your reward request was submitted.');
      setConfetti(true);
      setTimeout(() => setConfetti(false), 3000);
    } catch (err) {
      console.error('Failed to redeem reward', err);
      Alert.alert('Error', 'Could not submit reward request.');
    } finally {
      setRedeemingId(null);
      setIsRedeeming(false);
    }
  };

  const handleRedeem = async (reward: RewardInfo) => {
    if (isRedeeming) return;

    if (isCouponReward(reward)) {
      setCouponConfirmReward(reward);
      return;
    }

    Alert.alert(
      'Request Reward',
      `Submit a reward request for ${reward.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            await submitRewardRequest(reward);
          },
        },
      ],
    );
  };

  const handleCouponConfirmRedeem = async () => {
    if (!couponConfirmReward || isRedeeming) return;
    const reward = couponConfirmReward;
    setCouponConfirmReward(null);
    await submitRewardRequest(reward);
  };

  const renderReward = ({ item }: { item: RewardInfo }) => {
    const isCurrentRedeeming = redeemingId === item.id;
    const isDisabled = isRedeeming || points < item.points;

    return (
      <View style={styles.rewardCard}>
        <Text style={styles.rewardName}>{item.name}</Text>
        <View style={styles.rewardFooter}>
          <Text style={styles.rewardPoints}>{item.points} pts</Text>
          <Pressable
            style={[
              styles.redeemBtn,
              { opacity: isDisabled ? 0.5 : 1 },
            ]}
            disabled={isDisabled}
            onPress={() => handleRedeem(item)}
          >
            <Text style={styles.redeemTxt}>{isCurrentRedeeming ? 'Submitting\u2026' : 'Redeem'}</Text>
          </Pressable>
        </View>
      </View>
    );
  };

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
            <Text style={styles.sectionTitle}>Recent Requests</Text>
            {recentRequests.map(request => {
              const status = request.status || 'pending';
              const statusLabel = getRequestStatusLabel(status);
              return (
                <View key={request.id} style={styles.historyRow}>
                  <View style={styles.requestContent}>
                    <Text style={styles.historyName}>{getRewardNameById(request.rewardId)}</Text>
                    {status === 'rejected' ? (
                      <Text style={styles.requestReason}>{getRejectedReason(request.reason)}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.historyStatus}>{statusLabel}</Text>
                </View>
              );
            })}
            <Text style={styles.sectionTitle}>Your Redemptions</Text>
            {history.map(h => (
              <View key={h.id} style={styles.historyRow}>
                <Text style={styles.historyName}>{h.name}</Text>
                <Text style={styles.historyStatus}>{getRedemptionStatusLabel(h)}</Text>
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
      <Modal
        visible={couponConfirmReward !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setCouponConfirmReward(null)}
      >
        <Pressable
          style={styles.modalBg}
          onPress={() => {
            if (!isRedeeming) setCouponConfirmReward(null);
          }}
        >
          <Pressable style={styles.couponConfirmCard} onPress={() => {}}>
            <Text style={styles.couponConfirmTitle}>Unlock $5 Off</Text>
            <Text style={styles.couponConfirmSubtitle}>Expires 7 days after redeeming</Text>
            <View style={styles.couponChipRow}>
              <View style={styles.couponChip}>
                <Text style={styles.couponChipText}>Expires 7 days</Text>
              </View>
              <View style={styles.couponChip}>
                <Text style={styles.couponChipText}>Single-use</Text>
              </View>
            </View>
            <View style={styles.couponConfirmActions}>
              <Pressable
                style={styles.couponCancelBtn}
                disabled={isRedeeming}
                onPress={() => setCouponConfirmReward(null)}
              >
                <Text style={styles.couponCancelTxt}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.couponBtn, styles.couponConfirmRedeemBtn, { opacity: isRedeeming ? 0.5 : 1 }]}
                disabled={isRedeeming}
                onPress={handleCouponConfirmRedeem}
              >
                <Text style={styles.couponTxt}>{isRedeeming ? 'Submitting...' : 'Redeem'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
    marginHorizontal: 44,
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
    borderRadius: 8,
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
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 4,
  },
  couponTxt: { fontWeight: 'bold', color: colors.black },
  couponConfirmCard: {
    backgroundColor: colors.white,
    width: '84%',
    maxWidth: 360,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  couponConfirmTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 22,
    color: colors.black,
    textAlign: 'center',
  },
  couponConfirmSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textDark,
    textAlign: 'center',
    marginTop: 6,
  },
  couponChipRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  couponChip: {
    borderWidth: 1,
    borderColor: colors.grayOutline,
    backgroundColor: colors.translucentWhite,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginHorizontal: 4,
  },
  couponChipText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textDark,
  },
  couponConfirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
  },
  couponCancelBtn: {
    borderWidth: 1,
    borderColor: colors.grayOutline,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  couponCancelTxt: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.textDark,
  },
  couponConfirmRedeemBtn: {
    marginBottom: 0,
    minWidth: 80,
  },
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
    borderRadius: 8,
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
  requestContent: { flex: 1, marginRight: 8 },
  requestReason: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  faqCard: { backgroundColor: colors.white, padding: 20, borderRadius: 16, width: '80%' },
  faqTitle: { fontWeight: 'bold', fontSize: 18, marginBottom: 8, color: colors.black, textAlign: 'center' },
  faqText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textDark, textAlign: 'center' },
});
