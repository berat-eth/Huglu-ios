import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import BulkOrderUploader from '../components/BulkOrderUploader';

export default function B2BBulkOrderScreen({ navigation }) {
  const handleTemplateDownload = () => {
    Alert.alert('Şablon', 'CSV/Excel şablon indirimi henüz mobilde uygulanmadı.');
  };

  const handleUploadPress = () => {
    Alert.alert('Dosya Yükleme', 'Dosya seçimi için belge seçici entegrasyonu eklenmelidir.');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Toplu Sipariş</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <BulkOrderUploader
          onSelectTemplate={handleTemplateDownload}
          onUploadPress={handleUploadPress}
        />
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Nasıl çalışır?</Text>
          <Text style={styles.infoText}>
            1. Şablonu indirin ve ürün kodu ile miktarları doldurun.
          </Text>
          <Text style={styles.infoText}>
            2. Doldurduğunuz dosyayı buradan yükleyin.
          </Text>
          <Text style={styles.infoText}>
            3. Sistem siparişi doğrulayacak ve sepetinize ekleyecektir.
          </Text>
        </View>
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
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.gray50,
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
    marginBottom: 2,
  },
});

