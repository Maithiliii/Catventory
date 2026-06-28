import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StatusBar,
  ScrollView,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LogOut, Pencil, Map, Info, Trash2, ChevronRight } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import type { ProfileStackParamList } from '../../types';
import { Skeleton } from '../../components/Skeleton';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>;
};

interface Profile {
  username: string;
  email: string;
  avatar_url: string | null;
  is_live: boolean;
}

export default function ProfileScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingLive, setTogglingLive] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setProfile(null);
      load();
    }, []),
  );

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: prof } = await supabase
      .from('users')
      .select('username, avatar_url, is_live')
      .eq('id', user.id)
      .single();
    if (prof) setProfile({ ...(prof as any), email: user.email ?? '' });
    setLoading(false);
  }

  async function toggleLive() {
    if (!profile || togglingLive) return;
    setTogglingLive(true);
    const next = !profile.is_live;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from('users').update({ is_live: next }).eq('id', user.id);
      setProfile(p => p ? { ...p, is_live: next } : p);
    } finally {
      setTogglingLive(false);
    }
  }

  function signOut() {
    setShowSignOutModal(true);
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) {
        Alert.alert('Error', error.message);
        setDeleting(false);
        return;
      }
      await supabase.auth.signOut();
    } catch (e: any) {
      Alert.alert('Error', e.message);
      setDeleting(false);
    }
  }

  const initials = profile?.username?.[0]?.toUpperCase() ?? '?';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#5e3620" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarWrap}>
              {loading ? (
                <Skeleton style={styles.avatarSkeleton} />
              ) : profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>{initials}</Text>
                </View>
              )}
              {!loading && profile?.is_live && <View style={styles.liveDot} />}
            </View>
            <View style={styles.userInfo}>
              {loading ? (
                <>
                  <Skeleton style={styles.usernameSkeleton} />
                  <Skeleton style={styles.emailSkeleton} />
                </>
              ) : (
                <>
                  <Text style={styles.headerUsername}>@{profile?.username ?? '…'}</Text>
                  <Text style={styles.headerEmail}>{profile?.email ?? ''}</Text>
                </>
              )}
            </View>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
            <LogOut size={17} color="#fff9e8" strokeWidth={1.8} />
          </TouchableOpacity>
        </View>
        <View style={styles.headerCurve} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Live mode */}
        <View style={styles.liveCard}>
          <View style={styles.liveText}>
            <Text style={styles.liveTitle}>Live mode</Text>
            <Text style={styles.liveSub}>let others see your spots on the map</Text>
          </View>
          {loading ? (
            <Skeleton style={styles.toggleSkeleton} />
          ) : (
            <TouchableOpacity
              style={[styles.toggleTrack, profile?.is_live && styles.toggleTrackOn]}
              onPress={toggleLive}
              activeOpacity={0.8}>
              <View style={[styles.toggleKnob, profile?.is_live && styles.toggleKnobOn]} />
            </TouchableOpacity>
          )}
        </View>

        {/* Menu */}
        <View style={styles.menuCard}>
          <MenuItem icon={<Pencil size={16} color="#5e3620" strokeWidth={1.8} />} label="Edit profile" onPress={() => navigation.navigate('EditProfile')} />
          <MenuItem icon={<Map size={16} color="#5e3620" strokeWidth={1.8} />} label="My cat map" onPress={() => navigation.navigate('CatMap')} />
          <MenuItem
            icon={<Info size={16} color="#5e3620" strokeWidth={1.8} />}
            label="About"
            onPress={() => navigation.navigate('About')}
            last
          />
        </View>

        {/* Delete account */}
        <View style={[styles.menuCard, styles.menuCardLast]}>
          <MenuItem
            icon={<Trash2 size={16} color="#c0626b" strokeWidth={1.8} />}
            label="Delete account"
            labelColor="#c0626b"
            iconBg="#fff0f0"
            chevronColor="#c0626b"
            onPress={() => setShowDeleteModal(true)}
            last
          />
        </View>

      </ScrollView>

      {/* Sign out modal */}
      <Modal visible={showSignOutModal} transparent animationType="fade" onRequestClose={() => setShowSignOutModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Sign out</Text>
            <Text style={styles.modalBody}>Are you sure you want to sign out?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowSignOutModal(false)}
                activeOpacity={0.7}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => { setShowSignOutModal(false); supabase.auth.signOut(); }}
                activeOpacity={0.7}>
                <Text style={styles.deleteBtnText}>Sign out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete account modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete account</Text>
            <Text style={styles.modalBody}>
              This will permanently delete your account and all your cat spots. This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowDeleteModal(false)}
                disabled={deleting}
                activeOpacity={0.7}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={confirmDelete}
                disabled={deleting}
                activeOpacity={0.7}>
                {deleting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.deleteBtnText}>Yes, delete</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function MenuItem({
  icon, label, onPress, last, labelColor, iconBg, chevronColor,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  last?: boolean;
  labelColor?: string;
  iconBg?: string;
  chevronColor?: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuRow, last && styles.menuRowLast]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={[styles.menuIconWrap, iconBg ? { backgroundColor: iconBg } : undefined]}>
        {icon}
      </View>
      <Text style={[styles.menuLabel, labelColor ? { color: labelColor } : undefined]}>{label}</Text>
      <ChevronRight size={16} color={chevronColor ?? '#a09070'} strokeWidth={1.8} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fdfcee' },

  header: { backgroundColor: '#5e3620', paddingTop: 28, paddingHorizontal: 18 },
  headerInner: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingBottom: 20,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 58, height: 58, borderRadius: 29, borderWidth: 3, borderColor: '#7a4828' },
  avatarPlaceholder: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: '#fff9e8', borderWidth: 3, borderColor: '#7a4828',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: { fontSize: 24, fontWeight: '600', color: '#5e3620' },
  liveDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#CBDF90', borderWidth: 2, borderColor: '#5e3620',
  },
  avatarSkeleton: { width: 58, height: 58, borderRadius: 29 },
  userInfo: { gap: 6 },
  usernameSkeleton: { width: 120, height: 16, borderRadius: 6 },
  emailSkeleton: { width: 80, height: 11, borderRadius: 5 },
  headerUsername: { fontSize: 18, fontWeight: '500', color: '#fff9e8' },
  headerEmail: { fontSize: 12, color: '#c8b090' },
  logoutBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#7a4828', borderWidth: 0.5, borderColor: '#faa93e',
    justifyContent: 'center', alignItems: 'center',
  },
  headerCurve: {
    height: 22, backgroundColor: '#fdfcee',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    marginHorizontal: -18,
  },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 48 },

  liveCard: {
    backgroundColor: '#5e3620', borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12,
  },
  liveText: { flex: 1 },
  liveTitle: { fontSize: 13, fontWeight: '500', color: '#fff9e8', marginBottom: 3 },
  liveSub: { fontSize: 11, color: '#c8b090' },
  toggleSkeleton: { width: 46, height: 26, borderRadius: 13 },
  toggleTrack: {
    width: 46, height: 26, borderRadius: 13,
    backgroundColor: '#a09070', flexDirection: 'row',
    alignItems: 'center', paddingHorizontal: 3, justifyContent: 'flex-start',
  },
  toggleTrackOn: { backgroundColor: '#CBDF90', justifyContent: 'flex-end' },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff9e8' },
  toggleKnobOn: { backgroundColor: '#5e3620' },

  menuCard: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 0.5, borderColor: '#fff9e8',
    overflow: 'hidden', marginBottom: 12,
  },
  menuCardLast: { marginBottom: 0 },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    borderBottomWidth: 0.5, borderBottomColor: '#fff9e8',
  },
  menuRowLast: { borderBottomWidth: 0 },
  menuIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#fff9e8', justifyContent: 'center', alignItems: 'center',
  },
  menuLabel: { flex: 1, fontSize: 13, color: '#5e3620' },

  // Modal
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    width: '100%', backgroundColor: '#fdfcee',
    borderRadius: 24, padding: 28,
    borderWidth: 0.5, borderColor: '#eab664',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18, fontWeight: '600', color: '#5e3620',
    marginBottom: 10, textAlign: 'center',
  },
  modalBody: {
    fontSize: 13, color: '#736c5c', textAlign: 'center',
    lineHeight: 20, marginBottom: 24,
  },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: {
    flex: 1, height: 46, borderRadius: 12,
    borderWidth: 1, borderColor: '#eab664',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#fff9e8',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '500', color: '#5e3620' },
  deleteBtn: {
    flex: 1, height: 46, borderRadius: 12,
    backgroundColor: '#c0626b',
    justifyContent: 'center', alignItems: 'center',
  },
  deleteBtnText: { fontSize: 14, fontWeight: '500', color: '#fff' },
});
