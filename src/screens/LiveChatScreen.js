import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { liveSupportAPI } from '../services/api';
import { secureStorage } from '../utils/secureStorage';
import { useAlert } from '../hooks/useAlert';

export default function LiveChatScreen({ navigation, route }) {
  const alert = useAlert();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState(null);
  const scrollViewRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Kullanıcı ID'sini al
  useEffect(() => {
    loadUserId();
  }, []);

  // Mesaj geçmişini yükle
  useEffect(() => {
    if (userId) {
      loadMessages();
      // İlk mesaj varsa gönder
      const initialMessage = route?.params?.initialMessage;
      if (initialMessage && initialMessage.trim()) {
        setTimeout(() => {
          sendInitialMessage(initialMessage);
        }, 1000);
      }
      // Her 5 saniyede bir yeni mesajları kontrol et (sadece aktif konuşmalar için)
      const conversationDate = route?.params?.conversationDate;
      if (!conversationDate) {
        // Sadece aktif konuşmalar için otomatik yenileme
        const interval = setInterval(() => {
          loadMessages();
        }, 5000);
        return () => clearInterval(interval);
      }
    }
  }, [userId, route?.params?.conversationDate]);

  const loadUserId = async () => {
    try {
      const storedUserId = await secureStorage.getItem('userId');
      if (storedUserId) {
        setUserId(parseInt(storedUserId));
      } else {
        // Eğer userId yoksa, route'dan al
        const routeUserId = route?.params?.userId;
        if (routeUserId) {
          setUserId(routeUserId);
        } else {
          // Misafir kullanıcı için benzersiz deviceId oluştur
          let deviceId = await secureStorage.getItem('guestDeviceId');
          if (!deviceId) {
            // Benzersiz deviceId oluştur (timestamp + random)
            deviceId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
            await secureStorage.setItem('guestDeviceId', deviceId);
          }
          // DeviceId'yi userId olarak kullan (backend'de özel işleme için)
          // Negatif sayı kullanarak misafir kullanıcıları ayırt ediyoruz
          // Hash fonksiyonu ile deviceId'yi sayıya çevir
          const hash = deviceId.split('').reduce((acc, char) => {
            const hash = ((acc << 5) - acc) + char.charCodeAt(0);
            return hash & hash;
          }, 0);
          // Negatif sayı yaparak misafir kullanıcı olduğunu belirt
          const guestUserId = -Math.abs(hash);
          setUserId(guestUserId);
          // DeviceId'yi de sakla (backend'e göndermek için)
          await secureStorage.setItem('guestDeviceId', deviceId);
        }
      }
    } catch (error) {
      console.error('User ID yükleme hatası:', error);
      // Hata durumunda da benzersiz deviceId oluştur
      const deviceId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      const hash = deviceId.split('').reduce((acc, char) => {
        const hash = ((acc << 5) - acc) + char.charCodeAt(0);
        return hash & hash;
      }, 0);
      setUserId(-Math.abs(hash));
    }
  };

  const loadMessages = async () => {
    if (!userId) {
      console.warn('[LiveChat] loadMessages: userId yok');
      return;
    }

    try {
      setLoading(true);
      
      // Eğer conversationDate varsa, o tarihteki mesajları filtrele
      const conversationDate = route?.params?.conversationDate;
      console.log('[LiveChat] Mesajlar yükleniyor...', { userId, conversationDate });
      
      // Misafir kullanıcı için deviceId'yi de gönder
      let deviceId = null;
      if (userId < 0) {
        deviceId = await secureStorage.getItem('guestDeviceId');
      }
      const response = await liveSupportAPI.getHistory(userId, deviceId);
      console.log('[LiveChat] API yanıtı:', {
        status: response?.status,
        success: response?.data?.success,
        dataLength: response?.data?.data?.length,
        fullResponse: response?.data
      });
      
      // Axios response formatı: response.data içinde gerçek data var
      const responseData = response?.data || response;
      const messagesData = responseData?.data || responseData;
      
      if (responseData && (responseData.success === true || response?.status >= 200 && response?.status < 300) && messagesData) {
        console.log('[LiveChat] Mesajlar bulundu:', messagesData.length, 'mesaj');
        
        // Backend'den gelen mesajları formatla
        let filteredMessages = Array.isArray(messagesData) ? messagesData : [];
        
        // Eğer belirli bir tarih seçildiyse, o tarihteki mesajları filtrele
        if (conversationDate) {
          const targetDate = new Date(conversationDate).toISOString().split('T')[0];
          filteredMessages = filteredMessages.filter(msg => {
            if (!msg.timestamp) return false;
            const msgDate = new Date(msg.timestamp).toISOString().split('T')[0];
            return msgDate === targetDate;
          });
        }
        
        console.log('[LiveChat] Filtrelenmiş mesajlar:', filteredMessages.length);
        
        // Mesajları formatla ve duplicate kontrolü yap
        const messageMap = new Map();
        filteredMessages.forEach((msg, index) => {
          const isUser = msg.intent === 'live_support';
          const isAdmin = msg.intent === 'admin_message';
          
          // Mesaj ID'si ve timestamp kombinasyonu ile unique key oluştur
          const messageKey = `${msg.id || index}-${msg.timestamp || Date.now()}`;
          
          if (!messageMap.has(messageKey)) {
            const formattedMsg = {
              id: msg.id || Date.now() + index,
              text: msg.message || '',
              isUser: isUser,
              isAdmin: isAdmin,
              time: msg.timestamp 
                ? new Date(msg.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                : new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
              timestamp: msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now()
            };
            messageMap.set(messageKey, formattedMsg);
            console.log('[LiveChat] Mesaj eklendi:', {
              id: formattedMsg.id,
              text: formattedMsg.text.substring(0, 30),
              isUser,
              isAdmin,
              intent: msg.intent
            });
          }
        });

        // Map'ten array'e çevir ve timestamp'e göre sırala
        const formattedMessages = Array.from(messageMap.values());
        formattedMessages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        console.log('[LiveChat] Formatlanmış mesajlar:', formattedMessages.length, 'mesaj');
        console.log('[LiveChat] Mesaj örnekleri:', formattedMessages.slice(0, 3));

        setMessages(formattedMessages);
        
        // Scroll to bottom
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        console.warn('[LiveChat] Mesajlar bulunamadı veya format hatalı:', {
          responseData,
          messagesData,
          response
        });
      }
    } catch (error) {
      console.error('[LiveChat] Mesaj geçmişi yükleme hatası:', error);
      if (__DEV__) {
        console.error('[LiveChat] Hata detayları:', {
          message: error?.message,
          response: error?.response?.data,
          status: error?.response?.status,
          stack: error?.stack
        });
      }
      // İlk yüklemede hata varsa hoş geldin mesajı göster
      if (messages.length === 0) {
        setMessages([{
          id: 1,
          text: 'Merhaba! Size nasıl yardımcı olabilirim?',
          isUser: false,
          isAdmin: false,
          time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const sendInitialMessage = async (messageText) => {
    if (!messageText.trim() || !userId || sending) {
      console.warn('[LiveChat] sendInitialMessage: Validasyon hatası', { messageText: messageText?.trim(), userId, sending });
      return;
    }

    console.log('[LiveChat] İlk mesaj gönderiliyor:', { userId, messageText });
    setSending(true);

    try {
      const response = await liveSupportAPI.sendMessage(userId, messageText);
      console.log('[LiveChat] İlk mesaj API yanıtı:', {
        status: response?.status,
        data: response?.data,
        success: response?.data?.success
      });
      
      const responseData = response?.data || response;
      const isSuccess = responseData?.success === true || (response?.status >= 200 && response?.status < 300);
      
      if (isSuccess) {
        // Mesaj başarıyla gönderildi, geçmişi yenile
        setTimeout(() => {
          loadMessages();
        }, 500);
      } else {
        console.error('[LiveChat] İlk mesaj başarısız:', response);
      }
    } catch (error) {
      console.error('[LiveChat] İlk mesaj gönderme hatası:', error);
      if (__DEV__) {
        console.error('[LiveChat] İlk mesaj hata detayları:', {
          message: error?.message,
          response: error?.response?.data,
          status: error?.response?.status
        });
      }
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async () => {
    // Validasyon kontrolleri
    if (!message.trim()) {
      console.warn('[LiveChat] Mesaj boş');
      return;
    }
    
    if (!userId) {
      console.error('[LiveChat] userId bulunamadı');
      alert.show('Hata', 'Kullanıcı bilgisi bulunamadı. Lütfen uygulamayı yeniden başlatın.');
      return;
    }
    
    if (sending) {
      console.warn('[LiveChat] Mesaj zaten gönderiliyor');
      return;
    }

    const messageText = message.trim();
    console.log('[LiveChat] Mesaj gönderiliyor:', { userId, messageLength: messageText.length });
    
    setMessage('');
    setSending(true);

    // Optimistic update - mesajı hemen göster
    const tempMessage = {
      id: Date.now(),
      text: messageText,
      isUser: true,
      isAdmin: false,
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, tempMessage]);

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      console.log('[LiveChat] API çağrısı yapılıyor...', { userId, messageText });
      const response = await liveSupportAPI.sendMessage(userId, messageText);
      console.log('[LiveChat] API yanıtı:', {
        status: response?.status,
        statusText: response?.statusText,
        data: response?.data,
        success: response?.data?.success
      });
      
      // Axios response objesi döner, data içinde success var
      const responseData = response?.data || response;
      const isSuccess = responseData?.success === true || (response?.status >= 200 && response?.status < 300);
      
      if (isSuccess) {
        console.log('[LiveChat] Mesaj başarıyla gönderildi');
        // Mesaj başarıyla gönderildi, hemen geçmişi yenile
        // Optimistic update zaten yapıldı, şimdi backend'den gerçek mesajı al
        setTimeout(() => {
          loadMessages();
        }, 300); // 300ms sonra yenile (mesajın kaydedilmesi için yeterli süre)
      } else {
        console.error('[LiveChat] API başarısız yanıt:', {
          status: response?.status,
          data: responseData,
          fullResponse: response
        });
        // Hata durumunda mesajı geri al
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
        const errorMsg = responseData?.message || response?.statusText || 'Mesaj gönderilemedi. Lütfen tekrar deneyin.';
        alert.show('Hata', errorMsg);
      }
    } catch (error) {
      console.error('[LiveChat] Mesaj gönderme hatası:', error);
      if (__DEV__) {
        console.error('[LiveChat] Hata detayları:', {
          message: error?.message,
          response: error?.response?.data,
          status: error?.response?.status,
          stack: error?.stack
        });
      }
      // Hata durumunda mesajı geri al
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      
      // Daha açıklayıcı hata mesajı
      let errorMessage = 'Mesaj gönderilemedi.';
      if (error?.response?.status === 404) {
        errorMessage = 'Kullanıcı bulunamadı. Lütfen uygulamayı yeniden başlatın.';
      } else if (error?.response?.status === 400) {
        errorMessage = 'Geçersiz mesaj. Lütfen tekrar deneyin.';
      } else if (error?.message?.includes('Network')) {
        errorMessage = 'İnternet bağlantınızı kontrol edin.';
      }
      
      alert.show('Hata', errorMessage);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.agentAvatar}>
            <Ionicons name="headset" size={20} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Canlı Destek</Text>
            <View style={styles.onlineStatus}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Çevrimiçi</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.moreButton}
          onPress={() => navigation.navigate('ChatHistory')}
        >
          <Ionicons name="time-outline" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        {loading && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Mesajlar yükleniyor...</Text>
          </View>
        ) : (
          <ScrollView 
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }}
          >
            {/* Date Separator */}
            {messages.length > 0 && (
              <View style={styles.dateSeparator}>
                <View style={styles.dateLine} />
                <Text style={styles.dateText}>Bugün</Text>
                <View style={styles.dateLine} />
              </View>
            )}

            {/* Messages */}
            {messages.length > 0 ? (
              messages.map((msg, index) => {
                if (!msg || !msg.text) {
                  console.warn('[LiveChat] Geçersiz mesaj:', msg);
                  return null;
                }
                
                return (
                  <View
                    key={msg.id || `msg-${index}`}
                    style={[
                      styles.messageRow,
                      msg.isUser ? styles.messageRowUser : styles.messageRowAgent,
                    ]}
                  >
                    {!msg.isUser && (
                      <View style={styles.messageAvatar}>
                        <Ionicons 
                          name={msg.isAdmin ? "person" : "headset"} 
                          size={16} 
                          color={msg.isAdmin ? COLORS.primary : COLORS.success} 
                        />
                      </View>
                    )}
                    <View
                      style={[
                        styles.messageBubble,
                        msg.isUser ? styles.messageBubbleUser : styles.messageBubbleAgent,
                        msg.isAdmin && styles.messageBubbleAdmin,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          msg.isUser ? styles.messageTextUser : styles.messageTextAgent,
                        ]}
                      >
                        {msg.text}
                      </Text>
                      <Text
                        style={[
                          styles.messageTime,
                          msg.isUser ? styles.messageTimeUser : styles.messageTimeAgent,
                        ]}
                      >
                        {msg.time || '00:00'}
                      </Text>
                    </View>
                  </View>
                );
              })
            ) : (
              !loading && (
                <View style={styles.emptyState}>
                  <Ionicons name="chatbubbles-outline" size={48} color={COLORS.gray400} />
                  <Text style={styles.emptyStateText}>Henüz mesaj yok</Text>
                  <Text style={styles.emptyStateSubtext}>İlk mesajınızı göndererek başlayın</Text>
                </View>
              )
            )}

            {/* Typing Indicator - Admin yazıyor göstergesi */}
            {sending && (
              <View style={styles.typingIndicator}>
                <View style={styles.messageAvatar}>
                  <Ionicons name="headset" size={16} color={COLORS.primary} />
                </View>
                <View style={styles.typingBubble}>
                  <View style={styles.typingDots}>
                    <View style={styles.typingDot} />
                    <View style={styles.typingDot} />
                    <View style={styles.typingDot} />
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="add-circle-outline" size={24} color={COLORS.gray400} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Mesajınızı yazın..."
            placeholderTextColor={COLORS.gray400}
            value={message}
            onChangeText={setMessage}
            multiline
            editable={!sending && !loading}
          />
          <TouchableOpacity 
            style={[styles.sendButton, message.trim() && styles.sendButtonActive]}
            onPress={sendMessage}
            disabled={!message.trim() || sending || loading}
          >
            {sending ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Ionicons 
                name="send" 
                size={20} 
                color={message.trim() ? COLORS.white : COLORS.gray400} 
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <alert.AlertComponent />
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
    backgroundColor: COLORS.white,
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
    gap: 12,
    marginLeft: 8,
  },
  agentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  onlineText: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray500,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 12,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.gray200,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.gray400,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.gray400,
    marginTop: 8,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAgent: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 16,
  },
  messageBubbleUser: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  messageBubbleAgent: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  messageBubbleAdmin: {
    backgroundColor: '#E3F2FD',
    borderColor: COLORS.primary,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  messageTextUser: {
    color: COLORS.white,
  },
  messageTextAgent: {
    color: COLORS.textMain,
  },
  messageTime: {
    fontSize: 11,
  },
  messageTimeUser: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  messageTimeAgent: {
    color: COLORS.gray400,
  },
  typingIndicator: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  typingBubble: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.gray400,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    gap: 8,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 20,
    fontSize: 15,
    color: COLORS.textMain,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: COLORS.primary,
  },
});
