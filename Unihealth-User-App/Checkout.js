// src/screens/Checkout.js

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { ref, onValue, update, serverTimestamp } from 'firebase/database';
import { db } from '../../firebaseConfig';

const { width } = Dimensions.get('window');

export default function Checkout({ route, navigation }) {
  // --- 1. DATA & PARAMS ---
  const { totalPrice, totalItems } = route.params || {
    totalPrice: 0,
    totalItems: 0,
  };
  const REGISTERED_ADDRESS =
    'Flat 402, Green Apartments, HSR Layout, Bangalore';

  // --- 2. STATE ---
  const [deliveryMode, setDeliveryMode] = useState('instant');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [address, setAddress] = useState(REGISTERED_ADDRESS);
  const [isLocating, setIsLocating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('');
  const [ecoPackaging, setEcoPackaging] = useState(false);

  // --- 2b. WALLET STATE ---
  const auth = getAuth();
  const user = auth.currentUser;
  const safeEmail = user?.email?.replace(/\./g, '_') || 'guest_user';

  const [walletBalance, setWalletBalance] = useState(0);
  const [walletLoading, setWalletLoading] = useState(true);

  useEffect(() => {
    const walletRef = ref(db, `wallets/${safeEmail}`);
    const unsub = onValue(walletRef, snapshot => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setWalletBalance(data.balance || 0);
      } else {
        setWalletBalance(0);
      }
      setWalletLoading(false);
    });
    return () => unsub();
  }, [safeEmail]);

  // --- 3. CALCULATIONS ---
  const deliveryFee = deliveryMode === 'instant' ? 40 : 15;
  const platformFee = 5;
  const grandTotal = totalPrice + deliveryFee + platformFee;

  // --- 4. DYNAMIC SLOTS ---
  const timeSlots = useMemo(() => {
    const slots = [];
    const now = new Date();
    const currentHour = now.getHours();
    for (let i = 1; i <= 3; i++) {
      const start = currentHour + i * 2;
      if (start < 21) {
        const label = start > 12 ? `${start - 12} PM` : `${start} AM`;
        const endLabel =
          start + 2 > 12 ? `${start + 2 - 12} PM` : `${start + 2} AM`;
        slots.push(`Today, ${label} - ${endLabel}`);
      }
    }
    slots.push('Tomorrow, 09 AM - 11 AM', 'Tomorrow, 04 PM - 06 PM');
    return slots;
  }, []);

  // --- 5. HANDLERS ---

  const finalizeOrder = () => {
    setIsProcessing(true);
    setProcessStep('AI verifying prescription...');

    setTimeout(() => {
      setProcessStep('Digital Pharmacist reviewing...');
      setTimeout(() => {
        setProcessStep('Order Verified ✅');
        setTimeout(() => {
          setIsProcessing(false);
          navigation.navigate('OrderTracking', {
            orderDetails: { grandTotal, address },
          });
        }, 800);
      }, 1200);
    }, 1200);
  };

  const openGPay = async () => {
    const upiUrl = `upi://pay?pa=healthplus@bank&pn=HealthPlusPharmacy&am=${grandTotal}&cu=INR`;
    try {
      const canOpen = await Linking.canOpenURL(upiUrl);
      if (canOpen) {
        await Linking.openURL(upiUrl);
      } else {
        Alert.alert(
          'Payment Gateway',
          'UPI Intent triggered. Simulating secure payment response...',
          [{ text: 'Continue', onPress: () => finalizeOrder() }]
        );
      }
    } catch (err) {
      Alert.alert('Error', 'Could not launch Payment App');
    }
  };

  const payWithWallet = async () => {
    if (walletLoading) {
      Alert.alert('Wallet', 'Loading wallet balance. Please wait.');
      return;
    }

    if (walletBalance < grandTotal) {
      Alert.alert(
        'Wallet',
        `Insufficient wallet balance. Available: ₹${walletBalance}, required: ₹${grandTotal}.`
      );
      return;
    }

    try {
      if (!user) {
        Alert.alert('Wallet', 'User not logged in.');
        return;
      }

      setIsProcessing(true);
      setProcessStep('Reserving amount from wallet...');

      const newBalance = walletBalance - grandTotal;
      const walletRef = ref(db, `wallets/${safeEmail}`);
      await update(walletRef, {
        balance: newBalance,
        lastUpdated: serverTimestamp(),
      });

      setWalletBalance(newBalance);

      setTimeout(() => {
        setProcessStep('Order Verified ✅');
        setTimeout(() => {
          setIsProcessing(false);
          navigation.navigate('OrderTracking', {
            orderDetails: { grandTotal, address, paidVia: 'WALLET' },
          });
        }, 800);
      }, 1200);
    } catch (e) {
      setIsProcessing(false);
      Alert.alert('Wallet', 'Could not complete wallet payment. Try again.');
    }
  };

  const handlePlaceOrder = () => {
    if (deliveryMode === 'scheduled' && !selectedSlot) {
      Alert.alert(
        'Delivery Slot',
        'Please select a time slot for your scheduled delivery.'
      );
      return;
    }

    if (paymentMethod === 'UPI') {
      openGPay();
      return;
    }

    if (paymentMethod === 'WALLET') {
      payWithWallet();
      return;
    }

    // CARD / COD
    finalizeOrder();
  };

  const handleGPSLocation = () => {
    setIsLocating(true);
    setTimeout(() => {
      setAddress('12th Main, Indiranagar, Bangalore (GPS Location 📍)');
      setIsLocating(false);
    }, 2000);
  };

  const PaymentRadioLabel = method => {
    if (method === 'WALLET') return 'HealthConnect Wallet';
    if (method === 'UPI') return 'UPI (GPay/PhonePe)';
    if (method === 'CARD') return 'Credit/Debit Card';
    if (method === 'COD') return 'Cash on Delivery';
    return method;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#1a3c5a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ADDRESS CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.row}>
              <Ionicons name="location" size={20} color="#e74c3c" />
              <Text style={styles.cardTitle}>Delivery Address</Text>
            </View>
            <TouchableOpacity onPress={handleGPSLocation}>
              {isLocating ? (
                <ActivityIndicator size="small" color="#25a29a" />
              ) : (
                <Text style={styles.gpsText}>Use GPS</Text>
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.addressDisplay}>{address}</Text>
        </View>

        {/* DELIVERY MODE */}
        <Text style={styles.sectionLabel}>Delivery Mode</Text>
        <View style={styles.deliveryRow}>
          <TouchableOpacity
            style={[
              styles.deliveryBox,
              deliveryMode === 'instant' && styles.activeBox,
            ]}
            onPress={() => {
              setDeliveryMode('instant');
              setSelectedSlot(null);
            }}
          >
            <MaterialCommunityIcons
              name="lightning-bolt"
              size={24}
              color={deliveryMode === 'instant' ? '#fff' : '#25a29a'}
            />
            <Text
              style={[
                styles.deliveryLabel,
                deliveryMode === 'instant' && styles.whiteText,
              ]}
            >
              Instant
            </Text>
            <Text
              style={[
                styles.deliveryTime,
                deliveryMode === 'instant' && styles.whiteText,
              ]}
            >
              15-20 Mins
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.deliveryBox,
              deliveryMode === 'scheduled' && styles.activeBox,
            ]}
            onPress={() => setDeliveryMode('scheduled')}
          >
            <Ionicons
              name="calendar"
              size={22}
              color={deliveryMode === 'scheduled' ? '#fff' : '#25a29a'}
            />
            <Text
              style={[
                styles.deliveryLabel,
                deliveryMode === 'scheduled' && styles.whiteText,
              ]}
            >
              Scheduled
            </Text>
            <Text
              style={[
                styles.deliveryTime,
                deliveryMode === 'scheduled' && styles.whiteText,
              ]}
            >
              Pick a Slot
            </Text>
          </TouchableOpacity>
        </View>

        {/* TIME SLOTS */}
        {deliveryMode === 'scheduled' && (
          <View style={styles.slotBox}>
            <Text style={styles.slotHeader}>Select Available Time</Text>
            {timeSlots.map(slot => (
              <TouchableOpacity
                key={slot}
                style={[
                  styles.slotItem,
                  selectedSlot === slot && styles.activeSlotItem,
                ]}
                onPress={() => setSelectedSlot(slot)}
              >
                <Text
                  style={[
                    styles.slotText,
                    selectedSlot === slot && styles.activeSlotText,
                  ]}
                >
                  {slot}
                </Text>
                {selectedSlot === slot && (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color="#25a29a"
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* SAFETY: COLD CHAIN ASSURANCE */}
        <View style={styles.coldChainCard}>
          <View style={styles.row}>
            <View style={styles.iceIconBg}>
              <MaterialCommunityIcons
                name="snowflake"
                size={22}
                color="#2980b9"
              />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.coldChainTitle}>Cold Chain Delivery</Text>
              <Text style={styles.coldChainSub}>
                Temperature controlled for medicine potency.
              </Text>
            </View>
            <View style={styles.tempBadge}>
              <Text style={styles.tempText}>4°C - 8°C</Text>
            </View>
          </View>
        </View>

        {/* PAYMENT METHOD */}
        <Text style={styles.sectionLabel}>Payment Method</Text>
        <View style={styles.paymentContainer}>
          {['WALLET', 'UPI', 'CARD', 'COD'].map(method => (
            <TouchableOpacity
              key={method}
              style={[
                styles.payItem,
                paymentMethod === method && styles.activePay,
              ]}
              onPress={() => setPaymentMethod(method)}
            >
              <Ionicons
                name={
                  method === 'UPI'
                    ? 'flash'
                    : method === 'CARD'
                    ? 'card'
                    : method === 'COD'
                    ? 'cash'
                    : 'wallet'
                }
                size={20}
                color={
                  paymentMethod === method ? '#25a29a' : '#7f8c8d'
                }
              />
              <Text
                style={[
                  styles.payLabel,
                  paymentMethod === method && styles.activePayText,
                ]}
              >
                {PaymentRadioLabel(method)}
              </Text>

              {method === 'WALLET' && (
                <View style={styles.walletPill}>
                  {walletLoading ? (
                    <ActivityIndicator size="small" color="#0f766e" />
                  ) : (
                    <Text style={styles.walletPillText}>
                      ₹{walletBalance}
                    </Text>
                  )}
                </View>
              )}

              <View
                style={[
                  styles.radio,
                  paymentMethod === method && styles.radioActive,
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* SOCIAL IMPACT: ECO PACKAGING */}
        <View style={styles.impactCard}>
          <View style={styles.row}>
            <MaterialCommunityIcons
              name="leaf"
              size={24}
              color="#27ae60"
            />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.impactTitle}>Eco-Friendly Packaging</Text>
              <Text style={styles.impactSub}>
                Using recycled paper bags to reduce waste.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setEcoPackaging(!ecoPackaging)}
            >
              <Ionicons
                name={ecoPackaging ? 'checkbox' : 'square-outline'}
                size={26}
                color="#27ae60"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* BILL SUMMARY */}
        <View style={styles.billCard}>
          <Text style={styles.billTitle}>Bill Summary</Text>
          <View style={styles.billRow}>
            <Text style={styles.bText}>
              Item Total ({totalItems})
            </Text>
            <Text>₹{totalPrice}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.bText}>Delivery Fee</Text>
            <Text>₹{deliveryFee}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.bText}>Platform Fee</Text>
            <Text>₹{platformFee}</Text>
          </View>

          <View style={[styles.billRow, styles.totalRow]}>
            <Text style={styles.totalText}>Grand Total</Text>
            <Text style={styles.totalText}>₹{grandTotal}</Text>
          </View>

          {/* COMPLIANCE BADGE */}
          <View style={styles.safetyBadge}>
            <Ionicons
              name="shield-checkmark"
              size={16}
              color="#25a29a"
            />
            <Text style={styles.safetyBadgeText}>
              WHO-GPP COMPLIANT DELIVERY
            </Text>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.payBtn}
          onPress={handlePlaceOrder}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <View style={styles.row}>
              <ActivityIndicator
                color="#fff"
                style={{ marginRight: 10 }}
              />
              <Text style={styles.payAction}>
                {processStep || 'Processing...'}
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.payAction}>
                {paymentMethod === 'WALLET'
                  ? 'PAY VIA WALLET'
                  : paymentMethod === 'UPI'
                  ? 'PAY VIA UPI'
                  : 'PLACE ORDER'}{' '}
                • ₹{grandTotal}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color="#fff"
              />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: { padding: 5 },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 15,
    color: '#1a3c5a',
  },
  content: { padding: 20 },
  card: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 20,
    marginBottom: 15,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: { fontWeight: 'bold', color: '#1a3c5a', marginLeft: 8 },
  gpsText: { color: '#25a29a', fontWeight: 'bold', fontSize: 13 },
  addressDisplay: { color: '#4A5568', fontSize: 14, lineHeight: 20 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#7f8c8d',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deliveryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  deliveryBox: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  activeBox: {
    backgroundColor: '#25a29a',
    borderColor: '#25a29a',
  },
  deliveryLabel: { fontWeight: 'bold', marginTop: 8 },
  deliveryTime: { fontSize: 11, color: '#7f8c8d' },
  whiteText: { color: '#fff' },
  slotBox: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    marginBottom: 20,
  },
  slotHeader: {
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1a3c5a',
  },
  slotItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  activeSlotItem: { borderBottomColor: '#25a29a' },
  slotText: { color: '#4A5568' },
  activeSlotText: { color: '#25a29a', fontWeight: 'bold' },
  coldChainCard: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bbdefb',
  },
  iceIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  coldChainTitle: {
    fontWeight: 'bold',
    color: '#1a3c5a',
    fontSize: 14,
  },
  coldChainSub: { color: '#546e7a', fontSize: 11, marginTop: 2 },
  tempBadge: {
    backgroundColor: '#2980b9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tempText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  paymentContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 1,
  },
  payItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  activePay: { backgroundColor: '#f0faf9' },
  payLabel: {
    flex: 1,
    marginLeft: 15,
    color: '#1a3c5a',
    fontSize: 14,
  },
  activePayText: { color: '#25a29a', fontWeight: 'bold' },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#bdc3c7',
  },
  radioActive: { borderColor: '#25a29a', backgroundColor: '#25a29a' },
  walletPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#ecfdf5',
    marginRight: 8,
  },
  walletPillText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '700',
  },
  impactCard: {
    backgroundColor: '#ebf9f1',
    padding: 15,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#d1f2e1',
  },
  impactTitle: {
    fontWeight: 'bold',
    color: '#1a3c5a',
    fontSize: 14,
  },
  impactSub: { color: '#27ae60', fontSize: 11 },
  billCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    elevation: 2,
  },
  billTitle: {
    fontWeight: 'bold',
    color: '#1a3c5a',
    marginBottom: 15,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  bText: { color: '#7f8c8d' },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#f1f1f1',
    marginTop: 12,
    paddingTop: 12,
  },
  totalText: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#1a3c5a',
  },
  safetyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f6f5',
    padding: 8,
    borderRadius: 10,
    marginTop: 15,
  },
  safetyBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#25a29a',
    marginLeft: 5,
    letterSpacing: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  payBtn: {
    backgroundColor: '#1a3c5a',
    padding: 18,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  payAction: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    marginRight: 10,
  },
});
