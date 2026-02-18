import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

/**
 * Modern Custom Alert Component
 * Alert.alert yerine kullanılacak, güncel tasarıma uygun
 * Dark mode desteği ile
 */
export default function CustomAlert({ visible, onClose, title, message, buttons = [] }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible]);

  // Default button if none provided
  const defaultButtons = buttons.length > 0 
    ? buttons 
    : [{ text: 'Tamam', onPress: onClose }];

  // Determine icon and color based on title
  const getAlertType = () => {
    const titleLower = (title || '').toLowerCase();
    if (titleLower.includes('başarılı') || titleLower.includes('tebrikler') || titleLower.includes('success')) {
      return { icon: 'checkmark-circle', color: COLORS.success, bgColor: `${COLORS.success}15` };
    }
    if (titleLower.includes('hata') || titleLower.includes('error')) {
      return { icon: 'close-circle', color: COLORS.error, bgColor: `${COLORS.error}15` };
    }
    if (titleLower.includes('uyarı') || titleLower.includes('warning')) {
      return { icon: 'warning', color: COLORS.warning, bgColor: `${COLORS.warning}15` };
    }
    if (titleLower.includes('giriş') || titleLower.includes('login')) {
      return { icon: 'log-in', color: COLORS.primary, bgColor: `${COLORS.primary}15` };
    }
    return { icon: 'information-circle', color: COLORS.primary, bgColor: `${COLORS.primary}15` };
  };

  const alertType = getAlertType();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View 
        style={[
          styles.overlay,
          { 
            opacity: fadeAnim,
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)'
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
              backgroundColor: isDark ? COLORS.surfaceDark : COLORS.white,
            },
          ]}
        >
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: alertType.bgColor }]}>
            <Ionicons name={alertType.icon} size={48} color={alertType.color} />
          </View>

          {/* Title */}
          {title && (
            <Text style={[styles.title, { color: isDark ? COLORS.white : COLORS.textMain }]}>{title}</Text>
          )}

          {/* Message */}
          {message && (
            <Text style={[styles.message, { color: isDark ? COLORS.gray400 : COLORS.gray700 }]}>{message}</Text>
          )}

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {defaultButtons.map((button, index) => {
              const isPrimary = index === defaultButtons.length - 1;
              const isCancel = button.style === 'cancel' || button.text?.toLowerCase().includes('iptal');
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    isPrimary && !isCancel && styles.primaryButton,
                    isCancel && styles.cancelButton,
                    defaultButtons.length > 1 && styles.multiButton,
                  ]}
                  onPress={() => {
                    if (button.onPress) {
                      button.onPress();
                    }
                    onClose();
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      isPrimary && !isCancel && styles.primaryButtonText,
                      isCancel && [styles.cancelButtonText, { color: isDark ? COLORS.gray400 : COLORS.gray700 }],
                      !isPrimary && !isCancel && { color: isDark ? COLORS.white : COLORS.primary },
                    ]}
                  >
                    {button.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cancelButton: {
    backgroundColor: COLORS.gray100,
  },
  multiButton: {
    flex: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  cancelButtonText: {
    // Color will be set dynamically based on dark mode
  },
});



















