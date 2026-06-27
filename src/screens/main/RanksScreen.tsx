import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Animated,
  Image,
} from 'react-native';
import { supabase } from '../../lib/supabase';

interface LeaderboardEntry {
  id: string;
  username: string;
  avatar_url: string | null;
  cat_count: number;
}

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const PODIUM_HEIGHTS = [100, 70, 50];
const PODIUM_COLORS = ['#5e3620', '#a09070', '#7a4828'];
const MEDALS = ['🥇', '🥈', '🥉'];
const PODIUM_ORDER = [1, 0, 2]; // left=2nd, center=1st, right=3rd

export default function RanksScreen() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    load();

    // Realtime: refresh when any cat is added/removed
    const channel = supabase
      .channel('leaderboard-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cats' }, load)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.2, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulseAnim]);

  async function load() {
    const { data } = await supabase
      .from('leaderboard')
      .select('*');
    if (data) setEntries(data as LeaderboardEntry[]);
  }

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  function Avatar({ entry, size }: { entry: LeaderboardEntry; size: number }) {
    if (entry.avatar_url) {
      return <Image source={{ uri: entry.avatar_url }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
    }
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#fff9e8', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: size * 0.4, fontWeight: '600', color: '#5e3620' }}>
          {entry.username?.[0]?.toUpperCase()}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#5e3620" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>global</Text>
          <Text style={styles.headerTitle}>Ranks</Text>
        </View>
        <View style={styles.livePill}>
          <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
          <Text style={styles.liveText}>live</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Podium */}
        {top3.length > 0 && (
          <View style={styles.podiumSection}>
            <View style={styles.podiumRow}>
              {PODIUM_ORDER.map(rank => {
                const entry = top3[rank];
                if (!entry) return <View key={rank} style={styles.podiumCol} />;
                const isFirst = rank === 0;
                const avatarSize = isFirst ? 60 : 48;
                return (
                  <View key={rank} style={styles.podiumCol}>
                    <View style={[styles.avatarRing, { borderColor: MEDAL_COLORS[rank] }]}>
                      <Avatar entry={entry} size={avatarSize} />
                    </View>
                    <Text style={styles.podiumUsername} numberOfLines={1}>@{entry.username}</Text>
                    <Text style={styles.podiumCatCount}>{entry.cat_count} cats</Text>
                    <View style={[styles.podiumBar, {
                      height: PODIUM_HEIGHTS[rank],
                      backgroundColor: PODIUM_COLORS[rank],
                    }]}>
                      <Text style={styles.podiumMedal}>{MEDALS[rank]}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.divider} />

        {/* Ranks 4–10 */}
        {rest.map((entry, i) => (
          <View key={entry.id} style={styles.rankRow}>
            <Text style={styles.rankNum}>{i + 4}</Text>
            <View style={styles.rankAvatar}>
              <Avatar entry={entry} size={34} />
            </View>
            <Text style={styles.rankUsername} numberOfLines={1}>@{entry.username}</Text>
            <Text style={styles.rankCatCount}>{entry.cat_count} 🐱</Text>
          </View>
        ))}

        {entries.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No cats spotted yet.</Text>
            <Text style={styles.emptySubText}>Be the first on the board!</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLabel: { fontSize: 11, color: '#eab664', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 3 },
  headerTitle: { fontSize: 26, fontWeight: '500', color: '#fff9e8', letterSpacing: -0.3 },

  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#7a4828',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 0.5,
    borderColor: '#faa93e',
  },
  liveDot: { width: 7, height: 7, backgroundColor: '#CBDF90', borderRadius: 4 },
  liveText: { fontSize: 11, color: '#fff9e8' },

  scroll: { paddingTop: 8 },

  podiumSection: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 0 },
  podiumRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 6 },
  podiumCol: { flex: 1, alignItems: 'center', gap: 6 },
  avatarRing: { borderWidth: 2.5, borderRadius: 34, padding: 2 },
  podiumUsername: { fontSize: 10, fontWeight: '500', color: '#5e3620', textAlign: 'center' },
  podiumCatCount: { fontSize: 9, color: '#a09070' },
  podiumBar: {
    width: '100%',
    borderRadius: 10,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumMedal: { fontSize: 22 },

  divider: { height: 0.5, backgroundColor: '#eab664', marginHorizontal: 16, marginVertical: 14, opacity: 0.4 },

  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#fff9e8',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  rankNum: { fontSize: 13, fontWeight: '500', color: '#a09070', width: 20, textAlign: 'center' },
  rankAvatar: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#fff9e8',
    overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
  },
  rankUsername: { flex: 1, fontSize: 13, fontWeight: '500', color: '#5e3620' },
  rankCatCount: { fontSize: 12, color: '#736c5c' },

  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 16, color: '#5e3620', fontWeight: '500' },
  emptySubText: { fontSize: 13, color: '#a09070' },
});
