import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { secureStorage } from '../utils/secureStorage';
import { COLORS } from '../constants/colors';
import { liveSupportAPI } from '../services/api';
import { useAlert } from '../hooks/useAlert';

export default function ChatHistoryScreen({ navigation }) {
  const alert = useAlert();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    loadUserId();
  }, []);

  useEffect(() => {
    if (userId) {
      loadChatHistory();
    }
  }, [userId]);

  const loadUserId = async () => {
    try {
      const storedUserId = await secureStorage.getItem('userId');
      if (storedUserId) {
        setUserId(parseInt(storedUserId));
      } else {
        // Varsayılan olarak 1 kullan (misafir kullanıcı için)
        setUserId(1);
      }
    } catch (error) {
      console.error('User ID yükleme hatası:', error);
      setUserId(1);
    }
  };

  const loadChatHistory = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const response = await liveSupportAPI.getConversations(userId);
      
      if (response && response.success && response.data) {
        // Backend'den gelen verileri formatla
        const formattedChats = response.data.map((conv, index) => {
          // İkon ve renk belirleme
          let icon = 'chatbubble-outline';
          let iconBg = 'rgba(17, 212, 33, 0.1)';
          let iconColor = COLORS.primary;

          if (conv.productId) {
            icon = 'cube-outline';
            iconBg = 'rgba(255, 149, 0, 0.1)';
            iconColor = '#FF9500';
          } else if (conv.isResolved) {
            icon = 'checkmark-circle-outline';
            iconBg = COLORS.gray100;
            iconColor = COLORS.gray600;
          } else if (conv.isActive) {
            icon = 'chatbubble-ellipses-outline';
            iconBg = 'rgba(17, 212, 33, 0.1)';
            iconColor = COLORS.primary;
          }

          return {
            id: conv.conversationId || `conv_${index}`,
            conversationId: conv.conversationId,
            title: conv.title || 'Destek Talebi',
            lastMessage: conv.lastMessage || 'Mesaj yok',
            timestamp: conv.timestamp || 'Bilinmiyor',
            fullTimestamp: conv.fullTimestamp,
            icon: icon,
            iconBg: iconBg,
            iconColor: iconColor,
            isActive: conv.isActive || false,
            isResolved: conv.isResolved || false,
            unreadCount: conv.unreadCount || 0,
            messageCount: conv.messageCount || 0,
            productId: conv.productId,
            productName: conv.productName,
            productPrice: conv.productPrice,
            productImage: conv.productImage,
          };
        });

        setChats(formattedChats);
      } else {
        setChats([]);
      }
    } catch (error) {
      console.error('Destek talepleri yükleme hatası:', error);
      alert.show('Hata', 'Destek talepleri yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChatPress = (chat) => {
    // Konuşma tarihini al ve LiveChatScreen'e gönder
    const conversationDate = chat.fullTimestamp ? new Date(chat.fullTimestamp).toISOString().split('T')[0] : null;
    navigation.navigate('LiveChat', { 
      conversationDate: conversationDate,
      conversationId: chat.conversationId,
      chatTitle: chat.title 
    });
  };

  const handleNewChat = () => {
    navigation.navigate('LiveChatEntry');
  };

  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const recentChats = filteredChats.filter(chat => !chat.isResolved);
  const previousChats = filteredChats.filter(chat => chat.isResolved);

  const renderChatItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.chatItem,
        item.isActive && styles.chatItemActive,
      ]}
      onPress={() => handleChatPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.chatIconContainer}>
        <View style={[styles.chatIcon, { backgroundColor: item.iconBg }]}>
          <Ionicons name={item.icon} size={24} color={item.iconColor} />
        </View>
        {item.isActive && <View style={styles.activeIndicator} />}
      </View>

      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[
            styles.chatTimestamp,
            item.isActive && styles.chatTimestampActive
          ]}>
            {item.timestamp}
          </Text>
        </View>
        <Text style={styles.chatMessage} numberOfLines={1}>
          {item.lastMessage}
        </Text>
        {item.productName && (
          <View style={styles.productInfo}>
            <Ionicons name="cube-outline" size={12} color={COLORS.gray500} />
            <Text style={styles.productText} numberOfLines={1}>
              {item.productName}
            </Text>
          </View>
        )}
        {item.messageCount > 0 && (
          <Text style={styles.messageCountText}>
            {item.messageCount} mesaj
          </Text>
        )}
      </View>

      {item.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{item.unreadCount}</Text>
        </View>
      )}

      {item.isResolved && (
        <View style={styles.resolvedIcon}>
          <Ionicons name="checkmark" size={16} color={COLORS.gray400} />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderSectionHeader = (title, showClear = false) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {showClear && (
        <TouchableOpacity>
          <Text style={styles.clearButton}>Temizle</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Geçmiş Destek Taleplerim</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Geçmiş Destek Taleplerim</Text>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={COLORS.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Konuşmalarda ara..."
            placeholderTextColor={COLORS.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Chat List */}
      <FlatList
        data={[]}
        keyExtractor={(item) => item.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {recentChats.length > 0 && (
              <>
                {renderSectionHeader('AKTİF TALEPLER', true)}
                {recentChats.map(chat => (
                  <View key={chat.id}>
                    {renderChatItem({ item: chat })}
                  </View>
                ))}
              </>
            )}
            {previousChats.length > 0 && (
              <>
                {renderSectionHeader('GEÇMİŞ TALEPLER')}
                {previousChats.map(chat => (
                  <View key={chat.id}>
                    {renderChatItem({ item: chat })}
                  </View>
                ))}
              </>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="chatbubbles-outline" size={64} color={COLORS.gray300} />
            </View>
            <Text style={styles.emptyTitle}>Henüz destek talebi yok</Text>
            <Text style={styles.emptySubtitle}>
              Destek ekibimizle iletişime geçmek için yeni bir talep oluşturun
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={handleNewChat}
            >
              <Text style={styles.emptyButtonText}>Yeni Talep Oluştur</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleNewChat}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={24} color={COLORS.white} />
        <Text style={styles.fabText}>Yeni Talep</Text>
      </TouchableOpacity>
      <alert.AlertComponent />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
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
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 8,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textMain,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gray500,
    letterSpacing: 0.5,
  },
  clearButton: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chatItemActive: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  chatIconContainer: {
    position: 'relative',
  },
  chatIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  chatContent: {
    flex: 1,
    gap: 4,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginRight: 8,
  },
  chatTimestamp: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.gray400,
  },
  chatTimestampActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  chatMessage: {
    fontSize: 14,
    color: COLORS.gray600,
    lineHeight: 20,
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  productText: {
    fontSize: 12,
    color: COLORS.gray500,
    flex: 1,
  },
  messageCountText: {
    fontSize: 11,
    color: COLORS.gray400,
    marginTop: 2,
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  resolvedIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.gray500,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 28,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});
