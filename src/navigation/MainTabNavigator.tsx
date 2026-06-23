import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ExploreScreen from '../screens/main/ExploreScreen';
import CollectionNavigator from './CollectionNavigator';
import CameraScreen from '../screens/main/CameraScreen';
import RanksScreen from '../screens/main/RanksScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import type { MainTabParamList } from '../types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ACTIVE = '#2B2B6E';
const INACTIVE = '#9B9BC8';

const ICONS: Record<string, string> = {
  Explore: '🧭',
  Collection: '🐾',
  Ranks: '🏆',
  Profile: '👤',
};

const TAB_BAR_STYLE = {
  backgroundColor: '#fff',
  borderTopWidth: 0.5,
  borderTopColor: '#E8D8F0',
  paddingBottom: Platform.OS === 'ios' ? 20 : 12,
  paddingTop: 0,
  height: Platform.OS === 'ios' ? 80 : 64,
};

function TabBarIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <View style={tabStyles.iconWrap}>
      <Text style={tabStyles.icon}>{ICONS[name]}</Text>
      <Text style={[tabStyles.label, { color: focused ? ACTIVE : INACTIVE }]}>{name}</Text>
    </View>
  );
}

function CameraTabIcon() {
  return (
    <View style={tabStyles.cameraBtn}>
      <Text style={tabStyles.cameraIcon}>📷</Text>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  iconWrap: { alignItems: 'center', gap: 4, paddingTop: 4 },
  icon: { fontSize: 22 },
  label: { fontSize: 10, fontWeight: '500' },
  cameraBtn: {
    width: 50,
    height: 50,
    backgroundColor: ACTIVE,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#F5F0F8',
    marginBottom: 20,
  },
  cameraIcon: { fontSize: 22 },
});

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: TAB_BAR_STYLE,
        tabBarShowLabel: false,
      }}>
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabBarIcon name="Explore" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Collection"
        component={CollectionNavigator}
        options={{
          tabBarIcon: ({ focused }) => <TabBarIcon name="Collection" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Camera"
        component={CameraScreen}
        options={{
          tabBarIcon: () => <CameraTabIcon />,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tab.Screen
        name="Ranks"
        component={RanksScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabBarIcon name="Ranks" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabBarIcon name="Profile" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}
