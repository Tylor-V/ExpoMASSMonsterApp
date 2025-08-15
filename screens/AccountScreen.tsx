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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth } from '../firebase/firebase';
import { firestore } from '../firebase/firebase';
import { colors, fonts } from '../theme';
import { useCurrentUserDoc } from '../hooks/useCurrentUserDoc';

const Row = ({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) => {
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
        <Ionicons name={icon} size={24} color={colors.textDark} />
        <Text style={styles.rowLabel}>{label}</Text>
        <Ionicons name="chevron-forward" size={20} color="#B0B0B0" style={{ marginLeft: 'auto' }} />
      </View>
    </TouchableOpacity>
  );
};

export default function AccountScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const user = useCurrentUserDoc() || {};

  const [modal, setModal] = useState<null | 'email' | 'password' | 'firstName' | 'lastName'>(null);
  const [input, setInput] = useState('');
  const [currentPass, setCurrentPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const openModal = (type: 'email' | 'password' | 'firstName' | 'lastName') => {
    if (type === 'email') setInput(user.email || '');
    if (type === 'firstName') setInput(user.firstName || '');
    if (type === 'lastName') setInput(user.lastName || '');
    if (type === 'password') setInput('');
    setCurrentPass('');
    setError('');
    setModal(type);
  };

  const closeModal = () => {
    if (loading) return;
    setModal(null);
    setInput('');
    setCurrentPass('');
    setError('');
  };

  const handleSave = async () => {
    if (!modal) return;
    const newValue = input.trim();
    if (!newValue) {
      setError('Required');
      return;
    }
    setLoading(true);
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) throw new Error('No user');
      if (modal === 'email' || modal === 'password') {
        const cred = auth.EmailAuthProvider.credential(currentUser.email || '', currentPass);
        await currentUser.reauthenticateWithCredential(cred);
      }
      if (modal === 'email') {
        if (newValue === user.email) throw new Error('Email unchanged');
        await currentUser.updateEmail(newValue);
        await firestore().collection('users').doc(currentUser.uid).set(
          { email: newValue },
          { merge: true }
        );
      } else if (modal === 'password') {
        await currentUser.updatePassword(newValue);
      } else if (modal === 'firstName') {
        await firestore().collection('users').doc(currentUser.uid).set(
          { firstName: newValue },
          { merge: true }
        );
        await currentUser.updateProfile({ displayName: `${newValue} ${user.lastName || ''}`.trim() });
      } else if (modal === 'lastName') {
        await firestore().collection('users').doc(currentUser.uid).set(
          { lastName: newValue },
          { merge: true }
        );
        await currentUser.updateProfile({ displayName: `${user.firstName || ''} ${newValue}`.trim() });
      }
      closeModal();
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
      </ScrollView>
      <Modal visible={modal !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update {modal}</Text>
            {modal === 'password' ? (
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
                  <Text style={styles.modalBtnText}>Save</Text>
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
    height: 56,
    backgroundColor: '#232323',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backBtn: { marginRight: 16 },
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
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
  error: { color: colors.error, marginBottom: 6, fontFamily: fonts.regular },
});