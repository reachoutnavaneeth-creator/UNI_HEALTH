// src/screens/RequestTokenScreen.js

import React, { useState, useEffect } from 'react';

import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';
import {
  getDatabase,
  ref,
  onValue,
  push,
  set,
  serverTimestamp,
} from 'firebase/database';

const HOSPITAL_ID = 'UH-HOS-00000';

// same date key format as web + other screens
function getTodayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function RequestTokenScreen({ route, navigation }) {
  const hospitalId = route?.params?.hospitalId || HOSPITAL_ID;

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);

  // Sync State from Admin Dashboard
  const [hospSnapshot, setHospSnapshot] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const db = getDatabase();

  useEffect(() => {
    // Listen to emergency_dashboard for live status & KPIs
    const hospRef = ref(db, `Hospitals/${hospitalId}/emergency_dashboard`);
    const unsubscribe = onValue(hospRef, snapshot => {
      setHospSnapshot(snapshot.val() || null);
    });
    return unsubscribe;
  }, [db, hospitalId]);

  const handleSubmit = async () => {
    // 1) Validation (unchanged)
    if (!name.trim() || !reason.trim()) {
      Alert.alert(
        'Missing Details',
        'Please enter your full name and reason for visit.'
      );
      return;
    }

    setSubmitting(true);

    try {
      const db = getDatabase();
      const todayKey = getTodayKey();
      

      // 2) Main tokens path for app + website:
      //    Hospitals/{hospitalId}/tokens/{YYYY-MM-DD}/{tokenId}
      const tokenListRef = ref(
        db,
        `Hospitals/${hospitalId}/tokens/${todayKey}`
      );
      const newTokenRef = push(tokenListRef);

      const nowIso = new Date().toISOString();
      const priority = isEmergency ? 'emergency' : 'normal';
      const etaText = hospSnapshot?.avgWait || '15 min';

      // 3) Token data (aligned with hospital web)
      const tokenData = {
        tokenId: newTokenRef.key,
        patientName: name.trim(),
        phone: phone.trim(),
        // Web uses this reason label + priority flag; full text stays in audit
        reason: reason.trim(),
        eta: etaText,
        status: 'Waiting',
        priority,
        timestamp: Date.now(),
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      // 4) Create the token under Hospitals/{hospitalId}/tokens/{todayKey}
      await set(newTokenRef, tokenData);

      // 5) Existing Audit/tokens entry (logic unchanged)
      const auditRef = ref(db, `Audit/tokens/${hospitalId}`);
      const newAuditRef = push(auditRef);
      await set(newAuditRef, {
        timestamp: serverTimestamp(),
        action: isEmergency
          ? 'EMERGENCY_TOKEN_REQUESTED'
          : 'TOKEN_REQUESTED',
        patientName: name.trim(),
        phone: phone.trim(),
        reason: reason.trim(), // full free-text reason
        tokenId: newTokenRef.key,
      });

      // 6) Confirm to user + navigate (unchanged)
      Alert.alert(
        'Token Generated',
        'Your request is live on the hospital dashboard.',
        [
          {
            text: 'Track Status',
            onPress: () =>
              navigation.navigate('MyTokenStatus', {
                hospitalId,
                tokenId: newTokenRef.key,
                // pass date so MyTokenStatus knows where to read
                dateKey: todayKey,
              }),
          },
          { text: 'Dismiss', style: 'cancel' },
        ]
      );

      // 7) Reset form (unchanged)
      setName('');
      setPhone('');
      setReason('');
      setIsEmergency(false);
    } catch (err) {
      console.log('TOKEN SUBMIT ERROR', err);   // add this line
      Alert.alert(
        'Sync Error',
        'Could not connect to Hospital OS. Try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const bedsAvailable = hospSnapshot?.bedsAvailable ?? 0;
  const bedsTotal = hospSnapshot?.bedsTotal ?? 145;
  const occupancyRate = Math.round(
    ((bedsTotal - bedsAvailable) / bedsTotal) * 100
  );
  const hospitalStatus = hospSnapshot?.status || 'normal';
  const isBusy = hospitalStatus === 'busy';
  const isOver = hospitalStatus === 'overloaded';

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color="#0f172a"
              />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>UniHealth Booking</Text>
              <Text style={styles.headerSub}>
                Real-time Hospital OS Sync
              </Text>
            </View>
          </View>

          {/* Live Status Banner */}
          <View
            style={[
              styles.statusBanner,
              isOver
                ? styles.statusOver
                : isBusy
                ? styles.statusBusy
                : styles.statusNormal,
            ]}
          >
            <Ionicons
              name={
                isOver
                  ? 'alert-circle'
                  : isBusy
                  ? 'warning'
                  : 'checkmark-circle'
              }
              size={20}
              color={isOver ? '#b91c1c' : isBusy ? '#92400e' : '#166534'}
            />
            <View>
              <Text style={styles.statusText}>
                HOSPITAL STATUS • {hospitalStatus.toUpperCase()} •{' '}
                {occupancyRate}% Full
              </Text>
              <Text style={styles.statusSub}>
                Tokens sync directly with the Member 2 admin console.
              </Text>
            </View>
          </View>

          {/* KPI Card */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiItem}>
              <Text style={styles.kpiLabel}>AVG WAIT</Text>
              <Text style={styles.kpiValue}>
                {hospSnapshot?.avgWait || '15m'}
              </Text>
            </View>
            <View style={[styles.kpiItem, styles.kpiBorder]}>
              <Text style={styles.kpiLabel}>ICU BEDS</Text>
              <Text style={styles.kpiValue}>
                {hospSnapshot?.icuAvailable ?? 0}
              </Text>
            </View>
            <View style={styles.kpiItem}>
              <Text style={styles.kpiLabel}>DOCTORS</Text>
              <Text style={styles.kpiValue}>
                {hospSnapshot?.doctorsOnDuty ?? 0}
              </Text>
            </View>
          </View>

          {/* Booking Form */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Patient Registration</Text>

            <Text style={styles.inputLabel}>FULL NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.inputLabel}>PHONE</Text>
            <TextInput
              style={styles.input}
              placeholder="Optional contact number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>REASON FOR VISIT</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your symptoms or reason"
              value={reason}
              onChangeText={setReason}
              multiline
            />

            <View style={styles.emergencyRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.emTitle}>Mark as Emergency?</Text>
                <Text style={styles.emSub}>
                  Prioritizes your token on the Admin Panel.
                </Text>
              </View>
              <Switch
                value={isEmergency}
                onValueChange={setIsEmergency}
              />
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.submitBtnText}>
                {submitting
                  ? 'SYNCING TO DASHBOARD...'
                  : 'REQUEST LIVE TOKEN'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footerNote}>
            Your request will appear instantly on Member 2’s Admin
            Dashboard under Token Management.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // unchanged styles from your original file
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  backBtn: {
    marginRight: 15,
    padding: 5,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
  },
  statusNormal: {
    backgroundColor: '#dcfce7',
    borderColor: '#bbf7d0',
  },
  statusBusy: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  statusOver: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusSub: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  kpiCard: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
    elevation: 8,
  },
  kpiItem: {
    flex: 1,
    alignItems: 'center',
  },
  kpiBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#334155',
  },
  kpiLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 5,
  },
  kpiValue: {
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: '800',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 5,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 8,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 15,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 20,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  emergencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff1f2',
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
  },
  emTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991b1b',
  },
  emSub: {
    fontSize: 11,
    color: '#e11d48',
    marginTop: 2,
  },
  submitBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 1,
  },
  footerNote: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 25,
    lineHeight: 16,
  },
});