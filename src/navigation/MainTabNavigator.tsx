import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Compass, Camera as CameraIcon, Trophy, User } from 'lucide-react-native';
import PawIcon from '../components/PawIcon';
import ExploreScreen from '../screens/main/ExploreScreen';
import CollectionNavigator from './CollectionNavigator';
import CameraScreen from '../screens/main/CameraScreen';
import RanksScreen from '../screens/main/RanksScreen';
import ProfileNavigator from './ProfileNavigator';
import type { MainTabParamList } from '../types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ACTIVE = '#5e3620';
const INACTIVE = '#a09070';

type IconName = 'Explore' | 'Collection' | 'Ranks' | 'Profile';

const LUCIDE_MAP: Record<Exclude<IconName, 'Collection'>, React.ComponentType<{ size: number; color: string; strokeWidth: number }>> = {
  Explore: Compass,
  Ranks: Trophy,
  Profile: User,
};

const TAB_BAR_STYLE = {
  backgroundColor: '#fff',
  borderTopWidth: 0.5,
  borderTopColor: '#fff9e8',
  paddingBottom: Platform.OS === 'ios' ? 20 : 8,
  paddingTop: 6,
  height: Platform.OS === 'ios' ? 84 : 68,
};

function TabBarIcon({ name, focused }: { name: IconName; focused: boolean }) {
  const color = focused ? ACTIVE : INACTIVE;
  let iconEl: React.ReactNode;
  if (name === 'Collection') {
    iconEl = <PawIcon size={22} color={color} strokeWidth={1.8} />;
  } else {
    const IconComponent = LUCIDE_MAP[name];
    iconEl = <IconComponent size={22} color={color} strokeWidth={1.8} />;
  }
  return (
    <View style={tabStyles.iconWrap}>
      {iconEl}
      <Text style={[tabStyles.tabLabel, { color }]} numberOfLines={1}>{name}</Text>
    </View>
  );
}

function CameraTabIcon() {
  return (
    <View style={tabStyles.cameraBtn}>
      <CameraIcon size={22} color="#fff9e8" strokeWidth={1.8} />
    </View>
  );
}

const tabStyles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 10,
    width: 60,
  },
  tabLabel: { fontSize: 9, marginTop: 3, letterSpacing: 0.1 },
  cameraBtn: {
    width: 50,
    height: 50,
    backgroundColor: ACTIVE,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
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
        component={ProfileNavigator}
        options={{
          tabBarIcon: ({ focused }) => <TabBarIcon name="Profile" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}
