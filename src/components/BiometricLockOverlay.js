import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { useTranslation } from 'react-i18next';

export default function BiometricLockOverlay({ visible, busy, errorText, onRetry }) {
  const { t } = useTranslation();
  if (!visible) return null;

  return (
    <View style={styles.backdrop} pointerEvents="auto">
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="lock-closed" size={26} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>{t('lock.title')}</Text>
        <Text style={styles.subtitle}>
          {t('lock.subtitle')}
        </Text>

        {!!errorText && <Text style={styles.error}>{errorText}</Text>}

        <TouchableOpacity
          style={[styles.button, busy && styles.buttonDisabled]}
          onPress={onRetry}
          disabled={busy}
          activeOpacity={0.9}
        >
          {busy ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="finger-print" size={18} color={COLORS.white} />
              <Text style={styles.buttonText}>{t('lock.verify')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 9999,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(17, 212, 33, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.gray600,
    marginBottom: 12,
    lineHeight: 18,
  },
  error: {
    fontSize: 12,
    color: COLORS.error,
    marginBottom: 12,
  },
  button: {
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
});

