import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';

export function Skeleton({ style }: { style?: ViewStyle | ViewStyle[] }) {
  const anim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.35, duration: 750, useNativeDriver: true }),
      ]),
    ).start();
  }, [anim]);

  return <Animated.View style={[styles.base, style, { opacity: anim }]} />;
}

const styles = StyleSheet.create({
  base: { backgroundColor: '#d8c8b0', borderRadius: 8 },
});
