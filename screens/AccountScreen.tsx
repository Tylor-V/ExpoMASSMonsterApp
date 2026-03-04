import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut,
  updateEmail,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import { auth, firestore } from '../firebase/firebase';
import { useAppContext } from '../firebase/AppContext';
import { colors, fonts } from '../theme';
import { useCurrentUserDoc } from '../hooks/useCurrentUserDoc';
import { clearUserCache } from '../utils/clearUserCache';

type AccountModal = 'email' | 'password' | 'firstName' | 'lastName' | 'delete';

const Row = ({
  icon,
  label,
  onPress,
  destructive = false,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) => {
  const [pressed, setPressed] = useState(false);
  const handlePress = () => {
    setPressed(true);
    setTimeout(() => {
      setPressed(false);
      onPress();
    }, 100);
  };

  return (
    <TouchableOpacity activeOpacity={1} onPress={handlePress}>
      <View style={[styles.row, { backgroundColor: pressed ? '#F5F5F5' : colors.white }]}>
        <Ionicons
          name={icon as any}
          size={24}
          color={destructive ? colors.error : colors.textDark}
        />
        <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>{label}</Text>
        <Ionicons name="chevron-forward" size={20} color="#B0B0B0" style={{ marginLeft: 'auto' }} />
      </View>
    </TouchableOpacity>
  );
};

export default function AccountScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { setAppStatus } = useAppContext();
  const user = useCurrentUserDoc() || {};

  const [modal, setModal] = useState<null | AccountModal>(null);
  const [input, setInput] = useState('');
  const [currentPass, setCurrentPass] = useState('');
  const [deletePhrase, setDeletePhrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const openModal = (type: AccountModal) => {
    if (type === 'email') setInput(user.email || '');
    if (type === 'firstName') setInput(user.firstName || '');
    if (type === 'lastName') setInput(user.lastName || '');
    if (type === 'password' || type === 'delete') setInput('');
    setCurrentPass('');
    setDeletePhrase('');
    setError('');
    setModal(type);
  };

  const closeModal = (force = false) => {
    if (loading && !force) return;
    setModal(null);
    setInput('');
    setCurrentPass('');
    setDeletePhrase('');
    setError('');
  };

  const resetToAuthStack = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'AuthStack' }],
      }),
    );
  };

  const signOutCleanly = async (uid: string) => {
    await signOut(auth());
    void clearUserCache(uid).catch(cacheError => {
      console.warn('Failed to clear user cache on account deletion request', cacheError);
    });
    setAppStatus({ user: null, points: 0, workoutHistory: [] });
    resetToAuthStack();
  };

  const reauthenticateCurrentUser = async (password: string) => {
    const currentUser = auth().currentUser;
    if (!currentUser) throw new Error('No signed-in user.');
    const email = currentUser.email || user.email;
    if (!email) throw new Error('No email found for this account.');
    const credential = EmailAuthProvider.credential(email, password);
    await reauthenticateWithCredential(currentUser, credential);
    return currentUser;
  };

  const handleDeleteAccountRequest = async () => {
    const currentUser = auth().currentUser;
    if (!currentUser) throw new Error('No signed-in user.');
    if (!currentPass.trim()) throw new Error('Current password is required.');
    if (deletePhrase.trim().toUpperCase() !== 'DELETE') {
      throw new Error('Type DELETE to confirm account deletion.');
    }

    await reauthenticateCurrentUser(currentPass.trim());

    const requestRef = firestore()
      .collection('accountDeletionRequests')
      .doc(currentUser.uid);
    const existing = await requestRef.get();
    if (existing.exists) {
      throw new Error('A deletion request is already pending for this account.');
    }

    await requestRef.set({
      uid: currentUser.uid,
      status: 'pending',
      requestedAt: firestore.FieldValue.serverTimestamp(),
      reauthenticatedAt: firestore.FieldValue.serverTimestamp(),
      requestSource: 'in-app',
    });

    closeModal(true);
    Alert.alert(
      'Request submitted',
      'Your account deletion request has been submitted. You will now be signed out.',
      [
        {
          text: 'OK',
          onPress: () => {
            void signOutCleanly(currentUser.uid);
          },
        },
      ],
    );
  };

  const handleSave = async () => {
    if (!modal) return;

    const newValue = input.trim();
    if (modal !== 'delete' && !newValue) {
      setError('Required');
      return;
    }

    setLoading(true);
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) throw new Error('No signed-in user.');

      if (modal === 'delete') {
        await handleDeleteAccountRequest();
        return;
      }

      if ((modal === 'email' || modal === 'password') && !currentPass.trim()) {
        throw new Error('Current password is required.');
      }

      if (modal === 'email' || modal === 'password') {
        await reauthenticateCurrentUser(currentPass.trim());
      }

      if (modal === 'email') {
        if (newValue === user.email) throw new Error('Email unchanged');
        await updateEmail(currentUser, newValue);
        await firestore().collection('users').doc(currentUser.uid).set(
          { email: newValue },
          { merge: true },
        );
      } else if (modal === 'password') {
        await updatePassword(currentUser, newValue);
      } else if (modal === 'firstName') {
        await firestore().collection('users').doc(currentUser.uid).set(
          { firstName: newValue },
          { merge: true },
        );
        await firestore().collection('publicUsers').doc(currentUser.uid).set(
          { firstName: newValue },
          { merge: true },
        );
        await updateProfile(currentUser, {
          displayName: `${newValue} ${user.lastName || ''}`.trim(),
        });
      } else if (modal === 'lastName') {
        await firestore().collection('users').doc(currentUser.uid).set(
          { lastName: newValue },
          { merge: true },
        );
        await firestore().collection('publicUsers').doc(currentUser.uid).set(
          { lastName: newValue },
          { merge: true },
        );
        await updateProfile(currentUser, {
          displayName: `${user.firstName || ''} ${newValue}`.trim(),
        });
      }

      closeModal(true);
    } catch (e: any) {
      setError(e.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.headerBar}>
        <TouchableOpacity testID="account-back" onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ACCOUNT</Text>
      </View>
      <ScrollView contentContainerStyle={styles.listContent}>
        <Row icon="mail-outline" label="Email Address" onPress={() => openModal('email')} />
        <Row icon="lock-closed-outline" label="Password" onPress={() => openModal('password')} />
        <Row icon="person-outline" label="First Name" onPress={() => openModal('firstName')} />
        <Row icon="person-outline" label="Last Name" onPress={() => openModal('lastName')} />
        <View style={styles.sectionDivider} />
        <Row
          icon="trash-outline"
          label="Delete Account"
          destructive
          onPress={() => openModal('delete')}
        />
      </ScrollView>
      <Modal visible={modal !== null} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modal === 'delete' ? 'Delete account' : `Update ${modal}`}
            </Text>
            {modal === 'delete' ? (
              <>
                <Text style={styles.deleteWarning}>
                  This request permanently deletes your account and private data. This action cannot be undone.
                </Text>
                <TextInput
                  style={styles.input}
                  secureTextEntry
                  placeholder="Current Password"
                  value={currentPass}
                  onChangeText={setCurrentPass}
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Type DELETE to confirm"
                  value={deletePhrase}
                  onChangeText={setDeletePhrase}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </>
            ) : modal === 'password' ? (
              <TextInput
                style={styles.input}
                secureTextEntry
                placeholder="New Password"
                value={input}
                onChangeText={setInput}
              />
            ) : (
              <TextInput
                style={styles.input}
                placeholder={`New ${modal}`}
                value={input}
                onChangeText={setInput}
                autoCapitalize="none"
              />
            )}
            {(modal === 'email' || modal === 'password') && (
              <TextInput
                style={styles.input}
                secureTextEntry
                placeholder="Current Password"
                value={currentPass}
                onChangeText={setCurrentPass}
              />
            )}
            {!!error && <Text style={styles.error}>{error}</Text>}
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={closeModal} style={styles.modalBtn} disabled={loading}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={styles.modalBtn} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={colors.accent} />
                ) : (
                  <Text style={[styles.modalBtnText, modal === 'delete' && styles.deleteBtnText]}>
                    {modal === 'delete' ? 'Request deletion' : 'Save'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  headerBar: {
    minHeight: 56,
    backgroundColor: '#232323',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backBtn: { marginRight: 16, minHeight: 44, minWidth: 44, justifyContent: 'center' },
  headerTitle: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 20,
    textAlign: 'center',
    flex: 1,
    letterSpacing: 0.5,
    marginRight: 40,
  },
  listContent: { paddingVertical: 22 },
  sectionDivider: { height: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderColor: '#EFEFEF',
  },
  rowLabel: {
    fontFamily: fonts.regular,
    fontSize: 17,
    color: '#232323',
    marginLeft: 12,
  },
  rowLabelDestructive: {
    color: colors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    color: colors.textDark,
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  deleteWarning: {
    color: colors.textDark,
    fontFamily: fonts.regular,
    marginBottom: 12,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: fonts.regular,
    fontSize: 16,
    marginBottom: 10,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  modalBtnText: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.accent },
  deleteBtnText: { color: colors.error },
  error: { color: colors.error, marginBottom: 6, fontFamily: fonts.regular },
});