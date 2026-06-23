import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import type { Cat } from '../../types';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning,';
  if (hour < 17) return 'Good afternoon,';
  return 'Good evening,';
}

function timeAgo(isoDate: string) {
  const diff = (Date.now() - new Date(isoDate).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const EMOJIS: Record<string, string> = {};
const DEFAULT_EMOJI = '🐱';

export default function ExploreScreen() {
  const [username, setUsername] = useState('');
  const [recentCats, setRecentCats] = useState<Cat[]>([]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('users')
        .select('username')
        .eq('id', user.id)
        .single();
      if (profile) setUsername(profile.username);

      const { data: cats } = await supabase
        .from('cats')
        .select('*')
        .order('spotted_at', { ascending: false })
        .limit(10);
      if (cats) setRecentCats(cats as Cat[]);
    }
    load();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#2B2B6E" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.username}>@{username || '…'} 🐾</Text>
        </View>
        <TouchableOpacity style={styles.bellBtn}>
          <Text style={styles.bellIcon}>🔔</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Map preview */}
        <View style={styles.mapCard}>
          <View style={styles.mapGrid} />
          <View style={styles.mapPins}>
            {['#CBDF90', '#D4B8D0', '#CBDF90'].map((color, i) => (
              <View key={i} style={styles.pinWrap}>
                <View style={[styles.pinDot, { backgroundColor: color }]} />
                <View style={[styles.pinStem, { backgroundColor: color }]} />
              </View>
            ))}
          </View>
          <View style={styles.mapFooter}>
            <Text style={styles.mapFooterText}>3 cats spotted nearby</Text>
            <TouchableOpacity style={styles.openMapBtn}>
              <Text style={styles.openMapBtnText}>⤢  Open map</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recently spotted */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Recently spotted</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>see all</Text>
          </TouchableOpacity>
        </View>

        {recentCats.length === 0 ? (
          // Placeholder cards
          [
            { emoji: '🐱', name: 'Tabby near Park St', dist: '0.2 km', time: '4 min ago', isNew: true },
            { emoji: '🐈', name: 'Black cat, Main Ave', dist: '0.5 km', time: '12 min ago', isNew: false },
            { emoji: '🐈‍⬛', name: 'Fluffy, Rooftop Café', dist: '1.1 km', time: '28 min ago', isNew: false },
          ].map((cat, i) => (
            <View key={i} style={styles.catCard}>
              <View style={styles.catAvatar}>
                <Text style={styles.catEmoji}>{cat.emoji}</Text>
              </View>
              <View style={styles.catInfo}>
                <Text style={styles.catName}>{cat.name}</Text>
                <Text style={styles.catMeta}>📍 {cat.dist} · {cat.time}</Text>
              </View>
              <View style={[styles.pill, cat.isNew && styles.pillNew]}>
                <Text style={[styles.pillText, cat.isNew && styles.pillTextNew]}>
                  {cat.isNew ? 'new' : 'spotted'}
                </Text>
              </View>
            </View>
          ))
        ) : (
          recentCats.map(cat => (
            <View key={cat.id} style={styles.catCard}>
              <View style={styles.catAvatar}>
                <Text style={styles.catEmoji}>{cat.emoji || DEFAULT_EMOJI}</Text>
              </View>
              <View style={styles.catInfo}>
                <Text style={styles.catName}>{cat.name}</Text>
                <Text style={styles.catMeta}>
                  {cat.locationName ? `📍 ${cat.locationName} · ` : ''}
                  {timeAgo(cat.spottedAt)}
                </Text>
              </View>
              <View style={styles.pill}>
                <Text style={styles.pillText}>spotted</Text>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F0F8' },

  header: {
    backgroundColor: '#2B2B6E',
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: { fontSize: 13, color: '#9B9BC8', marginBottom: 4 },
  username: { fontSize: 24, fontWeight: '500', color: '#E8D8F0', letterSpacing: -0.3 },
  bellBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#3d3d8a', borderWidth: 1.5, borderColor: '#5B5B9E',
    justifyContent: 'center', alignItems: 'center',
  },
  bellIcon: { fontSize: 18 },

  scroll: { flex: 1 },

  mapCard: {
    margin: 14,
    marginTop: 14,
    backgroundColor: '#2B2B6E',
    borderRadius: 18,
    overflow: 'hidden',
    height: 155,
  },
  mapGrid: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#32327a',
  },
  mapPins: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  pinWrap: { alignItems: 'center', gap: 3 },
  pinDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#2B2B6E' },
  pinStem: { width: 1.5, height: 8, opacity: 0.6 },
  mapFooter: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#1e1e5a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mapFooterText: { fontSize: 11, color: '#9B9BC8' },
  openMapBtn: {
    backgroundColor: '#E8D8F0', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  openMapBtnText: { fontSize: 11, fontWeight: '500', color: '#2B2B6E' },

  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: '500', color: '#2B2B6E' },
  seeAll: { fontSize: 11, color: '#9B9BC8' },

  catCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: '#E8D8F0',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  catAvatar: {
    width: 46, height: 46, borderRadius: 12,
    backgroundColor: '#E8D8F0', justifyContent: 'center', alignItems: 'center',
  },
  catEmoji: { fontSize: 24 },
  catInfo: { flex: 1 },
  catName: { fontSize: 13, fontWeight: '500', color: '#2B2B6E' },
  catMeta: { fontSize: 11, color: '#9B9BC8', marginTop: 3 },
  pill: {
    backgroundColor: '#E8D8F0', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  pillNew: { backgroundColor: '#2B2B6E' },
  pillText: { fontSize: 10, color: '#5B5B9E', fontWeight: '500' },
  pillTextNew: { color: '#E8D8F0' },
});
