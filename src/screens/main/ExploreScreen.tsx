import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Modal,
  Image,
} from 'react-native';
import { Bell, MapPin } from 'lucide-react-native';
import MapboxGL from '@rnmapbox/maps';
import { useFocusEffect } from '@react-navigation/native';
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

function formatLocation(cat: Cat) {
  if (cat.locationName) return cat.locationName;
  if (cat.lat != null && cat.lng != null) {
    return `${Math.abs(cat.lat).toFixed(2)}°${cat.lat >= 0 ? 'N' : 'S'}, ${Math.abs(cat.lng).toFixed(2)}°${cat.lng >= 0 ? 'E' : 'W'}`;
  }
  return null;
}

export default function ExploreScreen() {
  const [username, setUsername] = useState('');
  const [recentCats, setRecentCats] = useState<Cat[]>([]);
  const [mapOpen, setMapOpen] = useState(false);
  const [fullMapSelected, setFullMapSelected] = useState<Cat | null>(null);

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('users')
      .select('username')
      .eq('id', user.id)
      .single();
    if (profile) setUsername((profile as any).username);

    const { data } = await supabase
      .from('collections')
      .select('cats(id, cat_number, name, emoji, photo_url, lat, lng, location_name, spotted_at, spotted_by)')
      .eq('user_id', user.id);

    if (data) {
      const mapped: Cat[] = (data as any[])
        .filter(row => row.cats)
        .map(row => ({
          id: row.cats.id,
          catNumber: row.cats.cat_number,
          name: row.cats.name,
          emoji: row.cats.emoji,
          photoUri: row.cats.photo_url ?? undefined,
          lat: row.cats.lat ?? undefined,
          lng: row.cats.lng ?? undefined,
          locationName: row.cats.location_name ?? undefined,
          spottedAt: row.cats.spotted_at,
          spottedBy: row.cats.spotted_by,
        } as Cat))
        .sort((a, b) => new Date(b.spottedAt).getTime() - new Date(a.spottedAt).getTime())
        .slice(0, 10);
      setRecentCats(mapped);
    }
  }

  const catsWithLocation = recentCats.filter(c => c.lat != null && c.lng != null && c.photoUri?.startsWith('http'));
  const mapCenter: [number, number] = catsWithLocation.length > 0
    ? [catsWithLocation[0].lng!, catsWithLocation[0].lat!]
    : [78.9629, 20.5937];

  function renderRecentCard({ item }: { item: Cat }) {
    const loc = formatLocation(item);
    const isNew = (Date.now() - new Date(item.spottedAt).getTime()) < 86400000;
    const ago = timeAgo(item.spottedAt);
    const meta = [loc, ago].filter(Boolean).join(' · ');
    return (
      <View style={styles.recentCard}>
        <View style={styles.recentAvatar}>
          {item.photoUri?.startsWith('http') && (
            <Image source={{ uri: item.photoUri }} style={styles.recentAvatarImg} />
          )}
        </View>
        <View style={styles.recentInfo}>
          <Text style={styles.recentName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.recentSpotter} numberOfLines={1}>@{username}</Text>
          <View style={styles.recentLocRow}>
            <MapPin size={10} color="#a09070" strokeWidth={1.8} />
            <Text style={styles.recentMeta} numberOfLines={1}>{meta}</Text>
          </View>
        </View>
        <View style={[styles.pill, isNew ? styles.pillNew : styles.pillSpotted]}>
          <Text style={[styles.pillText, isNew ? styles.pillTextNew : styles.pillTextSpotted]}>
            {isNew ? 'new' : 'spotted'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#5e3620" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.username}>@{username || '…'} 🐾</Text>
        </View>
        <TouchableOpacity style={styles.bellBtn}>
          <Bell size={18} color="#faa93e" strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Map preview */}
        <View style={styles.mapCard}>
          <MapboxGL.MapView
            style={styles.map}
            scrollEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
            zoomEnabled={false}
            logoEnabled={false}
            attributionEnabled={false}
            scaleBarEnabled={false}>
            <MapboxGL.Camera
              centerCoordinate={mapCenter}
              zoomLevel={catsWithLocation.length > 0 ? 11 : 3}
              animationDuration={0}
            />
            {catsWithLocation.map(cat => (
              <MapboxGL.MarkerView
                key={cat.id}
                id={cat.id}
                coordinate={[cat.lng!, cat.lat!]}>
                <View style={styles.markerWrap}>
                  <View style={styles.mapMarker}>
                    <Image source={{ uri: cat.photoUri }} style={styles.mapMarkerImage} />
                  </View>
                  <View style={styles.markerLabel}>
                    <Text style={styles.markerLabelName} numberOfLines={1}>{cat.name}</Text>
                  </View>
                </View>
              </MapboxGL.MarkerView>
            ))}
          </MapboxGL.MapView>
          <View style={styles.mapFooter}>
            <Text style={styles.mapFooterText}>
              {catsWithLocation.length} cat{catsWithLocation.length !== 1 ? 's' : ''} on map
            </Text>
            <TouchableOpacity style={styles.openMapBtn} onPress={() => setMapOpen(true)}>
              <Text style={styles.openMapBtnText}>⤢  Open map</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recently spotted */}
        <Text style={styles.sectionTitle}>Recently spotted</Text>

        {recentCats.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>No cats spotted yet. Go find some!</Text>
            <Image source={require('../../../assets/Icons/Paws.png')} style={styles.emptyPaw} />
          </View>
        ) : (
          <View style={styles.recentList}>
            {recentCats.map(item => <React.Fragment key={item.id}>{renderRecentCard({ item })}</React.Fragment>)}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Full-screen map modal */}
      <Modal visible={mapOpen} animationType="slide" onRequestClose={() => { setMapOpen(false); setFullMapSelected(null); }}>
        <View style={styles.fullMapRoot}>
          <StatusBar barStyle="light-content" backgroundColor="#5e3620" />
          <View style={styles.fullMapHeader}>
            <TouchableOpacity onPress={() => { setMapOpen(false); setFullMapSelected(null); }} style={styles.fullMapClose}>
              <Text style={styles.fullMapCloseText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.fullMapTitle}>Cat Map</Text>
          </View>
          <MapboxGL.MapView
            style={styles.fullMap}
            logoEnabled={false}
            attributionEnabled={false}
            scaleBarEnabled={false}
            onPress={() => setFullMapSelected(null)}>
            <MapboxGL.Camera
              centerCoordinate={mapCenter}
              zoomLevel={catsWithLocation.length > 0 ? 11 : 3}
            />
            {catsWithLocation.map(cat => (
              <MapboxGL.MarkerView key={cat.id} id={cat.id} coordinate={[cat.lng!, cat.lat!]}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setFullMapSelected(fullMapSelected?.id === cat.id ? null : cat)}>
                  <View style={styles.markerWrap}>
                    <View style={[styles.mapMarker, fullMapSelected?.id === cat.id && styles.mapMarkerSelected]}>
                      <Image source={{ uri: cat.photoUri }} style={styles.mapMarkerImage} />
                    </View>
                    <View style={styles.markerLabel}>
                      <Text style={styles.markerLabelName} numberOfLines={1}>{cat.name}</Text>
                      <Text style={styles.markerLabelSpotter} numberOfLines={1}>@{username}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </MapboxGL.MarkerView>
            ))}
          </MapboxGL.MapView>

          {fullMapSelected && (
            <View style={styles.fullMapInfoCard}>
              <View style={styles.fullMapInfoAvatar}>
                {fullMapSelected.photoUri?.startsWith('http') && (
                  <Image source={{ uri: fullMapSelected.photoUri }} style={styles.fullMapInfoAvatarImg} />
                )}
              </View>
              <View style={styles.fullMapInfoText}>
                <Text style={styles.fullMapInfoName}>{fullMapSelected.name}</Text>
                <Text style={styles.fullMapInfoSpotter}>@{username}</Text>
              </View>
              <TouchableOpacity style={styles.fullMapInfoDismiss} onPress={() => setFullMapSelected(null)}>
                <Text style={styles.fullMapInfoDismissText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fdfcee' },

  header: {
    backgroundColor: '#5e3620',
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: { fontSize: 13, color: '#eab664', marginBottom: 4 },
  username: { fontSize: 24, fontWeight: '500', color: '#fff9e8', letterSpacing: -0.3 },
  bellBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#7a4828', borderWidth: 1.5, borderColor: '#faa93e',
    justifyContent: 'center', alignItems: 'center',
  },

  scroll: { flex: 1 },

  mapCard: {
    margin: 14,
    borderRadius: 18,
    overflow: 'hidden',
    height: 180,
  },
  map: { flex: 1 },
  markerWrap: { alignItems: 'center', gap: 3 },
  mapMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff9e8',
    borderWidth: 2,
    borderColor: '#eab664',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapMarkerImage: { width: 32, height: 32, resizeMode: 'cover' },
  markerLabel: {
    backgroundColor: 'rgba(253,252,238,0.95)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignItems: 'center',
    maxWidth: 76,
    borderWidth: 0.5,
    borderColor: '#eab664',
  },
  markerLabelName: { fontSize: 9, fontWeight: '600', color: '#5e3620' },
  markerLabelSpotter: { fontSize: 8, color: '#a09070' },
  mapFooter: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#3d2010',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mapFooterText: { fontSize: 11, color: '#eab664' },
  openMapBtn: {
    backgroundColor: '#fff9e8', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  openMapBtnText: { fontSize: 11, fontWeight: '500', color: '#5e3620' },

  sectionTitle: {
    fontSize: 14, fontWeight: '500', color: '#5e3620',
    marginHorizontal: 16, marginBottom: 12,
  },
  emptyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16,
  },
  emptyText: { fontSize: 13, color: '#a09070' },
  emptyPaw: { width: 16, height: 16, resizeMode: 'contain', tintColor: '#a09070' },

  recentList: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: '#f0ead8',
    padding: 10,
    gap: 12,
  },
  recentAvatar: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#fff9e8',
    overflow: 'hidden',
    flexShrink: 0,
  },
  recentAvatarImg: { width: 46, height: 46, resizeMode: 'cover' },
  recentInfo: { flex: 1, gap: 2 },
  recentName: { fontSize: 13, fontWeight: '500', color: '#5e3620' },
  recentSpotter: { fontSize: 10, color: '#a09070' },
  recentLocRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  recentMeta: { fontSize: 11, color: '#a09070', flex: 1 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    flexShrink: 0,
  },
  pillNew: { backgroundColor: '#5e3620' },
  pillSpotted: { backgroundColor: '#f0ead8' },
  pillText: { fontSize: 10, fontWeight: '500' },
  pillTextNew: { color: '#fff9e8' },
  pillTextSpotted: { color: '#5e3620' },

  mapMarkerSelected: { borderColor: '#faa93e', borderWidth: 3, transform: [{ scale: 1.15 }] },

  fullMapRoot: { flex: 1, backgroundColor: '#000' },
  fullMapHeader: {
    backgroundColor: '#5e3620',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 12,
  },
  fullMapClose: { padding: 4 },
  fullMapCloseText: { fontSize: 18, color: '#fff9e8' },
  fullMapTitle: { fontSize: 18, fontWeight: '500', color: '#fff9e8' },
  fullMap: { flex: 1 },

  fullMapInfoCard: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    backgroundColor: '#fdfcee',
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: '#eab664',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  fullMapInfoAvatar: {
    width: 48, height: 48, borderRadius: 12,
    overflow: 'hidden', backgroundColor: '#fff9e8', flexShrink: 0,
  },
  fullMapInfoAvatarImg: { width: 48, height: 48, resizeMode: 'cover' },
  fullMapInfoText: { flex: 1 },
  fullMapInfoName: { fontSize: 14, fontWeight: '500', color: '#5e3620', marginBottom: 2 },
  fullMapInfoSpotter: { fontSize: 11, color: '#a09070' },
  fullMapInfoDismiss: { padding: 6 },
  fullMapInfoDismissText: { fontSize: 15, color: '#a09070' },
});
