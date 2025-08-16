import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Dimensions,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons as Icon } from '@expo/vector-icons';
import ProfileImage from '../components/ProfileImage';
import { colors, fonts } from '../theme';
import { ANIM_BUTTON_POP } from '../utils/animations';
import { ROLE_COLORS } from '../constants/roles';
import { getChatLevelColor } from '../utils/chatLevel';
import BackgroundWrapper from '../components/BackgroundWrapper';
import ComingSoonOverlay from '../components/ComingSoonOverlay';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MOCK_PARTICIPANTS = [
  {
    id: '1',
    first: 'Alex',
    last: 'H',
    mic: true,
    cam: true,
    level: 5,
    streak: 2,
    role: 'Member',
  },
  {
    id: '2',
    first: 'Brandon',
    last: 'S',
    mic: false,
    cam: true,
    level: 7,
    streak: 12,
    role: 'Member',
  },
  {
    id: '3',
    first: 'Chris',
    last: 'L',
    mic: true,
    cam: false,
    level: 9,
    streak: 4,
    role: 'Mod',
  },
];

export default function CommunityVoiceChannel() {
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);
  const [participants, setParticipants] = useState(MOCK_PARTICIPANTS);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [actionTarget, setActionTarget] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setReady(true), 500);
    return () => clearTimeout(timeout);
  }, []);

  const toggleMute = () => setMuted(m => !m);
  const toggleDeafen = () => setDeafened(d => !d);
  const toggleCamera = () => setCameraOn(c => !c);

  if (!ready) {
    return (
      <BackgroundWrapper padTop={false}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Connecting...</Text>
        </View>
      </BackgroundWrapper>
    );
  }

  const renderParticipant = (p: typeof MOCK_PARTICIPANTS[number]) => {
    const showActions = actionTarget === p.id;
    return (
      <Pressable
        key={p.id}
        style={styles.participantRow}
        onLongPress={() => setActionTarget(p.id)}
        onPressOut={() => setActionTarget(null)}
      >
        <ProfileImage style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.participantName}>{`${p.first} ${p.last[0]}.`}</Text>
            <Icon
              name={p.mic ? 'mic' : 'mic-off'}
              size={16}
              color={p.mic ? colors.gray : colors.error}
              style={styles.statusIcon}
            />
            <Icon
              name={p.cam ? 'videocam' : 'videocam-off'}
              size={16}
              color={p.cam ? colors.gray : colors.error}
              style={styles.statusIcon}
            />
          </View>
          <View style={styles.metaRow}>
            <View
              style={[
                styles.metaPill,
                { backgroundColor: getChatLevelColor(p.level), marginLeft: 1 },
              ]}
            >
              <Text style={styles.metaPillText}>{`Lv${p.level}`}</Text>
            </View>
            <View style={[styles.metaPill, { backgroundColor: getChatLevelColor(p.level) }]}>
              <Text style={styles.metaPillText}>{`🔥${p.streak}`}</Text>
            </View>
            <View
              style={[
                styles.metaPill,
                { backgroundColor: ROLE_COLORS[p.role.toLowerCase()] || colors.purple },
              ]}
            >
              <Text style={styles.metaPillText}>{p.role.toUpperCase()}</Text>
            </View>
          </View>
        </View>
        {showActions && (
          <View style={styles.quickActions}>
            <TouchableOpacity
              onPress={() => setParticipants(ps => ps.map(pp => pp.id === p.id ? { ...pp, mic: false } : pp))}
              style={styles.quickBtn}
            >
              <Text style={styles.quickTxt}>Mute</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setParticipants(ps => ps.filter(pp => pp.id !== p.id))}
              style={[styles.quickBtn, { backgroundColor: colors.accentRed }]}
            >
              <Text style={styles.quickTxt}>Kick</Text>
            </TouchableOpacity>
          </View>
        )}
      </Pressable>
    );
  };

  const videos = participants.filter(p => p.cam);
  const videoContent = (
    <View style={styles.videoGrid}>
      {videos.map(p => (
        <Pressable
          key={p.id}
          style={styles.videoContainer}
          onPress={() => setFullscreen(p.id)}
        >
          <View style={styles.videoPlaceholder}>
            <Text style={styles.videoName}>{p.first}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );

  return (
    <BackgroundWrapper padTop={false} style={{ backgroundColor: colors.background }}>
      <View style={styles.roomContainer}>
        <View style={styles.sidebar}>
          <Text style={styles.sidebarHeader}>{`Users ${participants.length}`}</Text>
          <ScrollView
            style={styles.participantsList}
            contentContainerStyle={{ paddingBottom: 0 }}
            showsVerticalScrollIndicator={false}
          >
            {participants.map(renderParticipant)}
          </ScrollView>
        </View>
        {fullscreen ? (
          <View style={styles.fullscreenContainer}>
            <TouchableOpacity
              style={[styles.fullscreenBack, { top: insets.top + 12 }]}
              onPress={() => setFullscreen(null)}
            >
              <Icon name="chevron-back" size={28} color={colors.white} />
            </TouchableOpacity>
            <View style={styles.fullscreenVideo}>
              <Text style={styles.fullscreenName}>
                {participants.find(p => p.id === fullscreen)?.first}
              </Text>
            </View>
          </View>
        ) : (
          videoContent
        )}
        <View style={[styles.controlsBar, { bottom: insets.bottom + 16 }]}>
          <TouchableOpacity onPress={toggleMute} style={styles.controlBtn}>
            <Icon
              name={muted ? 'mic-off' : 'mic'}
              size={24}
              color={muted ? colors.error : colors.gray}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleDeafen} style={styles.controlBtn}>
            <Icon
              name="headset"
              size={24}
              color={deafened ? colors.error : colors.gray}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleCamera} style={styles.controlBtn}>
            <Icon
              name={cameraOn ? 'videocam' : 'videocam-off'}
              size={24}
              color={cameraOn ? colors.accent : colors.error}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn} onPress={() => {}}>
            <Icon name="call" size={24} color={colors.accentRed} />
          </TouchableOpacity>
        </View>
        <ComingSoonOverlay />
      </View>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingText: { color: colors.white },
  roomContainer: { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: SCREEN_WIDTH * 0.4,
    backgroundColor: 'rgba(24,24,27,0.9)',
    paddingTop: 10,
    borderTopRightRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.7,
    shadowLeftRadius: 4,
    shadowOffset: { width: 2, height: 2 },
    elevation: 2,
  },
  sidebarHeader: {
    color: colors.white,
    fontWeight: 'bold',
    marginLeft: 10,
    marginBottom: 6,
  },
  participantsList: { flex: 1 },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  avatar: { width: 24, height: 24, marginRight: 8 },
  participantName: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginLeft: 4,
  },
  metaRow: { flexDirection: 'row' },
  metaPill: {
    borderRadius: 2,
    paddingHorizontal: 4,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 3,
  },
  metaPillText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 8,
    letterSpacing: 0.8,
  },
  quickActions: {
    position: 'absolute',
    right: 10,
    top: '50%',
    flexDirection: 'row',
    transform: [{ translateY: -16 }],
  },
  quickBtn: {
    backgroundColor: colors.yellow,
    borderRadius: 16,
    paddingVertical: 1,
    paddingHorizontal: 10,
    marginLeft: 6,
  },
  quickTxt: {
    fontWeight: 'bold',
    fontSize: 12,
    color: colors.textDark,
  },
  videoGrid: {
    flex: 1,
    flexWrap: 'wrap',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 2,
    paddingTop: 4,
  },
  videoContainer: {
    width: '49%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 4,
    marginLeft: 1,
  },
  videoPlaceholder: {
    flex: 1,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoName: { color: colors.white, fontWeight: 'bold' },
  fullscreenContainer: { flex: 1, backgroundColor: '#000' },
  fullscreenBack: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
  },
  fullscreenVideo: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fullscreenName: { color: colors.white, fontSize: 18, fontWeight: 'bold' },
  controlsBar: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    flexDirection: 'row',
    backgroundColor: colors.translucentWhite,
    borderRadius: 40,
    justifyContent: 'space-around',
    paddingVertical: 18,
    paddingHorizontal: 32,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
  },
  controlBtn: { paddingHorizontal: 6 },
});