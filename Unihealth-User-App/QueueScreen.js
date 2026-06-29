import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { db, ref, onValue, set, push } from './firebaseConfig';

export default function QueueScreen({ route }) {
  const { hospitalId } = route.params || { hospitalId: 'UH-HOS-00000' };
  const [liveQueue, setLiveQueue] = useState({ current: 'A-020', waiting: 18, avgTime: '11m' });
  const [myToken, setMyToken] = useState(null); // Stores user's active token

  // 1. Real-time Listener for the Hospital's Queue
  useEffect(() => {
    const queueRef = ref(db, `hospitals/${hospitalId}/queueStats`);
    const unsubscribe = onValue(queueRef, (snapshot) => {
      if (snapshot.exists()) {
        setLiveQueue(snapshot.val());
      }
    });
    return () => unsubscribe();
  }, [hospitalId]);

  // 2. Function to Book a Token
  const bookToken = (type) => {
    const tokenRef = ref(db, `hospitals/${hospitalId}/tokens`);
    const newToken = {
      patientName: "User", // This would come from user profile
      type: type, // 'emergency' or 'normal'
      status: 'waiting',
      timestamp: Date.now(),
    };

    push(tokenRef, newToken).then(() => {
      Alert.alert("Token Generated", `Your ${type} token has been added to the queue.`);
      setMyToken({ id: 'A-043', ...newToken }); // Mocking ID generation
    });
  };

  return (
    <ScrollView style={styles.container}>
      {/* HEADER: LIVE STATUS */}
      <View style={styles.liveBanner}>
        <View style={styles.bannerIcon}>
          <MaterialCommunityIcons name="broadcast" size={24} color="#dc2626" />
        </View>
        <View>
          <Text style={styles.bannerTitle}>Live Hospital Queue</Text>
          <Text style={styles.bannerSub}>Real-time updates from the facility</Text>
        </View>
      </View>

      {/* STATS ROW */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Current</Text>
          <Text style={styles.statValue}>{liveQueue.current}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Waiting</Text>
          <Text style={styles.statValue}>{liveQueue.waiting}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Avg. Wait</Text>
          <Text style={styles.statValue}>{liveQueue.avgTime}</Text>
        </View>
      </View>

      {/* USER'S ACTIVE TOKEN */}
      {myToken ? (
        <View style={styles.tokenCard}>
          <Text style={styles.tokenTitle}>YOUR ACTIVE TOKEN</Text>
          <View style={styles.tokenMain}>
            <Text style={styles.tokenNumber}>{myToken.id}</Text>
            <View style={[styles.statusBadge, myToken.type === 'emergency' ? styles.bgRed : styles.bgBlue]}>
              <Text style={styles.statusText}>{myToken.type.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.tokenHint}>Please reach the hospital in 15 mins</Text>
        </View>
      ) : (
        <View style={styles.bookingSection}>
          <Text style={styles.sectionTitle}>Need Assistance?</Text>
          <TouchableOpacity 
            style={[styles.bookBtn, styles.emergencyBtn]} 
            onPress={() => bookToken('emergency')}
          >
            <Ionicons name="flash" size={20} color="#fff" />
            <Text style={styles.bookBtnText}>Request Emergency Token</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.bookBtn, styles.normalBtn]} 
            onPress={() => bookToken('normal')}
          >
            <Ionicons name="calendar" size={20} color="#1e293b" />
            <Text style={[styles.bookBtnText, {color: '#1e293b'}]}>Book General OPD</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* QUEUE OVERRIDE INFO (From the HTML logic) */}
      <View style={styles.infoPanel}>
        <Ionicons name="information-circle" size={20} color="#64748b" />
        <Text style={styles.infoText}>
          Emergency Override is <Text style={{fontWeight: 'bold'}}>Active</Text>. 
          Critical cases may jump the queue to ensure immediate care.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  liveBanner: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 15 },
  bannerIcon: { backgroundColor: '#fee2e2', padding: 10, borderRadius: 12 },
  bannerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  bannerSub: { fontSize: 13, color: '#64748b' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 25 },
  statCard: { flex: 1, backgroundColor: '#fff', padding: 15, borderRadius: 16, alignItems: 'center', elevation: 2 },
  statLabel: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginTop: 4 },
  tokenCard: { backgroundColor: '#1e293b', borderRadius: 24, padding: 24, alignItems: 'center' },
  tokenTitle: { color: '#94a3b8', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  tokenMain: { flexDirection: 'row', alignItems: 'center', gap: 15, marginVertical: 10 },
  tokenNumber: { fontSize: 48, fontWeight: '900', color: '#fff' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  bgRed: { backgroundColor: '#dc2626' },
  bgBlue: { backgroundColor: '#2563eb' },
  statusText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  tokenHint: { color: '#64748b', fontSize: 13 },
  bookingSection: { gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 5 },
  bookBtn: { flexDirection: 'row', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', gap: 10 },
  emergencyBtn: { backgroundColor: '#dc2626' },
  normalBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  bookBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  infoPanel: { flexDirection: 'row', backgroundColor: '#f1f5f9', padding: 15, borderRadius: 12, marginTop: 30, gap: 10 },
  infoText: { flex: 1, fontSize: 12, color: '#64748b', lineHeight: 18 },
});