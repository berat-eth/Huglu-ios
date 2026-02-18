import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';
import { checkMaintenanceMode } from '../utils/maintenanceCheck';

export default function MaintenanceScreen({ navigation, route }) {
  const { message, estimatedEndTime } = route.params || {};
  const [checking, setChecking] = useState(false);

  const handleRetry = async () => {
    try {
      setChecking(true);
      
      // Bakım modu kontrolü yap
      const maintenanceStatus = await checkMaintenanceMode('mobile');
      
      if (!maintenanceStatus.isMaintenanceMode) {
        // Bakım modu bitti, ana sayfaya git
        navigation.replace('Main');
      } else {
        // Hala bakım modunda, parametreleri güncelle
        navigation.setParams({
          message: maintenanceStatus.message,
          estimatedEndTime: maintenanceStatus.estimatedEndTime,
        });
      }
    } catch (error) {
      console.error('Retry error:', error);
    } finally {
      setChecking(false);
    }
  };
  const formatEndTime = () => {
    if (!estimatedEndTime) return null;
    
    try {
      const endDate = new Date(estimatedEndTime);
      return endDate.toLocaleString('tr-TR', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return null;
    }
  };

  const formattedEndTime = formatEndTime();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient
        colors={[COLORS.primary, '#0ea61a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Decorative circles */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
        
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="construct-outline" size={80} color={COLORS.white} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Bakım Çalışması</Text>

          {/* Message */}
          <Text style={styles.message}>
            {message || 'Sistemimiz şu anda bakımda. Daha iyi hizmet verebilmek için çalışıyoruz.'}
          </Text>

          {/* Estimated End Time */}
          {formattedEndTime && (
            <View style={styles.timeContainer}>
              <Ionicons name="time-outline" size={20} color={COLORS.white} />
              <Text style={styles.timeText}>
                Tahmini bitiş: {formattedEndTime}
              </Text>
            </View>
          )}

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={24} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Bakım çalışması tamamlandığında uygulamayı tekrar kullanabileceksiniz.
            </Text>
          </View>

          {/* Retry Button */}
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={handleRetry}
            disabled={checking}
          >
            {checking ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={20} color={COLORS.primary} />
                <Text style={styles.retryButtonText}>Tekrar Dene</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Contact Info */}
          <View style={styles.contactContainer}>
            <Text style={styles.contactText}>
              Acil durumlar için:{'\n'}
              <Text style={styles.contactLink}>destek@hugluoutdoor.com</Text>
            </Text>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  gradient: {
    flex: 1,
    overflow: 'hidden',
  },
  decorativeCircle1: {
    position: 'absolute',
    right: -100,
    top: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    left: -80,
    bottom: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 1,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 32,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    width: '100%',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textMain,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.white,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  contactContainer: {
    marginTop: 16,
  },
  contactText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 20,
  },
  contactLink: {
    fontWeight: '700',
    color: COLORS.white,
  },
});
