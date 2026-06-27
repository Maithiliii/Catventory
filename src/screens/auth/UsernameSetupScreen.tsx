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
} from 'react-native';
import { User, Camera as CameraIcon } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'UsernameSetup'>;
};

export default function UsernameSetupScreen({ navigation }: Props) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  function handleUsernameChange(text: string) {
    setUsername(text.replace(/[^a-zA-Z0-9_]/g, ''));
  }

  async function submit() {
    if (!username) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { error } = await supabase.from('users').upsert({
      id: user.id,
      username,
      is_live: false,
    });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      navigation.replace('Main');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor="#5e3620" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <Text style={styles.headerEmoji}>🐾</Text>
          <Text style={styles.headerTitle}>One last thing</Text>
          <Text style={styles.headerSub}>Choose how other cat lovers will know you</Text>
        </View>

        <View style={styles.body}>
          {/* Profile picture placeholder */}
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <User size={32} color="#eab664" strokeWidth={1.5} />
            </View>
            <View style={styles.cameraBtn}>
              <CameraIcon size={12} color="#fff9e8" strokeWidth={2} />
            </View>
          </View>
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

          {/* Button */}
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
    paddingTop: 36,
    paddingBottom: 32,
    alignItems: 'center',
  },
  headerEmoji: { fontSize: 48, marginBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '500', color: '#fff9e8', letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: '#eab664', marginTop: 6, textAlign: 'center', paddingHorizontal: 20 },

  body: {
    padding: 24,
  },

  avatarWrap: { alignSelf: 'center', marginBottom: 6, position: 'relative' },
  avatar: {
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
