import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  StatusBar,
  Alert,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
} from 'react-native-vision-camera';
import { X, Zap, ZapOff, SwitchCamera } from 'lucide-react-native';
import { useIsFocused, useNavigation, useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import MapboxGL from '@rnmapbox/maps';
import { MAPBOX_PUBLIC_TOKEN } from '@env';
import type { MainTabParamList } from '../../types';

type NavProp = BottomTabNavigationProp<MainTabParamList>;

const FRAME_SIZE = 220;
const CORNER = 36;
const CORNER_THICKNESS = 3;
const CORNER_RADIUS = 6;

type FlashMode = 'off' | 'on';
type CameraPos = 'back' | 'front';
type DetectionState = 'scanning' | 'detected';

async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location access',
        message: 'Allow Catventory to use your location to tag where you spotted this cat?',
        buttonPositive: 'Allow',
        buttonNegative: 'Skip',
      },
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

export default function CameraScreen() {
  const navigation = useNavigation<NavProp>();
  const { hasPermission, requestPermission } = useCameraPermission();
  const [position, setPosition] = useState<CameraPos>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [detection, setDetection] = useState<DetectionState>('scanning');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [saving, setSaving] = useState(false);

  const device = useCameraDevice(position);
  const isFocused = useIsFocused();
  const photoOutput = usePhotoOutput();
  // Pulsing animation for scanning state
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // Dot blink animation for detected state
  const dotAnim = useRef(new Animated.Value(1)).current;
  // Corner color interpolation (white → green on detect)
  const cornerColor = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  useFocusEffect(
    useCallback(() => {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor('transparent');
      setDetection('scanning');
      setPhotoUri(null);
      setSaving(false);
      requestLocationPermission().then(granted => {
        setLocationGranted(granted);
        if (granted) MapboxGL.locationManager.start();
      });
      return () => {
        StatusBar.setTranslucent(false);
        MapboxGL.locationManager.stop();
      };
    }, []),
  );

  // Scanning pulse loop
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Dot blink + corner color on detection
  useEffect(() => {
    if (detection === 'detected') {
      Animated.timing(cornerColor, { toValue: 1, duration: 300, useNativeDriver: false }).start();
      const blink = Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim, { toValue: 0.2, duration: 600, useNativeDriver: false }),
          Animated.timing(dotAnim, { toValue: 1, duration: 600, useNativeDriver: false }),
        ]),
      );
      blink.start();
      return () => blink.stop();
    } else {
      Animated.timing(cornerColor, { toValue: 0, duration: 300, useNativeDriver: false }).start();
    }
  }, [detection, cornerColor, dotAnim]);

  const animatedCornerColor = cornerColor.interpolate({
    inputRange: [0, 1],
    outputRange: ['#eab664', '#CBDF90'],
  });

  const handleShutter = useCallback(async () => {
    try {
      const photo = await photoOutput.capturePhotoToFile({ flashMode: flash }, {});
      setPhotoUri(`file://${photo.filePath}`);
      setDetection('detected');
    } catch (e) {
      Alert.alert('Error', 'Could not take photo. Try again.');
    }
  }, [photoOutput, flash]);

  async function handleSave() {
    if (!photoUri) return;
    setSaving(true);

    let lat: number | undefined;
    let lng: number | undefined;
    let locationName: string | undefined;

    if (locationGranted) {
      try {
        const loc = MapboxGL.locationManager.getLastKnownLocation() as any;
        if (loc?.geometry?.coordinates) {
          const [locLng, locLat] = loc.geometry.coordinates as [number, number];
          lng = locLng;
          lat = locLat;
          try {
            const resp = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=neighborhood,place&access_token=${MAPBOX_PUBLIC_TOKEN}`,
            );
            const json = await resp.json();
            locationName = json.features?.[0]?.place_name;
          } catch {
            // locationName stays undefined, user can add manually
          }
        }
      } catch {
        // proceed without location
      }
    }

    setSaving(false);
    (navigation as any).navigate('Collection', {
      screen: 'CatEdit',
      params: {
        cat: {
          id: '',
          catNumber: 0,
          name: 'New Cat',
          emoji: '🐱',
          photoUri,
          spottedAt: new Date().toISOString(),
          lat,
          lng,
          locationName,
          spottedBy: '',
        },
        isNew: true,
      },
    });
  }

  function handleClose() {
    navigation.navigate('Explore');
  }

  function resetDetection() {
    setDetection('scanning');
    setPhotoUri(null);
  }

  if (!hasPermission) {
    return (
      <View style={styles.permissionScreen}>
        <Text style={styles.permissionEmoji}>📷</Text>
        <Text style={styles.permissionText}>Camera access needed</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Allow camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.permissionScreen}>
        <Text style={styles.permissionEmoji}>😿</Text>
        <Text style={styles.permissionText}>No camera found</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Camera viewfinder */}
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isFocused}
        outputs={[photoOutput]}
      />

      {/* Dark overlay when detected */}
      {detection === 'detected' && <View style={styles.overlay} />}

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBtn} onPress={handleClose}>
          <X size={16} color="#fff" strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.hintPill}>
          <Text style={styles.hintText}>
            {detection === 'scanning' ? 'point at a cat' : 'cat found!'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.topBtn}
          onPress={() => setFlash(f => (f === 'off' ? 'on' : 'off'))}>
          {flash === 'on'
            ? <Zap size={16} color="#fff" strokeWidth={2} />
            : <ZapOff size={16} color="#fff" strokeWidth={2} />}
        </TouchableOpacity>
      </View>

      {/* Detection frame */}
      <View style={styles.frameWrap} pointerEvents="none">
        <View style={styles.frameInner}>
          <Animated.View
            style={[
              styles.frameBorder,
              { borderColor: animatedCornerColor, opacity: detection === 'scanning' ? 0.2 : 0.4 },
            ]}
          />
          {(['tl', 'tr', 'bl', 'br'] as const).map(pos => (
            <Animated.View
              key={pos}
              style={[
                styles.corner,
                styles[pos],
                { borderColor: animatedCornerColor, opacity: detection === 'scanning' ? pulseAnim : 1 },
              ]}
            />
          ))}
          <View style={styles.frameLabel}>
            {detection === 'scanning' && (
              <Animated.Text style={[styles.scanningText, { opacity: pulseAnim }]}>
                scanning...
              </Animated.Text>
            )}
          </View>
        </View>
      </View>

      {/* Bottom section */}
      <View style={styles.bottomSection}>

        {/* Cat detected popup */}
        {detection === 'detected' && (
          <View style={styles.popup}>
            <View style={styles.popupHeader}>
              <Animated.View style={[styles.greenDot, { opacity: dotAnim }]} />
              <Text style={styles.popupTitle}>cat detected!</Text>
            </View>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              activeOpacity={0.85}
              disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff9e8" size="small" />
                : <Text style={styles.saveBtnText}>Save to collection</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={resetDetection} style={styles.rescanBtn} disabled={saving}>
              <Text style={styles.rescanText}>retake</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Shutter row */}
        <View style={styles.shutterRow}>
          <View style={styles.sideBtn} />
          <TouchableOpacity
            style={styles.shutter}
            onPress={detection === 'scanning' ? handleShutter : resetDetection}
            activeOpacity={0.8}>
            <View style={styles.shutterInner} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sideBtn}
            onPress={() => setPosition(p => (p === 'back' ? 'front' : 'back'))}>
            <SwitchCamera size={22} color="#fff" strokeWidth={1.8} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    paddingTop: 52,
    paddingHorizontal: 18,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBtn: {
    width: 34, height: 34,
    backgroundColor: 'rgba(94,54,32,0.65)',
    borderRadius: 10,
    borderWidth: 0.5, borderColor: 'rgba(234,182,100,0.45)',
    justifyContent: 'center', alignItems: 'center',
  },
  hintPill: {
    backgroundColor: 'rgba(45,26,13,0.88)',
    borderWidth: 0.5, borderColor: '#faa93e',
    borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5,
  },
  hintText: { fontSize: 12, color: '#fff9e8' },

  frameWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -30,
  },
  frameInner: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
  },
  frameBorder: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderWidth: 1.5,
    borderRadius: 8,
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderWidth: CORNER_THICKNESS,
  },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: CORNER_RADIUS },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: CORNER_RADIUS },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: CORNER_RADIUS },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: CORNER_RADIUS },

  frameLabel: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  scanningText: {
    fontSize: 11,
    color: '#eab664',
    backgroundColor: 'rgba(45,26,13,0.5)',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 4,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20,
    paddingBottom: 44,
  },
  popup: {
    backgroundColor: 'rgba(45,26,13,0.93)',
    borderWidth: 0.5, borderColor: '#eab664',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  popupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14,
  },
  greenDot: { width: 8, height: 8, backgroundColor: '#CBDF90', borderRadius: 4 },
  popupTitle: { fontSize: 13, fontWeight: '500', color: '#fff9e8' },
  saveBtn: {
    backgroundColor: '#7a4828',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#faa93e',
    marginBottom: 10,
  },
  saveBtnText: { fontSize: 13, fontWeight: '500', color: '#fff9e8' },
  rescanBtn: { alignItems: 'center', paddingVertical: 4 },
  rescanText: { fontSize: 11, color: '#eab664' },

  shutterRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  sideBtn: {
    width: 44, height: 44,
    backgroundColor: 'rgba(94,54,32,0.65)',
    borderRadius: 14,
    borderWidth: 0.5, borderColor: 'rgba(234,182,100,0.45)',
    justifyContent: 'center', alignItems: 'center',
  },
  shutter: {
    width: 68, height: 68, borderRadius: 34,
    borderWidth: 3, borderColor: '#eab664',
    justifyContent: 'center', alignItems: 'center',
  },
  shutterInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff9e8' },

  permissionScreen: {
    flex: 1, backgroundColor: '#2d1a0d',
    justifyContent: 'center', alignItems: 'center', gap: 16,
  },
  permissionEmoji: { fontSize: 48 },
  permissionText: { fontSize: 16, color: '#eab664' },
  permissionBtn: {
    backgroundColor: '#5e3620', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  permissionBtnText: { color: '#fff9e8', fontSize: 14, fontWeight: '500' },
});
