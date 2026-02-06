import { Ionicons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppContext } from '../firebase/AppContext';
import { firestore } from '../firebase/firebase';

type ReportItem = {
  id: string;
  targetType?: string;
  type?: string;
  targetId?: string;
  reportedBy?: string;
  createdAt?: any;
  timestamp?: any;
  reason?: string;
  details?: string;
  status?: string;
};

const toMillis = (value: any): number => {
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value === 'number') return value;
  return 0;
};

const ModerationQueueScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user } = useAppContext();
  const currentUserId = user?.uid;
  const isModerator = user?.role === 'moderator';

  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!isModerator) {
      navigation.goBack();
      return;
    }
    const unsub = firestore()
      .collection('reports')
      .onSnapshot(
        snap => {
          const next = snap.docs
            .map(doc => ({ id: doc.id, ...(doc.data() as any) }))
            .filter(item => !item.status || item.status === 'open')
            .sort((a, b) => {
              const left = toMillis(a.createdAt) || toMillis(a.timestamp);
              const right = toMillis(b.createdAt) || toMillis(b.timestamp);
              return right - left;
            });
          setReports(next);
          setLoading(false);
          setSelectedReportId(current => {
            if (!current) return next[0]?.id || null;
            if (!next.find(r => r.id === current)) return next[0]?.id || null;
            return current;
          });
        },
        () => setLoading(false),
      );
    return unsub;
  }, [isModerator, navigation]);

  const selectedReport = useMemo(
    () => reports.find(r => r.id === selectedReportId) || null,
    [reports, selectedReportId],
  );

  const logModerationAction = async (report: ReportItem, action: string) => {
    await firestore().collection('moderationActions').add({
      adminUid: currentUserId,
      action,
      targetType: report.targetType || report.type || 'unknown',
      targetId: report.targetId || '',
      reportId: report.id,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
  };

  const updateReport = async (reportId: string, payload: any) => {
    await firestore()
      .collection('reports')
      .doc(reportId)
      .update({
        ...payload,
        reviewedBy: currentUserId,
        reviewedAt: firestore.FieldValue.serverTimestamp(),
      });
  };

  const handleResolve = async () => {
    if (!selectedReport || processing) return;
    setProcessing(true);
    try {
      await updateReport(selectedReport.id, { status: 'resolved', action: 'none' });
      await logModerationAction(selectedReport, 'resolve_no_action');
    } finally {
      setProcessing(false);
    }
  };

  const handleTimeout = async () => {
    if (!selectedReport || processing) return;
    const targetId = selectedReport.targetId;
    if (!targetId || (selectedReport.targetType || selectedReport.type) !== 'user') {
      Alert.alert('Unsupported Target', 'Timeout can only be applied to user reports.');
      return;
    }
    setProcessing(true);
    try {
      await firestore().collection('users').doc(targetId).update({
        timeoutUntil: Date.now() + 24 * 60 * 60 * 1000,
      });
      await updateReport(selectedReport.id, { status: 'actioned', action: 'timeout_24h' });
      await logModerationAction(selectedReport, 'timeout_24h');
    } finally {
      setProcessing(false);
    }
  };

  const handleBan = async () => {
    if (!selectedReport || processing) return;
    const targetId = selectedReport.targetId;
    if (!targetId || (selectedReport.targetType || selectedReport.type) !== 'user') {
      Alert.alert('Unsupported Target', 'Ban can only be applied to user reports.');
      return;
    }
    Alert.alert('Ban User', 'Ban this user and disable UGC access?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Ban User',
        style: 'destructive',
        onPress: async () => {
          setProcessing(true);
          try {
            await firestore().collection('users').doc(targetId).update({
              isBanned: true,
              ugcDisabled: true,
              bannedAt: firestore.FieldValue.serverTimestamp(),
              bannedBy: currentUserId,
            });
            await updateReport(selectedReport.id, { status: 'actioned', action: 'ban_user' });
            await logModerationAction(selectedReport, 'ban_user');
          } finally {
            setProcessing(false);
          }
        },
      },
    ]);
  };

  const handleRemoveContent = async () => {
    if (!selectedReport || processing) return;
    const targetType = selectedReport.targetType || selectedReport.type;
    const targetId = selectedReport.targetId;

    if (!targetType || targetType === 'user') {
      Alert.alert('Unsupported Target', 'Remove Content is only available for non-user reports.');
      return;
    }
    if (!targetId) {
      Alert.alert('Missing Target', 'No content id was found for this report.');
      return;
    }

    if (targetType !== 'video') {
      Alert.alert('Unsupported Target', `Remove Content is not configured for ${targetType} yet.`);
      return;
    }

    Alert.alert('Remove Content', 'Remove this content from the feed for all users?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setProcessing(true);
          try {
            await firestore()
              .collection('videos')
              .doc('gym-feed')
              .collection('gym-feed')
              .doc(targetId)
              .update({
                status: 'removed',
                isRemoved: true,
                removedAt: firestore.FieldValue.serverTimestamp(),
                removedBy: currentUserId,
              });
            await updateReport(selectedReport.id, { status: 'actioned', action: 'remove_content' });
            await logModerationAction(selectedReport, 'remove_content');
          } finally {
            setProcessing(false);
          }
        },
      },
    ]);
  };

  if (!isModerator) {
    return null;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}> 
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MODERATION QUEUE</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#232323" />
        </View>
      ) : (
        <>
          <FlatList
            data={reports}
            keyExtractor={item => item.id}
            contentContainerStyle={reports.length ? undefined : styles.centered}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setSelectedReportId(item.id)}
                style={[styles.row, selectedReportId === item.id && styles.rowActive]}
              >
                <Text style={styles.rowTitle}>{item.targetType || item.type || 'unknown'} • {item.targetId || 'n/a'}</Text>
                <Text style={styles.rowMeta}>Reporter: {item.reportedBy || 'unknown'}</Text>
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No open reports.</Text>}
          />

          {selectedReport ? (
            <View style={styles.detailCard}>
              <Text style={styles.detailTitle}>Report Details</Text>
              <Text style={styles.detailText}>Target Type: {selectedReport.targetType || selectedReport.type || 'unknown'}</Text>
              <Text style={styles.detailText}>Target ID: {selectedReport.targetId || 'n/a'}</Text>
              <Text style={styles.detailText}>Reporter: {selectedReport.reportedBy || 'unknown'}</Text>
              <Text style={styles.detailText}>Created: {new Date(toMillis(selectedReport.createdAt) || toMillis(selectedReport.timestamp) || Date.now()).toLocaleString()}</Text>
              <Text style={styles.detailText}>Reason: {selectedReport.reason || selectedReport.details || 'Not provided'}</Text>

              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={handleResolve} disabled={processing}>
                  <Text style={styles.actionBtnText}>Resolve (No Action)</Text>
                </TouchableOpacity>
                {(selectedReport.targetType || selectedReport.type) !== 'user' ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.destructive]}
                    onPress={handleRemoveContent}
                    disabled={processing}
                  >
                    <Text style={styles.actionBtnText}>Remove Content</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={styles.actionBtn} onPress={handleTimeout} disabled={processing}>
                  <Text style={styles.actionBtnText}>Timeout User 24h</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.destructive]} onPress={handleBan} disabled={processing}>
                  <Text style={styles.actionBtnText}>Ban User</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  headerBar: {
    height: 56,
    backgroundColor: '#232323',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backBtn: { marginRight: 16 },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  rowActive: { backgroundColor: '#F6F6F6' },
  rowTitle: { fontSize: 14, fontWeight: '700', color: '#232323' },
  rowMeta: { marginTop: 4, fontSize: 13, color: '#666666' },
  emptyText: { color: '#777777', fontSize: 14 },
  detailCard: {
    borderTopWidth: 1,
    borderTopColor: '#E6E6E6',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
    backgroundColor: '#FFFFFF',
  },
  detailTitle: { fontSize: 15, fontWeight: '700', color: '#232323', marginBottom: 4 },
  detailText: { fontSize: 13, color: '#333333' },
  actionsRow: { marginTop: 8, gap: 8 },
  actionBtn: {
    backgroundColor: '#232323',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  destructive: { backgroundColor: '#9B1C1C' },
  actionBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});

export default ModerationQueueScreen;
