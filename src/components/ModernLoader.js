import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { COLORS } from '../constants/colors';

/**
 * Outdoor‑uyumlu 3D hissiyatlı yükleme animasyonu.
 * Küçük bir dağ silüeti ve etrafında dönen "güneş" animasyonu gösterir.
 */
export default function ModernLoader({ message = 'Yükleniyor...', size = 72 }) {
  const orbit = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(orbit, {
        toValue: 1,
        duration: 2600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 900,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [orbit, bounce]);

  const spin = orbit.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const bob = bounce.interpolate({
    inputRange: [0, 1],
    outputRange: [4, -4],
  });

  const orbitRadius = size * 0.55;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.loaderWrapper,
          {
            width: size * 1.4,
            height: size * 1.4,
            transform: [
              { translateY: bob },
              { perspective: 600 },
              { rotateX: '18deg' },
            ],
          },
        ]}
      >
        {/* Arka arazi plakası */}
        <View
          style={[
            styles.groundPlate,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        >
          {/* Dağ silüeti */}
          <View style={styles.mountainLayer}>
            <View style={[styles.mountain, styles.mountainLeft]} />
            <View style={[styles.mountain, styles.mountainRight]} />
          </View>
          {/* Ön çim şeridi */}
          <View style={styles.grassStrip} />
        </View>

        {/* Güneş / ay yörüngesi */}
        <Animated.View
          style={[
            styles.orbit,
            {
              width: orbitRadius,
              height: orbitRadius,
              borderRadius: orbitRadius / 2,
              transform: [{ rotate: spin }],
            },
          ]}
        >
          <View style={styles.orbitAnchor}>
            <View style={styles.sun} />
          </View>
        </Animated.View>
      </Animated.View>

      {!!message && <Text style={styles.text}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loaderWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  groundPlate: {
    backgroundColor: '#0c1d1a',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  mountainLayer: {
    position: 'absolute',
    bottom: 10,
    width: '100%',
    height: '70%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  mountain: {
    width: 0,
    height: 0,
    borderLeftWidth: 26,
    borderRightWidth: 26,
    borderBottomWidth: 38,
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#3c6b4f',
  },
  mountainLeft: {
    transform: [{ translateX: -10 }],
    opacity: 0.9,
  },
  mountainRight: {
    transform: [{ translateX: 10 }, { scale: 0.8 }],
    borderBottomColor: '#2d523c',
    opacity: 0.85,
  },
  grassStrip: {
    position: 'absolute',
    bottom: 0,
    left: -10,
    right: -10,
    height: 16,
    backgroundColor: '#1f3d30',
  },
  orbit: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  orbitAnchor: {
    width: '100%',
    alignItems: 'flex-end',
  },
  sun: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ffd86b',
    shadowColor: '#ffd86b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  text: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});

