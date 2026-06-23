import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  StatusBar,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { CollectionStackParamList } from '../../types';

// Mapbox will be integrated here. For now this is a coordinate-entry placeholder.
// When Mapbox is set up, replace the manual input with a MapboxGL.MapView + marker.

type Props = {
  navigation: NativeStackNavigationProp<CollectionStackParamList, 'MapPicker'>;
  route: RouteProp<CollectionStackParamList, 'MapPicker'>;
};

export default function MapPickerScreen({ navigation, route }: Props) {
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [locName, setLocName] = useState('');

  function confirm() {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum)) {
      Alert.alert('Invalid coordinates', 'Please enter valid latitude and longitude.');
      return;
    }
    // Navigate back to CatEdit, passing the selected location as a param.
    // CatEdit reads route.params.selectedLocation on every render.
    navigation.navigate('CatEdit', {
      cat: (navigation.getState().routes.find(r => r.name === 'CatEdit')?.params as any)?.cat,
      isNew: (navigation.getState().routes.find(r => r.name === 'CatEdit')?.params as any)?.isNew,
      selectedLocation: { lat: latNum, lng: lngNum, name: locName },
    });
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#2B2B6E" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Location</Text>
      </View>

      {/* Map placeholder — swap in Mapbox MapView here */}
      <View style={styles.mapPlaceholder}>
        <View style={styles.mapGrid} />
        <View style={styles.mapCenter}>
          <Text style={styles.mapPin}>📍</Text>
          <Text style={styles.mapPlaceholderText}>
            Mapbox map goes here{'\n'}(integration coming soon)
          </Text>
        </View>
      </View>

      {/* Manual coordinate entry (used until Mapbox is wired up) */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Enter coordinates manually</Text>

        <Text style={styles.label}>Location name</Text>
        <TextInput
          style={styles.input}
          value={locName}
          onChangeText={setLocName}
          placeholder="e.g. Park Street"
          placeholderTextColor="#9B9BC8"
        />

        <View style={styles.coordRow}>
          <View style={styles.coordField}>
            <Text style={styles.label}>Latitude</Text>
            <TextInput
              style={styles.input}
              value={lat}
              onChangeText={setLat}
              placeholder="12.9716"
              placeholderTextColor="#9B9BC8"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.coordField}>
            <Text style={styles.label}>Longitude</Text>
            <TextInput
              style={styles.input}
              value={lng}
              onChangeText={setLng}
              placeholder="77.5946"
              placeholderTextColor="#9B9BC8"
              keyboardType="numeric"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.confirmBtn} onPress={confirm}>
          <Text style={styles.confirmBtnText}>Confirm location</Text>
        </TouchableOpacity>
      </View>
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
  headerTitle: { fontSize: 18, fontWeight: '500', color: '#E8D8F0' },

  mapPlaceholder: { flex: 1, backgroundColor: '#32327a', position: 'relative' },
  mapGrid: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0.15,
  },
  mapCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  mapPin: { fontSize: 48 },
  mapPlaceholderText: {
    fontSize: 13,
    color: '#9B9BC8',
    textAlign: 'center',
    lineHeight: 20,
  },

  panel: {
    backgroundColor: '#F5F0F8',
    padding: 20,
    borderTopWidth: 0.5,
    borderTopColor: '#D4B8D0',
    gap: 4,
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2B2B6E',
    marginBottom: 12,
  },

  label: { fontSize: 12, color: '#6B6B9E', marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 0.5,
    borderColor: '#9B9BC8',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 44,
    backgroundColor: '#fff',
    fontSize: 14,
    color: '#2B2B6E',
  },

  coordRow: { flexDirection: 'row', gap: 12 },
  coordField: { flex: 1 },

  confirmBtn: {
    height: 50,
    backgroundColor: '#2B2B6E',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  confirmBtnText: { color: '#E8D8F0', fontSize: 15, fontWeight: '500' },
});
