import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft } from 'lucide-react-native';
import type { ProfileStackParamList } from '../../types';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'About'>;
};

function Section({ title, body, bullets }: { title: string; body?: string; bullets?: string[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {body && <Text style={styles.sectionBody}>{body}</Text>}
      {bullets && bullets.map((item, i) => (
        <View key={i} style={styles.bullet}>
          <Text style={styles.paw}>🐾</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export default function AboutScreen({ navigation }: Props) {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#5e3620" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ChevronLeft size={22} color="#fff9e8" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        <Section
          title="What is Catventory?"
          body="Catventory is a cat spotting app. Take a photo of a cat you spot, save it to your collection, and share it on the map for other cat lovers nearby to discover. Think of it as your personal cat field journal."
        />

        <Section
          title="How you can use this app"
          bullets={[
            'Spot and collect cats you encounter in your daily life',
            'Share cat locations on the map to help others find them',
            'Help animal welfare organisations track stray cat populations in your area',
            'Coordinate community feeding spots for strays',
            'Assist NGOs in identifying cats that need neutering or medical attention',
            'Help connect stray cats to potential adopters',
          ]}
        />

        <Section
          title="Community guidelines"
          bullets={[
            'Never disturb, chase, or harm a cat to get a photo',
            'Do not share false or misleading cat locations',
            'Do not use the app to harass other users',
            'Respect private property when spotting cats',
            'If you find an injured cat, contact a local animal welfare NGO immediately',
          ]}
        />

        <Section
          title="For animal welfare organisations"
          body="NGOs and animal welfare volunteers can use Catventory to map stray cat populations, plan neutering drives, coordinate feeding routes, and identify cats that need urgent care. The app is free to use for all welfare purposes."
        />

        <Section
          title="Misuse policy"
          body="Any misuse of the app including posting fake locations, using the platform to harm animals, or harassing other users will result in permanent removal from Catventory."
        />

        <View style={styles.footer}>
          <Text style={styles.version}>Version 1.0.0</Text>
          <Text style={styles.privacy}>Privacy policy</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fdfcee' },

  header: {
    backgroundColor: '#5e3620',
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '500', color: '#fff9e8' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  section: {
    backgroundColor: '#fff9e8',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: '#eab664',
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 13, fontWeight: '500', color: '#5e3620', marginBottom: 8 },
  sectionBody: { fontSize: 12, color: '#736c5c', lineHeight: 20 },

  bullet: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  paw: { fontSize: 12 },
  bulletText: { flex: 1, fontSize: 12, color: '#736c5c', lineHeight: 20 },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  version: { fontSize: 11, color: '#736c5c' },
  privacy: { fontSize: 11, color: '#faa93e' },
});
