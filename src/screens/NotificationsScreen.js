import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { secureStorage } from '../utils/secureStorage';
import { COLORS } from '../constants/colors';
import { notificationsAPI } from '../services/api';
import { useAlert } from '../hooks/useAlert';

// Bildirim tipine göre ikon ve renk belirleme
const getNotificationStyle = (type) => {
  switch (type) {
    case 'order':
      return { icon: 'cube', iconBg: COLORS.primary };
    case 'promotion':
    case 'discount':
      return { icon: 'pricetag', iconBg: '#FF6B6B' };
    case 'wishlist':
    case 'favorite':
      return { icon: 'heart', iconBg: '#FF6B6B' };
    case 'delivery':
    case 'shipped':
      return { icon: 'car', iconBg: COLORS.primary };
    case 'success':
    case 'delivered':
      return { icon: 'checkmark-circle', iconBg: '#10b981' };
    case 'info':
    case 'system':
      return { icon: 'information-circle', iconBg: '#4A90E2' };
    case 'warning':
      return { icon: 'warning', iconBg: '#F59E0B' };
    default:
      return { icon: 'notifications', iconBg: COLORS.primary };
  }
};

// Zaman farkını hesaplama
const getTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Az önce';
  if (diffMins < 60) return `${diffMins} dakika önce`;
  if (diffHours < 24) return `${diffHours} saat önce`;
  if (diffDays === 1) return 'Dün';
  if (diffDays < 7) return `${diffDays} gün önce`;
  return date.toLocaleDateString('tr-TR');
};

