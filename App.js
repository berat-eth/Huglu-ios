import React, { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import { View, ActivityIndicator, AppState, Linking } from 'react-native';
import { productsAPI } from './src/services/api';
import analytics from './src/services/analytics';
import safeLog from './src/utils/safeLogger';
import BiometricLockOverlay from './src/components/BiometricLockOverlay';
import { useTranslation } from 'react-i18next';
import {
  authenticateWithBiometrics,
  getBiometricLockEnabled,
  getBiometricSupport,
} from './src/utils/biometricLock';

// Kritik ekranlar - statik import (hızlı erişim için)
import SplashScreen from './src/screens/SplashScreen';
import MaintenanceScreen from './src/screens/MaintenanceScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProductListScreen from './src/screens/ProductListScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import WishlistScreen from './src/screens/WishlistScreen';

// Lazy loading - sadece gerektiğinde yüklenecek
const SignUpScreen = lazy(() => import('./src/screens/SignUpScreen'));
const ForgotPasswordScreen = lazy(() => import('./src/screens/ForgotPasswordScreen'));
const ProductDetailScreen = lazy(() => import('./src/screens/ProductDetailScreen'));
const CartScreen = lazy(() => import('./src/screens/CartScreen'));
const PaymentMethodScreen = lazy(() => import('./src/screens/PaymentMethodScreen'));
const OrderConfirmationScreen = lazy(() => import('./src/screens/OrderConfirmationScreen'));
const OrderTrackingScreen = lazy(() => import('./src/screens/OrderTrackingScreen'));
const PickupOrdersScreen = lazy(() => import('./src/screens/PickupOrdersScreen'));
const OrderDetailScreen = lazy(() => import('./src/screens/OrderDetailScreen'));
const NotificationsScreen = lazy(() => import('./src/screens/NotificationsScreen'));
const SearchScreen = lazy(() => import('./src/screens/SearchScreen'));
const CampaignsScreen = lazy(() => import('./src/screens/CampaignsScreen'));
const LiveChatScreen = lazy(() => import('./src/screens/LiveChatScreen'));
const LiveChatEntryScreen = lazy(() => import('./src/screens/LiveChatEntryScreen'));
const FAQScreen = lazy(() => import('./src/screens/FAQScreen'));
const SettingsScreen = lazy(() => import('./src/screens/SettingsScreen'));
const TermsOfServiceScreen = lazy(() => import('./src/screens/TermsOfServiceScreen'));
const PrivacyPolicyScreen = lazy(() => import('./src/screens/PrivacyPolicyScreen'));
const ChangePasswordScreen = lazy(() => import('./src/screens/ChangePasswordScreen'));
const TwoFactorAuthScreen = lazy(() => import('./src/screens/TwoFactorAuthScreen'));
const B2BCreditScreen = lazy(() => import('./src/screens/B2BCreditScreen'));
const B2BInvoiceScreen = lazy(() => import('./src/screens/B2BInvoiceScreen'));
const B2BProductCatalogScreen = lazy(() => import('./src/screens/B2BProductCatalogScreen'));
const B2BReportsScreen = lazy(() => import('./src/screens/B2BReportsScreen'));
const B2BUsersScreen = lazy(() => import('./src/screens/B2BUsersScreen'));
const B2BBulkOrderScreen = lazy(() => import('./src/screens/B2BBulkOrderScreen'));
const LanguageScreen = lazy(() => import('./src/screens/LanguageScreen'));
const PersonalInfoScreen = lazy(() => import('./src/screens/PersonalInfoScreen'));
const PhysicalStoresScreen = lazy(() => import('./src/screens/PhysicalStoresScreen'));
const WalletScreen = lazy(() => import('./src/screens/WalletScreen'));
const WalletTransferScreen = lazy(() => import('./src/screens/WalletTransferScreen'));
const FlashDealsScreen = lazy(() => import('./src/screens/FlashDealsScreen'));
const ReferralScreen = lazy(() => import('./src/screens/ReferralScreen'));
const ChatHistoryScreen = lazy(() => import('./src/screens/ChatHistoryScreen'));
const ShippingInformationScreen = lazy(() => import('./src/screens/ShippingInformationScreen'));
const DailyRewardScreen = lazy(() => import('./src/screens/DailyRewardScreen'));
const QuestScreen = lazy(() => import('./src/screens/QuestScreen'));
const WelcomeBonusScreen = lazy(() => import('./src/screens/WelcomeBonusScreen'));
const SocialShareScreen = lazy(() => import('./src/screens/SocialShareScreen'));
const WholesaleScreen = lazy(() => import('./src/screens/WholesaleScreen'));
const WholesaleStatusScreen = lazy(() => import('./src/screens/WholesaleStatusScreen'));
const MyAddressesScreen = lazy(() => import('./src/screens/MyAddressesScreen'));
const AddAddressScreen = lazy(() => import('./src/screens/AddAddressScreen'));
const ReturnRequestScreen = lazy(() => import('./src/screens/ReturnRequestScreen'));
const ReturnRequestsListScreen = lazy(() => import('./src/screens/ReturnRequestsListScreen'));
const InvoicesScreen = lazy(() => import('./src/screens/InvoicesScreen'));
const UserLevelScreen = lazy(() => import('./src/screens/UserLevelScreen'));
const PriceAlertsScreen = lazy(() => import('./src/screens/PriceAlertsScreen'));
const BadgesScreen = lazy(() => import('./src/screens/BadgesScreen'));
const StyleAdvisorScreen = lazy(() => import('./src/screens/StyleAdvisorScreen'));
const AiRoutePlannerScreen = lazy(() => import('./src/screens/AiRoutePlannerScreen'));

// Loading component
const ScreenLoader = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
    <ActivityIndicator size="large" color="#11d421" />
  </View>
);

