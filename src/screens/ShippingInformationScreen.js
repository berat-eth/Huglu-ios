import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { useAlert } from '../hooks/useAlert';

const MOCK_ADDRESSES = [
  {
    id: 1,
    label: 'Home',
    address: '123 Forest Trail',
    city: 'Boulder, CO 80302',
    phone: '(303) 555-0123',
    isDefault: true,
  },
  {
    id: 2,
    label: 'Office',
    address: '456 Mountain View Dr',
    city: 'Denver, CO 80202',
    phone: '',
    isDefault: false,
  },
];

const DELIVERY_METHODS = [
  {
    id: 'standard',
    name: 'Standard Shipping',
    description: 'Arrives by Fri, Oct 24',
    price: 0,
    isEco: true,
  },
  {
    id: 'expedited',
    name: 'Expedited',
    description: 'Arrives by Wed, Oct 22',
    price: 12.99,
    isEco: false,
  },
  {
    id: 'same-day',
    name: 'Same-Day Delivery',
    description: 'Arrives Today by 8pm',
    price: 24.99,
    isEco: false,
  },
];

export default function ShippingInformationScreen({ navigation, route }) {
  const alert = useAlert();
  const [selectedAddress, setSelectedAddress] = useState(1);
  const [selectedDelivery, setSelectedDelivery] = useState('standard');
  const [addresses, setAddresses] = useState(MOCK_ADDRESSES);
  
  const cartTotal = route.params?.cartTotal || 245.00;

  const selectedDeliveryMethod = DELIVERY_METHODS.find(m => m.id === selectedDelivery);
  const shippingCost = selectedDeliveryMethod?.price || 0;
  const total = cartTotal + shippingCost;

  const handleProceedToPayment = () => {
    const selectedAddr = addresses.find(a => a.id === selectedAddress);
    
    if (!selectedAddr) {
      alert.show('Hata', 'Lütfen bir teslimat adresi seçin');
      return;
    }

    navigation.navigate('PaymentMethod', {
      shippingAddress: selectedAddr,
      deliveryMethod: selectedDeliveryMethod,
      cartTotal,
      shippingCost,
      total,
    });
  };

  const handleAddNewAddress = () => {
    alert.show(
      'Yeni Adres',
      'Yeni adres ekleme özelliği yakında eklenecek',
      [{ text: 'Tamam' }]
    );
  };

  const handleEditAddress = (addressId) => {
    alert.show(
      'Adresi Düzenle',
      'Adres düzenleme özelliği yakında eklenecek',
      [{ text: 'Tamam' }]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shipping</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Progress Stepper */}
        <View style={styles.stepperContainer}>
          <View style={styles.stepper}>
            {/* Step 1 - Completed */}
            <View style={styles.stepCompleted}>
              <Ionicons name="checkmark" size={16} color={COLORS.primary} />
            </View>
            <View style={styles.stepLineCompleted} />
            
            {/* Step 2 - Active */}
            <View style={styles.stepActive}>
              <Text style={styles.stepActiveText}>2</Text>
            </View>
            <View style={styles.stepLine} />
            
            {/* Step 3 - Pending */}
            <View style={styles.stepPending}>
              <Text style={styles.stepPendingText}>3</Text>
            </View>
          </View>
          
          <View style={styles.stepLabels}>
            <Text style={styles.stepLabelActive}>Cart</Text>
            <Text style={styles.stepLabelActive}>Shipping</Text>
            <Text style={styles.stepLabel}>Payment</Text>
          </View>
        </View>

        {/* Shipping Address Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Shipping Address</Text>
          </View>

          {addresses.map((address) => (
            <TouchableOpacity
              key={address.id}
              style={[
                styles.addressCard,
                selectedAddress === address.id && styles.addressCardSelected,
              ]}
              onPress={() => setSelectedAddress(address.id)}
              activeOpacity={0.7}
            >
              <View style={styles.radioButton}>
                {selectedAddress === address.id && <View style={styles.radioButtonInner} />}
              </View>
              
              <View style={styles.addressContent}>
                <View style={styles.addressHeader}>
                  <Text style={styles.addressLabel}>{address.label}</Text>
                  <TouchableOpacity onPress={() => handleEditAddress(address.id)}>
                    <Ionicons name="create-outline" size={18} color={COLORS.gray400} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.addressText}>{address.address}</Text>
                <Text style={styles.addressText}>{address.city}</Text>
                {address.phone && (
                  <Text style={styles.addressPhone}>{address.phone}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.addAddressButton} onPress={handleAddNewAddress}>
            <Ionicons name="add" size={20} color={COLORS.primary} />
            <Text style={styles.addAddressText}>Add New Address</Text>
          </TouchableOpacity>
        </View>

        {/* Delivery Method Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="car-outline" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Delivery Method</Text>
          </View>

          {DELIVERY_METHODS.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.deliveryCard,
                selectedDelivery === method.id && styles.deliveryCardSelected,
              ]}
              onPress={() => setSelectedDelivery(method.id)}
              activeOpacity={0.7}
            >
              <View style={styles.radioButton}>
                {selectedDelivery === method.id && <View style={styles.radioButtonInner} />}
              </View>
              
              <View style={styles.deliveryContent}>
                <View style={styles.deliveryHeader}>
                  <Text style={styles.deliveryName}>{method.name}</Text>
                  {method.isEco && (
                    <View style={styles.ecoBadge}>
                      <Ionicons name="leaf-outline" size={10} color={COLORS.primary} />
                      <Text style={styles.ecoBadgeText}>Eco</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.deliveryDescription}>{method.description}</Text>
              </View>
              
              <Text style={styles.deliveryPrice}>
                {method.price === 0 ? 'Free' : `$${method.price.toFixed(2)}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Order Subtotal (3 items)</Text>
            <Text style={styles.summaryValue}>${cartTotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={[
              styles.summaryValue,
              shippingCost === 0 && styles.summaryValueFree
            ]}>
              {shippingCost === 0 ? 'Free' : `$${shippingCost.toFixed(2)}`}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotal}>Total</Text>
            <Text style={styles.summaryTotal}>${total.toFixed(2)}</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.proceedButton}
          onPress={handleProceedToPayment}
          activeOpacity={0.9}
        >
          <Text style={styles.proceedButtonText}>Proceed to Payment</Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>
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
    paddingBottom: 24,
  },
  stepperContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepCompleted: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(17, 212, 33, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepActive: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  stepActiveText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  stepPending: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepPendingText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gray400,
  },
  stepLineCompleted: {
    width: 48,
    height: 2,
    backgroundColor: 'rgba(17, 212, 33, 0.2)',
  },
  stepLine: {
    width: 48,
    height: 2,
    backgroundColor: COLORS.gray200,
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.gray400,
    textTransform: 'uppercase',
  },
  stepLabelActive: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  addressCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    gap: 12,
  },
  addressCardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: 'rgba(17, 212, 33, 0.03)',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.gray300,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  addressContent: {
    flex: 1,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  addressText: {
    fontSize: 14,
    color: COLORS.gray600,
    lineHeight: 20,
  },
  addressPhone: {
    fontSize: 12,
    color: COLORS.gray400,
    marginTop: 4,
  },
  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(17, 212, 33, 0.05)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(17, 212, 33, 0.4)',
  },
  addAddressText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  deliveryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    gap: 12,
  },
  deliveryCardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: 'rgba(17, 212, 33, 0.03)',
  },
  deliveryContent: {
    flex: 1,
  },
  deliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  deliveryName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  ecoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(17, 212, 33, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  ecoBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
  },
  deliveryDescription: {
    fontSize: 12,
    color: COLORS.gray600,
  },
  deliveryPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  summaryCard: {
    marginHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.gray600,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  summaryValueFree: {
    color: COLORS.primary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.gray100,
    marginVertical: 8,
  },
  summaryTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  footer: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  proceedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  proceedButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});
