// src/screens/PatientHome.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Vibration,
  Alert,
  TextInput,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { getAuth } from 'firebase/auth';
import { ref, push, set, serverTimestamp, onValue, update } from 'firebase/database';
import { db } from '../../firebaseConfig';

const { width } = Dimensions.get('window');
const HOSPITAL_ID = 'UH-HOS-00000'; // Member 2 demo hospital

export default function PatientHome({ navigation, route }) {
  const [sosActive, setSosActive] = useState(false);
  const [hospitalStatus, setHospitalStatus] = useState('normal');
  const [hospitalStats, setHospitalStats] = useState(null);
  const [hospitalCore, setHospitalCore] = useState(null);
  const [todayTokens, setTodayTokens] = useState(0);
  const [todayEmergencyTokens, setTodayEmergencyTokens] = useState(0);

  const [walletBalance, setWalletBalance] = useState(0);
  const [walletLoading, setWalletLoading] = useState(true);
  const [showWalletAdd, setShowWalletAdd] = useState(false);
  const [walletAmountInput, setWalletAmountInput] = useState('');

  // NEW: emergency sheet state
  const [showEmergencySheet, setShowEmergencySheet] = useState(false);
  const [lastEmergencyMeta, setLastEmergencyMeta] = useState(null);

  const auth = getAuth();
  const user = auth.currentUser;
  const isGuest = route?.params?.isGuest === true;
  const safeEmail = user?.email?.replace(/\./g, '_') || 'guest_user';

  // Live emergency dashboard summary
  useEffect(() => {
    const statusRef = ref(db, `Hospitals/${HOSPITAL_ID}/emergency_dashboard`);
    const unsubStatus = onValue(statusRef, snapshot => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setHospitalStatus(data.status || 'normal');
        setHospitalStats(data);
      } else {
        setHospitalStatus('normal');
        setHospitalStats(null);
      }
    });
    return unsubStatus;
  }, []);

  // Core hospital node
  useEffect(() => {
    const hospitalRef = ref(db, `Hospitals/${HOSPITAL_ID}`);
    const unsubCore = onValue(hospitalRef, snapshot => {
      if (snapshot.exists()) {
        setHospitalCore(snapshot.val());
      } else {
        setHospitalCore(null);
      }
    });
    return unsubCore;
  }, []);

  // Today’s token snapshot from queue (legacy summary – kept as-is)
  useEffect(() => {
    const queueRef = ref(db, `Hospitals/${HOSPITAL_ID}/queue`);
    const unsubQueue = onValue(queueRef, snapshot => {
      if (!snapshot.exists()) {
        setTodayTokens(0);
        setTodayEmergencyTokens(0);
        return;
      }
      const data = snapshot.val();
      setTodayTokens(data.todayBookings || 0);
      setTodayEmergencyTokens(data.emergencyBookingsToday || 0);
    });
    return unsubQueue;
  }, []);

  // Wallet listener (skip writes for guest later)
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
    return unsub;
  }, [safeEmail]);

  // UPDATED SOS logic → audit_logs + emergency token + sheet (allowed for guest)
  const handleSOS = async () => {
    setSosActive(true);
    Vibration.vibrate([0, 500, 200, 500]);

    const newLogRef = push(ref(db, `Hospitals/${HOSPITAL_ID}/audit_logs`));

    // You can later replace this with a quick picker
    const emergencyType = 'Unknown';
    const priority = 'high';

    try {
      await set(newLogRef, {
        type: 'SOS_ALERT',
        patientEmail: user?.email || (isGuest ? 'Guest' : 'Unknown'),
        user: isGuest ? 'GuestPatient' : 'Patient',
        emergencyType,
        priority,
        timestamp: serverTimestamp(),
        hospitalStatusAtTime: hospitalStatus,
      });

      // Auto-create emergency token for today (optional but useful)
      const now = new Date();
      const dateKey = now.toISOString().slice(0, 10); // YYYY-MM-DD
      const tokensRef = ref(db, `Hospitals/${HOSPITAL_ID}/tokens/${dateKey}`);
      const newTokenRef = push(tokensRef);

      const tokenData = {
        tokenId: newTokenRef.key,
        type: 'emergency',
        mode: 'emergency',
        status: 'waiting',
        priority,
        createdAt: serverTimestamp(),
        patientName:
          user?.email?.split('@')[0] || (isGuest ? 'Guest' : 'Unknown'),
        notes: `Auto-created from SOS (${emergencyType})`,
      };

      await set(newTokenRef, tokenData);

      setLastEmergencyMeta({
        logId: newLogRef.key,
        tokenId: newTokenRef.key,
        dateKey,
      });

      // Show emergency actions dashboard instead of plain alert
      setShowEmergencySheet(true);
    } catch (e) {
      Alert.alert('Error', 'Signal failed. Please try again.');
    } finally {
      setTimeout(() => setSosActive(false), 2000);
    }
  };

  const AppTile = ({ label, icon, color, desc, onPress, disabled }) => (
    <TouchableOpacity
      style={[styles.tile, disabled && { opacity: 0.4 }]}
      onPress={() => {
        if (disabled) {
          Alert.alert('Login required', 'Please sign in to access this feature.');
          return;
        }
        onPress && onPress();
      }}
      activeOpacity={disabled ? 1 : 0.7}
    >
      <View style={[styles.tileIconContainer, { backgroundColor: `${color}15` }]}>
        <MaterialCommunityIcons
          name={icon}
          size={30}
          color={disabled ? '#9ca3af' : color}
        />
      </View>
      <View style={styles.tileTextContainer}>
        <Text style={styles.tileLabel}>{label}</Text>
        <Text style={styles.tileDesc}>{desc}</Text>
      </View>
    </TouchableOpacity>
  );

  const isOverloaded = hospitalStatus?.toLowerCase() === 'overloaded';
  const isBusy = hospitalStatus?.toLowerCase() === 'busy';

  const badgeBg =
    isOverloaded || isBusy ? '#ef444430' : 'rgba(255,255,255,0.1)';
  const pulseColor = isOverloaded ? '#ef4444' : isBusy ? '#f59e0b' : '#22c55e';

  const statusLabel =
    isOverloaded ? 'High stress' : isBusy ? 'Busy' : 'Stable today';

  const bedsFree = hospitalStats?.bedsAvailable ?? hospitalCore?.Bed ?? 0;
  const icuFree = hospitalStats?.icuAvailable ?? hospitalCore?.icubeds ?? 0;
  const avgWait = hospitalStats?.avgWait || '—';
  const doctorsOnDuty = hospitalStats?.doctorsOnDuty ?? 0; // kept even if not displayed yet

  const handleAddMoney = async () => {
    if (isGuest) {
      Alert.alert('Wallet', 'Please sign in to use wallet.');
      return;
    }

    const raw = walletAmountInput.trim();
    const amount = parseInt(raw, 10);

    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Wallet', 'Enter a valid amount to add.');
      return;
    }

    const upiUrl = `upi://pay?pa=healthplus@bank&pn=HealthConnectWalletTopup&am=${amount}&cu=INR`;

    try {
      const canOpen = await Linking.canOpenURL(upiUrl);

      if (canOpen) {
        await Linking.openURL(upiUrl);
        Alert.alert(
          'Wallet top‑up',
          'If payment was successful, tap Confirm to credit your wallet.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Confirm', onPress: () => creditWallet(amount) },
          ]
        );
      } else {
        Alert.alert(
          'UPI not available',
          'UPI app not detected. Simulating a successful top‑up for testing.',
          [
            {
              text: 'OK',
              onPress: () => creditWallet(amount),
            },
          ]
        );
      }
    } catch (e) {
      Alert.alert('Wallet', 'Could not open payment app. Try again.');
    }
  };

  const creditWallet = async amount => {
    try {
      const walletRef = ref(db, `wallets/${safeEmail}`);
      const newBalance = walletBalance + amount;

      await update(walletRef, {
        balance: newBalance,
        lastUpdated: serverTimestamp(),
      });

      setWalletAmountInput('');
      setShowWalletAdd(false);
      Alert.alert('Wallet', `₹${amount} added to your wallet.`);
    } catch (e) {
      Alert.alert('Wallet', 'Could not credit wallet. Try again.');
    }
  };

  // NEW: Emergency actions sheet component
  const EmergencyActionsSheet = () => {
    if (!showEmergencySheet) return null;

    return (
      <View style={styles.emergencyOverlay}>
        <View style={styles.emergencySheet}>
          <Text style={styles.emergencyTitle}>Emergency dashboard</Text>
          <Text style={styles.emergencySubtitle}>
            SOS sent to UniHealth. Choose your next step.
          </Text>

          <View style={styles.emergencyStatusRow}>
            <Text style={styles.emergencyStatusText}>
              Status: {hospitalStatus?.toUpperCase() || 'UNKNOWN'}
            </Text>
            <Text style={styles.emergencyStatusText}>
              Beds free: {bedsFree} • ICU: {icuFree}
            </Text>
            <Text style={styles.emergencyStatusSub}>
              Doctors on duty: {doctorsOnDuty} • Avg wait: {avgWait}
            </Text>
          </View>

          <View style={styles.emergencyButtonsRow}>
            <TouchableOpacity
              style={[styles.emergencyBtn, styles.emergencyPrimary]}
              onPress={() => {
                setShowEmergencySheet(false);
                navigation.navigate('NearbyHospitalsWithModes', {
                  mode: 'emergency',
                });
              }}
            >
              <MaterialCommunityIcons
                name="hospital-building"
                size={18}
                color="#f9fafb"
              />
              <Text style={styles.emergencyPrimaryText}>
                Nearest emergency hospital
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.emergencyBtn, styles.emergencySecondary]}
              onPress={() => {
                setShowEmergencySheet(false);
                navigation.navigate('EmergencyDashboard', {
                  hospitalId: HOSPITAL_ID,
                  mode: 'emergency',
                });
              }}
            >
              <MaterialCommunityIcons
                name="view-dashboard"
                size={18}
                color="#e5e7eb"
              />
              <Text style={styles.emergencySecondaryText}>
                Hospital live status
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.emergencyBtn, styles.emergencySecondary]}
              onPress={() => {
                setShowEmergencySheet(false);
                navigation.navigate('MyTokenStatus', {
                  hospitalId: HOSPITAL_ID,
                  focusEmergency: true,
                  dateKey: lastEmergencyMeta?.dateKey,
                  tokenId: lastEmergencyMeta?.tokenId,
                });
              }}
            >
              <MaterialCommunityIcons
                name="ticket-confirmation"
                size={18}
                color="#e5e7eb"
              />
              <Text style={styles.emergencySecondaryText}>
                View emergency token
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.emergencyBtn, styles.emergencySecondary]}
              onPress={() => {
                setShowEmergencySheet(false);
                navigation.navigate('MedicalRecords', {
                  filter: 'critical',
                });
              }}
            >
              <MaterialCommunityIcons
                name="file-document-outline"
                size={18}
                color="#e5e7eb"
              />
              <Text style={styles.emergencySecondaryText}>
                Show critical records
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.emergencyBtn, styles.emergencyCall]}
              onPress={() => {
                // Ideally read from hospitalCore.profile.phone
                Linking.openURL('tel:+919000000000');
              }}
            >
              <MaterialCommunityIcons name="phone" size={18} color="#fef2f2" />
              <Text style={styles.emergencyCallText}>Call hospital emergency</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.emergencyClose}
            onPress={() => setShowEmergencySheet(false)}
          >
            <Text style={styles.emergencyCloseText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={['#020617', '#0f172a', '#1e293b']}
        style={styles.topBg}
      >
        <SafeAreaView>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.welcomeText}>
                {isGuest ? 'Welcome, Guest' : 'Welcome back,'}
              </Text>
              {!isGuest && (
                <Text style={styles.userName}>
                  {user?.email?.split('@')[0] || 'Patient'}
                </Text>
              )}
            </View>

            {/* Live status pill */}
            <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
              <View
                style={[styles.pulseDot, { backgroundColor: pulseColor }]}
              />
              <Text style={styles.statusBadgeText}>
                {hospitalStatus?.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Today snapshot row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 20 }}
            contentContainerStyle={{ paddingRight: 24 }}
          >
            <View style={styles.chipCard}>
              <Text style={styles.chipLabel}>Hospital mood</Text>
              <Text style={styles.chipValue}>{statusLabel}</Text>
              <Text style={styles.chipSub}>Auto‑synced from admin</Text>
            </View>

            <View style={styles.chipCard}>
              <Text style={styles.chipLabel}>Beds free</Text>
              <Text style={styles.chipValue}>{bedsFree}</Text>
              <Text style={styles.chipSub}>
                ICU: {icuFree} • Wait: {avgWait}
              </Text>
            </View>

            <View style={styles.chipCard}>
              <Text style={styles.chipLabel}>Today’s flow</Text>
              <Text style={styles.chipValue}>{todayTokens}</Text>
              <Text style={styles.chipSub}>
                Emergency: {todayEmergencyTokens}
              </Text>
            </View>

            {/* EMERGENCY DASHBOARD TILE */}
            <TouchableOpacity
              style={[styles.chipCard, styles.chipAccent]}
              onPress={() =>
                navigation.navigate('EmergencyDashboard', {
                  hospitalId: HOSPITAL_ID,
                })
              }
            >
              <Text style={styles.chipLabel}>Emergency dashboard</Text>
              <Text style={styles.chipValue}>Open</Text>
              <Text style={styles.chipSub}>Live capacity & ICU status</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* SOS */}
          <View style={styles.sosWrapper}>
            <TouchableOpacity
              style={styles.sosCircle}
              onLongPress={handleSOS}
              delayLongPress={1500}
            >
              <LinearGradient
                colors={
                  sosActive ? ['#ef4444', '#991b1b'] : ['#f43f5e', '#fb7185']
                }
                style={styles.sosInternal}
              >
                <MaterialCommunityIcons
                  name="lightning-bolt"
                  size={32}
                  color="#fff"
                />
                <Text style={styles.sosMainText}>
                  {sosActive ? 'SOS SENT' : 'SOS'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.sosHint}>Hold for Emergency ping</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Body */}
      <SafeAreaView style={{ flex: 1 }}>
        <LinearGradient
          colors={['#f8fafc', '#e2e8f0']}
          style={{ flex: 1 }}
        >
          <View style={styles.contentBody}>
            {/* Smart row */}
            <View style={styles.smartRow}>
              <Text style={styles.sectionTitle}>Your health hub</Text>
              {!isGuest && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('SystemHealthMonitor')}
                >
                  <Text style={styles.systemText}>System status • Live</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {/* Quick actions strip – hide for guest */}
              {!isGuest && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 18 }}
                  contentContainerStyle={{ paddingHorizontal: 4 }}
                >
                  <TouchableOpacity
                    style={styles.quickAction}
                    onPress={() =>
                      navigation.navigate('HospitalGeneral', {
                        hospitalId: HOSPITAL_ID,
                        mode: 'general', // ensure general mode
                      })
                    }
                  >
                    <MaterialCommunityIcons
                      name="calendar-clock"
                      size={20}
                      color="#0f172a"
                    />
                    <Text style={styles.quickText}>General appointments</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickAction}
                    onPress={() =>
                      navigation.navigate('RequestToken', {
                        hospitalId: HOSPITAL_ID,
                        mode: 'general', // UniHealth OPD tokens
                      })
                    }
                  >
                    <MaterialCommunityIcons
                      name="ticket-confirmation"
                      size={20}
                      color="#0f172a"
                    />
                    <Text style={styles.quickText}>Book token</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickAction}
                    onPress={() => navigation.navigate('AIConsult')}
                  >
                    <MaterialCommunityIcons
                      name="robot-happy-outline"
                      size={20}
                      color="#0f172a"
                    />
                    <Text style={styles.quickText}>Ask AI</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickAction}
                    onPress={() => navigation.navigate('MedicalRecords')}
                  >
                    <MaterialCommunityIcons
                      name="file-document-outline"
                      size={20}
                      color="#0f172a"
                    />
                    <Text style={styles.quickText}>View records</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}

              {/* Main tiles */}
              <View style={styles.grid}>
                {/* Hospital tile → HospitalMode (Emergency / General) */}
                <AppTile
                  label="Hospital"
                  icon="hospital-building"
                  color="#3b82f6"
                  desc={
                    isOverloaded
                      ? 'High demand • Use nearest'
                      : isBusy
                      ? 'Busy • Check ETA'
                      : 'Stable • Fast care'
                  }
                  onPress={() => navigation.navigate('HospitalMode')}
                  disabled={false}
                />

                {/* General Care */}
                <AppTile
                  label="General Care"
                  icon="calendar-clock"
                  color="#0f766e"
                  desc="Plan OPD visits & consult"
                  onPress={() =>
                    navigation.navigate('HospitalGeneral', {
                      hospitalId: HOSPITAL_ID,
                      mode: 'general', // pass mode here too
                    })
                  }
                  disabled={isGuest}
                />

                {/* Wallet */}
                <AppTile
                  label="Wallet"
                  icon="wallet"
                  color="#22c55e"
                  desc={
                    walletLoading
                      ? 'Loading balance…'
                      : `Balance: ₹${walletBalance}`
                  }
                  onPress={() => setShowWalletAdd(true)}
                  disabled={isGuest}
                />

                {/* AI Consult */}
                <AppTile
                  label="AI Consult"
                  icon="robot-happy-outline"
                  color="#8b5cf6"
                  desc="Symptom triage in seconds"
                  onPress={() => navigation.navigate('AIConsult')}
                  disabled={isGuest}
                />

                {/* Pharmacy */}
                <AppTile
                  label="Pharmacy"
                  icon="pill"
                  color="#f59e0b"
                  desc="Order medicines & refills"
                  onPress={() => navigation.navigate('NearbyPharmacies')}
                  disabled={isGuest}
                />

                {/* Lab Tests */}
                <AppTile
                  label="Lab Tests"
                  icon="test-tube"
                  color="#0ea5e9"
                  desc="Book diagnostics & scans"
                  onPress={() => navigation.navigate('LabTestCart')}
                  disabled={isGuest}
                />

                {/* Family Hub */}
                <AppTile
                  label="Family Hub"
                  icon="heart-multiple"
                  color="#10b981"
                  desc="Manage family profiles"
                  onPress={() => navigation.navigate('FamilyHub')}
                  disabled={isGuest}
                />

                {/* My Tokens */}
                <AppTile
                  label="My Tokens"
                  icon="ticket-confirmation"
                  color="#ec4899"
                  desc="Track queue & ETA"
                  onPress={() =>
                    navigation.navigate('MyTokenStatus', {
                      hospitalId: HOSPITAL_ID,
                    })
                  }
                  disabled={isGuest}
                />

                {/* Records */}
                <AppTile
                  label="Records"
                  icon="folder-zip-outline"
                  color="#64748b"
                  desc="Prescriptions & labs"
                  onPress={() => navigation.navigate('MedicalRecords')}
                  disabled={isGuest}
                />
              </View>
            </ScrollView>
          </View>
        </LinearGradient>
      </SafeAreaView>

      {/* WALLET ADD-MONEY PANEL (blocked for guest) */}
      {showWalletAdd && !isGuest && (
        <View style={styles.walletOverlay}>
          <View style={styles.walletSheet}>
            <Text style={styles.walletTitle}>Add money to wallet</Text>
            <Text style={styles.walletSubtitle}>
              Current balance: ₹{walletBalance}
            </Text>

            <TextInput
              style={styles.walletInput}
              placeholder="Enter amount (₹)"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              value={walletAmountInput}
              onChangeText={setWalletAmountInput}
            />

            <View style={styles.walletButtonsRow}>
              <TouchableOpacity
                style={[styles.walletBtn, styles.walletCancel]}
                onPress={() => {
                  setShowWalletAdd(false);
                  setWalletAmountInput('');
                }}
              >
                <Text style={styles.walletCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.walletBtn, styles.walletConfirm]}
                onPress={handleAddMoney}
              >
                <Text style={styles.walletConfirmText}>Pay & add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* NEW: Emergency actions sheet after SOS */}
      <EmergencyActionsSheet />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#020617',
  },
  topBg: {
    height: 340,
    paddingHorizontal: 25,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 15,
  },
  welcomeText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
  userName: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    marginLeft: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipCard: {
    minWidth: 150,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(15,23,42,0.75)',
    marginRight: 10,
  },
  chipAccent: {
    backgroundColor: '#0f766e',
  },
  chipLabel: {
    color: '#cbd5f5',
    fontSize: 11,
    fontWeight: '600',
  },
  chipValue: {
    color: '#e5e7eb',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  chipSub: {
    color: '#9ca3af',
    fontSize: 10,
    marginTop: 2,
  },
  sosWrapper: {
    alignItems: 'center',
    marginTop: 24,
  },
  sosCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 10,
    elevation: 20,
  },
  sosInternal: {
    flex: 1,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosMainText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
    marginTop: 2,
  },
  sosHint: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  contentBody: {
    flex: 1,
    marginTop: -30,
    paddingHorizontal: 20,
  },
  smartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    marginLeft: 4,
  },
  systemText: {
    fontSize: 11,
    color: '#0f172a',
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tile: {
    width: (width - 60) / 2,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    elevation: 10,
    shadowColor: '#1e293b',
    shadowOpacity: 0.1,
    shadowRadius: 15,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  tileIconContainer: {
    width: 55,
    height: 55,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  tileTextContainer: {
    alignItems: 'flex-start',
  },
  tileLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },
  tileDesc: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 4,
    fontWeight: '600',
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    marginRight: 8,
  },
  quickText: {
    marginLeft: 6,
    fontSize: 11,
    fontWeight: '600',
    color: '#0f172a',
  },
  walletOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    backgroundColor: 'rgba(15,23,42,0.65)',
    justifyContent: 'flex-end',
  },
  walletSheet: {
    backgroundColor: '#0b1220',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  walletTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#e5e7eb',
  },
  walletSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  walletInput: {
    marginTop: 16,
    backgroundColor: '#020617',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#e5e7eb',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  walletButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 18,
  },
  walletBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    marginLeft: 8,
  },
  walletCancel: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  walletConfirm: {
    backgroundColor: '#22c55e',
  },
  walletCancelText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '600',
  },
  walletConfirmText: {
    color: '#022c22',
    fontSize: 13,
    fontWeight: '800',
  },

  // NEW emergency sheet styles
  emergencyOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.75)',
    justifyContent: 'flex-end',
  },
  emergencySheet: {
    backgroundColor: '#020617',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f9fafb',
  },
  emergencySubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  emergencyStatusRow: {
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#0b1120',
    paddingHorizontal: 10,
  },
  emergencyStatusText: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '600',
  },
  emergencyStatusSub: {
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 2,
  },
  emergencyButtonsRow: {
    marginTop: 16,
  },
  emergencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginBottom: 8,
  },
  emergencyPrimary: {
    backgroundColor: '#ef4444',
  },
  emergencyPrimaryText: {
    color: '#fef2f2',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 8,
  },
  emergencySecondary: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  emergencySecondaryText: {
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  emergencyCall: {
    backgroundColor: '#b91c1c',
  },
  emergencyCallText: {
    color: '#fef2f2',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 8,
  },
  emergencyClose: {
    alignSelf: 'center',
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  emergencyCloseText: {
    color: '#9ca3af',
    fontSize: 12,
  },
});
