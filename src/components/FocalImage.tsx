import React, { useEffect, useState } from 'react';
import { Image, View, type ViewStyle } from 'react-native';

interface Props {
  uri: string;
  focalX?: number;
  focalY?: number;
  style?: ViewStyle | ViewStyle[];
}

export function FocalImage({ uri, focalX = 0.5, focalY = 0.5, style }: Props) {
  const [container, setContainer] = useState<{ w: number; h: number } | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    if (!uri) return;
    Image.getSize(uri, (w, h) => setNatural({ w, h }), () => {});
  }, [uri]);

  const offset = (() => {
    if (!container || !natural) return null;
    const { w: cW, h: cH } = container;
    const { w: iW, h: iH } = natural;
    const scale = Math.max(cW / iW, cH / iH);
    const rW = iW * scale;
    const rH = iH * scale;
    let left = cW / 2 - focalX * rW;
    let top = cH / 2 - focalY * rH;
    left = Math.min(0, Math.max(cW - rW, left));
    top = Math.min(0, Math.max(cH - rH, top));
    return { left, top, width: rW, height: rH };
  })();

  return (
    <View
      style={[style, { overflow: 'hidden' }]}
      onLayout={e => {
        const { width, height } = e.nativeEvent.layout;
        setContainer({ w: width, h: height });
      }}>
      {offset ? (
        <Image
          source={{ uri }}
          style={{ position: 'absolute', left: offset.left, top: offset.top, width: offset.width, height: offset.height }}
        />
      ) : (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      )}
    </View>
  );
}
