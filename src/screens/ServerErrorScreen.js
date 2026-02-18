import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

// WhatsApp support number (Turkish format without leading 0)
const WHATSAPP_SUPPORT_NUMBER = '905303125813';

const ServerErrorScreen = ({ onRetry, onClose, onContactSupport }) => {
  
  const handleContactSupport = () => {
    const message = encodeURIComponent('Merhaba, uygulamada bağlantı sorunu yaşıyorum. Yardımcı olabilir misiniz?');
    const whatsappUrl = `whatsapp://send?phone=${WHATSAPP_SUPPORT_NUMBER}&text=${message}`;
    
    Linking.canOpenURL(whatsappUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(whatsappUrl);
        } else {
          // Fallback: Open WhatsApp web
          const webUrl = `https://wa.me/${WHATSAPP_SUPPORT_NUMBER}?text=${message}`;
          return Linking.openURL(webUrl);
        }
      })
      .catch((err) => {
        console.error('WhatsApp açılamadı:', err);
        // If onContactSupport prop is provided, use it as fallback
        if (onContactSupport) {
          onContactSupport();
        }
      });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      {/* Header - Kapatma butonu kaldırıldı */}

      {/* Content */}
      <View style={styles.content}>
        {/* Error Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="cloud-offline-outline" size={120} color={COLORS.primary} />
        </View>

        {/* Error Message */}
        <View style={styles.messageContainer}>
          <Text style={styles.title}>Bağlantı Hatası</Text>
          <Text style={styles.description}>
            Sunucularımıza şu anda bağlanamıyoruz. Lütfen internet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {/* Retry Button */}
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={onRetry}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color="#0e1b13" />
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>

          {/* WhatsApp Support Button */}
          <TouchableOpacity 
            style={styles.supportButton}
            onPress={handleContactSupport}
            activeOpacity={0.7}
          >
            <View style={styles.supportButtonContent}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              <Text style={styles.supportButtonText}>WhatsApp ile Destek Alın</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: -40,
  },
  iconContainer: {
    marginBottom: 32,
    opacity: 0.9,
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  actionsContainer: {
    width: '100%',
    gap: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    color: '#0e1b13',
    fontSize: 16,
    fontWeight: 'bold',
  },
  supportButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#25D366',
  },
  supportButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  supportButtonText: {
    color: '#25D366',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default ServerErrorScreen;
