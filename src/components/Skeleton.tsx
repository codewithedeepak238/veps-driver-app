import { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';

/**
 * Skeleton — a pulsing placeholder shown while data loads.
 * `color` defaults to a light gray; pass a translucent white on dark surfaces.
 */
export default function Skeleton({
  width,
  height,
  radius = 6,
  color = '#e2e8f0',
  style,
}: {
  width: number | `${number}%`;
  height: number;
  radius?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: color, opacity }, style]}
    />
  );
}