// Lazy wrapper component
const LazyScreen = ({ component: Component, ...props }) => (
  <Suspense fallback={<ScreenLoader />}>
    <Component {...props} />
  </Suspense>
);

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const PRIMARY_COLOR = '#11d421';

// Deep Linking Configuration
const linking = {
  prefixes: ['hugluoutdoor://', 'https://huglutekstil.com'],
  config: {
    screens: {
      ProductDetail: {
        path: 'urunler/:productId',
        parse: {
          productId: (productId) => productId,
        },
      },
    },
  },
  // Custom getInitialURL handler
  async getInitialURL() {
    // First, check if the app was opened via a deep link
    const url = await Linking.getInitialURL();
    if (url != null) {
      return url;
    }
    return null;
  },
  // Custom subscribe handler for listening to incoming links
  subscribe(listener) {
    const onReceiveURL = ({ url }) => listener(url);
    // Listen for incoming links from deep linking
    const subscription = Linking.addEventListener('url', onReceiveURL);
    return () => {
      subscription.remove();
    };
  },
};

function MainTabs() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'compass' : 'compass-outline';
          else if (route.name === 'Shop') iconName = focused ? 'storefront' : 'storefront-outline';
          else if (route.name === 'Wishlist') iconName = focused ? 'heart' : 'heart-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';

          const activeBg = PRIMARY_COLOR;
          const inactiveColor = '#9CA3AF';

          return (
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: focused ? activeBg : 'transparent',
              }}
            >
              <Ionicons
                name={iconName}
                size={20}
                color={focused ? '#FFFFFF' : inactiveColor}
              />
            </View>
          );
        },
        tabBarActiveTintColor: PRIMARY_COLOR,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 16,
          height: 64,
          borderRadius: 32,
          backgroundColor: '#1F2933',
          borderTopWidth: 0,
          elevation: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 10,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 0,
        },
        tabBarShowLabel: false,
      })}
      sceneContainerStyle={{
        paddingBottom: 80,
        backgroundColor: 'transparent',
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('tabs.home') }} />
      <Tab.Screen name="Shop" component={ProductListScreen} options={{ title: t('tabs.shop') }} />
      <Tab.Screen name="Wishlist" component={WishlistScreen} options={{ title: t('tabs.wishlist') }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: t('tabs.profile') }} />
    </Tab.Navigator>
  );
}


