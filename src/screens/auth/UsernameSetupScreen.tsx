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
} from 'react-native';
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
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>🐾</Text>
          <Text style={styles.headerTitle}>One last thing</Text>
          <Text style={styles.headerSub}>Choose how other cat hunters will know you</Text>
        </View>

        <View style={styles.body}>
          {/* Profile picture placeholder */}
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarIcon}>👤</Text>
            </View>
            <View style={styles.cameraBtn}>
              <Text style={styles.cameraBtnIcon}>📷</Text>
            </View>
          </View>
          <Text style={styles.avatarHint}>
            profile picture <Text style={styles.optional}>optional</Text>
          </Text>

          {/* Username input */}
          <View style={styles.labelRow}>
            <Text style={styles.label}>Username</Text>
            <Text style={styles.required}>required</Text>
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.atSign}>@</Text>
            <TextInput
              style={styles.textInput}
              placeholder="yourcatname"
              placeholderTextColor="#9B9BC8"
              value={username}
              onChangeText={handleUsernameChange}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <Text style={styles.hint}>only letters, numbers and underscores</Text>

          {/* Preview */}
          <View style={styles.preview}>
            <Text style={styles.previewLabel}>preview</Text>
            <View style={styles.previewRow}>
              <View style={styles.previewAvatar}>
                <Text>👤</Text>
              </View>
              <View>
                <Text style={styles.previewName}>
                  {username ? `@${username}` : '@yourcatname'}
                </Text>
                <Text style={styles.previewSub}>cat hunter · 0 collected</Text>
              </View>
            </View>
          </View>

          {/* Button */}
          <TouchableOpacity
            style={[styles.btn, !username && styles.btnDisabled]}
            onPress={submit}
            disabled={!username || loading}>
            {loading ? (
              <ActivityIndicator color="#F5F0F8" />
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
  root: { flex: 1, backgroundColor: '#F5F0F8' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },

  header: {
    backgroundColor: '#2B2B6E',
    borderRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingVertical: 32,
    alignItems: 'center',
  },
  headerEmoji: { fontSize: 48, marginBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '500', color: '#E8D8F0', letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: '#9B9BC8', marginTop: 6, textAlign: 'center', paddingHorizontal: 20 },

  body: {
    backgroundColor: '#F5F0F8',
    borderWidth: 0.5,
    borderColor: '#D4B8D0',
    borderRadius: 20,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    padding: 24,
  },

  avatarWrap: { alignSelf: 'center', marginBottom: 6, position: 'relative' },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#E8D8F0', borderWidth: 2, borderColor: '#D4B8D0',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarIcon: { fontSize: 32 },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#2B2B6E', borderWidth: 2, borderColor: '#F5F0F8',
    justifyContent: 'center', alignItems: 'center',
  },
  cameraBtnIcon: { fontSize: 12 },
  avatarHint: { textAlign: 'center', fontSize: 11, color: '#9B9BC8', marginBottom: 24 },
  optional: { color: '#D4B8D0', fontWeight: '500' },

  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  label: { fontSize: 12, color: '#6B6B9E' },
  required: { fontSize: 11, color: '#2B2B6E', fontWeight: '500' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#9B9BC8',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    backgroundColor: '#fff',
  },
  atSign: { fontSize: 16, color: '#9B9BC8', marginRight: 4 },
  textInput: { flex: 1, fontSize: 14, color: '#2B2B6E' },
  hint: { fontSize: 11, color: '#9B9BC8', marginTop: 6, paddingLeft: 4, marginBottom: 20 },

  preview: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#E8D8F0',
    padding: 14,
    marginBottom: 24,
  },
  previewLabel: { fontSize: 12, color: '#9B9BC8', marginBottom: 8 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  previewAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#E8D8F0', justifyContent: 'center', alignItems: 'center',
  },
  previewName: { fontSize: 13, fontWeight: '500', color: '#2B2B6E' },
  previewSub: { fontSize: 11, color: '#9B9BC8' },

  btn: {
    height: 48, backgroundColor: '#2B2B6E',
    borderRadius: 14, justifyContent: 'center', alignItems: 'center',
  },
  btnDisabled: { backgroundColor: '#9B9BC8', opacity: 0.6 },
  btnText: { color: '#F5F0F8', fontSize: 15, fontWeight: '500' },
  btnHint: { textAlign: 'center', fontSize: 11, color: '#9B9BC8', marginTop: 8 },
});
