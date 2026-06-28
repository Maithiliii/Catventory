import React, { useEffect, useState } from 'react';
import { View, Image } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import LoginScreen from '../screens/auth/LoginScreen';
import UsernameSetupScreen from '../screens/auth/UsernameSetupScreen';
import MainTabNavigator from './MainTabNavigator';
import type { RootStackParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();

type AuthState = 'loading' | 'unauthenticated' | 'needsUsername' | 'authenticated';

export default function AppNavigator() {
  const [authState, setAuthState] = useState<AuthState>('loading');

  useEffect(() => {
    async function resolve(userId: string) {
      const { data: profile } = await supabase
        .from('users')
        .select('username')
        .eq('id', userId)
        .single();
      setAuthState(profile?.username ? 'authenticated' : 'needsUsername');
    }

    // Check existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setAuthState('unauthenticated'); return; }
      resolve(session.user.id);
    });

    // React to any future auth change (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setAuthState('unauthenticated');
      } else if (session?.user) {
        resolve(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (authState === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#faf2e2' }}>
        <Image
          source={require('../../assets/Logo.png')}
          style={{ width: 160, height: 160, resizeMode: 'contain' }}
        />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {authState === 'authenticated' ? (
        <Stack.Screen name="Main" component={MainTabNavigator} />
      ) : authState === 'needsUsername' ? (
        <Stack.Screen name="UsernameSetup" component={UsernameSetupScreen} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
