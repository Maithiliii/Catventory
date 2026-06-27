import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ChevronLeft, Camera, AtSign, Mail, Lock, Pencil } from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';
import { supabase } from '../../lib/supabase';
import type { ProfileStackParamList } from '../../types';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'EditProfile'>;
};

function SaveButton({ hasChanges, saving, onPress }: { hasChanges: boolean; saving: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.saveBtn, (!hasChanges || saving) && styles.saveBtnDisabled]}
      onPress={onPress}
      disabled={!hasChanges || saving}
      activeOpacity={0.85}>
      {saving ? <ActivityIndicator color="#5e3620" /> : <Text style={styles.saveBtnText}>Save changes</Text>}
    </TouchableOpacity>
  );
}

export default function EditProfileScreen({ navigation }: Props) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const userId = useRef('');
  const original = useRef({ username: '', bio: '' });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    userId.current = user.id;
    setEmail(user.email ?? '');

    const { data } = await supabase
      .from('users')
      .select('username, avatar_url, bio')
      .eq('id', user.id)
      .single();
    if (data) {
      const u = (data as any).username ?? '';
      const b = (data as any).bio ?? '';
      setUsername(u);
      setAvatarUrl((data as any).avatar_url ?? null);
      setBio(b);
      original.current = { username: u, bio: b };
    } else {
      // bio column may not exist yet — fall back to just username + avatar
      const { data: basic } = await supabase
        .from('users')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single();
      if (basic) {
        const u = (basic as any).username ?? '';
        setUsername(u);
        setAvatarUrl((basic as any).avatar_url ?? null);
        original.current = { username: u, bio: '' };
      }
    }
  }

  function handleUsernameChange(text: string) {
    const cleaned = text.replace(/[^a-zA-Z0-9_]/g, '');
    setUsername(cleaned);
    setUsernameError('');
  }

  async function pickAvatar() {
    const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, quality: 0.8 });
    if (result.didCancel || !result.assets?.length) return;
    const asset = result.assets[0];
    if (!asset.uri || !userId.current) return;

    setUploading(true);
    try {
      // Step 1: read the picked image as a Blob via XHR
      const blob = await new Promise<Blob>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => resolve(xhr.response);
        xhr.onerror = () => reject(new Error('Could not read image'));
        xhr.responseType = 'blob';
        xhr.open('GET', asset.uri, true);
        xhr.send(null);
      });

      // Step 2: get the current auth token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? SUPABASE_ANON_KEY;

      // Step 3: upload via XHR directly to Supabase storage REST API
      const storagePath = userId.current;
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`${xhr.status}: ${xhr.responseText}`));
          }
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/avatars/${storagePath}`, true);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
        xhr.setRequestHeader('Content-Type', asset.type || 'image/jpeg');
        xhr.setRequestHeader('x-upsert', 'true');
        xhr.send(blob);
      });

      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${storagePath}`;
      await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', userId.current);
      setAvatarUrl(publicUrl);
    } catch (e: any) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    const trimmed = username.trim();
    if (!trimmed) {
      setUsernameError('Username cannot be empty');
      return;
    }
    if (trimmed.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return;
    }

    setSaving(true);
    try {
      // Check uniqueness (exclude self)
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', trimmed)
        .neq('id', userId.current)
        .maybeSingle();

      if (existing) {
        setUsernameError('That username is already taken');
        setSaving(false);
        return;
      }

      const updatePayload: Record<string, any> = { username: trimmed };
      if (bio.trim()) updatePayload.bio = bio.trim();

      const { error } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', userId.current);

      if (error) { Alert.alert('Error', error.message); return; }
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#5e3620" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ChevronLeft size={22} color="#fff9e8" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit profile</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {username.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
            {uploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color="#fff9e8" />
              </View>
            )}
            <TouchableOpacity style={styles.cameraBadge} onPress={pickAvatar} disabled={uploading} activeOpacity={0.8}>
              <Camera size={13} color="#5e3620" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Username */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Username</Text>
          <View style={[styles.inputRow, usernameError ? styles.inputRowError : undefined]}>
            <AtSign size={16} color="#eab664" strokeWidth={1.8} />
            <TextInput
              style={styles.textInput}
              value={username}
              onChangeText={handleUsernameChange}
              placeholder="your_username"
              placeholderTextColor="#c8b090"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pencil size={14} color="#a09070" strokeWidth={1.8} />
          </View>
          {usernameError ? (
            <Text style={styles.errorText}>{usernameError}</Text>
          ) : (
            <Text style={styles.fieldHint}>only letters, numbers and underscores</Text>
          )}
        </View>

        {/* Bio */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>
            Bio{'  '}
            <Text style={styles.optionalLabel}>(optional)</Text>
          </Text>
          <TextInput
            style={styles.bioInput}
            value={bio}
            onChangeText={setBio}
            placeholder="cat lover in Mumbai..."
            placeholderTextColor="#c8b090"
            multiline
            maxLength={120}
            textAlignVertical="top"
          />
          <Text style={styles.fieldHint}>keep it short and sweet</Text>
        </View>

        {/* Email — read-only */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Email</Text>
          <View style={styles.lockedRow}>
            <Mail size={16} color="#a09070" strokeWidth={1.8} />
            <Text style={styles.lockedText} numberOfLines={1}>{email}</Text>
            <Lock size={14} color="#a09070" strokeWidth={1.8} />
          </View>
        </View>

        {/* Save */}
        <SaveButton
          hasChanges={username.trim() !== original.current.username || bio.trim() !== original.current.bio}
          saving={saving}
          onPress={save}
        />

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fdfcee' },

  header: {
    backgroundColor: '#5e3620',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 18,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '500', color: '#fff9e8' },

  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 48 },

  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 2, borderColor: '#eab664',
  },
  avatarPlaceholder: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#fff9e8', borderWidth: 2, borderColor: '#eab664',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: { fontSize: 36, fontWeight: '600', color: '#5e3620' },
  uploadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 45, backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center', alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#faa93e', borderWidth: 2, borderColor: '#fdfcee',
    justifyContent: 'center', alignItems: 'center',
  },

  fieldGroup: { marginBottom: 18 },
  fieldLabel: { fontSize: 12, color: '#736c5c', marginBottom: 6 },
  optionalLabel: { fontSize: 11, color: '#eab664' },
  fieldHint: { fontSize: 11, color: '#a09070', marginTop: 5, paddingLeft: 2 },
  errorText: { fontSize: 11, color: '#c0626b', marginTop: 5, paddingLeft: 2 },

  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 0.5, borderColor: '#eab664',
    borderRadius: 12, paddingHorizontal: 14, height: 48,
    backgroundColor: '#fff9e8',
  },
  inputRowError: { borderColor: '#c0626b' },
  textInput: { flex: 1, fontSize: 14, color: '#5e3620' },

  bioInput: {
    borderWidth: 0.5, borderColor: '#eab664',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: '#fff9e8', minHeight: 88,
    fontSize: 14, color: '#5e3620',
  },

  lockedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 0.5, borderColor: '#eab664',
    borderRadius: 12, paddingHorizontal: 14, height: 48,
    backgroundColor: '#fdfcee', opacity: 0.6,
  },
  lockedText: { flex: 1, fontSize: 14, color: '#736c5c' },

  saveBtn: {
    height: 48, backgroundColor: '#faa93e',
    borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 15, fontWeight: '500', color: '#5e3620' },
});
