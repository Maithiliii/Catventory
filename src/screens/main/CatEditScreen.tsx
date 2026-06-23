import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  StatusBar,
  Platform,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import type { Cat, CollectionStackParamList } from '../../types';

type Props = {
  navigation: NativeStackNavigationProp<CollectionStackParamList, 'CatEdit'>;
  route: RouteProp<CollectionStackParamList, 'CatEdit'>;
};

const CAT_EMOJIS = ['🐱', '🐈', '🐈‍⬛', '😸', '😹', '😻', '🙀', '😺', '🐾'];

function formatCatId(num: number) {
  return `#${num.toString().padStart(5, '0')}`;
}

export default function CatEditScreen({ navigation, route }: Props) {
  const { cat, isNew, selectedLocation } = route.params;

  const [name, setName] = useState(cat.name || '');
  const [emoji, setEmoji] = useState(cat.emoji || '🐱');
  const [locationName, setLocationName] = useState(
    selectedLocation?.name || cat.locationName || '',
  );
  const [lat, setLat] = useState(selectedLocation?.lat ?? cat.lat);
  const [lng, setLng] = useState(selectedLocation?.lng ?? cat.lng);
  const [date, setDate] = useState(() => {
    const d = new Date(cat.spottedAt);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  });
  const [time, setTime] = useState(() => {
    const d = new Date(cat.spottedAt);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please give this cat a name.');
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    // Parse date/time back to ISO
    const [dd, mm, yyyy] = date.split('/');
    const [hh, min] = time.split(':');
    const spottedAt = new Date(
      parseInt(yyyy), parseInt(mm) - 1, parseInt(dd),
      parseInt(hh), parseInt(min)
    ).toISOString();

    const payload: Partial<Cat> = {
      name: name.trim(),
      emoji,
      locationName: locationName || undefined,
      lat,
      lng,
      spottedAt,
      spottedBy: user.id,
    };

    if (isNew || !cat.id) {
      // Count existing cats to assign sequential ID
      const { count } = await supabase
        .from('cats')
        .select('*', { count: 'exact', head: true })
        .eq('spotted_by', user.id);
      const catNumber = (count ?? 0) + 1;

      const { error } = await supabase.from('cats').insert({
        ...payload,
        cat_number: catNumber,
        photo_url: cat.photoUri ?? null,
      });
      if (error) { Alert.alert('Error', error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase
        .from('cats')
        .update({ ...payload, photo_url: cat.photoUri ?? null })
        .eq('id', cat.id);
      if (error) { Alert.alert('Error', error.message); setSaving(false); return; }
    }

    setSaving(false);
    navigation.goBack();
  }

  async function deleteCat() {
    if (isNew || !cat.id) { navigation.goBack(); return; }
    Alert.alert('Remove cat?', `Remove ${cat.name} from your collection?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('cats').delete().eq('id', cat.id);
          navigation.goBack();
        },
      },
    ]);
  }

  function openMapPicker() {
    navigation.navigate('MapPicker', { returnTo: 'CatEdit' });
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#2B2B6E" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isNew ? 'Add Cat' : 'Edit Cat'}</Text>
        <Text style={styles.catIdBadge}>{formatCatId(cat.catNumber)}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* Photo + emoji picker */}
        <View style={styles.photoSection}>
          <View style={styles.photoBox}>
            {cat.photoUri ? (
              <Image source={{ uri: cat.photoUri }} style={styles.photo} />
            ) : (
              <Text style={styles.bigEmoji}>{emoji}</Text>
            )}
          </View>
          <View style={styles.emojiRow}>
            {CAT_EMOJIS.map(e => (
              <TouchableOpacity
                key={e}
                style={[styles.emojiOption, e === emoji && styles.emojiOptionSelected]}
                onPress={() => setEmoji(e)}>
                <Text style={styles.emojiOptionText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Cat ID (read-only) */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Cat ID</Text>
          <View style={[styles.inputRow, styles.inputRowReadonly]}>
            <Text style={styles.inputText}>{formatCatId(cat.catNumber)}</Text>
            <View style={styles.lockBadge}>
              <Text style={styles.lockText}>🔒</Text>
            </View>
          </View>
          <Text style={styles.fieldHint}>unique ID, cannot be changed</Text>
        </View>

        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Cat name</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Whiskers"
              placeholderTextColor="#9B9BC8"
            />
          </View>
        </View>

        {/* Date & Time row */}
        <View style={styles.twoCol}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Date</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.textInput}
                value={date}
                onChangeText={setDate}
                placeholder="DD/MM/YYYY"
                placeholderTextColor="#9B9BC8"
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Time</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.textInput}
                value={time}
                onChangeText={setTime}
                placeholder="HH:MM"
                placeholderTextColor="#9B9BC8"
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
          </View>
        </View>

        {/* Location */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Location</Text>
          {lat && lng ? (
            <View style={styles.locationBox}>
              <View style={styles.locationInfo}>
                <Text style={styles.locationEmoji}>📍</Text>
                <View>
                  <Text style={styles.locationName} numberOfLines={1}>
                    {locationName || `${lat.toFixed(5)}, ${lng.toFixed(5)}`}
                  </Text>
                  {locationName ? (
                    <Text style={styles.locationCoords}>
                      {lat.toFixed(5)}, {lng.toFixed(5)}
                    </Text>
                  ) : null}
                </View>
              </View>
              <TouchableOpacity style={styles.changeLocationBtn} onPress={openMapPicker}>
                <Text style={styles.changeLocationText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addLocationBtn} onPress={openMapPicker}>
              <Text style={styles.addLocationIcon}>🗺</Text>
              <Text style={styles.addLocationText}>Select on map</Text>
            </TouchableOpacity>
          )}
          <TextInput
            style={[styles.inputRow, styles.textInput, { marginTop: 8 }]}
            value={locationName}
            onChangeText={setLocationName}
            placeholder="Location name (e.g. Park Street)"
            placeholderTextColor="#9B9BC8"
          />
        </View>

        {/* Save button */}
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#F5F0F8" />
          ) : (
            <Text style={styles.saveBtnText}>{isNew ? 'Add to collection' : 'Save changes'}</Text>
          )}
        </TouchableOpacity>

        {/* Delete */}
        {!isNew && cat.id && (
          <TouchableOpacity style={styles.deleteBtn} onPress={deleteCat}>
            <Text style={styles.deleteBtnText}>Remove from collection</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F0F8' },

  header: {
    backgroundColor: '#2B2B6E',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 12,
  },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 20, color: '#E8D8F0' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '500', color: '#E8D8F0' },
  catIdBadge: {
    fontSize: 12,
    color: '#9B9BC8',
    backgroundColor: '#3d3d8a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  scroll: { flex: 1 },
  scrollContent: { padding: 20, gap: 4 },

  photoSection: { alignItems: 'center', marginBottom: 20 },
  photoBox: {
    width: 120, height: 120, borderRadius: 24,
    backgroundColor: '#E8D8F0', borderWidth: 1, borderColor: '#D4B8D0',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
    marginBottom: 14,
  },
  photo: { width: '100%', height: '100%', resizeMode: 'cover' },
  bigEmoji: { fontSize: 64 },
  emojiRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  emojiOption: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#E8D8F0',
    justifyContent: 'center', alignItems: 'center',
  },
  emojiOptionSelected: {
    borderColor: '#2B2B6E', borderWidth: 1.5, backgroundColor: '#E8D8F0',
  },
  emojiOptionText: { fontSize: 22 },

  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, color: '#6B6B9E', marginBottom: 6 },
  fieldHint: { fontSize: 11, color: '#9B9BC8', marginTop: 4, paddingLeft: 2 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#9B9BC8',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 46,
    backgroundColor: '#fff',
  },
  inputRowReadonly: { backgroundColor: '#F5F0F8', borderColor: '#D4B8D0' },
  inputText: { flex: 1, fontSize: 14, color: '#6B6B9E', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  textInput: { flex: 1, fontSize: 14, color: '#2B2B6E' },
  lockBadge: { marginLeft: 8 },
  lockText: { fontSize: 14 },

  twoCol: { flexDirection: 'row', gap: 12 },

  locationBox: {
    borderWidth: 0.5,
    borderColor: '#9B9BC8',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationEmoji: { fontSize: 18 },
  locationName: { fontSize: 13, fontWeight: '500', color: '#2B2B6E', maxWidth: 160 },
  locationCoords: { fontSize: 10, color: '#9B9BC8', marginTop: 2 },
  changeLocationBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#E8D8F0', borderRadius: 8 },
  changeLocationText: { fontSize: 12, fontWeight: '500', color: '#2B2B6E' },

  addLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 0.5,
    borderColor: '#9B9BC8',
    borderRadius: 10,
    borderStyle: 'dashed',
    padding: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  addLocationIcon: { fontSize: 20 },
  addLocationText: { fontSize: 14, color: '#5B5B9E', fontWeight: '500' },

  saveBtn: {
    height: 50,
    backgroundColor: '#2B2B6E',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: { color: '#E8D8F0', fontSize: 16, fontWeight: '500' },

  deleteBtn: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  deleteBtnText: { color: '#c0626b', fontSize: 14 },
});
