import React, { useEffect, useRef, useState } from 'react';
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
  StatusBar,
  Image,
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [loadingSend, setLoadingSend] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const digitRefs = useRef<(TextInput | null)[]>([]);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const otpFilled = otp.every(d => d !== '');
  const canResend = otpSent && resendCooldown === 0;

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  function startCooldown() {
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function sendOtp() {
    if (!email.trim()) return;
    setLoadingSend(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setLoadingSend(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setOtpSent(true);
      startCooldown();
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
      Alert.alert('Invalid code', error.message);
      return;
    }
    // AppNavigator's onAuthStateChange handles routing after SIGNED_IN fires
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
    if (!canResend) return;
    setOtp(['', '', '', '', '', '']);
    sendOtp();
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <View style={styles.appName}>
          <Text style={styles.headerTitle}>Catventory</Text>
          <Text style={styles.headerSub}>collect every cat you meet</Text>
        </View>

        <Image
          source={require('../../../assets/Login.jpg')}
          style={styles.heroImage}
          resizeMode="contain"
        />

        <View style={styles.body}>
          <Text style={styles.welcome}>Welcome</Text>
          <Text style={styles.welcomeSub}>Enter your email to get started</Text>

          {/* Email */}
          <Text style={styles.label}>Email address</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="you@example.com"
              placeholderTextColor="#a09070"
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
              <ActivityIndicator color="#fff9e8" />
            ) : (
              <Text style={styles.primaryBtnText}>{otpSent ? 'OTP sent' : 'Send OTP'}</Text>
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
              <ActivityIndicator color="#5e3620" />
            ) : (
              <Text style={styles.secondaryBtnText}>Verify & enter</Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Didn't get it? </Text>
            <TouchableOpacity onPress={resendOtp} disabled={!canResend}>
              <Text style={[styles.resendLink, !canResend && styles.resendLinkDisabled]}>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  scroll: { flexGrow: 1, backgroundColor: '#fdfcee' },

  appName: {
    backgroundColor: '#fff',
    paddingTop: 17,
    paddingBottom: 12,
    paddingHorizontal: 24,
    alignItems: 'flex-start',
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#5e3620', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: '#a09070', marginTop: 3 },

  heroImage: {
    width: '100%',
    height: 180,
    marginTop: -19,
  },

  body: {
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },

  welcome: { fontSize: 20, fontWeight: '500', color: '#5e3620', marginBottom: 4 },
  welcomeSub: { fontSize: 13, color: '#736c5c', marginBottom: 20 },

  label: { fontSize: 12, color: '#736c5c', marginBottom: 6 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#eab664',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  textInput: { flex: 1, fontSize: 14, color: '#5e3620' },

  primaryBtn: {
    height: 44,
    backgroundColor: '#5e3620',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#fff9e8', fontSize: 15, fontWeight: '500' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 0.5, backgroundColor: '#eab664' },
  dividerText: { fontSize: 12, color: '#a09070', marginHorizontal: 8 },

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
    borderColor: '#faa93e',
    borderRadius: 8,
    fontSize: 20,
    fontWeight: '500',
    color: '#5e3620',
    backgroundColor: '#fff',
  },
  digitBoxFilled: { borderColor: '#5e3620', borderWidth: 1.5 },

  secondaryBtn: {
    height: 44,
    backgroundColor: '#eab664',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  secondaryBtnDisabled: { opacity: 0.5 },
  secondaryBtnText: { color: '#5e3620', fontSize: 15, fontWeight: '500' },

  resendRow: { flexDirection: 'row', justifyContent: 'center' },
  resendText: { fontSize: 12, color: '#736c5c' },
  resendLink: { fontSize: 12, color: '#faa93e', fontWeight: '500' },
  resendLinkDisabled: { color: '#a09070' },
});
