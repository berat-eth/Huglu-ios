import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

/**
 * NOT: React Native'de CSV/Excel dosyası seçimi için ayrıca
 * document picker entegrasyonu gerekir. Bu bileşen yalnızca
 * UI ve callback iskeletini sağlar.
 */
export default function BulkOrderUploader({ onSelectTemplate, onUploadPress }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Toplu Sipariş Yükleme</Text>
      <Text style={styles.subtitle}>
        CSV/Excel şablonunu indirip ürünleri doldurduktan sonra yükleyebilirsiniz.
      </Text>

      <TouchableOpacity style={styles.buttonSecondary} onPress={onSelectTemplate}>
        <Ionicons name="download-outline" size={18} color={COLORS.primary} />
        <Text style={styles.buttonSecondaryText}>Şablonu İndir</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.buttonPrimary} onPress={onUploadPress}>
        <Ionicons name="cloud-upload-outline" size={18} color={COLORS.white} />
        <Text style={styles.buttonPrimaryText}>Dosya Yükle</Text>
      </TouchableOpacity>

      <Text style={styles.helperText}>Desteklenen formatlar: .csv, .xlsx</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.gray600,
    marginBottom: 12,
  },
  buttonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 10,
    marginBottom: 8,
    gap: 6,
  },
  buttonSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  buttonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    gap: 6,
  },
  buttonPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  helperText: {
    fontSize: 11,
    color: COLORS.gray600,
    marginTop: 8,
    textAlign: 'center',
  },
});

