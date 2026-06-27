import React, { useEffect, useState } from 'react';
import { View, Image } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import LoginScreen from '../screens/auth/LoginScreen';
import UsernameSetupScreen from '../screens/auth/UsernameSetupScreen';
import MainTabNavigator from './MainTabNavigator';
import type { RootStackParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setInitialRoute('Login');
        return;
      }
      const { data: profile } = await supabase
        .from('users')
        .select('username')
        .eq('id', session.user.id)
        .single();
      setInitialRoute(profile?.username ? 'Main' : 'UsernameSetup');
    }
    checkSession();
  }, []);

  if (!initialRoute) {
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
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="UsernameSetup" component={UsernameSetupScreen} />
      <Stack.Screen name="Main" component={MainTabNavigator} />
    </Stack.Navigator>
  );
}