function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const { t } = useTranslation();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);
  const [biometricLocked, setBiometricLocked] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricError, setBiometricError] = useState('');
  const hasPromptedOnceRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          ...Ionicons.font,
        });
        setFontsLoaded(true);
      } catch (error) {
        safeLog.error('Error loading fonts:', error);
        setFontsLoaded(true); // Continue anyway
      }
    }
    loadFonts();
    
    // Analytics'i başlat
    async function initAnalytics() {
      try {
        await analytics.initialize();
        await analytics.startSession();
        // Session heartbeat - her 30 saniyede bir
        setInterval(() => {
          analytics.heartbeat();
        }, 30000);
      } catch (error) {
        safeLog.error('Analytics initialization error:', error);
      }
    }
    initAnalytics();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initBiometrics() {
      try {
        const enabled = await getBiometricLockEnabled();
        const support = await getBiometricSupport();
        if (!isMounted) return;
        setBiometricEnabled(enabled);
        setBiometricSupported(!!support?.hasHardware);
        setBiometricEnrolled(!!support?.isEnrolled);

        // Soğuk başlangıçta: ayar açık ve biyometri uygunsa kilitle
        if (enabled && support?.hasHardware && support?.isEnrolled) {
          setBiometricLocked(true);
        }
      } catch (e) {
        safeLog.error('Biometric init error:', e?.message || e);
      }
    }

    initBiometrics();

    return () => {
      isMounted = false;
    };
  }, []);

  async function runBiometricUnlock({ reason } = {}) {
    if (!biometricEnabled || !biometricSupported || !biometricEnrolled) {
      setBiometricLocked(false);
      setBiometricError('');
      return;
    }
    if (biometricBusy) return;

    try {
      setBiometricBusy(true);
      setBiometricError('');
      const result = await authenticateWithBiometrics({
        promptMessage: t('lock.prompt'),
        cancelLabel: t('common.cancel'),
        disableDeviceFallback: false,
      });

      if (result?.success) {
        setBiometricLocked(false);
        setBiometricError('');
        return;
      }

      // Kullanıcı iptal etti / başarısız
      const msg =
        result?.error === 'user_cancel' || result?.error === 'system_cancel'
          ? t('lock.canceled')
          : t('lock.failed');
      setBiometricError(msg);
      setBiometricLocked(true);
      safeLog.warn('Biometric auth failed', { reason, error: result?.error });
    } catch (e) {
      setBiometricError(t('lock.error'));
      setBiometricLocked(true);
      safeLog.error('Biometric auth error:', e?.message || e);
    } finally {
      setBiometricBusy(false);
    }
  }

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextAppState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextAppState;

      // background -> active: tekrar kilitle
      if (prev && prev.match(/inactive|background/) && nextAppState === 'active') {
        if (biometricEnabled && biometricSupported && biometricEnrolled) {
          setBiometricLocked(true);
          hasPromptedOnceRef.current = false;
        }
      }
    });

    return () => sub?.remove?.();
  }, [biometricEnabled, biometricSupported, biometricEnrolled]);

  useEffect(() => {
    // Kilit açma promptunu overlay görünür olduğunda çalıştır
    if (!biometricLocked) return;
    if (hasPromptedOnceRef.current) return;
    hasPromptedOnceRef.current = true;
    runBiometricUnlock({ reason: 'auto_prompt' });
  }, [biometricLocked]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#11d421' }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <NavigationContainer
        theme={{
          colors: {
            primary: PRIMARY_COLOR,
            background: 'transparent',
            card: 'transparent',
            text: '#0d1b0f',
            border: 'transparent',
            notification: PRIMARY_COLOR,
          },
        }}
        linking={linking}
        onReady={() => {
          // Navigation hazır olduğunda analytics'i başlat
          analytics.initialize().catch((error) => safeLog.error('Analytics init error:', error));
        }}
        onStateChange={(state) => {
          // Screen değişikliklerini track et
          if (state) {
            const route = state.routes[state.index];
            if (route) {
              const screenName = route.name;
              analytics.trackScreenView(screenName).catch((error) => safeLog.error('Screen tracking error:', error));
            }
          }
        }}
      >
        <StatusBar style="auto" />
        <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen 
            name="Maintenance" 
            component={MaintenanceScreen}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp">
            {props => <LazyScreen component={SignUpScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="ForgotPassword">
            {props => <LazyScreen component={ForgotPasswordScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen
            name="Main"
            component={MainTabs}
            options={{ cardStyle: { backgroundColor: 'transparent' } }}
          />
          <Stack.Screen name="ProductDetail">
            {props => <LazyScreen component={ProductDetailScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="Cart">
            {props => <LazyScreen component={CartScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="PaymentMethod">
            {props => <LazyScreen component={PaymentMethodScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="OrderConfirmation">
            {props => <LazyScreen component={OrderConfirmationScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="OrderTracking">
            {props => <LazyScreen component={OrderTrackingScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="PickupOrders">
            {props => <LazyScreen component={PickupOrdersScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="OrderDetail">
            {props => <LazyScreen component={OrderDetailScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="Notifications">
            {props => <LazyScreen component={NotificationsScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="Search">
            {props => <LazyScreen component={SearchScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="Campaigns">
            {props => <LazyScreen component={CampaignsScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="LiveChatEntry">
            {props => <LazyScreen component={LiveChatEntryScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="LiveChat">
            {props => <LazyScreen component={LiveChatScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="FAQ">
            {props => <LazyScreen component={FAQScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="Settings">
            {props => <LazyScreen component={SettingsScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="TermsOfService">
            {props => <LazyScreen component={TermsOfServiceScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="PrivacyPolicy">
            {props => <LazyScreen component={PrivacyPolicyScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="ChangePassword">
            {props => <LazyScreen component={ChangePasswordScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="TwoFactorAuth">
            {props => <LazyScreen component={TwoFactorAuthScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="Language">
            {props => <LazyScreen component={LanguageScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="PersonalInfo">
            {props => <LazyScreen component={PersonalInfoScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="PhysicalStores">
            {props => <LazyScreen component={PhysicalStoresScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="Wallet">
            {props => <LazyScreen component={WalletScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="WalletTransfer">
            {props => <LazyScreen component={WalletTransferScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="UserLevel">
            {props => <LazyScreen component={UserLevelScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="PriceAlerts">
            {props => <LazyScreen component={PriceAlertsScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="Badges">
            {props => <LazyScreen component={BadgesScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="StyleAdvisor">
            {props => <LazyScreen component={StyleAdvisorScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="FlashDeals">
            {props => <LazyScreen component={FlashDealsScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="Referral">
            {props => <LazyScreen component={ReferralScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="ChatHistory">
            {props => <LazyScreen component={ChatHistoryScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="ShippingInformation">
            {props => <LazyScreen component={ShippingInformationScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="MyAddresses">
            {props => <LazyScreen component={MyAddressesScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="AddAddress">
            {props => <LazyScreen component={AddAddressScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="ReturnRequest">
            {props => <LazyScreen component={ReturnRequestScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="ReturnRequests">
            {props => <LazyScreen component={ReturnRequestsListScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="Invoices">
            {props => <LazyScreen component={InvoicesScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="DailyReward">
            {props => <LazyScreen component={DailyRewardScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="Quest">
            {props => <LazyScreen component={QuestScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="WelcomeBonus">
            {props => <LazyScreen component={WelcomeBonusScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="SocialShare">
            {props => <LazyScreen component={SocialShareScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="Wholesale">
            {props => <LazyScreen component={WholesaleScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="WholesaleStatus">
            {props => <LazyScreen component={WholesaleStatusScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="AiRoutePlanner">
            {props => <LazyScreen component={AiRoutePlannerScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="B2BCredit">
            {props => <LazyScreen component={B2BCreditScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="B2BInvoice">
            {props => <LazyScreen component={B2BInvoiceScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="B2BProductCatalog">
            {props => <LazyScreen component={B2BProductCatalogScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="B2BReports">
            {props => <LazyScreen component={B2BReportsScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="B2BUsers">
            {props => <LazyScreen component={B2BUsersScreen} {...props} />}
          </Stack.Screen>
          <Stack.Screen name="B2BBulkOrder">
            {props => <LazyScreen component={B2BBulkOrderScreen} {...props} />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>

      <BiometricLockOverlay
        visible={biometricLocked}
        busy={biometricBusy}
        errorText={biometricError}
        onRetry={() => runBiometricUnlock({ reason: 'manual_retry' })}
      />
    </View>
  );
}

export default App;
