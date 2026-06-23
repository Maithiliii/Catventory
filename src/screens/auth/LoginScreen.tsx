import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [loadingSend, setLoadingSend] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const digitRefs = useRef<(TextInput | null)[]>([]);

  const otpFilled = otp.every(d => d !== '');

  async function sendOtp() {
    if (!email.trim()) return;
    setLoadingSend(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
    setLoadingSend(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setOtpSent(true);
    }
  }

  async function verifyOtp() {
    if (!otpFilled) return;
    setLoadingVerify(true);
    const token = otp.join('');
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: 'email',
    });
    setLoadingVerify(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    // Check if user already has a username
    if (data.user) {
      const { data: profile } = await supabase
        .from('users')
        .select('username')
        .eq('id', data.user.id)
        .single();
      if (profile?.username) {
        navigation.replace('Main');
      } else {
        navigation.replace('UsernameSetup');
      }
    }
  }

  function handleDigitChange(text: string, index: number) {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) {
      digitRefs.current[index + 1]?.focus();
    }
  }

  function handleDigitKeyPress(key: string, index: number) {
    if (key === 'Backspace' && otp[index] === '' && index > 0) {
      digitRefs.current[index - 1]?.focus();
    }
  }

  function resendOtp() {
    setOtp(['', '', '', '', '', '']);
    sendOtp();
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>🐱</Text>
          <Text style={styles.headerTitle}>Catventory</Text>
          <Text style={styles.headerSub}>collect every cat you meet</Text>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <Text style={styles.welcome}>Welcome</Text>
          <Text style={styles.welcomeSub}>Enter your email to get started</Text>

          {/* Email */}
          <Text style={styles.label}>Email address</Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputIcon}>✉</Text>
            <TextInput
              style={styles.textInput}
              placeholder="you@example.com"
              placeholderTextColor="#BBAED0"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!otpSent}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, (!email.trim() || otpSent) && styles.primaryBtnDisabled]}
            onPress={sendOtp}
            disabled={!email.trim() || otpSent || loadingSend}>
            {loadingSend ? (
              <ActivityIndicator color="#E8D8F0" />
            ) : (
              <Text style={styles.primaryBtnText}>{otpSent ? 'OTP sent ✓' : 'Send OTP'}</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>then enter your code</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* OTP digits */}
          <Text style={styles.label}>OTP code</Text>
          <View style={styles.otpRow}>
            {otp.map((digit, i) => (
              <TextInput
                key={i}
                ref={r => { digitRefs.current[i] = r; }}
                style={[styles.digitBox, digit ? styles.digitBoxFilled : null]}
                value={digit}
                onChangeText={t => handleDigitChange(t, i)}
                onKeyPress={({ nativeEvent }) => handleDigitKeyPress(nativeEvent.key, i)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                selectTextOnFocus
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.secondaryBtn, !otpFilled && styles.secondaryBtnDisabled]}
            onPress={verifyOtp}
            disabled={!otpFilled || loadingVerify}>
            {loadingVerify ? (
              <ActivityIndicator color="#2B2B6E" />
            ) : (
              <Text style={styles.secondaryBtnText}>Verify & enter</Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Didn't get it? </Text>
            <TouchableOpacity onPress={resendOtp}>
              <Text style={styles.resendLink}>Resend</Text>
            </TouchableOpacity>
          </View>
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
    paddingVertical: 40,
    alignItems: 'center',
    marginBottom: 0,
  },
  headerEmoji: { fontSize: 52, marginBottom: 8 },
  headerTitle: { fontSize: 26, fontWeight: '500', color: '#E8D8F0', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: '#9B9BC8', marginTop: 4 },

  body: {
    backgroundColor: '#F5F0F8',
    borderWidth: 0.5,
    borderColor: '#D4B8D0',
    borderRadius: 20,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    padding: 24,
  },

  welcome: { fontSize: 20, fontWeight: '500', color: '#2B2B6E', marginBottom: 4 },
  welcomeSub: { fontSize: 13, color: '#6B6B9E', marginBottom: 20 },

  label: { fontSize: 12, color: '#6B6B9E', marginBottom: 6 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#9B9BC8',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  inputIcon: { fontSize: 16, color: '#5B5B9E', marginRight: 8 },
  textInput: { flex: 1, fontSize: 14, color: '#2B2B6E' },

  primaryBtn: {
    height: 44,
    backgroundColor: '#2B2B6E',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#E8D8F0', fontSize: 15, fontWeight: '500' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 0.5, backgroundColor: '#D4B8D0' },
  dividerText: { fontSize: 12, color: '#BBAED0', marginHorizontal: 8 },

  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  digitBox: {
    width: 44,
    height: 52,
    borderWidth: 0.5,
    borderColor: '#5B5B9E',
    borderRadius: 8,
    fontSize: 20,
    fontWeight: '500',
    color: '#2B2B6E',
    backgroundColor: '#fff',
  },
  digitBoxFilled: { borderColor: '#2B2B6E', borderWidth: 1.5 },

  secondaryBtn: {
    height: 44,
    backgroundColor: '#D4B8D0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  secondaryBtnDisabled: { opacity: 0.5 },
  secondaryBtnText: { color: '#2B2B6E', fontSize: 15, fontWeight: '500' },

  resendRow: { flexDirection: 'row', justifyContent: 'center' },
  resendText: { fontSize: 12, color: '#6B6B9E' },
  resendLink: { fontSize: 12, color: '#5B5B9E', fontWeight: '500' },
});
