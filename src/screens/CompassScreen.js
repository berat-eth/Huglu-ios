import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Magnetometer } from 'expo-sensors';
import * as Location from 'expo-location';
import { COLORS } from '../constants/colors';
import { useAlert } from '../hooks/useAlert';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive değerler
const isSmallScreen = SCREEN_HEIGHT < 700;
const isMediumScreen = SCREEN_HEIGHT >= 700 && SCREEN_HEIGHT < 800;
const isLargeScreen = SCREEN_HEIGHT >= 800;

// Pusula boyutu ekrana göre ayarlanır
const COMPASS_SIZE = isSmallScreen ? 260 : isMediumScreen ? 300 : 320;
const HEADING_FONT_SIZE = isSmallScreen ? 52 : isMediumScreen ? 58 : 64;
const DIRECTION_FONT_SIZE = isSmallScreen ? 16 : 18;

export default function CompassScreen({ navigation }) {
  const alert = useAlert();
  const [heading, setHeading] = useState(0);
  const [direction, setDirection] = useState('KUZEY');
  const [coordinates, setCoordinates] = useState(null);
  const [elevation, setElevation] = useState(null);
  const [accuracy, setAccuracy] = useState('Bilinmiyor');
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [headingLocked, setHeadingLocked] = useState(false);
  const [subscription, setSubscription] = useState(null);

  const rotateValue = useRef(new Animated.Value(0)).current;
  const lastAngle = useRef(0);
  
  // Low-pass filter için alpha değeri (0-1 arası, düşük = daha yumuşak)
  const filterAlpha = 0.15;

  useEffect(() => {
    requestPermissions();
    return () => {
      unsubscribe();
    };
  }, []);

  const requestPermissions = async () => {
    try {
      // Start magnetometer first (doesn't require permission)
      subscribe();

      // Try to get location permission (optional)
      try {
        const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
        if (locationStatus === 'granted') {
          // Get initial location
          await updateLocation();
        } else {
          console.log('Konum izni verilmedi, sadece pusula çalışacak');
        }
      } catch (locError) {
        console.log('Konum servisi kullanılamıyor, sadece pusula çalışacak:', locError);
      }
    } catch (error) {
      console.error('Permission error:', error);
      // Hata olsa bile magnetometre çalışmaya devam etsin
      subscribe();
    }
  };

  const subscribe = () => {
    // Daha hızlı güncelleme için interval'i azalt
    Magnetometer.setUpdateInterval(50);
    
    const sub = Magnetometer.addListener((data) => {
      if (!headingLocked) {
        // Magnetometre verilerinden açı hesapla
        let angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
        
        // Negatif açıları pozitife çevir (0-360 arası)
        if (angle < 0) {
          angle = angle + 360;
        }
        
        // Manyetik sapma düzeltmesi (Türkiye için ortalama +5 derece)
        const magneticDeclination = 5;
        angle = (angle + magneticDeclination) % 360;
        
        // Low-pass filter: Titreşimi azaltır
        // 0-360 geçişinde sorun olmaması için özel kontrol
        let diff = angle - lastAngle.current;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        
        let filteredAngle = lastAngle.current + filterAlpha * diff;
        if (filteredAngle < 0) filteredAngle += 360;
        if (filteredAngle >= 360) filteredAngle -= 360;
        
        lastAngle.current = filteredAngle;
        
        const roundedAngle = Math.round(filteredAngle);
        
        console.log('📍 Pusula:', { 
          ham: Math.round(Math.atan2(data.y, data.x) * (180 / Math.PI)), 
          düzeltilmiş: roundedAngle,
          güç: Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z).toFixed(2)
        });
        
        setHeading(roundedAngle);
        updateDirection(filteredAngle);
        
        // Daha hassas animasyon
        Animated.timing(rotateValue, {
          toValue: -filteredAngle,
          duration: 50,
          useNativeDriver: true,
        }).start();
      }
    });
    setSubscription(sub);
  };

  const unsubscribe = () => {
    subscription && subscription.remove();
    setSubscription(null);
  };

  const updateLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude, altitude, accuracy: acc } = location.coords;
      
      setCoordinates({
        latitude: latitude.toFixed(4),
        longitude: longitude.toFixed(4),
      });

      if (altitude) {
        setElevation(Math.round(altitude * 3.28084)); // meters to feet
      }

      if (acc) {
        if (acc < 10) setAccuracy('Yüksek (±5m)');
        else if (acc < 50) setAccuracy('Orta (±20m)');
        else setAccuracy('Düşük (±50m)');
      }
    } catch (error) {
      console.error('Location error:', error);
      // Konum alınamazsa sadece uyarı ver, uygulamayı durdurma
      setAccuracy('Bilinmiyor');
    }
  };

  const updateDirection = (angle) => {
    const directions = [
      { name: 'KUZEY', min: 337.5, max: 22.5 },
      { name: 'KUZEY DOĞU', min: 22.5, max: 67.5 },
      { name: 'DOĞU', min: 67.5, max: 112.5 },
      { name: 'GÜNEY DOĞU', min: 112.5, max: 157.5 },
      { name: 'GÜNEY', min: 157.5, max: 202.5 },
      { name: 'GÜNEY BATI', min: 202.5, max: 247.5 },
      { name: 'BATI', min: 247.5, max: 292.5 },
      { name: 'KUZEY BATI', min: 292.5, max: 337.5 },
    ];

    for (const dir of directions) {
      if (angle >= dir.min && angle < dir.max) {
        setDirection(dir.name);
        return;
      }
    }
    setDirection('KUZEY');
  };

  const handleCalibrate = () => {
    setIsCalibrating(true);
    alert.show(
      'Pusula Kalibrasyonu',
      'Doğru kalibrasyon için:\n\n' +
      '1. Metal objelerden uzaklaşın\n' +
      '2. Cihazı havada yavaşça 8 şeklinde hareket ettirin\n' +
      '3. Her yönde (yukarı, aşağı, sağa, sola) döndürün\n' +
      '4. 10-15 saniye boyunca devam edin\n\n' +
      'Bu işlem manyetik sensörü kalibre edecektir.',
      [
        {
          text: 'İptal',
          style: 'cancel',
          onPress: () => setIsCalibrating(false),
        },
        {
          text: 'Başlat',
          onPress: () => {
            // Kalibrasyon süresi
            let countdown = 15;
            const interval = setInterval(() => {
              countdown--;
              if (countdown <= 0) {
                clearInterval(interval);
                setIsCalibrating(false);
                alert.show('✅ Başarılı', 'Pusula kalibre edildi!\n\nEn iyi sonuç için metal objelerden uzak durun.');
              }
            }, 1000);
          },
        },
      ]
    );
  };

  const toggleLockHeading = () => {
    setHeadingLocked(!headingLocked);
    alert.show(
      headingLocked ? 'Kilit Açıldı' : 'Kilit Kapatıldı',
      headingLocked ? 'Pusula tekrar hareket edecek' : 'Mevcut yön kilitlendi'
    );
  };

  const showTips = () => {
    alert.show(
      '💡 Doğruluk İpuçları',
      '• Metal objelerden (telefon kılıfı, mıknatıs, elektronik cihazlar) uzak durun\n\n' +
      '• Cihazı düz tutun\n\n' +
      '• İlk kullanımda mutlaka kalibre edin\n\n' +
      '• Kapalı alanlarda doğruluk düşebilir\n\n' +
      '• Elektrik hatları ve büyük metal yapılardan uzak durun',
      [{ text: 'Anladım', style: 'default' }]
    );
  };

  const getAccuracyColor = () => {
    if (accuracy.includes('Yüksek')) return COLORS.success;
    if (accuracy.includes('Orta')) return COLORS.warning;
    if (accuracy.includes('Bilinmiyor')) return COLORS.gray400;
    return COLORS.error;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pusula</Text>
        <TouchableOpacity onPress={showTips} style={styles.infoButton}>
          <Ionicons name="information-circle-outline" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Heading Display */}
        <View style={styles.headingContainer}>
          <Text style={styles.headingText}>{heading}°</Text>
          <Text style={styles.directionText}>{direction.toUpperCase()}</Text>
        </View>

        {/* Compass Visualization */}
        <View style={styles.compassContainer}>
          {/* Outer Ring */}
          <View style={styles.compassOuter}>
            {/* Degree Marks */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((degree) => {
              const isCardinal = degree % 90 === 0;
              return (
                <View
                  key={degree}
                  style={[
                    styles.degreeMark,
                    isCardinal && styles.degreeMarkLarge,
                    { transform: [{ rotate: `${degree}deg` }] },
                  ]}
                />
              );
            })}

            {/* Top Center Marker (Fixed) */}
            <View style={styles.topMarker}>
              <Ionicons name="add" size={20} color={COLORS.gray300} />
            </View>

            {/* Cardinal Directions - Rotates with compass */}
            <Animated.View
              style={[
                styles.cardinalContainer,
                {
                  transform: [
                    {
                      rotate: rotateValue.interpolate({
                        inputRange: [-360, 0, 360],
                        outputRange: ['-360deg', '0deg', '360deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={[styles.cardinalText, styles.cardinalNorth, { top: COMPASS_SIZE * 0.1 }]}>K</Text>
              <Text style={[styles.cardinalText, { bottom: COMPASS_SIZE * 0.1 }]}>G</Text>
              <Text style={[styles.cardinalText, { right: COMPASS_SIZE * 0.1 }]}>D</Text>
              <Text style={[styles.cardinalText, { left: COMPASS_SIZE * 0.1 }]}>B</Text>

              {/* Intermediate directions */}
              <Text style={[styles.cardinalTextSmall, { top: COMPASS_SIZE * 0.15, right: COMPASS_SIZE * 0.15 }]}>KD</Text>
              <Text style={[styles.cardinalTextSmall, { bottom: COMPASS_SIZE * 0.15, right: COMPASS_SIZE * 0.15 }]}>GD</Text>
              <Text style={[styles.cardinalTextSmall, { bottom: COMPASS_SIZE * 0.15, left: COMPASS_SIZE * 0.15 }]}>GB</Text>
              <Text style={[styles.cardinalTextSmall, { top: COMPASS_SIZE * 0.15, left: COMPASS_SIZE * 0.15 }]}>KB</Text>
            </Animated.View>

            {/* Compass Needle - Always points North */}
            <Animated.View
              style={[
                styles.needleContainer,
                {
                  transform: [
                    {
                      rotate: rotateValue.interpolate({
                        inputRange: [-360, 0, 360],
                        outputRange: ['-360deg', '0deg', '360deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.needleNorth} />
              <View style={styles.needleSouth} />
              <View style={styles.needlePivot} />
            </Animated.View>

            {/* Inner Ring */}
            <View style={styles.compassInner} />
          </View>
        </View>

        {/* Coordinates Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="location" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Koordinatlar</Text>
              <Text style={styles.infoValue}>
                {coordinates
                  ? `${coordinates.latitude}° K, ${coordinates.longitude}° B`
                  : 'Yükleniyor...'}
              </Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoGrid}>
            <View style={styles.infoGridItem}>
              <View style={styles.infoLabelRow}>
                <Ionicons name="trending-up" size={16} color={COLORS.gray500} />
                <Text style={styles.infoLabel}>Yükseklik</Text>
              </View>
              <Text style={styles.infoValue}>{elevation ? `${elevation} ft` : 'Yok'}</Text>
            </View>

            <View style={styles.infoGridDivider} />

            <View style={styles.infoGridItem}>
              <View style={styles.infoLabelRow}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.gray500} />
                <Text style={styles.infoLabel}>Doğruluk</Text>
              </View>
              <Text style={[styles.infoValue, { color: getAccuracyColor() }]}>
                {accuracy}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[styles.calibrateButton, isCalibrating && styles.calibrateButtonActive]}
          onPress={handleCalibrate}
          disabled={isCalibrating}
        >
          <Ionicons name="compass" size={24} color={COLORS.white} />
          <Text style={styles.calibrateButtonText}>
            {isCalibrating ? 'Kalibre Ediliyor...' : 'Pusulayı Kalibre Et'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.lockButton} onPress={toggleLockHeading}>
          <Ionicons
            name={headingLocked ? 'lock-closed' : 'lock-open'}
            size={18}
            color={COLORS.gray500}
          />
          <Text style={styles.lockButtonText}>
            {headingLocked ? 'Kilidi Aç' : 'Yönü Kilitle'}
          </Text>
        </TouchableOpacity>
      </View>
      <alert.AlertComponent />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SCREEN_WIDTH * 0.05,
    gap: isSmallScreen ? 24 : isMediumScreen ? 32 : 40,
  },
  headingContainer: {
    alignItems: 'center',
  },
  headingText: {
    fontSize: HEADING_FONT_SIZE,
    fontWeight: '800',
    color: COLORS.textMain,
    letterSpacing: -2,
  },
  directionText: {
    fontSize: DIRECTION_FONT_SIZE,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 3,
    marginTop: isSmallScreen ? 4 : 8,
  },
  compassContainer: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassOuter: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    borderRadius: COMPASS_SIZE / 2,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  degreeMark: {
    position: 'absolute',
    width: 1,
    height: 8,
    backgroundColor: COLORS.gray300,
    top: 20,
  },
  degreeMarkLarge: {
    width: 2,
    height: 12,
    backgroundColor: COLORS.gray400,
  },
  cardinalContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardinalText: {
    position: 'absolute',
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  cardinalTextSmall: {
    position: 'absolute',
    fontSize: isSmallScreen ? 12 : 14,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  cardinalNorth: {
    color: COLORS.primary,
  },
  needleContainer: {
    position: 'absolute',
    width: COMPASS_SIZE * 0.6,
    height: COMPASS_SIZE * 0.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  needleNorth: {
    position: 'absolute',
    top: 0,
    width: 4,
    height: COMPASS_SIZE * 0.3,
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  needleSouth: {
    position: 'absolute',
    bottom: 0,
    width: 4,
    height: COMPASS_SIZE * 0.3,
    backgroundColor: COLORS.gray300,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  needlePivot: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    borderWidth: 4,
    borderColor: COLORS.gray100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  compassInner: {
    position: 'absolute',
    width: COMPASS_SIZE * 0.8125,
    height: COMPASS_SIZE * 0.8125,
    borderRadius: (COMPASS_SIZE * 0.8125) / 2,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  topMarker: {
    position: 'absolute',
    top: 8,
    zIndex: 10,
  },
  infoCard: {
    width: '100%',
    maxWidth: SCREEN_WIDTH * 0.9,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: isSmallScreen ? 12 : 16,
    gap: 12,
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: isSmallScreen ? 11 : 12,
    fontWeight: '500',
    color: COLORS.gray500,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: isSmallScreen ? 13 : 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  infoDivider: {
    height: 1,
    backgroundColor: COLORS.gray100,
  },
  infoGrid: {
    flexDirection: 'row',
  },
  infoGridItem: {
    flex: 1,
    padding: isSmallScreen ? 12 : 16,
    gap: 4,
  },
  infoGridDivider: {
    width: 1,
    backgroundColor: COLORS.gray100,
  },
  infoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bottomActions: {
    padding: isSmallScreen ? 16 : 24,
    paddingBottom: isSmallScreen ? 20 : 32,
    gap: isSmallScreen ? 12 : 16,
  },
  calibrateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: isSmallScreen ? 50 : 56,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  calibrateButtonActive: {
    opacity: 0.7,
  },
  calibrateButtonText: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  lockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  lockButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray500,
  },
});
