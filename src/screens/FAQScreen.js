import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';
import { COLORS } from '../constants/colors';

const CATEGORIES = [
  { id: 'popular', label: 'Popüler', icon: 'star' },
  { id: 'shipping', label: 'Kargo', icon: 'cube-outline' },
  { id: 'orders', label: 'Siparişler', icon: 'receipt-outline' },
];

const FAQ_DATA = [
  {
    id: 1,
    category: 'popular',
    question: 'Outdoor ürünlerde iade politikanız nedir?',
    answer: 'Satın aldığınız outdoor ürünleri, orijinal ambalajı bozulmamış ve etiketleri sökülmemiş olmak kaydıyla 14 gün içinde iade edebilirsiniz. Ürünleri iade etmeden önce iç mekanda denemenizi öneririz!',
  },
  {
    id: 2,
    category: 'popular',
    question: 'Ücretsiz kargo sunuyor musunuz?',
    answer: '500 TL ve üzeri tüm siparişlerde ücretsiz kargo hizmetimiz bulunmaktadır. 500 TL altı siparişlerde kargo ücreti 29.90 TL\'dir.',
  },
  {
    id: 3,
    category: 'popular',
    question: 'Siparişimi nasıl takip edebilirim?',
    answer: 'Siparişinizi "Profil > Siparişlerim" bölümünden takip edebilirsiniz. Ayrıca kargo çıkışı yapıldığında size SMS ve e-posta ile takip numarası gönderilecektir.',
  },
  {
    id: 4,
    category: 'popular',
    question: 'Çadırlarınız su geçirmez mi?',
    answer: 'Tüm çadırlarımız su geçirmez özelliğe sahiptir. Ürün açıklamalarında su geçirmezlik derecesi (mm) belirtilmiştir. 3000mm ve üzeri değerler yoğun yağışlara karşı dayanıklıdır.',
  },
  {
    id: 5,
    category: 'popular',
    question: 'Kargo adresimi değiştirebilir miyim?',
    answer: 'Siparişiniz kargoya verilmeden önce "Siparişlerim" bölümünden adres değişikliği yapabilirsiniz. Kargo çıkışı yapıldıktan sonra adres değişikliği mümkün değildir.',
  },
  {
    id: 6,
    category: 'shipping',
    question: 'Kargo ne kadar sürede teslim edilir?',
    answer: 'Siparişiniz onaylandıktan sonra 1-2 iş günü içinde kargoya verilir. Teslimat süresi bölgenize göre 2-5 iş günü arasında değişmektedir.',
  },
  {
    id: 7,
    category: 'shipping',
    question: 'Hangi kargo firmasıyla çalışıyorsunuz?',
    answer: 'Aras Kargo, Yurtiçi Kargo ve MNG Kargo ile çalışmaktayız. Kargo firması siparişinizin ağırlığına ve bölgenize göre otomatik olarak belirlenir.',
  },
  {
    id: 8,
    category: 'shipping',
    question: 'Yurtdışına kargo gönderiyor musunuz?',
    answer: 'Şu anda sadece Türkiye içi teslimat yapmaktayız. Yakın zamanda yurtdışı kargo hizmetimizi başlatmayı planlıyoruz.',
  },
  {
    id: 9,
    category: 'orders',
    question: 'Siparişimi iptal edebilir miyim?',
    answer: 'Siparişiniz kargoya verilmeden önce "Siparişlerim" bölümünden iptal edebilirsiniz. Ödemeniz 3-5 iş günü içinde iade edilecektir.',
  },
  {
    id: 10,
    category: 'orders',
    question: 'Hangi ödeme yöntemlerini kabul ediyorsunuz?',
    answer: 'Kredi kartı, banka kartı, havale/EFT ve kapıda ödeme seçeneklerimiz bulunmaktadır. Taksit imkanları için ödeme sayfasını kontrol edebilirsiniz.',
  },
  {
    id: 11,
    category: 'orders',
    question: 'Fatura nasıl alırım?',
    answer: 'E-faturanız siparişiniz tamamlandıktan sonra e-posta adresinize gönderilir. Ayrıca "Siparişlerim" bölümünden faturanızı indirebilirsiniz.',
  },
];

export default function FAQScreen({ navigation }) {
  const [selectedCategory, setSelectedCategory] = useState('popular');
  const [expandedId, setExpandedId] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFAQs = FAQ_DATA.filter(
    (faq) =>
      faq.category === selectedCategory &&
      (searchQuery === '' ||
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yardım Merkezi</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Size nasıl{'\n'}yardımcı olabiliriz?</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={COLORS.gray400} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cevap ara..."
            placeholderTextColor={COLORS.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Category Tabs */}
        <View style={styles.categoryContainer}>
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryTab,
                selectedCategory === category.id && styles.categoryTabActive,
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Ionicons
                name={category.icon}
                size={18}
                color={selectedCategory === category.id ? COLORS.white : COLORS.textMain}
              />
              <Text
                style={[
                  styles.categoryLabel,
                  selectedCategory === category.id && styles.categoryLabelActive,
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* FAQ List */}
        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>ÖNE ÇIKAN SORULAR</Text>
          {filteredFAQs.map((faq) => (
            <TouchableOpacity
              key={faq.id}
              style={[
                styles.faqCard,
                expandedId === faq.id && styles.faqCardExpanded,
              ]}
              onPress={() => toggleExpand(faq.id)}
              activeOpacity={0.7}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Ionicons
                  name={expandedId === faq.id ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={expandedId === faq.id ? COLORS.primary : COLORS.gray400}
                />
              </View>
              {expandedId === faq.id && (
                <View style={styles.faqAnswerContainer}>
                  <Text style={styles.faqAnswer}>{faq.answer}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Support Card */}
        <View style={styles.supportCard}>
          <View style={styles.supportIconContainer}>
            <Ionicons name="chatbubble-ellipses" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.supportTitle}>Hala yardıma mı ihtiyacınız var?</Text>
          <Text style={styles.supportSubtitle}>
            Outdoor uzmanlarımız size yardımcı olmak için 7/24 hazır.
          </Text>
          <Button
            title="Destek ile Sohbet Et"
            onPress={() => navigation.navigate('LiveChatEntry')}
            icon="chatbubble-outline"
            style={styles.supportButton}
          />
        </View>

        <View style={{ height: 40 }} />
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
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
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
  content: {
    flex: 1,
  },
  titleSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textMain,
    lineHeight: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textMain,
  },
  categoryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 8,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryTabActive: {
    backgroundColor: COLORS.primary,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  categoryLabelActive: {
    color: COLORS.white,
  },
  faqSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gray500,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  faqCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  faqCardExpanded: {
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMain,
    lineHeight: 20,
  },
  faqAnswerContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  faqAnswer: {
    fontSize: 14,
    color: COLORS.gray600,
    lineHeight: 20,
  },
  supportCard: {
    marginHorizontal: 16,
    marginTop: 24,
    padding: 24,
    backgroundColor: 'rgba(17, 212, 33, 0.05)',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(17, 212, 33, 0.2)',
  },
  supportIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  supportTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 8,
    textAlign: 'center',
  },
  supportSubtitle: {
    fontSize: 14,
    color: COLORS.gray600,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  supportButton: {
    width: '100%',
  },
});
