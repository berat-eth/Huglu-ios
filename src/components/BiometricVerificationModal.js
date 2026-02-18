import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authenticateWithBiometrics, getBiometricSupport } from '../utils/biometricLock';
import { COLORS } from '../constants/colors';

export default function BiometricVerificationModal({ 
  visible, 
  onSuccess, 
  onCancel,
  title = 'Kimlik Doğrulama',
  description = 'Bu işlemi onaylamak için kimliğinizi doğrulayın',
  amount = null, // Optional: for displaying transfer amount
  autoTrigger = true // Automatically trigger biometric on mount
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [biometricType, setBiometricType] = useState('finger-print');

  useEffect(() => {
    if (visible) {
      checkBiometricType();
      if (autoTrigger) {
        // Small delay to let modal render first
        const timer = setTimeout(() => {
          handleVerify();
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [visible]);

  const checkBiometricType = async () => {
    try {
      const support = await getBiometricSupport();
      // Check if face recognition is available (type 2 is FaceID)
      if (support.supportedTypes.includes(2)) {
        setBiometricType('scan-outline');
      } else {
        setBiometricType('finger-print');
      }
    } catch (e) {
      console.log('Error checking biometric type:', e);
    }
  };

  const handleVerify = async () => {
    if (loading) return;
    
    setLoading(true);
    setError('');
    
    try {
      const result = await authenticateWithBiometrics({
        promptMessage: amount 
          ? `${amount} TL transfer işlemini onaylayın` 
          : description,
        cancelLabel: 'İptal',
        disableDeviceFallback: false,
      });
      
      if (result.success) {
        onSuccess();
      } else {
        if (result.error === 'user_cancel' || result.error === 'system_cancel') {
          setError('İşlem iptal edildi');
        } else {
          setError('Doğrulama başarısız. Tekrar deneyin.');
        }
      }
    } catch (e) {
      console.error('Biometric verification error:', e);
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setError('');
    setLoading(false);
    onCancel();
  };

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons 
              name={biometricType} 
              size={64} 
              color={COLORS.primary} 
            />
          </View>
          
          {/* Title */}
          <Text style={styles.title}>{title}</Text>
          
          {/* Description */}
          <Text style={styles.description}>
            {amount ? `${amount} TL transfer işlemini onaylamak için kimliğinizi doğrulayın` : description}
          </Text>
          
          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          
          {/* Verify Button */}
          <TouchableOpacity 
            style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
            onPress={handleVerify}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <>
                <Ionicons name={biometricType} size={20} color={COLORS.white} />
                <Text style={styles.verifyButtonText}>Doğrula</Text>
              </>
            )}
          </TouchableOpacity>
          
          {/* Cancel Button */}
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>İptal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '15',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 20,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
    fontWeight: '500',
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    gap: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  verifyButtonDisabled: {
    opacity: 0.7,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
});
