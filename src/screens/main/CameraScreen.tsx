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
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
} from 'react-native-vision-camera';
import { launchImageLibrary } from 'react-native-image-picker';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../types';

type NavProp = BottomTabNavigationProp<MainTabParamList>;

const FRAME_SIZE = 220;
const CORNER = 36;
const CORNER_THICKNESS = 3;
const CORNER_RADIUS = 6;

type FlashMode = 'off' | 'on';
type CameraPos = 'back' | 'front';
type DetectionState = 'scanning' | 'detected';

export default function CameraScreen() {
  const navigation = useNavigation<NavProp>();
  const { hasPermission, requestPermission } = useCameraPermission();
  const [position, setPosition] = useState<CameraPos>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [detection, setDetection] = useState<DetectionState>('scanning');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

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

  // Scanning pulse loop
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
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
          Animated.timing(dotAnim, { toValue: 0.2, duration: 600, useNativeDriver: true }),
          Animated.timing(dotAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
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
    outputRange: ['#ffffff', '#CBDF90'],
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

  async function handleGallery() {
    const result = await launchImageLibrary({ mediaType: 'photo', includeExtra: true, selectionLimit: 1 });
    if (result.assets?.length) {
      setPhotoUri(result.assets[0].uri ?? null);
      setDetection('detected');
    }
  }

  function handleSave() {
    navigation.navigate('Collection');
    // TODO: pass photoUri + saveType into CatEdit once deep-link is wired up
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
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

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
          <Text style={styles.topBtnIcon}>✕</Text>
        </TouchableOpacity>
        <View style={styles.hintPill}>
          <Text style={styles.hintText}>
            {detection === 'scanning' ? 'point at a cat' : 'cat found!'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.topBtn}
          onPress={() => setFlash(f => (f === 'off' ? 'on' : 'off'))}>
          <Text style={styles.topBtnIcon}>{flash === 'on' ? '⚡' : '🔦'}</Text>
        </TouchableOpacity>
      </View>

      {/* Detection frame */}
      <View style={styles.frameWrap} pointerEvents="none">
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
          {detection === 'scanning' ? (
            <Animated.Text style={[styles.scanningText, { opacity: pulseAnim }]}>
              scanning...
            </Animated.Text>
          ) : (
            <Text style={styles.detectedFrameText}>🐱</Text>
          )}
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
              <Text style={styles.popupSub}>how do you want to save?</Text>
            </View>
            <View style={styles.popupOptions}>
              <TouchableOpacity style={styles.optionLight} onPress={handleSave}>
                <Text style={styles.optionEmoji}>✨</Text>
                <Text style={styles.optionTitleDark}>sticker</Text>
                <Text style={styles.optionSubDark}>bg removed</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.optionDark} onPress={handleSave}>
                <Text style={styles.optionEmoji}>📷</Text>
                <Text style={styles.optionTitleLight}>normal</Text>
                <Text style={styles.optionSubLight}>full photo</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={resetDetection} style={styles.rescanBtn}>
              <Text style={styles.rescanText}>retake</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Shutter row */}
        <View style={styles.shutterRow}>
          <TouchableOpacity style={styles.sideBtn} onPress={handleGallery}>
            <Text style={styles.sideBtnIcon}>🖼</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shutter}
            onPress={detection === 'scanning' ? handleShutter : resetDetection}
            activeOpacity={0.8}>
            <View style={styles.shutterInner} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sideBtn}
            onPress={() => setPosition(p => (p === 'back' ? 'front' : 'back'))}>
            <Text style={styles.sideBtnIcon}>🔄</Text>
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
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  topBtnIcon: { fontSize: 16, color: '#fff' },
  hintPill: {
    backgroundColor: 'rgba(43,43,110,0.8)',
    borderWidth: 0.5, borderColor: '#5B5B9E',
    borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5,
  },
  hintText: { fontSize: 12, color: '#E8D8F0' },

  frameWrap: {
    position: 'absolute',
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    top: '50%',
    left: '50%',
    marginTop: -(FRAME_SIZE / 2) - 30,
    marginLeft: -(FRAME_SIZE / 2),
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
    color: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(232,216,240,0.1)',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 4,
  },
  detectedFrameText: { fontSize: 32 },

  bottomSection: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20,
    paddingBottom: 44,
  },
  popup: {
    backgroundColor: 'rgba(43,43,110,0.9)',
    borderWidth: 0.5, borderColor: '#5B5B9E',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  popupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
  },
  greenDot: { width: 8, height: 8, backgroundColor: '#CBDF90', borderRadius: 4 },
  popupTitle: { fontSize: 13, fontWeight: '500', color: '#E8D8F0' },
  popupSub: { fontSize: 11, color: '#9B9BC8', marginLeft: 'auto' },
  popupOptions: { flexDirection: 'row', gap: 8 },
  optionLight: {
    flex: 1, backgroundColor: '#E8D8F0', borderRadius: 12, padding: 10, alignItems: 'center',
  },
  optionDark: {
    flex: 1, backgroundColor: '#3d3d8a', borderRadius: 12, padding: 10, alignItems: 'center',
    borderWidth: 0.5, borderColor: '#5B5B9E',
  },
  optionEmoji: { fontSize: 20, marginBottom: 4 },
  optionTitleDark: { fontSize: 11, fontWeight: '500', color: '#2B2B6E' },
  optionSubDark: { fontSize: 9, color: '#6B6B9E', marginTop: 2 },
  optionTitleLight: { fontSize: 11, fontWeight: '500', color: '#E8D8F0' },
  optionSubLight: { fontSize: 9, color: '#9B9BC8', marginTop: 2 },
  rescanBtn: { alignItems: 'center', marginTop: 10 },
  rescanText: { fontSize: 11, color: '#9B9BC8' },

  shutterRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  sideBtn: {
    width: 44, height: 44,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  sideBtnIcon: { fontSize: 22 },
  shutter: {
    width: 68, height: 68, borderRadius: 34,
    borderWidth: 3, borderColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  shutterInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff' },

  permissionScreen: {
    flex: 1, backgroundColor: '#1a1228',
    justifyContent: 'center', alignItems: 'center', gap: 16,
  },
  permissionEmoji: { fontSize: 48 },
  permissionText: { fontSize: 16, color: '#9B9BC8' },
  permissionBtn: {
    backgroundColor: '#2B2B6E', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  permissionBtnText: { color: '#E8D8F0', fontSize: 14, fontWeight: '500' },
});
