import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ProfileScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.emoji}>👤</Text>
      <Text style={styles.text}>Profile coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F0F8', justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 48, marginBottom: 12 },
  text: { fontSize: 16, color: '#6B6B9E' },
});
