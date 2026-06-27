import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Check, X } from 'lucide-react-native';

const { width: SW, height: SH } = Dimensions.get('window');
const HEADER_H = 56;
const FOOTER_H = 96;
const AREA_W = SW;
const AREA_H = SH - HEADER_H - FOOTER_H;

interface Bounds { left: number; top: number; width: number; height: number }

interface Props {
  visible: boolean;
  imageUri: string;
  thumbnailAspect?: number; // width / height of thumbnail display; default 1 (square)
  initialFocalX?: number;
  initialFocalY?: number;
  onConfirm: (focalX: number, focalY: number) => void;
  onClose: () => void;
}

export function CropSelectorModal({
  visible,
  imageUri,
  thumbnailAspect = 1,
  initialFocalX = 0.5,
  initialFocalY = 0.5,
  onConfirm,
  onClose,
}: Props) {
  const [imgBounds, setImgBounds] = useState<Bounds | null>(null);
  const imgBoundsRef = useRef<Bounds | null>(null);

  const [boxPos, setBoxPos] = useState({ x: 0, y: 0 });
  const boxPosRef = useRef({ x: 0, y: 0 });
  const startPosRef = useRef({ x: 0, y: 0 });

  const [boxSize, setBoxSize] = useState({ w: 0, h: 0 });
  const boxSizeRef = useRef({ w: 0, h: 0 });

  function applyBoxPos(pos: { x: number; y: number }) {
    boxPosRef.current = pos;
    setBoxPos({ ...pos });
  }

  useEffect(() => {
    if (!visible || !imageUri) return;
    Image.getSize(
      imageUri,
      (imgW, imgH) => {
        const scale = Math.min(AREA_W / imgW, AREA_H / imgH);
        const rW = imgW * scale;
        const rH = imgH * scale;
        const bounds: Bounds = {
          left: (AREA_W - rW) / 2,
          top: (AREA_H - rH) / 2,
          width: rW,
          height: rH,
        };
        imgBoundsRef.current = bounds;
        setImgBounds(bounds);

        // Box is 65% of image width, height derived from thumbnail aspect ratio
        const bW = rW * 0.65;
        const bH = bW / thumbnailAspect;
        const clampedBH = Math.min(bH, rH);
        const clampedBW = clampedBH * thumbnailAspect;
        const sz = { w: clampedBW, h: clampedBH };
        boxSizeRef.current = sz;
        setBoxSize(sz);

        // Place box so its centre is over the initial focal point
        const cx = bounds.left + initialFocalX * rW;
        const cy = bounds.top + initialFocalY * rH;
        const initPos = {
          x: Math.max(bounds.left, Math.min(bounds.left + rW - sz.w, cx - sz.w / 2)),
          y: Math.max(bounds.top, Math.min(bounds.top + rH - sz.h, cy - sz.h / 2)),
        };
        applyBoxPos(initPos);
      },
      () => {},
    );
  }, [visible, imageUri, initialFocalX, initialFocalY, thumbnailAspect]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startPosRef.current = { ...boxPosRef.current };
      },
      onPanResponderMove: (_, gs) => {
        const b = imgBoundsRef.current;
        const bz = boxSizeRef.current;
        if (!b) return;
        let nx = startPosRef.current.x + gs.dx;
        let ny = startPosRef.current.y + gs.dy;
        nx = Math.max(b.left, Math.min(b.left + b.width - bz.w, nx));
        ny = Math.max(b.top, Math.min(b.top + b.height - bz.h, ny));
        applyBoxPos({ x: nx, y: ny });
      },
    }),
  ).current;

  function handleConfirm() {
    const b = imgBoundsRef.current;
    const bz = boxSizeRef.current;
    if (!b) { onClose(); return; }
    const cx = boxPosRef.current.x + bz.w / 2;
    const cy = boxPosRef.current.y + bz.h / 2;
    onConfirm(
      Math.max(0, Math.min(1, (cx - b.left) / b.width)),
      Math.max(0, Math.min(1, (cy - b.top) / b.height)),
    );
  }

  const b = imgBounds;
  const bp = boxPos;
  const bz = boxSize;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn} activeOpacity={0.7}>
            <X size={20} color="#fff9e8" strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Adjust thumbnail</Text>
          <TouchableOpacity onPress={handleConfirm} style={styles.headerBtn} activeOpacity={0.7}>
            <Check size={20} color="#CBDF90" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Image area */}
        <View style={styles.imageArea}>
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />

          {/* Dim overlay: 4 rectangles framing the crop box */}
          {b && bz.w > 0 && (
            <>
              {/* top */}
              <View style={[styles.dim, { left: b.left, top: b.top, width: b.width, height: bp.y - b.top }]} />
              {/* bottom */}
              <View style={[styles.dim, { left: b.left, top: bp.y + bz.h, width: b.width, height: b.top + b.height - bp.y - bz.h }]} />
              {/* left */}
              <View style={[styles.dim, { left: b.left, top: bp.y, width: bp.x - b.left, height: bz.h }]} />
              {/* right */}
              <View style={[styles.dim, { left: bp.x + bz.w, top: bp.y, width: b.left + b.width - bp.x - bz.w, height: bz.h }]} />
            </>
          )}

          {/* Crop box */}
          {b && bz.w > 0 && (
            <View
              {...panResponder.panHandlers}
              style={[styles.cropBox, { left: bp.x, top: bp.y, width: bz.w, height: bz.h }]}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.hint}>Drag the box to choose what shows in the thumbnail</Text>
          <TouchableOpacity style={styles.applyBtn} onPress={handleConfirm} activeOpacity={0.85}>
            <Text style={styles.applyBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const CORNER_SIZE = 18;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111' },

  header: {
    height: HEADER_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#1a0d00',
    borderBottomWidth: 0.5,
    borderBottomColor: '#3d2010',
  },
  headerBtn: { padding: 8 },
  headerTitle: { fontSize: 15, fontWeight: '500', color: '#fff9e8' },

  imageArea: {
    width: AREA_W,
    height: AREA_H,
    backgroundColor: '#000',
  },
  image: {
    width: '100%',
    height: '100%',
  },

  dim: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },

  cropBox: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#eab664',
    borderStyle: 'dashed',
  },

  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#faa93e',
    borderWidth: CORNER_THICKNESS,
  },
  cornerTL: { top: -1, left: -1, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: -1, right: -1, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: -1, left: -1, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: -1, right: -1, borderLeftWidth: 0, borderTopWidth: 0 },

  footer: {
    height: FOOTER_H,
    backgroundColor: '#1a0d00',
    borderTopWidth: 0.5,
    borderTopColor: '#3d2010',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  hint: { fontSize: 12, color: '#a09070', textAlign: 'center' },
  applyBtn: {
    backgroundColor: '#5e3620',
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderWidth: 0.5,
    borderColor: '#faa93e',
  },
  applyBtnText: { fontSize: 14, fontWeight: '500', color: '#fff9e8' },
});
