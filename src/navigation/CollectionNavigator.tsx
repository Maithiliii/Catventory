import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CollectionScreen from '../screens/main/CollectionScreen';
import CatEditScreen from '../screens/main/CatEditScreen';
import MapPickerScreen from '../screens/main/MapPickerScreen';
import CatMapScreen from '../screens/main/CatMapScreen';
import type { CollectionStackParamList } from '../types';

const Stack = createNativeStackNavigator<CollectionStackParamList>();

export default function CollectionNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CollectionList" component={CollectionScreen} />
      <Stack.Screen name="CatEdit" component={CatEditScreen} />
      <Stack.Screen name="MapPicker" component={MapPickerScreen} />
      <Stack.Screen name="CatMap" component={CatMapScreen} />
    </Stack.Navigator>
  );
}
