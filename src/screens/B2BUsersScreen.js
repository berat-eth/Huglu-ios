import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

/**
 * NOT: Backend tarafında /api/b2b/users endpoint'leri henüz tanımlı değil.
 * Bu ekran, gelecekteki çoklu kullanıcı yönetimi için temel UI iskeletini sağlar.
 */
export default function B2BUsersScreen({ navigation }) {
  const handleAddUser = () => {
    Alert.alert('B2B Kullanıcı', 'Kullanıcı ekleme fonksiyonu henüz uygulanmadı.');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>B2B Kullanıcıları</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Çoklu Kullanıcı Yönetimi</Text>
          <Text style={styles.infoText}>
            Şirket hesabınız altında birden fazla kullanıcı tanımlayarak sipariş, fatura ve raporlara
            erişim yetkilerini yönetebilirsiniz.
          </Text>
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={handleAddUser}>
          <Ionicons name="person-add-outline" size={18} color={COLORS.white} />
          <Text style={styles.primaryButtonText}>Yeni Kullanıcı Ekle</Text>
        </TouchableOpacity>
        <Text style={styles.helperText}>
          Not: Bu özellik için API entegrasyonu tamamlandığında kullanıcılar burada listelenecektir.
        </Text>
      </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
    backgroundColor: COLORS.backgroundLight,
  },
  backButton: {
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
  headerSpacer: {
    width: 40,
  },
  content: {
    padding: 16,
  },
  infoBox: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.gray50,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.gray600,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    gap: 6,
    marginBottom: 8,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.gray600,
    marginTop: 4,
  },
});

