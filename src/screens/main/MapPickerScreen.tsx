import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { ChevronLeft, MapPin, Search, X } from 'lucide-react-native';
import { MAPBOX_PUBLIC_TOKEN } from '@env';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { CollectionStackParamList } from '../../types';

type Props = {
  navigation: NativeStackNavigationProp<CollectionStackParamList, 'MapPicker'>;
  route: RouteProp<CollectionStackParamList, 'MapPicker'>;
};

const DEFAULT_LNG = 78.9629;
const DEFAULT_LAT = 20.5937;
const DEFAULT_ZOOM = 4;

export default function MapPickerScreen({ navigation }: Props) {
  const cameraRef = useRef<MapboxGL.Camera>(null);

  const [center, setCenter] = useState<[number, number]>([DEFAULT_LNG, DEFAULT_LAT]);
  const [cameraTarget, setCameraTarget] = useState<[number, number]>([DEFAULT_LNG, DEFAULT_LAT]);
  const [cameraZoom, setCameraZoom] = useState(DEFAULT_ZOOM);
  const [animDuration, setAnimDuration] = useState(0);
  const [locationCentered, setLocationCentered] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ id: string; text: string; placeName: string; center: [number, number] }>>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  useEffect(() => {
    async function requestLocation() {
      if (Platform.OS === 'android') {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location permission',
            message: 'Needed to center the map on your position',
            buttonPositive: 'Allow',
          },
        );
      }
    }
    requestLocation();
  }, []);

  function handleUserLocation(loc: { coords: { longitude: number; latitude: number } }) {
    if (locationCentered) return;
    const userLng = loc.coords.longitude;
    const userLat = loc.coords.latitude;
    setCameraTarget([userLng, userLat]);
    setCameraZoom(13);
    setAnimDuration(800);
    setCenter([userLng, userLat]);
    setLocationCentered(true);
    setTimeout(() => setAnimDuration(0), 900);
  }

  function handleSearchChange(text: string) {
    setSearchQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 350);
  }

  async function fetchSuggestions(q: string) {
    try {
      const resp = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?limit=5&access_token=${MAPBOX_PUBLIC_TOKEN}`,
      );
      const json = await resp.json();
      setSuggestions(
        (json.features ?? []).map((f: any) => ({
          id: f.id,
          text: f.text,
          placeName: f.place_name,
          center: f.center as [number, number],
        })),
      );
    } catch {
      setSuggestions([]);
    }
  }

  function selectSuggestion(center: [number, number]) {
    const [lng, lat] = center;
    setCameraTarget([lng, lat]);
    setCameraZoom(13);
    setAnimDuration(1000);
    setCenter([lng, lat]);
    setTimeout(() => setAnimDuration(0), 1100);
    setSuggestions([]);
  }

  async function searchLocation() {
    const q = searchQuery.trim();
    if (!q) return;
    setSuggestions([]);
    try {
      const resp = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?limit=1&access_token=${MAPBOX_PUBLIC_TOKEN}`,
      );
      const json = await resp.json();
      const feature = json.features?.[0];
      if (feature) selectSuggestion(feature.center as [number, number]);
    } catch {
      // ignore network errors
    }
  }

  async function confirm() {
    setConfirming(true);
    let locationName = '';
    try {
      const resp = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${center[0]},${center[1]}.json?types=neighborhood,locality,place&limit=1&access_token=${MAPBOX_PUBLIC_TOKEN}`,
      );
      const json = await resp.json();
      locationName = json.features?.[0]?.place_name ?? '';
    } catch {
      // fall through with empty name
    }
    const prevCat = (navigation.getState().routes.find(r => r.name === 'CatEdit')?.params as any);
    navigation.navigate('CatEdit', {
      cat: prevCat?.cat,
      isNew: prevCat?.isNew,
      selectedLocation: { lat: center[1], lng: center[0], name: locationName },
    });
    setConfirming(false);
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#5e3620" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={22} color="#fff9e8" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pick Location</Text>
      </View>

      <View style={styles.mapWrap}>
        <MapboxGL.MapView
          style={styles.map}
          logoEnabled={false}
          attributionEnabled={false}
          scaleBarEnabled={false}
          onCameraChanged={state => {
            const [lng, lat] = state.properties.center;
            setCenter([lng, lat]);
          }}>
          <MapboxGL.Camera
            ref={cameraRef}
            centerCoordinate={cameraTarget}
            zoomLevel={cameraZoom}
            animationDuration={animDuration}
          />
          <MapboxGL.UserLocation visible onUpdate={handleUserLocation} />
        </MapboxGL.MapView>

        {/* Search bar + autocomplete dropdown */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={16} color="#a09070" strokeWidth={1.8} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search a place…"
              placeholderTextColor="#a09070"
              value={searchQuery}
              onChangeText={handleSearchChange}
              onSubmitEditing={searchLocation}
              returnKeyType="search"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSuggestions([]); }} hitSlop={8}>
                <X size={16} color="#a09070" strokeWidth={1.8} />
              </TouchableOpacity>
            )}
          </View>

          {suggestions.length > 0 && (
            <View style={styles.dropdown}>
              {suggestions.map((s, i) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.suggestionRow, i < suggestions.length - 1 && styles.suggestionBorder]}
                  onPress={() => selectSuggestion(s.center)}
                  activeOpacity={0.7}>
                  <MapPin size={14} color="#eab664" strokeWidth={1.8} style={styles.suggestionPin} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.suggestionText} numberOfLines={1}>{s.text}</Text>
                    <Text style={styles.suggestionSub} numberOfLines={1}>{s.placeName}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Fixed center pin */}
        <View style={styles.pinOverlay} pointerEvents="none">
          <MapPin size={36} color="#5e3620" strokeWidth={2} fill="#faa93e" />
          <View style={styles.pinShadow} />
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.coordRow}>
          <Text style={styles.coordLabel}>Lat</Text>
          <Text style={styles.coordValue}>{center[1].toFixed(5)}</Text>
          <Text style={styles.coordLabel}>Lng</Text>
          <Text style={styles.coordValue}>{center[0].toFixed(5)}</Text>
        </View>
        <TouchableOpacity style={styles.confirmBtn} onPress={confirm} disabled={confirming}>
          {confirming
            ? <ActivityIndicator color="#fff9e8" />
            : <Text style={styles.confirmBtnText}>Confirm location</Text>}
        </TouchableOpacity>
      </View>
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

  mapWrap: { flex: 1, position: 'relative' },
  map: { flex: 1 },

  searchContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#5e3620',
    padding: 0,
  },
  dropdown: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  suggestionBorder: { borderBottomWidth: 0.5, borderBottomColor: '#f0ead8' },
  suggestionPin: { marginTop: 1 },
  suggestionText: { fontSize: 13, fontWeight: '500', color: '#5e3620' },
  suggestionSub: { fontSize: 11, color: '#a09070', marginTop: 2 },

  pinOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinShadow: {
    width: 8, height: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 4,
    marginTop: 2,
  },

  footer: {
    backgroundColor: '#fdfcee',
    padding: 20,
    borderTopWidth: 0.5,
    borderTopColor: '#eab664',
    gap: 14,
  },
  coordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  coordLabel: { fontSize: 11, color: '#a09070' },
  coordValue: { fontSize: 13, fontWeight: '500', color: '#5e3620', fontVariant: ['tabular-nums'] },

  confirmBtn: {
    height: 50,
    backgroundColor: '#5e3620',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: { color: '#fff9e8', fontSize: 15, fontWeight: '500' },
});
