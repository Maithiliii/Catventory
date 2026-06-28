import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { ChevronLeft } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import type { Cat } from '../../types';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

function formatCoords(lat: number, lng: number) {
  return `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(4)}°${lng >= 0 ? 'E' : 'W'}`;
}

export default function CatMapScreen({ navigation }: Props) {
  const [cats, setCats] = useState<Cat[]>([]);
  const [selected, setSelected] = useState<Cat | null>(null);
  const [username, setUsername] = useState('');

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: prof } = await supabase.from('users').select('username').eq('id', user.id).single();
    if (prof) setUsername((prof as any).username ?? '');

    const { data } = await supabase
      .from('collections')
      .select('cats(id, cat_number, name, photo_url, lat, lng, location_name, spotted_at, spotted_by)')
      .eq('user_id', user.id);

    if (data) {
      setCats(
        (data as any[])
          .filter(row => row.cats?.lat != null && row.cats?.lng != null && row.cats?.photo_url?.startsWith('http'))
          .map(row => ({
            id: row.cats.id,
            catNumber: row.cats.cat_number,
            name: row.cats.name,

            photoUri: row.cats.photo_url,
            lat: row.cats.lat,
            lng: row.cats.lng,
            locationName: row.cats.location_name ?? undefined,
            spottedAt: row.cats.spotted_at,
            spottedBy: row.cats.spotted_by,
          } as Cat)),
      );
    }
  }

  const center: [number, number] = cats.length > 0
    ? [cats[0].lng!, cats[0].lat!]
    : [78.9629, 20.5937];

  const bounds = cats.length > 1 ? {
    ne: [Math.max(...cats.map(c => c.lng!)), Math.max(...cats.map(c => c.lat!))] as [number, number],
    sw: [Math.min(...cats.map(c => c.lng!)), Math.min(...cats.map(c => c.lat!))] as [number, number],
  } : null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#5e3620" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ChevronLeft size={22} color="#fff9e8" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My cat map</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{cats.length} on map</Text>
        </View>
      </View>

      <MapboxGL.MapView
        style={styles.map}
        logoEnabled={false}
        attributionEnabled={false}
        scaleBarEnabled={false}
        onPress={() => setSelected(null)}>
        {bounds ? (
          <MapboxGL.Camera
            bounds={{ ...bounds, paddingTop: 80, paddingBottom: 80, paddingLeft: 60, paddingRight: 60 }}
            animationDuration={0}
          />
        ) : (
          <MapboxGL.Camera
            centerCoordinate={center}
            zoomLevel={cats.length > 0 ? 13 : 4}
            animationDuration={0}
          />
        )}
        {cats.map(cat => (
          <MapboxGL.MarkerView
            key={cat.id}
            id={cat.id}
            coordinate={[cat.lng!, cat.lat!]}
            allowOverflowView>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setSelected(selected?.id === cat.id ? null : cat)}>
              <View style={styles.markerWrap}>
                <View style={[styles.marker, selected?.id === cat.id && styles.markerSelected]}>
                  <Image source={{ uri: cat.photoUri }} style={styles.markerImage} />
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

      {/* Cat info card when a pin is tapped */}
      {selected && (
        <View style={styles.infoCard}>
          <View style={styles.infoAvatar}>
            <Image source={{ uri: selected.photoUri }} style={styles.infoAvatarImg} />
          </View>
          <View style={styles.infoText}>
            <Text style={styles.infoName}>{selected.name}</Text>
            <Text style={styles.infoSpotter} numberOfLines={1}>@{username}</Text>
            <Text style={styles.infoLoc} numberOfLines={1}>
              {selected.locationName || formatCoords(selected.lat!, selected.lng!)}
            </Text>
          </View>
          <TouchableOpacity style={styles.infoDismiss} onPress={() => setSelected(null)}>
            <Text style={styles.infoDismissText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {cats.length === 0 && (
        <View style={styles.emptyOverlay}>
          <Text style={styles.emptyText}>No cats with location yet</Text>
          <Text style={styles.emptySub}>Add a location when spotting a cat</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  header: {
    backgroundColor: '#5e3620',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '500', color: '#fff9e8' },
  countBadge: {
    backgroundColor: '#7a4828',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 0.5,
    borderColor: '#faa93e',
  },
  countText: { fontSize: 11, color: '#eab664' },

  map: { flex: 1 },

  markerWrap: { alignItems: 'center', gap: 3 },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: '#eab664',
    overflow: 'hidden',
    backgroundColor: '#fff9e8',
  },
  markerSelected: {
    borderColor: '#faa93e',
    borderWidth: 3,
    transform: [{ scale: 1.15 }],
  },
  markerImage: { width: 36, height: 36, resizeMode: 'cover' },
  markerLabel: {
    backgroundColor: 'rgba(253,252,238,0.95)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
    maxWidth: 84,
    borderWidth: 0.5,
    borderColor: '#eab664',
  },
  markerLabelName: { fontSize: 9, fontWeight: '600', color: '#5e3620' },
  markerLabelSpotter: { fontSize: 8, color: '#a09070' },

  infoCard: {
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
  infoAvatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#fff9e8',
    flexShrink: 0,
  },
  infoAvatarImg: { width: 52, height: 52, resizeMode: 'cover' },
  infoText: { flex: 1 },
  infoName: { fontSize: 15, fontWeight: '500', color: '#5e3620', marginBottom: 1 },
  infoSpotter: { fontSize: 11, color: '#eab664', marginBottom: 3 },
  infoLoc: { fontSize: 11, color: '#a09070' },
  infoDismiss: { padding: 6 },
  infoDismissText: { fontSize: 15, color: '#a09070' },

  emptyOverlay: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 6,
  },
  emptyText: { fontSize: 14, fontWeight: '500', color: '#fff9e8', backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  emptySub: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
});
