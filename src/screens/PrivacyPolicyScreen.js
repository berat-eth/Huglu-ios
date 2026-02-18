import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

export default function PrivacyPolicyScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gizlilik Politikası</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          <Text style={styles.lastUpdated}>Son Güncelleme: 01 Ocak 2026</Text>

          <Text style={styles.intro}>
            Huğlu Av Tüfekleri Kooperatifi ("Şirket", "Biz", "Bizim") olarak, kişisel verilerinizin korunmasına büyük önem veriyoruz. Bu Gizlilik Politikası, kişisel verilerinizin nasıl toplandığını, kullanıldığını, korunduğunu ve paylaşıldığını açıklamaktadır.
          </Text>

          <Text style={styles.sectionTitle}>1. TOPLANAN BİLGİLER</Text>
          <Text style={styles.subsectionTitle}>1.1. Kişisel Bilgiler</Text>
          <Text style={styles.paragraph}>
            Platform'u kullanırken aşağıdaki kişisel bilgileri toplayabiliriz:{'\n'}
            • Ad, soyad{'\n'}
            • E-posta adresi{'\n'}
            • Telefon numarası{'\n'}
            • Adres bilgileri{'\n'}
            • Doğum tarihi{'\n'}
            • Ödeme bilgileri (güvenli şekilde işlenir){'\n'}
            • Kullanıcı adı ve şifre
          </Text>

          <Text style={styles.subsectionTitle}>1.2. Otomatik Toplanan Bilgiler</Text>
          <Text style={styles.paragraph}>
            Cihaz bilgileri, IP adresi, tarayıcı türü, işletim sistemi, kullanım verileri ve çerezler gibi teknik bilgiler otomatik olarak toplanabilir.
          </Text>

          <Text style={styles.sectionTitle}>2. BİLGİLERİN KULLANIM AMAÇLARI</Text>
          <Text style={styles.paragraph}>
            Toplanan bilgiler aşağıdaki amaçlarla kullanılır:{'\n'}
            • Sipariş işleme ve teslimat{'\n'}
            • Hesap yönetimi ve müşteri hizmetleri{'\n'}
            • Ürün ve hizmet geliştirme{'\n'}
            • Pazarlama ve promosyon faaliyetleri (izin verdiğiniz takdirde){'\n'}
            • Yasal yükümlülüklerin yerine getirilmesi{'\n'}
            • Güvenlik ve dolandırıcılık önleme
          </Text>

          <Text style={styles.sectionTitle}>3. BİLGİLERİN PAYLAŞIMI</Text>
          <Text style={styles.paragraph}>
            Kişisel bilgileriniz aşağıdaki durumlarda üçüncü taraflarla paylaşılabilir:{'\n'}
            • Ödeme işlemleri için ödeme sağlayıcıları{'\n'}
            • Kargo ve lojistik hizmet sağlayıcıları{'\n'}
            • Yasal yükümlülükler gereği yetkili makamlar{'\n'}
            • İş ortakları ve hizmet sağlayıcıları (gizlilik anlaşmaları ile korunur)
          </Text>
          <Text style={styles.paragraph}>
            Kişisel bilgileriniz, yasal zorunluluklar dışında üçüncü taraflara satılmaz veya kiralanmaz.
          </Text>

          <Text style={styles.sectionTitle}>4. VERİ GÜVENLİĞİ</Text>
          <Text style={styles.paragraph}>
            Kişisel verilerinizin güvenliğini sağlamak için endüstri standardı güvenlik önlemleri alıyoruz:{'\n'}
            • SSL/TLS şifreleme{'\n'}
            • Güvenli veri depolama{'\n'}
            • Düzenli güvenlik denetimleri{'\n'}
            • Erişim kontrolü ve yetkilendirme
          </Text>
          <Text style={styles.paragraph}>
            Ancak, internet üzerinden veri aktarımının %100 güvenli olmadığını unutmayın.
          </Text>

          <Text style={styles.sectionTitle}>5. ÇEREZLER VE BENZERİ TEKNOLOJİLER</Text>
          <Text style={styles.paragraph}>
            Platform'da çerezler ve benzeri teknolojiler kullanılmaktadır. Çerezler, kullanıcı deneyimini iyileştirmek, analitik veriler toplamak ve kişiselleştirilmiş içerik sunmak için kullanılır. Tarayıcı ayarlarınızdan çerezleri yönetebilirsiniz.
          </Text>

          <Text style={styles.sectionTitle}>6. KULLANICI HAKLARI (KVKK)</Text>
          <Text style={styles.paragraph}>
            6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında aşağıdaki haklara sahipsiniz:{'\n'}
            • Kişisel verilerinizin işlenip işlenmediğini öğrenme{'\n'}
            • İşlenmişse bilgi talep etme{'\n'}
            • İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme{'\n'}
            • Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme{'\n'}
            • Eksik veya yanlış işlenmişse düzeltilmesini isteme{'\n'}
            • Kanunlarda öngörülen şartlar çerçevesinde silinmesini veya yok edilmesini isteme{'\n'}
            • Düzeltme, silme, yok etme işlemlerinin aktarıldığı üçüncü kişilere bildirilmesini isteme{'\n'}
            • İşlenmesine itiraz etme{'\n'}
            • Zarara uğraması halinde tazminat talep etme
          </Text>

          <Text style={styles.sectionTitle}>7. VERİ SAKLAMA SÜRESİ</Text>
          <Text style={styles.paragraph}>
            Kişisel verileriniz, yasal saklama süreleri ve işleme amaçları gereği gerekli olduğu sürece saklanır. Bu süre sona erdiğinde, verileriniz güvenli bir şekilde silinir veya anonimleştirilir.
          </Text>

          <Text style={styles.sectionTitle}>8. ÇOCUKLARIN GİZLİLİĞİ</Text>
          <Text style={styles.paragraph}>
            Platform, 18 yaş altındaki kişilerden bilerek kişisel bilgi toplamaz. 18 yaş altındaysanız, Platform'u kullanmadan önce ebeveyn veya vasinizin iznini almalısınız.
          </Text>

          <Text style={styles.sectionTitle}>9. ÜÇÜNCÜ TARAF BAĞLANTILARI</Text>
          <Text style={styles.paragraph}>
            Platform'da üçüncü taraf web sitelerine bağlantılar bulunabilir. Bu sitelerin gizlilik uygulamalarından biz sorumlu değiliz. Üçüncü taraf siteleri ziyaret etmeden önce gizlilik politikalarını incelemenizi öneririz.
          </Text>

          <Text style={styles.sectionTitle}>10. POLİTİKA DEĞİŞİKLİKLERİ</Text>
          <Text style={styles.paragraph}>
            Bu Gizlilik Politikası zaman zaman güncellenebilir. Önemli değişiklikler durumunda size bildirim gönderilecektir. Değişikliklerden haberdar olmak için bu sayfayı düzenli olarak kontrol etmeniz önerilir.
          </Text>

          <Text style={styles.sectionTitle}>11. İLETİŞİM VE BAŞVURU</Text>
          <Text style={styles.paragraph}>
            Kişisel verilerinizle ilgili sorularınız, talepleriniz veya şikayetleriniz için bizimle iletişime geçebilirsiniz:{'\n\n'}
            <Text style={styles.bold}>Veri Sorumlusu:</Text> Huğlu Av Tüfekleri Kooperatifi{'\n'}
            <Text style={styles.bold}>E-posta:</Text> info@hugluoutdoor.com{'\n'}
            <Text style={styles.bold}>Telefon:</Text> (0332) 516 11 53{'\n'}
            <Text style={styles.bold}>Adres:</Text> Özgürlük Caddesi No:40A, 42710 Huğlu, Beyşehir/Konya{'\n\n'}
            KVKK kapsamındaki haklarınızı kullanmak için yukarıdaki iletişim bilgilerinden bize ulaşabilirsiniz. Başvurularınız, Kanun'un 13. maddesi uyarınca en geç 30 gün içinde değerlendirilerek sonuçlandırılacaktır.
          </Text>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Bu belge, 6698 sayılı Kişisel Verilerin Korunması Kanunu'na uygun olarak hazırlanmıştır.
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
  intro: {
    fontSize: 15,
    color: COLORS.gray700,
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'justify',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    marginTop: 24,
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
    marginTop: 12,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    color: COLORS.gray700,
    lineHeight: 24,
    marginBottom: 16,
    textAlign: 'justify',
  },
  bold: {
    fontWeight: '700',
    color: COLORS.textMain,
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






















