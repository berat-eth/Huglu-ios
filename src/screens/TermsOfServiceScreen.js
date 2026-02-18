import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

export default function TermsOfServiceScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kullanım Koşulları</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          <Text style={styles.lastUpdated}>Son Güncelleme: 01 Ocak 2026</Text>

          <Text style={styles.sectionTitle}>1. GENEL HÜKÜMLER</Text>
          <Text style={styles.paragraph}>
            Bu Kullanım Koşulları, Huğlu Av Tüfekleri Kooperatifi ("Şirket", "Biz", "Bizim") tarafından işletilen mobil uygulama ve web sitesi ("Platform") kullanımına ilişkin şartları düzenlemektedir. Platform'u kullanarak, bu koşulları kabul etmiş sayılırsınız.
          </Text>

          <Text style={styles.sectionTitle}>2. HİZMETLERİN KULLANIMI</Text>
          <Text style={styles.paragraph}>
            Platform üzerinden outdoor ürünleri, av malzemeleri ve ilgili ürünleri satın alabilir, sipariş verebilir ve çeşitli hizmetlerden yararlanabilirsiniz. Platform'un kullanımı için geçerli yaş sınırı 18'dir.
          </Text>

          <Text style={styles.sectionTitle}>3. KULLANICI HESABI</Text>
          <Text style={styles.paragraph}>
            Platform'u kullanmak için bir hesap oluşturmanız gerekmektedir. Hesap bilgilerinizin doğruluğundan ve güvenliğinden siz sorumlusunuz. Hesabınızın güvenliğini sağlamak için şifrenizi kimseyle paylaşmamalısınız.
          </Text>

          <Text style={styles.sectionTitle}>4. SİPARİŞ VE ÖDEME</Text>
          <Text style={styles.paragraph}>
            Siparişleriniz, ürün stok durumuna ve ödeme onayına bağlı olarak işleme alınır. Ödeme yöntemleri güvenli şekilde işlenir. Fiyatlar, Platform üzerinde gösterildiği şekilde geçerlidir ve değişiklik gösterebilir.
          </Text>

          <Text style={styles.sectionTitle}>5. TESLİMAT VE İADE</Text>
          <Text style={styles.paragraph}>
            Ürünler, belirtilen teslimat süreleri içinde adresinize teslim edilir. İade ve değişim işlemleri, İade Politikası kapsamında gerçekleştirilir. Ürünler orijinal ambalajında ve 14 gün içinde iade edilmelidir.
          </Text>

          <Text style={styles.sectionTitle}>6. FİKRİ MÜLKİYET</Text>
          <Text style={styles.paragraph}>
            Platform'daki tüm içerikler, logolar, markalar ve tasarımlar Şirket'in fikri mülkiyetidir. Bu içeriklerin izinsiz kullanımı yasaktır ve yasal işlem başlatılabilir.
          </Text>

          <Text style={styles.sectionTitle}>7. KULLANICI SORUMLULUKLARI</Text>
          <Text style={styles.paragraph}>
            Platform'u yasalara uygun şekilde kullanmakla yükümlüsünüz. Yasadışı faaliyetlerde bulunmak, zararlı içerik paylaşmak veya sistem güvenliğini tehdit etmek yasaktır.
          </Text>

          <Text style={styles.sectionTitle}>8. HİZMET KESİNTİLERİ</Text>
          <Text style={styles.paragraph}>
            Şirket, teknik bakım, güncelleme veya olağanüstü durumlar nedeniyle Platform hizmetlerini geçici olarak durdurabilir. Bu durumlardan kaynaklanan zararlardan Şirket sorumlu tutulamaz.
          </Text>

          <Text style={styles.sectionTitle}>9. DEĞİŞİKLİKLER</Text>
          <Text style={styles.paragraph}>
            Şirket, bu Kullanım Koşullarını herhangi bir zamanda değiştirme hakkını saklı tutar. Değişiklikler Platform üzerinde yayınlandığında yürürlüğe girer. Değişikliklerden haberdar olmak için düzenli olarak bu sayfayı kontrol etmeniz önerilir.
          </Text>

          <Text style={styles.sectionTitle}>10. UYUŞMAZLIK ÇÖZÜMÜ</Text>
          <Text style={styles.paragraph}>
            Bu Kullanım Koşulları ile ilgili uyuşmazlıklar Türkiye Cumhuriyeti yasalarına tabidir. Uyuşmazlıkların çözümünde Konya Mahkemeleri yetkilidir.
          </Text>

          <Text style={styles.sectionTitle}>11. İLETİŞİM</Text>
          <Text style={styles.paragraph}>
            Kullanım Koşulları ile ilgili sorularınız için bizimle iletişime geçebilirsiniz:{'\n\n'}
            E-posta: info@hugluoutdoor.com{'\n'}
            Telefon: (0332) 516 11 53{'\n'}
            Adres: Özgürlük Caddesi No:40A, 42710 Huğlu, Beyşehir/Konya
          </Text>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Bu belge, Huğlu Av Tüfekleri Kooperatifi tarafından hazırlanmıştır.{'\n'}
              Beyşehir/Konya - Türkiye
            </Text>
          </View>
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
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  content: {
    padding: 20,
  },
  lastUpdated: {
    fontSize: 12,
    color: COLORS.gray500,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    color: COLORS.gray700,
    lineHeight: 24,
    marginBottom: 16,
    textAlign: 'justify',
  },
  footer: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.gray500,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});


