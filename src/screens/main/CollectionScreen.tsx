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
import { supabase } from '../../lib/supabase';
import type { Cat, CollectionStackParamList } from '../../types';

type NavProp = NativeStackNavigationProp<CollectionStackParamList, 'CollectionList'>;

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

const PLACEHOLDER_CATS: Cat[] = [
  { id: '1', catNumber: 1, name: 'Tabby', emoji: '🐱', spottedAt: '2026-06-23T10:42:00Z', spottedBy: '', locationName: 'Park Street' },
  { id: '2', catNumber: 2, name: 'Shadow', emoji: '🐈‍⬛', spottedAt: '2026-06-21T15:15:00Z', spottedBy: '', locationName: 'Main Ave' },
  { id: '3', catNumber: 3, name: 'Fluffy', emoji: '🐈', spottedAt: '2026-06-18T06:30:00Z', spottedBy: '' },
  { id: '4', catNumber: 4, name: 'Mango', emoji: '😸', spottedAt: '2026-06-15T08:05:00Z', spottedBy: '', locationName: 'Bus Stop' },
  { id: '5', catNumber: 5, name: 'Ghost', emoji: '🙀', spottedAt: '2026-06-10T12:20:00Z', spottedBy: '' },
];

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
    if (!user) { setCats(PLACEHOLDER_CATS); return; }
    setUserId(user.id);
    const { data, error } = await supabase
      .from('cats')
      .select('*')
      .eq('spotted_by', user.id)
      .order('cat_number', { ascending: true });
    if (data && data.length > 0) {
      setCats(data as Cat[]);
    } else {
      setCats(PLACEHOLDER_CATS);
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

    // Try to get EXIF date
    const spottedAt = asset.timestamp
      ? new Date(Number(asset.timestamp) * 1000).toISOString()
      : new Date().toISOString();

    // Try to get GPS
    const lat = (asset as any).latitude ?? undefined;
    const lng = (asset as any).longitude ?? undefined;

    const newCat: Partial<Cat> = {
      name: 'New Cat',
      emoji: '🐱',
      photoUri,
      spottedAt,
      lat,
      lng,
    };

    if (!lat || !lng) {
      // No GPS — navigate to edit screen so user can add location via map
      navigation.navigate('CatEdit', {
        cat: { ...newCat, id: '', catNumber: cats.length + 1, spottedBy: userId } as Cat,
        isNew: true,
      } as any);
    } else {
      // Has GPS — go straight to edit for naming
      navigation.navigate('CatEdit', {
        cat: { ...newCat, id: '', catNumber: cats.length + 1, spottedBy: userId } as Cat,
        isNew: true,
      } as any);
    }
  }

  function renderTile({ item, index }: { item: Cat; index: number }) {
    const hasLocation = !!(item.locationName || (item.lat && item.lng));
    const isRightCol = index % 2 === 1;

    return (
      <View style={[styles.tile, isRightCol && styles.tileRight]}>
        {/* Photo */}
        <View style={styles.photoArea}>
          {item.photoUri ? (
            <Image source={{ uri: item.photoUri }} style={styles.photo} />
          ) : (
            <Text style={styles.photoEmoji}>{item.emoji}</Text>
          )}
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('CatEdit', { cat: item })}>
            <Text style={styles.editBtnIcon}>✏️</Text>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoArea}>
          <View style={styles.nameTag}>
            <Text style={styles.nameTagPaw}>🐾</Text>
            <Text style={styles.nameTagText}>{item.name}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaIcon}>🕐</Text>
            <Text style={styles.metaText}>{formatDate(item.spottedAt)}</Text>
          </View>
          {hasLocation ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaIcon}>📍</Text>
              <Text style={styles.metaText} numberOfLines={1}>
                {item.locationName || `${item.lat?.toFixed(3)}, ${item.lng?.toFixed(3)}`}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.metaRow}
              onPress={() => navigation.navigate('CatEdit', { cat: item })}>
              <Text style={styles.metaIcon}>📍</Text>
              <Text style={styles.noLocText}>tap to add location</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#2B2B6E" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerLabel}>your cats</Text>
            <Text style={styles.headerTitle}>Collection</Text>
          </View>
          <View style={styles.headerActions}>
            <View style={styles.countBadge}>
              <Text style={styles.countEmoji}>🐱</Text>
              <Text style={styles.countText}>{cats.length}</Text>
            </View>
            <TouchableOpacity style={styles.mapIconBtn}>
              <Text style={styles.mapIconText}>🗺</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Add from gallery */}
        <TouchableOpacity style={styles.galleryBtn} onPress={addFromGallery}>
          <Text style={styles.galleryBtnIcon}>🖼</Text>
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
  root: { flex: 1, backgroundColor: '#F5F0F8' },

  header: {
    backgroundColor: '#2B2B6E',
    paddingHorizontal: 18,
    paddingTop: 22,
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
    color: '#9B9BC8',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '500',
    color: '#E8D8F0',
    letterSpacing: -0.3,
    fontStyle: 'italic',
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#3d3d8a',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  countEmoji: { fontSize: 14 },
  countText: { fontSize: 13, fontWeight: '500', color: '#E8D8F0' },
  mapIconBtn: {
    width: 34, height: 34, backgroundColor: '#3d3d8a',
    borderRadius: 10, justifyContent: 'center', alignItems: 'center',
    borderWidth: 0.5, borderColor: '#5B5B9E',
  },
  mapIconText: { fontSize: 17 },

  galleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8D8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  galleryBtnIcon: { fontSize: 18 },
  galleryBtnText: { fontSize: 13, fontWeight: '500', color: '#2B2B6E' },

  gridContent: { padding: 14, paddingBottom: 100 },
  row: { justifyContent: 'space-between' },

  tile: {
    width: TILE_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: '#E8D8F0',
    overflow: 'hidden',
    marginBottom: 10,
  },
  tileRight: {},

  photoArea: {
    width: '100%',
    height: 120,
    backgroundColor: '#E8D8F0',
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
    backgroundColor: 'rgba(43,43,110,0.75)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtnIcon: { fontSize: 11 },

  infoArea: { padding: 10 },
  nameTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F0F8',
    borderWidth: 0.5,
    borderColor: '#D4B8D0',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  nameTagPaw: { fontSize: 12 },
  nameTagText: { fontSize: 11, fontWeight: '500', color: '#2B2B6E' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  metaIcon: { fontSize: 10 },
  metaText: { fontSize: 10, color: '#9B9BC8', flex: 1 },
  noLocText: { fontSize: 10, color: '#c0626b', flex: 1 },
});
