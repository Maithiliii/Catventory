import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Image,
} from 'react-native';
import { Camera as CameraIcon } from 'lucide-react-native';
import LottieView from 'lottie-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';
import { supabase } from '../../lib/supabase';

export default function UsernameSetupScreen() {
  const [username, setUsername] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleUsernameChange(text: string) {
    setUsername(text.replace(/[^a-zA-Z0-9_]/g, ''));
  }

  async function pickAvatar() {
    const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, quality: 0.8 });
    if (result.didCancel || !result.assets?.length) return;
    const uri = result.assets[0].uri;
    if (uri) setAvatarUri(uri);
  }

  async function uploadAvatar(userId: string): Promise<string | null> {
    if (!avatarUri) return null;
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => resolve(xhr.response);
        xhr.onerror = () => reject(new Error('Could not read image'));
        xhr.responseType = 'blob';
        xhr.open('GET', avatarUri, true);
        xhr.send(null);
      });
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? SUPABASE_ANON_KEY;
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`${xhr.status}: ${xhr.responseText}`));
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/avatars/${userId}`, true);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
        xhr.setRequestHeader('Content-Type', 'image/jpeg');
        xhr.setRequestHeader('x-upsert', 'true');
        xhr.send(blob);
      });
      return `${SUPABASE_URL}/storage/v1/object/public/avatars/${userId}`;
    } catch (e: any) {
      Alert.alert('Photo upload failed', e.message);
      return null;
    }
  }

  async function submit() {
    if (!username) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const avatarUrl = await uploadAvatar(user.id);

    const payload: Record<string, any> = { id: user.id, username, is_live: false };
    if (avatarUrl) payload.avatar_url = avatarUrl;

    const { error } = await supabase.from('users').upsert(payload);
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      await supabase.auth.refreshSession();
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor="#5e3620" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <LottieView
            source={require('../../../assets/CatAnimation.json')}
            autoPlay
            loop
            style={styles.lottie}
          />
          <Text style={styles.headerTitle}>One last thing</Text>
          <Text style={styles.headerSub}>Choose how other cat lovers will know you</Text>
        </View>

        <View style={styles.body}>
          {/* Profile picture */}
          <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar} activeOpacity={0.8}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <CameraIcon size={28} color="#eab664" strokeWidth={1.5} />
              </View>
            )}
            <View style={styles.cameraBtn}>
              <CameraIcon size={12} color="#fff9e8" strokeWidth={2} />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>
            profile picture <Text style={styles.optional}>(optional)</Text>
          </Text>

          {/* Username input */}
          <View style={styles.labelRow}>
            <Text style={styles.label}>Username<Text style={styles.required}> *</Text></Text>
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.atSign}>@</Text>
            <TextInput
              style={styles.textInput}
              placeholder="yourname"
              placeholderTextColor="#eab664"
              value={username}
              onChangeText={handleUsernameChange}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <Text style={styles.hint}>only letters, numbers and underscores</Text>

          <TouchableOpacity
            style={[styles.btn, !username && styles.btnDisabled]}
            onPress={submit}
            disabled={!username || loading}>
            {loading ? (
              <ActivityIndicator color="#fdfcee" />
            ) : (
              <Text style={styles.btnText}>Let's go</Text>
            )}
          </TouchableOpacity>
          {!username && <Text style={styles.btnHint}>enter a username to continue</Text>}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fdfcee' },
  scroll: { flexGrow: 1 },

  header: {
    backgroundColor: '#5e3620',
    paddingTop: 28,
    paddingBottom: 28,
    alignItems: 'center',
  },
  lottie: { width: 140, height: 140 },
  headerTitle: { fontSize: 22, fontWeight: '500', color: '#fff9e8', letterSpacing: -0.3, marginTop: -8 },
  headerSub: { fontSize: 13, color: '#eab664', marginTop: 6, textAlign: 'center', paddingHorizontal: 20 },

  body: { padding: 24 },

  avatarWrap: { alignSelf: 'center', marginBottom: 6, position: 'relative' },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 2, borderColor: '#eab664',
  },
  avatarPlaceholder: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#fff9e8', borderWidth: 2, borderColor: '#eab664',
    justifyContent: 'center', alignItems: 'center',
  },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#5e3620', borderWidth: 2, borderColor: '#fdfcee',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarHint: { textAlign: 'center', fontSize: 11, color: '#eab664', marginBottom: 24 },
  optional: { color: '#eab664', fontWeight: '500' },

  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  label: { fontSize: 12, color: '#736c5c' },
  required: { fontSize: 14, color: '#c0626b', fontWeight: '700' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#eab664',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    backgroundColor: '#fff',
  },
  atSign: { fontSize: 16, color: '#eab664', marginRight: 4 },
  textInput: { flex: 1, fontSize: 14, color: '#5e3620' },
  hint: { fontSize: 11, color: '#eab664', marginTop: 6, paddingLeft: 4, marginBottom: 20 },

  btn: {
    height: 48, backgroundColor: '#5e3620',
    borderRadius: 14, justifyContent: 'center', alignItems: 'center',
  },
  btnDisabled: { backgroundColor: '#eab664', opacity: 0.6 },
  btnText: { color: '#fdfcee', fontSize: 15, fontWeight: '500' },
  btnHint: { textAlign: 'center', fontSize: 11, color: '#eab664', marginTop: 8 },
});
