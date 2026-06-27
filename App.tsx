import 'react-native-url-polyfill/auto';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MapboxGL from '@rnmapbox/maps';
import { MAPBOX_PUBLIC_TOKEN } from '@env';
import AppNavigator from './src/navigation/AppNavigator';

MapboxGL.setAccessToken(MAPBOX_PUBLIC_TOKEN);

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
