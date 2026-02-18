import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

/**
 * Sipariş Onay Modalı
 * Marka kitine uygun tasarım
 */
export default function OrderSuccessModal({
  visible,
  onClose,
  orderId,
  expGained,
  paymentMethod,
  paymentInfo,
  totalAmount,
}) {
  const isBankTransfer = paymentMethod === 'bank_transfer';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={styles.modalBackdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        <View style={styles.modalContainer}>
          {/* Success Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconBackground}>
              <Ionicons name="checkmark-circle" size={64} color={COLORS.primary} />
            </View>
            <View style={styles.confettiContainer}>
              <Text style={styles.confettiEmoji}>🎉</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>Sipariş Oluşturuldu!</Text>

          {/* Order Number */}
          {orderId && (
            <Text style={styles.orderNumber}>Sipariş No: {orderId}</Text>
          )}

          {/* EXP Gained */}
          {expGained && (
            <View style={styles.expContainer}>
              <Text style={styles.expText}>
                ✨ Alışveriş yaptığınız için EXP kazandınız!
              </Text>
            </View>
          )}

          {/* Payment Information (only for bank transfer) */}
          {isBankTransfer && paymentInfo && (
            <View style={styles.paymentSection}>
              <Text style={styles.paymentTitle}>Ödeme Bilgileri:</Text>
              
              <View style={styles.paymentItem}>
                <Text style={styles.paymentLabel}>Alıcı</Text>
                <Text style={styles.paymentValue}>{paymentInfo.recipient || 'Huğlu Av Tüfekleri Kooperatifi'}</Text>
              </View>

              <View style={styles.paymentItem}>
                <Text style={styles.paymentLabel}>Banka</Text>
                <Text style={styles.paymentValue}>{paymentInfo.bank || 'İş Bankası'}</Text>
              </View>

              <View style={styles.paymentItem}>
                <Text style={styles.paymentLabel}>IBAN</Text>
                <Text style={styles.paymentValue}>{paymentInfo.iban || 'TR33 0006 4000 0011 2345 6789 01'}</Text>
              </View>

              {totalAmount && (
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentLabel}>Tutar</Text>
                  <Text style={styles.paymentValue}>₺{totalAmount.toFixed(2)}</Text>
                </View>
              )}

              <View style={styles.instructionContainer}>
                <Text style={styles.instructionText}>
                  Ödeme yaptıktan sonra dekont/makbuzunu müşteri hizmetlerine iletiniz.
                </Text>
              </View>
            </View>
          )}

          {/* Success Message (for other payment methods) */}
          {!isBankTransfer && (
            <View style={styles.successMessage}>
              <Text style={styles.successText}>
                Siparişiniz başarıyla oluşturuldu. Siparişlerim sayfasından takip edebilirsiniz.
              </Text>
            </View>
          )}

          {/* Action Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>TAMAM</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confettiContainer: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  confettiEmoji: {
    fontSize: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray700,
    marginBottom: 12,
  },
  expContainer: {
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  expText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  paymentSection: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 16,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  paymentItemLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  paymentItemLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  paymentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray600,
    flex: 1,
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
    flex: 2,
    textAlign: 'right',
  },
  instructionContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  instructionText: {
    fontSize: 12,
    color: COLORS.gray600,
    lineHeight: 18,
    textAlign: 'center',
  },
  successMessage: {
    backgroundColor: 'rgba(17, 212, 33, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  successText: {
    fontSize: 14,
    color: COLORS.gray700,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButton: {
    alignSelf: 'flex-end',
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
});