export default function NotificationsScreen({ navigation }) {
  const alert = useAlert();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState('');
  
  const unreadCount = notifications.filter(n => !n.isRead && !n.read).length;

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const storedUserId = await secureStorage.getItem('userId');
      
      if (!storedUserId) {
        alert.show('Hata', 'Lütfen giriş yapın');
        navigation.navigate('Login');
        return;
      }

      setUserId(storedUserId);

      console.log('🔔 Bildirimler yükleniyor... userId:', storedUserId);
      const response = await notificationsAPI.getAll(storedUserId);
      
      console.log('📦 Bildirimler yanıtı:', JSON.stringify(response.data, null, 2));

      if (response.data?.success) {
        const notificationsData = response.data.notifications || response.data.data || [];
        setNotifications(Array.isArray(notificationsData) ? notificationsData : []);
        console.log('✅ Bildirimler yüklendi:', notificationsData.length, 'adet');
      } else {
        console.warn('⚠️ Bildirimler API başarısız yanıt döndü');
        setNotifications([]);
      }
    } catch (error) {
      console.error('❌ Bildirimler yüklenirken hata:', {
        message: error.message,
        response: error.response?.data,
      });
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const markAsRead = async (notificationId) => {
    try {
      console.log('📖 Bildirim okundu işaretleniyor:', notificationId);
      const response = await notificationsAPI.markAsRead(notificationId);
      
      if (response.data?.success) {
        // Local state'i güncelle
        setNotifications(notifications.map(n => 
          n.id === notificationId ? { ...n, isRead: true, read: true } : n
        ));
        console.log('✅ Bildirim okundu işaretlendi');
      }
    } catch (error) {
      console.error('❌ Bildirim okundu işaretlenemedi:', error.message);
    }
  };

  const markAllAsRead = async () => {
    try {
      console.log('📖 Tüm bildirimler okundu işaretleniyor...');
      const response = await notificationsAPI.markAllAsRead(userId);
      
      if (response.data?.success) {
        // Local state'i güncelle
        setNotifications(notifications.map(n => ({ ...n, isRead: true, read: true })));
        console.log('✅ Tüm bildirimler okundu işaretlendi');
      }
    } catch (error) {
      console.error('❌ Tüm bildirimler okundu işaretlenemedi:', error.message);
      alert.show('Hata', 'Bildirimler okundu işaretlenemedi');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bildirimler</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Bugün ve daha önce için bildirimleri ayır
  const todayNotifications = notifications.filter(n => {
    const timeAgo = getTimeAgo(n.createdAt || n.date || new Date());
    return timeAgo.includes('saat') || timeAgo.includes('dakika') || timeAgo === 'Az önce';
  });

  const earlierNotifications = notifications.filter(n => {
    const timeAgo = getTimeAgo(n.createdAt || n.date || new Date());
    return !timeAgo.includes('saat') && !timeAgo.includes('dakika') && timeAgo !== 'Az önce';
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Bildirimler</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllButton}>Tümünü Okundu İşaretle</Text>
          </TouchableOpacity>
        )}
        {unreadCount === 0 && <View style={{ width: 40 }} />}
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {notifications.length > 0 ? (
          <>
            {/* Today Section */}
            {todayNotifications.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Bugün</Text>
                {todayNotifications.map((notification) => {
                  const style = getNotificationStyle(notification.type);
                  const isUnread = !notification.isRead && !notification.read;
                  
                  return (
                    <TouchableOpacity
                      key={notification.id}
                      style={[
                        styles.notificationCard,
                        isUnread && styles.notificationCardUnread,
                      ]}
                      onPress={() => markAsRead(notification.id)}
                    >
                      <View style={[styles.iconContainer, { backgroundColor: `${style.iconBg}20` }]}>
                        <Ionicons name={style.icon} size={24} color={style.iconBg} />
                      </View>
                      <View style={styles.notificationContent}>
                        <Text style={styles.notificationTitle}>{notification.title}</Text>
                        <Text style={styles.notificationMessage}>{notification.message || notification.body}</Text>
                        <Text style={styles.notificationTime}>
                          {getTimeAgo(notification.createdAt || notification.date || new Date())}
                        </Text>
                      </View>
                      {isUnread && <View style={styles.unreadDot} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Earlier Section */}
            {earlierNotifications.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Daha Önce</Text>
                {earlierNotifications.map((notification) => {
                  const style = getNotificationStyle(notification.type);
                  const isUnread = !notification.isRead && !notification.read;
                  
                  return (
                    <TouchableOpacity
                      key={notification.id}
                      style={[
                        styles.notificationCard,
                        isUnread && styles.notificationCardUnread,
                      ]}
                      onPress={() => markAsRead(notification.id)}
                    >
                      <View style={[styles.iconContainer, { backgroundColor: `${style.iconBg}20` }]}>
                        <Ionicons name={style.icon} size={24} color={style.iconBg} />
                      </View>
                      <View style={styles.notificationContent}>
                        <Text style={styles.notificationTitle}>{notification.title}</Text>
                        <Text style={styles.notificationMessage}>{notification.message || notification.body}</Text>
                        <Text style={styles.notificationTime}>
                          {getTimeAgo(notification.createdAt || notification.date || new Date())}
                        </Text>
                      </View>
                      {isUnread && <View style={styles.unreadDot} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        ) : (
          /* Empty State */
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="notifications-off-outline" size={64} color={COLORS.gray300} />
            </View>
            <Text style={styles.emptyTitle}>Bildirim Yok</Text>
            <Text style={styles.emptyMessage}>
              Şu anda görüntülenecek bildiriminiz bulunmuyor.
            </Text>
          </View>
        )}
      </ScrollView>
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
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
  markAllButton: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gray500,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  notificationCardUnread: {
    backgroundColor: 'rgba(17, 212, 33, 0.03)',
    borderColor: COLORS.primary,
    borderWidth: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: COLORS.gray600,
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: COLORS.gray400,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginLeft: 8,
    marginTop: 4,
  },
  emptyState: {
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
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  emptyMessage: {
    fontSize: 16,
    color: COLORS.gray500,
    textAlign: 'center',
    lineHeight: 24,
  },
});
