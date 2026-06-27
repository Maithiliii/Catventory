import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  StatusBar,
  Alert,
  Image,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image as ImageIcon, Map, Pencil, Clock, MapPin } from 'lucide-react-native';
import { MAPBOX_PUBLIC_TOKEN } from '@env';
import { supabase } from '../../lib/supabase';
import type { Cat, CollectionStackParamList } from '../../types';

type NavProp = NativeStackNavigationProp<CollectionStackParamList, 'CollectionList'>;

function formatCoords(lat?: number, lng?: number) {
  if (lat == null || lng == null) return 'Unknown location';
  const latStr = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`;
  const lngStr = `${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'W'}`;
  return `${latStr}, ${lngStr}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const day = d.getDate().toString().padStart(2, '0');
  const mon = d.toLocaleString('en', { month: 'short' });
  const hrs = d.getHours().toString().padStart(2, '0');
  const min = d.getMinutes().toString().padStart(2, '0');
  return `${day} ${mon} · ${hrs}:${min}`;
}

function formatCatId(num: number) {
  return `#${num.toString().padStart(5, '0')}`;
}

function parseDateFromFilename(fileName: string | null | undefined): string | null {
  if (!fileName) return null;
  // IMG_YYYYMMDD_HHmmss, VID_, PANO_, Screenshot_YYYYMMDD_HHmmss, etc.
  const m1 = fileName.match(/(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/);
  if (m1) {
    const [, yr, mo, dy, hr, mn, sc] = m1.map(Number);
    if (yr >= 2000 && mo >= 1 && mo <= 12 && dy >= 1 && dy <= 31) {
      const d = new Date(yr, mo - 1, dy, hr, mn, sc);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }
  // WhatsApp: "WhatsApp Image 2024-06-23 at 10.30.45"
  // Signal: "signal-2024-06-23-10-30-45"
  const m2 = fileName.match(/(\d{4})-(\d{2})-(\d{2})(?:[- _at]+(\d{2})[._-](\d{2})[._-](\d{2}))?/i);
  if (m2) {
    const yr = Number(m2[1]), mo = Number(m2[2]), dy = Number(m2[3]);
    const hr = m2[4] ? Number(m2[4]) : 0;
    const mn = m2[5] ? Number(m2[5]) : 0;
    const sc = m2[6] ? Number(m2[6]) : 0;
    if (yr >= 2000 && mo >= 1 && mo <= 12 && dy >= 1 && dy <= 31) {
      const d = new Date(yr, mo - 1, dy, hr, mn, sc);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }
  return null;
}


export default function CollectionScreen() {
  const navigation = useNavigation<NavProp>();
  const [cats, setCats] = useState<Cat[]>([]);
  const [userId, setUserId] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadCats();
    }, []),
  );

  async function loadCats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const { data } = await supabase
      .from('collections')
      .select('cats(id, cat_number, name, emoji, photo_url, lat, lng, location_name, spotted_at, spotted_by)')
      .eq('user_id', user.id);
    if (data) {
      setCats(
        (data as any[])
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
          .sort((a, b) => a.catNumber - b.catNumber),
      );
    }
  }

  async function addFromGallery() {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      includeExtra: true,
      selectionLimit: 1,
    });
    if (result.didCancel || !result.assets?.length) return;

    const asset = result.assets[0];
    const photoUri = asset.uri ?? '';

    // 1. Try EXIF DateTimeOriginal from the library (works for Google Photos + camera rolls with EXIF)
    let spottedAt: string | null = null;
    if (asset.timestamp) {
      const d = new Date(asset.timestamp);
      if (!isNaN(d.getTime()) && d.getFullYear() >= 2000) {
        spottedAt = d.toISOString();
      }
    }
    // 2. Fallback: parse date from filename (covers screenshots, WhatsApp, Signal, etc.)
    if (!spottedAt) {
      spottedAt = parseDateFromFilename(asset.fileName) ?? new Date().toISOString();
    }

    const lat: number | undefined = (asset as any).latitude ?? undefined;
    const lng: number | undefined = (asset as any).longitude ?? undefined;

    let locationName: string | undefined;
    if (lat && lng) {
      try {
        const resp = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=neighborhood,place&access_token=${MAPBOX_PUBLIC_TOKEN}`,
        );
        const json = await resp.json();
        locationName = json.features?.[0]?.place_name ?? undefined;
      } catch {
        // location name stays undefined
      }
    }

    navigation.navigate('CatEdit', {
      cat: {
        id: '',
        catNumber: 0,
        name: 'New Cat',
        emoji: '🐱',
        photoUri,
        spottedAt,
        lat,
        lng,
        locationName,
        spottedBy: userId,
      } as Cat,
      isNew: true,
    } as any);
  }

  function renderTile({ item, index }: { item: Cat; index: number }) {
    const hasLocation = !!(item.locationName || (item.lat && item.lng));
    const isRightCol = index % 2 === 1;

    return (
      <View style={[styles.tile, isRightCol && styles.tileRight]}>
        {/* Photo */}
        <View style={styles.photoArea}>
          {item.photoUri?.startsWith('http') && (
            <Image source={{ uri: item.photoUri }} style={styles.photo} />
          )}
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('CatEdit', { cat: item })}>
            <Pencil size={11} color="#fff9e8" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoArea}>
          <View style={styles.nameTag}>
            <Text style={styles.nameTagPaw}>🐾</Text>
            <Text style={styles.nameTagText}>{item.name}</Text>
          </View>
          <View style={styles.metaRow}>
            <Clock size={10} color="#eab664" strokeWidth={1.8} />
            <Text style={styles.metaText}>{formatDate(item.spottedAt)}</Text>
          </View>
          {hasLocation ? (
            <View style={styles.metaRow}>
              <MapPin size={10} color="#eab664" strokeWidth={1.8} />
              <Text style={styles.metaText} numberOfLines={1}>
                {item.locationName || formatCoords(item.lat, item.lng)}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.metaRow}
              onPress={() => navigation.navigate('CatEdit', { cat: item })}>
              <MapPin size={10} color="#c0626b" strokeWidth={1.8} />
              <Text style={styles.noLocText}>tap to add location</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#5e3620" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerLabel}>field notes</Text>
            <Text style={styles.headerTitle}>Collection</Text>
          </View>
          <View style={styles.headerActions}>
            <View style={styles.countBadge}>
              <Image source={require('../../../assets/Icons/Cat.png')} style={styles.countIcon} />
              <Text style={styles.countText}>{cats.length}</Text>
            </View>
            <TouchableOpacity style={styles.mapIconBtn} onPress={() => navigation.navigate('CatMap')}>
              <Map size={17} color="#fff9e8" strokeWidth={1.8} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Add from gallery */}
        <TouchableOpacity style={styles.galleryBtn} onPress={addFromGallery}>
          <ImageIcon size={18} color="#5e3620" strokeWidth={1.8} />
          <Text style={styles.galleryBtnText}>Add cat from gallery</Text>
        </TouchableOpacity>
      </View>

      {/* Grid */}
      <FlatList
        data={cats}
        keyExtractor={item => item.id}
        renderItem={renderTile}
        numColumns={2}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.row}
      />

    </View>
  );
}

const TILE_WIDTH = '48.5%';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fdfcee' },

  header: {
    backgroundColor: '#5e3620',
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 16,
    gap: 14,
  },
  headerTop: {
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#7a4828',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  countIcon: { width: 18, height: 18, resizeMode: 'contain' },
  countText: { fontSize: 13, fontWeight: '500', color: '#fff9e8' },
  mapIconBtn: {
    width: 34, height: 34, backgroundColor: '#7a4828',
    borderRadius: 10, justifyContent: 'center', alignItems: 'center',
    borderWidth: 0.5, borderColor: '#faa93e',
  },

  galleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff9e8',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  galleryBtnText: { fontSize: 13, fontWeight: '500', color: '#5e3620' },

  gridContent: { padding: 14, paddingBottom: 100 },
  row: { justifyContent: 'space-between' },

  tile: {
    width: TILE_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: '#fff9e8',
    overflow: 'hidden',
    marginBottom: 10,
  },
  tileRight: {},

  photoArea: {
    width: '100%',
    height: 120,
    backgroundColor: '#fff9e8',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  photo: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoEmoji: { fontSize: 52 },
  editBtn: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 26,
    height: 26,
    backgroundColor: 'rgba(94,54,32,0.75)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  infoArea: { padding: 10 },
  nameTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fdfcee',
    borderWidth: 0.5,
    borderColor: '#eab664',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  nameTagPaw: { fontSize: 12 },
  nameTagText: { fontSize: 11, fontWeight: '500', color: '#5e3620' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  metaText: { fontSize: 10, color: '#eab664', flex: 1 },
  noLocText: { fontSize: 10, color: '#c0626b', flex: 1 },
});
