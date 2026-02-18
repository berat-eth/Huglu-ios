import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated, Dimensions } from 'react-native';
import { COLORS } from '../constants/colors';
import { productsAPI, slidersAPI, storiesAPI, flashDealsAPI } from '../services/api';
import { isServerError } from '../utils/errorHandler';
import { checkMaintenanceMode } from '../utils/maintenanceCheck';
import safeLog from '../utils/safeLogger';
import { enforceDeviceSecurity } from '../utils/deviceSecurity';
import { secureStorage } from '../utils/secureStorage';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const [loadingText, setLoadingText] = useState('Yükleniyor...');
  const [progress, setProgress] = useState(0);
  const progressAnim = useState(new Animated.Value(0))[0];
  const fadeAnim = useState(new Animated.Value(0))[0];

  // Glitch effect animations
  const glitchAnim1 = useRef(new Animated.Value(0)).current;
  const glitchAnim2 = useRef(new Animated.Value(0)).current;
  const glitchOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const sloganAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in animasyonu
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Logo scale animasyonu
    Animated.spring(logoScale, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Slogan animasyonu
    Animated.timing(sloganAnim, {
      toValue: 1,
      duration: 1000,
      delay: 400,
      useNativeDriver: true,
    }).start();

    // Glitch effect loop
    const glitchLoop = () => {
      Animated.sequence([
        Animated.delay(Math.random() * 2000 + 1500),
        Animated.parallel([
          Animated.sequence([
            Animated.timing(glitchOpacity, {
              toValue: 0.7,
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.timing(glitchAnim1, {
              toValue: Math.random() * 20 - 10,
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.timing(glitchAnim2, {
              toValue: Math.random() * -20 + 10,
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.delay(100),
            Animated.timing(glitchAnim1, {
              toValue: Math.random() * -15 + 7,
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.timing(glitchAnim2, {
              toValue: Math.random() * 15 - 7,
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.delay(50),
            Animated.timing(glitchOpacity, {
              toValue: 0,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(glitchAnim1, {
              toValue: 0,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(glitchAnim2, {
              toValue: 0,
              duration: 100,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start(() => glitchLoop());
    };

    glitchLoop();
    initializeApp();
  }, []);

  useEffect(() => {
    // Progress bar animasyonu
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const initializeApp = async () => {
    try {
      // 0. GÜVENLİK: Cihaz güvenlik kontrolü
      setLoadingText('Güvenlik kontrol ediliyor...');
      try {
        const deviceSecurity = await enforceDeviceSecurity();
        if (deviceSecurity.shouldRestrict) {
          safeLog.warn('⚠️ Device security warning:', deviceSecurity.issues);
          // Production'da uygulamayı kısıtlayabilir veya kapatabilirsiniz
          // Şimdilik sadece logluyoruz
        }
      } catch (securityError) {
        safeLog.error('Device security check error:', securityError);
        // Güvenlik kontrolü başarısız olsa bile uygulamaya devam et
      }

      // 1. Bakım modu kontrolü
      setLoadingText('Sistem kontrol ediliyor...');
      const maintenanceStatus = await checkMaintenanceMode('mobile');

      if (maintenanceStatus.isMaintenanceMode) {
        navigation.replace('Maintenance', {
          message: maintenanceStatus.message,
          estimatedEndTime: maintenanceStatus.estimatedEndTime,
        });
        return;
      }

      // 2. Best-effort legacy storage -> SecureStore migrasyonu (onboarding kontrolünden önce)
      try {
        await secureStorage.migrateFromAsyncStorage();
      } catch (migrationError) {
        safeLog.warn('Migration warning:', migrationError?.message || migrationError);
      }

      // 2.5. B2B modunun varsayılan değerini ayarla (ilk kurulumda)
      try {
        const existingB2BMode = await secureStorage.getItem('isB2BMode');
        if (existingB2BMode === null) {
          // İlk kurulumda B2C modunu aktif yap (varsayılan)
          await secureStorage.setItem('isB2BMode', 'false');
          safeLog.debug('B2B mode set to default: false (B2C mode)');
        }
      } catch (b2bError) {
        safeLog.warn('B2B mode initialization error:', b2bError);
      }

      // 3. Onboarding kontrolü
      const hasSeenOnboarding = await secureStorage.getItem('hasSeenOnboarding');
      if (!hasSeenOnboarding) {
        navigation.replace('Onboarding');
        return;
      }

      // 4. Verileri önceden yükle (opsiyonel)
      await preloadHomeData();

      // 5. Her zaman ana sayfaya yönlendir (login kontrolü yapma)
      // Kullanıcı isterse profil sayfasından login yapabilir
      navigation.replace('Main');
    } catch (error) {
      safeLog.error('App initialization error:', error);

      // Sunucu hatası kontrolü
      if (isServerError(error)) {
        setLoadingText('Sunucuya bağlanılamıyor...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Hata olsa bile onboarding kontrolü yap
      try {
        const hasSeenOnboarding = await secureStorage.getItem('hasSeenOnboarding');
        if (!hasSeenOnboarding) {
          navigation.replace('Onboarding');
          return;
        }
      } catch (storageError) {
        safeLog.error('Storage error:', storageError);
      }

      // Hata olsa bile ana sayfaya git
      navigation.replace('Main');
    }
  };

  const preloadHomeData = async () => {
    try {
      safeLog.debug('Preloading home data...');
      const totalSteps = 4;
      let completedSteps = 0;

      const updateProgress = () => {
        completedSteps++;
        setProgress((completedSteps / totalSteps) * 100);
      };

      // 1. Ürünleri yükle
      setLoadingText('Ürünler yükleniyor...');
      try {
        await productsAPI.getAll({ limit: 100 });
        updateProgress();
      } catch (error) {
        updateProgress();
      }

      // 2. Slider'ları yükle
      setLoadingText('Banner\'lar yükleniyor...');
      try {
        await slidersAPI.getActive();
        updateProgress();
        safeLog.debug('Sliders preloaded');
      } catch (error) {
        safeLog.warn('Sliders preload failed:', error.message);
        updateProgress();
      }

      // 3. Hikayeleri yükle
      setLoadingText('Hikayeler yükleniyor...');
      try {
        await storiesAPI.getActive();
        updateProgress();
        safeLog.debug('Stories preloaded');
      } catch (error) {
        safeLog.warn('Stories preload failed:', error.message);
        updateProgress();
      }

      // 4. Flash deals yükle
      setLoadingText('Kampanyalar yükleniyor...');
      try {
        await flashDealsAPI.getActive();
        updateProgress();
        safeLog.debug('Flash deals preloaded');
      } catch (error) {
        safeLog.warn('Flash deals preload failed:', error.message);
        updateProgress();
      }

      setLoadingText('Hazırlanıyor...');
      await new Promise(resolve => setTimeout(resolve, 300));

      safeLog.debug('All data preloaded successfully');
    } catch (error) {
      safeLog.error('Preload error:', error);
      // Hata olsa bile devam et
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const sloganTranslateY = sloganAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  return (
    <View style={styles.container}>
      {/* Background Image */}
      <Image 
        source={require('../../assets/splash.png')} 
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      {/* Content */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Logo with Glitch Effect */}
        <View style={styles.logoContainer}>
          {/* Glitch Layer 1 - Red Channel */}
          <Animated.View
            style={[
              styles.glitchLayerWrapper,
              {
                transform: [
                  { scale: logoScale },
                  { translateX: glitchAnim1 },
                  { translateY: Animated.multiply(glitchAnim1, 0.5) }
                ],
                opacity: glitchOpacity,
              }
            ]}
          >
            <Image
              source={require('../../assets/spalsh logo.png')}
              style={[styles.logo, { opacity: 0.8 }]}
              resizeMode="contain"
            />
            <View style={[styles.colorOverlay, { backgroundColor: '#FF0000' }]} />
          </Animated.View>

          {/* Glitch Layer 2 - Cyan Channel */}
          <Animated.View
            style={[
              styles.glitchLayerWrapper,
              {
                transform: [
                  { scale: logoScale },
                  { translateX: glitchAnim2 },
                  { translateY: Animated.multiply(glitchAnim2, -0.3) }
                ],
                opacity: glitchOpacity,
              }
            ]}
          >
            <Image
              source={require('../../assets/spalsh logo.png')}
              style={[styles.logo, { opacity: 0.8 }]}
              resizeMode="contain"
            />
            <View style={[styles.colorOverlay, { backgroundColor: '#00FFFF' }]} />
          </Animated.View>

          {/* Main Logo */}
          <Animated.View
            style={{
              transform: [{ scale: logoScale }]
            }}
          >
            <Image
              source={require('../../assets/spalsh logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* Brand Text */}
        <Animated.View
          style={[
            styles.brandTextContainer,
            {
              opacity: sloganAnim,
              transform: [{ translateY: sloganTranslateY }]
            }
          ]}
        >
          <Text style={styles.brandText}>
            Huğlu Outdoor, bir Huğlu Av tüfekleri Kooperatifi markasıdır.
          </Text>
        </Animated.View>

        {/* Loading Indicator */}
        <View style={styles.loadingContainer}>
          <View style={styles.progressBarContainer}>
            <Animated.View
              style={[
                styles.progressBar,
                { width: progressWidth }
              ]}
            />
          </View>
          <Text style={styles.loadingText}>{loadingText}</Text>
        </View>
      </Animated.View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.versionText}>v1.0.0 (Beta)</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },

  // Background Image
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
  },

  // Content
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 10,
  },

  // Logo Container
  logoContainer: {
    position: 'relative',
    width: 240,
    height: 240,
    marginBottom: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Logo
  logo: {
    width: 240,
    height: 240,
  },

  // Glitch Layers
  glitchLayer: {
    position: 'absolute',
    mixBlendMode: 'multiply',
  },

  // Glitch Layer Wrapper
  glitchLayerWrapper: {
    position: 'absolute',
    width: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Color Overlay for Glitch Effect
  colorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
    mixBlendMode: 'multiply',
  },

  // Brand Text Container
  brandTextContainer: {
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  brandText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Brand Typography
  brandContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  subtitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#2E7D32',
    letterSpacing: 8,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(76, 175, 80, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
    marginBottom: 4,
  },
  subtitleSecondary: {
    fontSize: 16,
    fontWeight: '300',
    fontStyle: 'italic',
    color: '#66BB6A',
    letterSpacing: 4,
    textTransform: 'lowercase',
  },

  // Loading
  loadingContainer: {
    width: '100%',
    maxWidth: 200,
    alignItems: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#388E3C',
    fontWeight: '500',
    letterSpacing: 1,
    opacity: 0.8,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  versionText: {
    fontSize: 10,
    color: '#81C784',
    fontWeight: '500',
    letterSpacing: 3,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
});
