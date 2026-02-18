import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';
import { COLORS } from '../constants/colors';

const TOPICS = [
  {
    id: 1,
    title: 'Sipariş Takibi',
    subtitle: 'Siparişim nerede?',
    icon: 'location-outline',
    color: '#4A90E2',
    bgColor: '#E3F2FD',
  },
  {
    id: 2,
    title: 'Ürün Danışmanı',
    subtitle: 'Ürün önerisi',
    icon: 'help-circle-outline',
    color: '#11d421',
    bgColor: '#E8F5E9',
    selected: true,
  },
  {
    id: 3,
    title: 'İade İşlemleri',
    subtitle: 'Değişim & İade',
    icon: 'return-down-back-outline',
    color: '#F5A623',
    bgColor: '#FFF3E0',
  },
  {
    id: 4,
    title: 'Garanti & Diğer',
    subtitle: 'Genel yardım',
    icon: 'shield-checkmark-outline',
    color: '#9013FE',
    bgColor: '#F3E5F5',
  },
];

export default function LiveChatEntryScreen({ navigation }) {
  const [selectedTopic, setSelectedTopic] = useState(2);
  const [message, setMessage] = useState('');

  const handleConnect = () => {
    const topic = TOPICS.find(t => t.id === selectedTopic);
    navigation.navigate('LiveChat', {
      topic: topic?.title || 'Genel',
      initialMessage: message,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Canlı Destek</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusContent}>
            <View style={styles.statusLeft}>
              <View style={styles.onlineIndicator}>
                <View style={styles.onlinePulse} />
                <View style={styles.onlineDot} />
              </View>
              <View style={styles.statusTextContainer}>
                <Text style={styles.statusTitle}>Çevrimiçiyiz</Text>
                <Text style={styles.statusSubtitle}>
                  Uzman ekibimiz macera için size yardımcı olmaya hazır.
                </Text>
                <View style={styles.waitTimeBadge}>
                  <Ionicons name="time-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.waitTimeText}>BEKLEME SÜRESİ: &lt; 2 DAKİKA</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Topic Selection */}
        <View style={styles.topicSection}>
          <Text style={styles.sectionTitle}>Bir konu seçin</Text>
          <View style={styles.topicGrid}>
            {TOPICS.map((topic) => (
              <TouchableOpacity
                key={topic.id}
                style={[
                  styles.topicCard,
                  selectedTopic === topic.id && styles.topicCardSelected,
                ]}
                onPress={() => setSelectedTopic(topic.id)}
              >
                {selectedTopic === topic.id && (
                  <View style={styles.selectedBadge}>
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                  </View>
                )}
                <View style={[styles.topicIcon, { backgroundColor: topic.bgColor }]}>
                  <Ionicons name={topic.icon} size={48} color={topic.color} />
                </View>
                <View style={styles.topicInfo}>
                  <Text style={styles.topicTitle}>{topic.title}</Text>
                  <Text style={styles.topicSubtitle}>{topic.subtitle}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Optional Message */}
        <View style={styles.messageSection}>
          <Text style={styles.messageLabel}>Kısa açıklama (Opsiyonel)</Text>
          <TextInput
            style={styles.messageInput}
            placeholder="Sorununuz hakkında kısa bir mesaj yazın..."
            placeholderTextColor={COLORS.gray400}
            multiline
            numberOfLines={5}
            value={message}
            onChangeText={setMessage}
            textAlignVertical="top"
          />
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View style={styles.bottomContainer}>
        <Button
          title="Temsilci ile Bağlan"
          onPress={handleConnect}
          icon="chatbubble-ellipses-outline"
          style={styles.connectButton}
        />
        <TouchableOpacity style={styles.faqLink} onPress={() => navigation.navigate('FAQ')}>
          <Ionicons name="help-circle-outline" size={16} color={COLORS.gray500} />
          <Text style={styles.faqText}>Bunun yerine SSS'yi kontrol edin</Text>
        </TouchableOpacity>
      </View>
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
  statusCard: {
    margin: 16,
    padding: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusContent: {
    flexDirection: 'row',
  },
  statusLeft: {
    flex: 1,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  onlinePulse: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    opacity: 0.3,
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  statusTextContainer: {
    marginLeft: 20,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 13,
    color: COLORS.gray500,
    lineHeight: 18,
    marginBottom: 12,
  },
  waitTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 6,
  },
  waitTimeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  topicSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 16,
  },
  topicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  topicCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 3,
    borderColor: '#E0E0E0',
  },
  topicCardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 3,
    backgroundColor: COLORS.white,
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  topicIcon: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  topicInfo: {
    gap: 2,
  },
  topicTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
    lineHeight: 18,
  },
  topicSubtitle: {
    fontSize: 11,
    color: COLORS.gray500,
    lineHeight: 14,
  },
  messageSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  messageLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 8,
  },
  messageInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: 16,
    fontSize: 15,
    color: COLORS.textMain,
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  connectButton: {
    marginBottom: 16,
  },
  faqLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  faqText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray500,
  },
});
