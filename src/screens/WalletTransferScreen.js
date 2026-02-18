import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { secureStorage } from '../utils/secureStorage';
import { COLORS } from '../constants/colors';
import { walletAPI, usersAPI } from '../services/api';
import InfoModal from '../components/InfoModal';
import ErrorModal from '../components/ErrorModal';
import SuccessModal from '../components/SuccessModal';
import BiometricVerificationModal from '../components/BiometricVerificationModal';
import { getBiometricSupport, isBiometricTransferReady } from '../utils/biometricLock';
import { useAlert } from '../hooks/useAlert';

const QUICK_AMOUNTS = [10, 25, 50, 100];

export default function WalletTransferScreen({ navigation }) {
  const alert = useAlert();
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [balance, setBalance] = useState(0);
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [userFullName, setUserFullName] = useState('');
  
  // Form states
  const [transferType, setTransferType] = useState('user'); // 'user' or 'bank'
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Modal states
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showTransferInfoModal, setShowTransferInfoModal] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Biometric verification states
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [pendingTransfer, setPendingTransfer] = useState(null);

  useEffect(() => {
    loadWalletBalance();
  }, []);

  useEffect(() => {
    // Kullanıcı arama (debounce)
    if (recipient.length >= 3 && transferType === 'user') {
      const timer = setTimeout(() => {
        searchUsers(recipient);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [recipient, transferType]);

  const loadWalletBalance = async () => {
    try {
      setLoading(true);
      const storedUserId = await secureStorage.getItem('userId');
      const storedUserName = await secureStorage.getItem('userName');
      
      if (!storedUserId) {
        alert.show('Hata', 'Lütfen giriş yapın');
        navigation.goBack();
        return;
      }

      setUserId(storedUserId);
      setUserName(storedUserName || 'Kullanıcı');

      // Kullanıcı profil bilgilerini yükle
      try {
        const userResponse = await usersAPI.getProfile(storedUserId);
        if (userResponse.data?.success) {
          const userData = userResponse.data.user || userResponse.data.data;
          const fullName = userData.name || userData.fullName || storedUserName || 'Kullanıcı';
          setUserFullName(fullName);
        }
      } catch (error) {
        console.error('Kullanıcı bilgileri yüklenemedi:', error);
        setUserFullName(storedUserName || 'Kullanıcı');
      }

      const response = await walletAPI.getBalance(storedUserId);
      if (response.data?.success) {
        // Backend response: { success: true, data: { balance: ... } }
        const balanceValue = response.data.data?.balance ?? 0;
        const parsedBalance = parseFloat(balanceValue) || 0;
        setBalance(parsedBalance);
      }
    } catch (error) {
      console.error('Bakiye yüklenemedi:', error);
      setBalance(0);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query) => {
    try {
      setSearching(true);
      const response = await usersAPI.search(query);
      
      if (response.data?.success) {
        const users = response.data.users || response.data.data || [];
        // Kendi kullanıcımızı filtrele
        setSearchResults(users.filter(u => u.id !== userId && u._id !== userId));
      }
    } catch (error) {
      console.error('Kullanıcı araması başarısız:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const selectUser = (user) => {
    setSelectedUser(user);
    setRecipient(user.email || user.username || user.name);
    setSearchResults([]);
  };

  const setQuickAmount = (value) => {
    setAmount(value.toString());
  };

  const setMaxAmount = () => {
    setAmount(balance.toString());
  };

  const handleTransfer = async () => {
    // Validasyon
    if (!recipient.trim()) {
      setErrorMessage('Lütfen alıcı bilgisini girin');
      setShowErrorModal(true);
      return;
    }

    const transferAmount = parseFloat(amount);
    if (!transferAmount || transferAmount <= 0) {
      setErrorMessage('Lütfen geçerli bir tutar girin');
      setShowErrorModal(true);
      return;
    }

    if (transferAmount > balance) {
      setErrorMessage('Yetersiz bakiye');
      setShowErrorModal(true);
      return;
    }

    if (transferType === 'user' && !selectedUser) {
      setErrorMessage('Lütfen listeden bir kullanıcı seçin');
      setShowErrorModal(true);
      return;
    }

    // Check if biometric verification is available and enabled
    try {
      const support = await getBiometricSupport();
      
      if (support.isEnrolled) {
        // Store transfer details and show biometric verification modal
        setPendingTransfer({
          recipient,
          amount: transferAmount,
          type: transferType,
          selectedUser
        });
        setShowBiometricModal(true);
        return;
      }
    } catch (error) {
      console.log('Biometric check error:', error);
      // Continue without biometric if error
    }

    // If no biometric, proceed with transfer directly
    processTransfer();
  };

  const onBiometricSuccess = () => {
    setShowBiometricModal(false);
    setPendingTransfer(null);
    processTransfer();
  };

  const onBiometricCancel = () => {
    setShowBiometricModal(false);
    setPendingTransfer(null);
  };

  const processTransfer = async () => {
    try {
      setTransferring(true);
      const transferAmount = parseFloat(amount);
      
      if (transferType === 'user') {
        const response = await walletAPI.transfer(
          userId,
          selectedUser.id || selectedUser._id,
          transferAmount,
          `Transfer to ${selectedUser.name || selectedUser.username}`
        );

        if (response.data?.success) {
          setShowSuccessModal(true);
        } else {
          setErrorMessage(response.data?.message || 'Transfer başarısız');
          setShowErrorModal(true);
        }
      } else {
        // Banka hesabına transfer - withdrawal request oluştur
        try {
          const withdrawResponse = await walletAPI.createWithdrawRequest(
            userId,
            transferAmount,
            recipient, // IBAN
            userFullName || userName
          );

          if (withdrawResponse.data?.success) {
            setInfoMessage(`Banka hesabınıza transfer talebi oluşturuldu. Talep ID: ${withdrawResponse.data.data?.id || withdrawResponse.data.id}. İşlem admin onayından sonra gerçekleştirilecektir.`);
            setShowInfoModal(true);
            // Bakiyeyi güncelle
            await loadWalletBalance();
            // Formu temizle
            setRecipient('');
            setAmount('');
          } else {
            setErrorMessage(withdrawResponse.data?.message || 'Transfer talebi oluşturulamadı');
            setShowErrorModal(true);
          }
        } catch (withdrawError) {
          console.error('Withdrawal request error:', withdrawError);
          setErrorMessage(withdrawError.response?.data?.message || 'Transfer talebi oluşturulurken bir hata oluştu');
          setShowErrorModal(true);
        }
      }
    } catch (error) {
      console.error('Transfer hatası:', error);
      if (error.response?.status === 401) {
        setErrorMessage('Oturumunuzun süresi dolmuş olabilir. Lütfen tekrar giriş yapın ve yeniden deneyin.');
      } else {
        setErrorMessage(error.response?.data?.message || 'Transfer sırasında bir hata oluştu');
      }
      setShowErrorModal(true);
    } finally {
      setTransferring(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Para Transferi</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const transferAmountValue = parseFloat(amount) || 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Para Transferi</Text>
        <TouchableOpacity 
          onPress={() => setShowTransferInfoModal(true)} 
          style={styles.infoButton}
        >
          <Ionicons name="information-circle-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Kullanılabilir Bakiye</Text>
          <Text style={styles.balanceAmount}>₺{balance.toFixed(2)}</Text>
          <View style={styles.secureTag}>
            <Ionicons name="lock-closed" size={12} color={COLORS.textSecondary} />
            <Text style={styles.secureText}>Güvenli Cüzdan</Text>
          </View>
        </View>

        {/* Transfer Type */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Transfer Tipi</Text>
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[styles.segment, transferType === 'user' && styles.segmentActive]}
              onPress={() => setTransferType('user')}
            >
              <Text style={[styles.segmentText, transferType === 'user' && styles.segmentTextActive]}>
                Kullanıcıya
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segment, transferType === 'bank' && styles.segmentActive]}
              onPress={() => setTransferType('bank')}
            >
              <Text style={[styles.segmentText, transferType === 'bank' && styles.segmentTextActive]}>
                Banka Hesabı
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recipient Input */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Alıcı</Text>
          
          {/* Müşteri Adı Soyadı - Sadece Banka Hesabı için */}
          {transferType === 'bank' && (
            <View style={styles.readOnlyField}>
              <View style={styles.readOnlyFieldHeader}>
                <Ionicons name="person-outline" size={18} color={COLORS.textSecondary} />
                <Text style={styles.readOnlyLabel}>Müşteri Adı Soyadı</Text>
              </View>
              <View style={styles.readOnlyValueContainer}>
                <Text style={styles.readOnlyValue}>{userFullName || userName || 'Kullanıcı'}</Text>
                <Ionicons name="lock-closed" size={16} color={COLORS.gray400} />
              </View>
            </View>
          )}
          
          <View style={styles.inputContainer}>
            <Ionicons name={transferType === 'bank' ? 'card-outline' : 'person-outline'} size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={transferType === 'user' ? 'E-posta veya Kullanıcı ID' : 'IBAN Numarası'}
              placeholderTextColor={COLORS.gray400}
              value={recipient}
              onChangeText={setRecipient}
              autoCapitalize="none"
              keyboardType={transferType === 'bank' ? 'default' : 'email-address'}
            />
            {searching && <ActivityIndicator size="small" color={COLORS.primary} />}
          </View>
          
          {/* Search Results */}
          {searchResults.length > 0 && (
            <View style={styles.searchResults}>
              {searchResults.map((user) => (
                <TouchableOpacity
                  key={user.id || user._id}
                  style={styles.searchResultItem}
                  onPress={() => selectUser(user)}
                >
                  <View style={styles.userAvatar}>
                    <Ionicons name="person" size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.name || user.username}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Amount Input */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Tutar</Text>
            <Text style={styles.feeText}>İşlem ücreti yok</Text>
          </View>
          <View style={styles.amountInputContainer}>
            <Text style={styles.currencySymbol}>₺</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor={COLORS.gray400}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity style={styles.maxButton} onPress={setMaxAmount}>
              <Text style={styles.maxButtonText}>MAX</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Amount Buttons */}
          <View style={styles.quickAmounts}>
            {QUICK_AMOUNTS.map((value) => (
              <TouchableOpacity
                key={value}
                style={styles.quickAmountButton}
                onPress={() => setQuickAmount(value)}
              >
                <Text style={styles.quickAmountText}>₺{value}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Transaction Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Transfer Tutarı</Text>
            <Text style={styles.summaryValue}>₺{transferAmountValue.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>İşlem Ücreti</Text>
            <Text style={styles.summaryValueFree}>Ücretsiz</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabelBold}>Toplam Kesinti</Text>
            <Text style={styles.summaryValueBold}>₺{transferAmountValue.toFixed(2)}</Text>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.transferButton, transferring && styles.transferButtonDisabled]}
          onPress={handleTransfer}
          disabled={transferring}
        >
          {transferring ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Text style={styles.transferButtonText}>Transferi Onayla</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
            </>
          )}
        </TouchableOpacity>
        <View style={styles.secureInfo}>
          <Ionicons name="shield-checkmark" size={16} color={COLORS.textSecondary} />
          <Text style={styles.secureInfoText}>256-bit Şifreli Güvenli İşlem</Text>
        </View>
      </View>

      {/* Transfer Info Modal */}
      <InfoModal
        visible={showTransferInfoModal}
        onClose={() => setShowTransferInfoModal(false)}
        title="Para Transferi Bilgisi"
        message="Para transferleri sadece kendi hesabınıza yapılabilir. Banka hesabınıza transfer yaptığınızda, işlem admin onayından sonra gerçekleştirilecektir. Transfer talebiniz admin panelde görüntülenecek ve manuel olarak işleme alınacaktır."
      />

      {/* Info Modal */}
      <InfoModal
        visible={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        title="Bilgi"
        message={infoMessage}
      />

      {/* Error Modal */}
      <ErrorModal
        visible={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        message={errorMessage}
      />

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          navigation.goBack();
        }}
        title="Başarılı"
        message={`${amount ? parseFloat(amount).toFixed(2) : '0.00'}₺ başarıyla transfer edildi`}
        onActionPress={() => {
          setShowSuccessModal(false);
          navigation.goBack();
        }}
      />

      {/* Biometric Verification Modal */}
      <BiometricVerificationModal
        visible={showBiometricModal}
        onSuccess={onBiometricSuccess}
        onCancel={onBiometricCancel}
        title="Transfer Onayı"
        description="Para transferini onaylamak için kimliğinizi doğrulayın"
        amount={pendingTransfer?.amount}
      />

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
  infoButton: {
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  balanceCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  secureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.backgroundLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  secureText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  feeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  segmentTextActive: {
    color: COLORS.white,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textMain,
  },
  searchResults: {
    marginTop: 8,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  userEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  maxButton: {
    backgroundColor: COLORS.backgroundLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  maxButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  quickAmountButton: {
    flex: 1,
    height: 40,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  summaryValueFree: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.gray100,
    marginVertical: 4,
  },
  summaryLabelBold: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  summaryValueBold: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    padding: 16,
    paddingBottom: 32,
    alignItems: 'center',
  },
  transferButton: {
    width: '100%',
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  transferButtonDisabled: {
    opacity: 0.6,
  },
  transferButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  secureInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    opacity: 0.6,
  },
  secureInfoText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  readOnlyField: {
    marginBottom: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: 16,
  },
  readOnlyFieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  readOnlyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  readOnlyValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  readOnlyValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    flex: 1,
  },
});
