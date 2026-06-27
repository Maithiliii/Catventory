import React, { useEffect, useState } from 'react';
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
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { ChevronLeft, Lock, MapPin, Map, Camera } from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';
import { supabase } from '../../lib/supabase';
import type { Cat, CollectionStackParamList } from '../../types';

type Props = {
  navigation: NativeStackNavigationProp<CollectionStackParamList, 'CatEdit'>;
  route: RouteProp<CollectionStackParamList, 'CatEdit'>;
};

function formatCatId(num: number) {
  return `#${num.toString().padStart(5, '0')}`;
}

function formatCoords(lat?: number, lng?: number) {
  if (lat == null || lng == null) return 'Unknown location';
  const latStr = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`;
  const lngStr = `${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'W'}`;
  return `${latStr}, ${lngStr}`;
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
  const [pickedDate, setPickedDate] = useState(() => new Date(cat.spottedAt));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [photoUri, setPhotoUri] = useState(cat.photoUri || '');
  const [resolvedCatNum, setResolvedCatNum] = useState<number | null>(isNew ? null : cat.catNumber);
  const [saving, setSaving] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!isNew) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: maxRow } = await supabase
        .from('cats')
        .select('cat_number')
        .eq('spotted_by', user.id)
        .order('cat_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      setResolvedCatNum((maxRow?.cat_number ?? 0) + 1);
    })();
  }, [isNew]);

  async function replacePhoto() {
    const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, quality: 0.9 });
    if (!result.didCancel && result.assets?.length) {
      setPhotoUri(result.assets[0].uri ?? '');
    }
  }

  function readAsBlob(uri: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = () => reject(new Error('Could not read file'));
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    });
  }

  async function uploadPhoto(localUri: string, catId: string): Promise<string> {
    const path = `cats/${catId}`;
    const blob = await readAsBlob(localUri);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? SUPABASE_ANON_KEY;
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`${xhr.status}: ${xhr.responseText}`));
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/cat-photos/${path}`, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
      xhr.setRequestHeader('Content-Type', 'image/jpeg');
      xhr.setRequestHeader('x-upsert', 'true');
      xhr.send(blob);
    });
    return `${SUPABASE_URL}/storage/v1/object/public/cat-photos/${path}`;
  }

  function isLocalUri(uri: string) {
    return uri.startsWith('file://') || uri.startsWith('content://');
  }

  async function save() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please give this cat a name.');
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const spottedAt = pickedDate.toISOString();

    if (isNew || !cat.id) {
      const { data: maxRow } = await supabase
        .from('cats')
        .select('cat_number')
        .eq('spotted_by', user.id)
        .order('cat_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      const catNumber = (maxRow?.cat_number ?? 0) + 1;

      const { data: catData, error: catError } = await supabase
        .from('cats')
        .insert({
          name: name.trim(), emoji,
          location_name: locationName || null,
          lat: lat ?? null, lng: lng ?? null,
          spotted_at: spottedAt, spotted_by: user.id,
          cat_number: catNumber, photo_url: null,
        })
        .select('id')
        .single();
      if (catError || !catData) { Alert.alert('Error', catError?.message ?? 'Failed to save'); setSaving(false); return; }

      // Upload photo now that we have the cat id
      let finalPhotoUrl: string | null = null;
      if (photoUri) {
        try {
          finalPhotoUrl = isLocalUri(photoUri)
            ? await uploadPhoto(photoUri, catData.id)
            : photoUri;
          await supabase.from('cats').update({ photo_url: finalPhotoUrl }).eq('id', catData.id);
        } catch (e: any) {
          Alert.alert('Photo upload failed', e.message);
        }
      }

      const { error: collError } = await supabase
        .from('collections')
        .insert({ user_id: user.id, cat_id: catData.id });
      if (collError) { Alert.alert('Error', collError.message); setSaving(false); return; }
    } else {
      let finalPhotoUrl: string | null = photoUri || null;
      if (photoUri && isLocalUri(photoUri)) {
        try {
          finalPhotoUrl = await uploadPhoto(photoUri, cat.id);
        } catch (e: any) {
          Alert.alert('Photo upload failed', e.message);
        }
      }
      const { error } = await supabase
        .from('cats')
        .update({
          name: name.trim(), emoji,
          location_name: locationName || null,
          lat: lat ?? null, lng: lng ?? null,
          spotted_at: spottedAt, spotted_by: user.id,
          photo_url: finalPhotoUrl,
        })
        .eq('id', cat.id);
      if (error) { Alert.alert('Error', error.message); setSaving(false); return; }
    }

    setSaving(false);
    navigation.popToTop();
  }

  function deleteCat() {
    if (isNew || !cat.id) { navigation.goBack(); return; }
    setShowRemoveModal(true);
  }

  async function confirmRemove() {
    setRemoving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setRemoving(false); return; }
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('user_id', user.id)
      .eq('cat_id', cat.id);
    if (error) { Alert.alert('Error', error.message); setRemoving(false); return; }
    setShowRemoveModal(false);
    navigation.popToTop();
  }

  function openMapPicker() {
    navigation.navigate('MapPicker', { returnTo: 'CatEdit' });
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#5e3620" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={22} color="#fff9e8" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isNew ? 'Add Cat' : 'Edit Cat'}</Text>
        <Text style={styles.catIdBadge}>
          {resolvedCatNum != null ? formatCatId(resolvedCatNum) : '#NEW'}
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* Photo */}
        <View style={styles.photoSection}>
          <TouchableOpacity
            style={styles.photoBox}
            onPress={replacePhoto}
            activeOpacity={0.85}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} />
            ) : (
              <Text style={styles.bigEmoji}>{emoji}</Text>
            )}
            <View style={styles.replacePhotoBtn}>
              <Camera size={13} color="#fff9e8" strokeWidth={2} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Cat ID (read-only) */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Cat ID</Text>
          <View style={[styles.inputRow, styles.inputRowReadonly]}>
            <Text style={styles.inputText}>
              {resolvedCatNum != null ? formatCatId(resolvedCatNum) : '—'}
            </Text>
            <View style={styles.lockBadge}>
              <Lock size={14} color="#eab664" strokeWidth={1.8} />
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
              placeholderTextColor="#eab664"
            />
          </View>
        </View>

        {/* Date & Time row */}
        <View style={styles.twoCol}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Date</Text>
            <TouchableOpacity style={styles.inputRow} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
              <Text style={styles.textInput}>
                {pickedDate.getDate().toString().padStart(2, '0')}/
                {(pickedDate.getMonth() + 1).toString().padStart(2, '0')}/
                {pickedDate.getFullYear()}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Time</Text>
            <TouchableOpacity style={styles.inputRow} onPress={() => setShowTimePicker(true)} activeOpacity={0.7}>
              <Text style={styles.textInput}>
                {pickedDate.getHours().toString().padStart(2, '0')}:
                {pickedDate.getMinutes().toString().padStart(2, '0')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={pickedDate}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={(_, selected) => {
              setShowDatePicker(false);
              if (selected) {
                const merged = new Date(pickedDate);
                merged.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
                setPickedDate(merged);
              }
            }}
          />
        )}
        {showTimePicker && (
          <DateTimePicker
            value={pickedDate}
            mode="time"
            display="default"
            is24Hour
            onChange={(_, selected) => {
              setShowTimePicker(false);
              if (selected) {
                const merged = new Date(pickedDate);
                merged.setHours(selected.getHours(), selected.getMinutes());
                setPickedDate(merged);
              }
            }}
          />
        )}

        {/* Location */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Location</Text>
          {lat && lng ? (
            <View style={styles.locationBox}>
              <View style={styles.locationInfo}>
                <MapPin size={18} color="#faa93e" strokeWidth={1.8} />
                <View>
                  <Text style={styles.locationName} numberOfLines={1}>
                    {locationName || formatCoords(lat, lng)}
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
              <Map size={20} color="#faa93e" strokeWidth={1.8} />
              <Text style={styles.addLocationText}>Select on map</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Save button */}
        {(() => {
          const canSave = name.trim().length > 0
            && pickedDate instanceof Date && !isNaN(pickedDate.getTime())
            && lat != null && lng != null;
          return (
            <TouchableOpacity
              style={[styles.saveBtn, (!canSave && isNew) && styles.saveBtnDisabled]}
              onPress={save}
              disabled={saving || (isNew && !canSave)}>
              {saving ? (
                <ActivityIndicator color="#fdfcee" />
              ) : (
                <Text style={styles.saveBtnText}>{isNew ? 'Add to collection' : 'Save changes'}</Text>
              )}
            </TouchableOpacity>
          );
        })()}

        {/* Delete */}
        {!isNew && cat.id && (
          <TouchableOpacity style={styles.deleteBtn} onPress={deleteCat}>
            <Text style={styles.deleteBtnText}>Remove from collection</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showRemoveModal} transparent animationType="fade" onRequestClose={() => setShowRemoveModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Remove cat?</Text>
            <Text style={styles.modalBody}>
              Remove {name || 'this cat'} from your collection? This cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowRemoveModal(false)}
                disabled={removing}
                activeOpacity={0.7}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={confirmRemove}
                disabled={removing}
                activeOpacity={0.7}>
                {removing
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.removeBtnText}>Remove</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fdfcee' },

  header: {
    backgroundColor: '#5e3620',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '500', color: '#fff9e8' },
  catIdBadge: {
    fontSize: 12,
    color: '#eab664',
    backgroundColor: '#7a4828',
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
    backgroundColor: '#fff9e8', borderWidth: 1, borderColor: '#eab664',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
    marginBottom: 14,
  },
  photo: { width: '100%', height: '100%', resizeMode: 'cover' },
  replacePhotoBtn: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(94,54,32,0.85)',
    borderWidth: 1,
    borderColor: '#eab664',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bigEmoji: { fontSize: 64 },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, color: '#736c5c', marginBottom: 6 },
  fieldHint: { fontSize: 11, color: '#eab664', marginTop: 4, paddingLeft: 2 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#eab664',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 46,
    backgroundColor: '#fff',
  },
  inputRowReadonly: { backgroundColor: '#fdfcee', borderColor: '#eab664' },
  inputText: { flex: 1, fontSize: 14, color: '#736c5c', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  textInput: { flex: 1, fontSize: 14, color: '#5e3620' },
  lockBadge: { marginLeft: 8 },

  twoCol: { flexDirection: 'row', gap: 12 },

  locationBox: {
    borderWidth: 0.5,
    borderColor: '#eab664',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationName: { fontSize: 13, fontWeight: '500', color: '#5e3620', maxWidth: 160 },
  locationCoords: { fontSize: 10, color: '#eab664', marginTop: 2 },
  changeLocationBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fff9e8', borderRadius: 8 },
  changeLocationText: { fontSize: 12, fontWeight: '500', color: '#5e3620' },

  addLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 0.5,
    borderColor: '#eab664',
    borderRadius: 10,
    borderStyle: 'dashed',
    padding: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  addLocationText: { fontSize: 14, color: '#faa93e', fontWeight: '500' },

  saveBtn: {
    height: 50,
    backgroundColor: '#5e3620',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: { backgroundColor: '#b09080', opacity: 0.6 },
  saveBtnText: { color: '#fff9e8', fontSize: 16, fontWeight: '500' },

  deleteBtn: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  deleteBtnText: { color: '#c0626b', fontSize: 14 },

  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    width: '100%', backgroundColor: '#fdfcee',
    borderRadius: 24, padding: 28,
    borderWidth: 0.5, borderColor: '#eab664',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18, fontWeight: '600', color: '#5e3620',
    marginBottom: 10, textAlign: 'center',
  },
  modalBody: {
    fontSize: 13, color: '#736c5c', textAlign: 'center',
    lineHeight: 20, marginBottom: 24,
  },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: {
    flex: 1, height: 46, borderRadius: 12,
    borderWidth: 1, borderColor: '#eab664',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#fff9e8',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '500', color: '#5e3620' },
  removeBtn: {
    flex: 1, height: 46, borderRadius: 12,
    backgroundColor: '#c0626b',
    justifyContent: 'center', alignItems: 'center',
  },
  removeBtnText: { fontSize: 14, fontWeight: '500', color: '#fff' },
});
