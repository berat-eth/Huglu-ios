import React, { useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { G, Path, Circle, Text as SvgText } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';

const { width } = Dimensions.get('window');
const WHEEL_SIZE = Math.min(width * 0.85, 350);
const SEGMENT_COUNT = 20; // 20 segment (%1'den %20'ye kadar)

// İndirim yüzdeleri (%1'den %20'ye kadar)
const DISCOUNT_SEGMENTS = Array.from({ length: SEGMENT_COUNT }, (_, i) => i + 1);

// Segment renkleri (alternatif renkler)
const SEGMENT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52BE80',
  '#E74C3C', '#3498DB', '#9B59B6', '#1ABC9C', '#F39C12',
  '#E67E22', '#95A5A6', '#34495E', '#16A085', '#27AE60',
];

export default function SpinWheel({ visible, onClose, onWin }) {
  const [spinning, setSpinning] = useState(false);
  const [wonDiscount, setWonDiscount] = useState(null);
  const spinValue = useRef(new Animated.Value(0)).current;
  const rotation = useRef(0);

  const segmentAngle = 360 / SEGMENT_COUNT;
  const radius = WHEEL_SIZE / 2;
  const center = radius;

  const slices = useMemo(() => {
    return DISCOUNT_SEGMENTS.map((discount, index) => {
      // 0 derece sağa baktığı için -90 ile üste taşıyoruz (pointer üstte)
      const startAngle = index * segmentAngle - 90;
      const endAngle = (index + 1) * segmentAngle - 90;

      const path = describeSlice(center, center, radius - 6, startAngle, endAngle);
      const mid = (startAngle + endAngle) / 2;
      const labelPoint = polarToCartesian(center, center, radius * 0.72, mid);
      const textRotate = mid + 90; // metni dilim yönüne göre çevir

      return {
        discount,
        color: SEGMENT_COLORS[index % SEGMENT_COLORS.length],
        path,
        labelPoint,
        textRotate,
      };
    });
  }, [segmentAngle, radius, center]);

  const spinWheel = () => {
    if (spinning) return;

    setSpinning(true);
    setWonDiscount(null);

    // Ağırlıklı rastgele seçim: %10 üzeri indirimlerin çıkma ihtimali %50 azaltıldı
    // %1-%10: 2 şans, %11-%20: 1 şans (toplamda %11-%20'nin şansı %50 azaldı)
    const weightedSegments = [];
    for (let i = 1; i <= 10; i++) {
      weightedSegments.push(i, i); // %1-%10 için 2 şans
    }
    for (let i = 11; i <= 20; i++) {
      weightedSegments.push(i); // %11-%20 için 1 şans
    }
    
    // Ağırlıklı listeden rastgele seç
    const randomIndex = Math.floor(Math.random() * weightedSegments.length);
    const selectedSegment = weightedSegments[randomIndex];
    
    // Çarkın kaç tur döneceği (3-5 tur arası)
    const spins = 3 + Math.random() * 2;
    
    // Seçilen segmentin açısını hesapla
    // Segmentler -90 dereceden başlıyor (pointer üstte olduğu için)
    const segmentIndex = selectedSegment - 1; // 0-19 arası index
    const segmentStartAngle = segmentIndex * segmentAngle - 90; // Segment başlangıç açısı
    const segmentCenterAngle = segmentStartAngle + segmentAngle / 2; // Segment merkez açısı
    
    // Pointer üstte (-90 derece) olduğu için, segment merkezini -90'a getirmeliyiz
    // Mevcut segment merkez açısından -90'a gitmek için gereken açı
    // segmentCenterAngle'dan -90'a gitmek: -90 - segmentCenterAngle
    // Ama çark saat yönünde döndüğü için negatif açıyı 360'a eklemeliyiz
    let angleToPointer = -90 - segmentCenterAngle;
    if (angleToPointer < 0) {
      angleToPointer += 360;
    }
    
    // Toplam dönüş açısı (turlar + seçilen segment merkezini pointer'a getir)
    const totalRotation = spins * 360 + angleToPointer;
    
    // Mevcut rotasyona ekle
    rotation.current += totalRotation;

    // Animasyon
    Animated.timing(spinValue, {
      toValue: rotation.current,
      duration: 3000,
      useNativeDriver: true,
    }).start(() => {
      setSpinning(false);
      setWonDiscount(selectedSegment);
      
      // Kazanılan indirimi callback ile gönder
      if (onWin) {
        setTimeout(() => {
          onWin(selectedSegment);
        }, 500);
      }
    });
  };

  const handleClose = () => {
    // Sadece spinning değilse ve kullanıcı manuel olarak kapatıyorsa
    if (!spinning) {
      onClose();
      // Reset for next time
      setTimeout(() => {
        setWonDiscount(null);
        rotation.current = 0;
        spinValue.setValue(0);
      }, 300);
    }
  };

  // Android geri tuşu için - sadece spinning değilse kapat
  const handleRequestClose = () => {
    if (!spinning) {
      handleClose();
    }
  };

  const spinRotation = spinValue.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleRequestClose}
    >
      <SafeAreaView style={styles.container}>
        <TouchableOpacity 
          activeOpacity={1} 
          style={styles.overlayTouchable}
          onPress={() => {}} // Overlay'e tıklanınca hiçbir şey yapma
        >
          <LinearGradient colors={['rgba(0,0,0,0.70)', 'rgba(0,0,0,0.88)']} style={styles.overlay}>
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={(e) => e.stopPropagation()} // İçeriğe tıklanınca event'i durdur
            >
              <View style={styles.content}>
            {/* Close */}
            <TouchableOpacity
              style={[styles.closeIcon, spinning && styles.closeIconDisabled]}
              onPress={handleClose}
              disabled={spinning}
            >
              <Ionicons name="close" size={22} color={COLORS.textMain} />
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>İndirim Çarkı</Text>
              <Text style={styles.subtitle}>
                Çarkı çevir ve kazan! %1'den %20'ye kadar indirim kazanabilirsin
              </Text>
            </View>

            {/* Wheel Container */}
            <View style={styles.wheelContainer}>
              <View style={styles.wheelWrapper}>
                {/* Pointer - Üstte sabit */}
                <View style={styles.pointerWrap}>
                  <View style={styles.pointerShadow} />
                  <Ionicons name="caret-down" size={34} color={COLORS.primary} />
                </View>

                {/* Wheel - Animasyonlu */}
                <Animated.View
                  style={[
                    styles.wheel,
                    {
                      transform: [{ rotate: spinRotation }],
                    },
                  ]}
                >
                  <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
                    <G>
                      {slices.map((s, idx) => (
                        <G key={`${s.discount}-${idx}`}>
                          <Path d={s.path} fill={s.color} stroke="rgba(255,255,255,0.92)" strokeWidth={2} />
                          <SvgText
                            x={s.labelPoint.x}
                            y={s.labelPoint.y}
                            fill="#FFFFFF"
                            fontSize="12"
                            fontWeight="800"
                            textAnchor="middle"
                            alignmentBaseline="middle"
                            transform={`rotate(${s.textRotate}, ${s.labelPoint.x}, ${s.labelPoint.y})`}
                          >
                            %{s.discount}
                          </SvgText>
                        </G>
                      ))}

                      {/* dış halka */}
                      <Circle
                        cx={center}
                        cy={center}
                        r={radius - 3}
                        stroke="rgba(255,255,255,0.95)"
                        strokeWidth={6}
                        fill="transparent"
                      />
                    </G>
                  </Svg>
                </Animated.View>

                {/* Center Circle - Üstte sabit */}
                <View style={styles.centerCircle}>
                  <LinearGradient colors={['#19d14a', '#0ea93a']} style={styles.centerInner}>
                    <Ionicons name="gift" size={30} color={COLORS.white} />
                    <Text style={styles.centerText}>Çevir</Text>
                  </LinearGradient>
                </View>
              </View>
            </View>

            {/* Result */}
            {wonDiscount && (
              <View style={styles.resultContainer}>
                <View style={styles.resultBox}>
                  <View style={styles.resultBadge}>
                    <Ionicons name="sparkles" size={18} color={COLORS.white} />
                    <Text style={styles.resultBadgeText}>KAZANDIN</Text>
                  </View>
                  <Text style={styles.resultTitle}>%{wonDiscount} İndirim</Text>
                  <Text style={styles.resultMessage}>Kodun hazır</Text>
                  <View style={styles.codePill}>
                    <Text style={styles.resultCode}>WELCOME{wonDiscount.toString().padStart(2, '0')}</Text>
                  </View>
                  <Text style={styles.resultMessage}>
                    Bu kodu alışveriş yaparken kullanabilirsiniz!
                  </Text>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              {!wonDiscount ? (
                <TouchableOpacity onPress={spinWheel} disabled={spinning} activeOpacity={0.9}>
                  <LinearGradient
                    colors={spinning ? ['#9FE7B6', '#7ADFA0'] : ['#19d14a', '#0ea93a']}
                    style={[styles.spinButton, spinning && styles.spinButtonDisabled]}
                  >
                    <Ionicons name={spinning ? 'sync' : 'refresh'} size={22} color={COLORS.white} />
                    <Text style={styles.spinButtonText}>{spinning ? 'Çevriliyor...' : 'Çarkı Çevir'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handleClose} activeOpacity={0.9}>
                  <LinearGradient colors={['#111827', '#0B1220']} style={styles.closeButton}>
                    <Text style={styles.closeButtonText}>Harika!</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
              </View>
            </TouchableOpacity>
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlayTouchable: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  content: {
    backgroundColor: COLORS.white,
    borderRadius: 28,
    padding: 22,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  closeIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  closeIconDisabled: {
    opacity: 0.6,
  },
  header: {
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.textMain,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.gray600,
    textAlign: 'center',
    lineHeight: 20,
  },
  wheelContainer: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    marginVertical: 10,
    position: 'relative',
  },
  wheelWrapper: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheel: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_SIZE / 2,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    backgroundColor: '#fff',
  },
  pointerWrap: {
    position: 'absolute',
    top: -14,
    zIndex: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointerShadow: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.15)',
    top: 10,
  },
  centerCircle: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 6,
    borderColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  centerInner: {
    width: 78,
    height: 78,
    borderRadius: 39,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  centerText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 1,
  },
  resultContainer: {
    width: '100%',
    marginTop: 12,
  },
  resultBox: {
    backgroundColor: '#F6FFF9',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(14,169,58,0.25)',
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
  },
  resultBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.textMain,
  },
  codePill: {
    marginTop: 10,
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  resultCode: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 1.2,
  },
  resultMessage: {
    fontSize: 14,
    color: COLORS.gray600,
    textAlign: 'center',
    marginTop: 8,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 14,
  },
  spinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  spinButtonDisabled: {
    opacity: 0.6,
  },
  spinButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.white,
  },
  closeButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.white,
  },
});

function polarToCartesian(cx, cy, r, angleInDegrees) {
  const angleInRadians = (Math.PI / 180) * angleInDegrees;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
}

function describeSlice(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');
}
