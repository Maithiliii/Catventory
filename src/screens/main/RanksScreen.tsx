import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Animated,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { Skeleton } from '../../components/Skeleton';

interface LeaderboardEntry {
  id: string;
  username: string;
  avatar_url: string | null;
  cat_count: number;
  last_spotted_at: string | null;
}

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const PODIUM_HEIGHTS = [100, 70, 50];
const PODIUM_BAR_COLORS = ['#5e3620', '#a09070', '#7a4828'];
const MEDALS = ['🥇', '🥈', '🥉'];
const PODIUM_ORDER = [1, 0, 2]; // left=2nd, center=1st, right=3rd

export default function RanksScreen() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.2, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    ).start();

    const channel = supabase
      .channel('leaderboard-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cats' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collections' }, load)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    setLoading(true);
    const { data } = await supabase.rpc('get_leaderboard');
    if (data) setEntries(data as LeaderboardEntry[]);
    setLoading(false);
  }

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  function Avatar({ entry, size }: { entry: LeaderboardEntry; size: number }) {
    if (entry.avatar_url) {
      return (
        <Image
          source={{ uri: entry.avatar_url }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      );
    }
    return (
      <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={{ fontSize: size * 0.38, fontWeight: '600', color: '#5e3620' }}>
          {entry.username?.[0]?.toUpperCase() ?? '?'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#5e3620" />

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
        {loading ? (
          <View style={styles.podiumSection}>
            <View style={styles.podiumRow}>
              {PODIUM_ORDER.map((rank, i) => {
                const isFirst = rank === 0;
                const avatarSize = isFirst ? 62 : 54;
                const barHeight = PODIUM_HEIGHTS[rank];
                return (
                  <View key={i} style={styles.podiumCol}>
                    <Skeleton style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }} />
                    <Skeleton style={styles.skeletonName} />
                    <Skeleton style={styles.skeletonCount} />
                    <Skeleton style={[styles.skeletonBar, { height: barHeight }]} />
                  </View>
                );
              })}
            </View>
          </View>
        ) : top3.length > 0 ? (
          <View style={styles.podiumSection}>
            <View style={styles.podiumRow}>
              {PODIUM_ORDER.map(rank => {
                const entry = top3[rank];
                if (!entry) return <View key={rank} style={styles.podiumCol} />;
                const isFirst = rank === 0;
                const avatarSize = isFirst ? 54 : 46;
                const isMe = entry.id === currentUserId;
                return (
                  <View key={rank} style={styles.podiumCol}>
                    <View style={[
                      styles.avatarRing,
                      { borderColor: MEDAL_COLORS[rank], width: avatarSize + 8, height: avatarSize + 8, borderRadius: (avatarSize + 8) / 2 },
                      isMe && styles.avatarRingMe,
                    ]}>
                      <Avatar entry={entry} size={avatarSize} />
                    </View>
                    <Text style={[styles.podiumUsername, isMe && styles.meText]} numberOfLines={1}>
                      @{entry.username}
                    </Text>
                    <Text style={styles.podiumCatCount}>{entry.cat_count} cats</Text>
                    <View style={[styles.podiumBar, { height: PODIUM_HEIGHTS[rank], backgroundColor: PODIUM_BAR_COLORS[rank] }]}>
                      <Text style={[styles.podiumMedal, isFirst && { fontSize: 26 }]}>{MEDALS[rank]}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.divider} />

        {/* Rows 4–10 */}
        {loading ? (
          [0, 1, 2, 3].map(i => (
            <View key={i} style={styles.rankRow}>
              <Skeleton style={styles.skeletonNum} />
              <Skeleton style={styles.skeletonRowAvatar} />
              <Skeleton style={styles.skeletonRowName} />
              <Skeleton style={styles.skeletonRowCount} />
            </View>
          ))
        ) : (
          rest.map((entry, i) => {
            const isMe = entry.id === currentUserId;
            return (
              <View key={entry.id} style={[styles.rankRow, isMe && styles.rankRowMe]}>
                <Text style={styles.rankNum}>{i + 4}</Text>
                <View style={styles.rankAvatar}>
                  <Avatar entry={entry} size={34} />
                </View>
                <Text style={styles.rankUsername} numberOfLines={1}>
                  @{entry.username}
                </Text>
                <View style={styles.rankCatBadge}>
                  <Text style={styles.rankCatCount}>{entry.cat_count}</Text>
                  <Image source={require('../../../assets/Icons/Cat.png')} style={styles.rankCatIcon} />
                </View>
              </View>
            );
          })
        )}

        {!loading && entries.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🏆</Text>
            <Text style={styles.emptyTitle}>No one on the board yet</Text>
            <Text style={styles.emptySub}>Go live and start spotting cats!</Text>
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
  headerLabel: {
    fontSize: 11,
    color: '#eab664',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '500',
    color: '#fff9e8',
    letterSpacing: -0.3,
  },
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

  podiumSection: { paddingHorizontal: 12, paddingTop: 20 },
  podiumRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8 },
  podiumCol: { flex: 1, alignItems: 'center', gap: 6 },

  avatarFallback: { backgroundColor: '#fff9e8', justifyContent: 'center', alignItems: 'center' },
  avatarRing: { borderWidth: 2.5, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarRingMe: { borderWidth: 3.5 },

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

  divider: {
    height: 0.5,
    backgroundColor: '#eab664',
    opacity: 0.4,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 14,
  },

  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#f0ead8',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  rankRowMe: { backgroundColor: '#fff9e8', borderColor: '#eab664' },
  rankNum: { fontSize: 13, fontWeight: '500', color: '#5e3620', width: 20, textAlign: 'center' },
  rankAvatar: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#fff9e8', overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
  },
  rankUsername: { flex: 1, fontSize: 13, fontWeight: '500', color: '#5e3620' },
  rankCatBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rankCatCount: { fontSize: 12, color: '#736c5c' },
  rankCatIcon: { width: 16, height: 16, resizeMode: 'contain' },

  meText: { color: '#faa93e', fontWeight: '700' },

  skeletonName: { width: 60, height: 10, borderRadius: 5 },
  skeletonCount: { width: 40, height: 8, borderRadius: 4 },
  skeletonBar: { width: '100%', borderRadius: 10, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  skeletonNum: { width: 20, height: 13, borderRadius: 4 },
  skeletonRowAvatar: { width: 34, height: 34, borderRadius: 10 },
  skeletonRowName: { flex: 1, height: 13, borderRadius: 6 },
  skeletonRowCount: { width: 36, height: 12, borderRadius: 5 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 16, color: '#5e3620', fontWeight: '500' },
  emptySub: { fontSize: 13, color: '#a09070', textAlign: 'center', paddingHorizontal: 32 },
});
