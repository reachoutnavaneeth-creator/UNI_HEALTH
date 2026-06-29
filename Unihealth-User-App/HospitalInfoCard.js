import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function HospitalInfoCard({ hospital }) {
  if (!hospital) return null;

  // Function to handle emergency calling
  const handleCall = (number) => {
    Linking.openURL(`tel:${number}`);
  };

  return (
    <View style={styles.cardContainer}>
      {/* Header: Name and Status */}
      <View style={styles.header}>
        <View>
          <Text style={styles.hosName}>{hospital.name}</Text>
          <Text style={styles.hosAddress}>{hospital.address}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Open 24/7</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Real-time Stats Section */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <MaterialCommunityIcons name="bed-outline" size={24} color="#2563eb" />
          <Text style={styles.statValue}>{hospital.availableBeds}</Text>
          <Text style={styles.statLabel}>Gen. Beds</Text>
        </View>
        
        <View style={styles.statBox}>
          <MaterialCommunityIcons name="pulse" size={24} color="#dc2626" />
          <Text style={styles.statValue}>{hospital.icuCapacity}</Text>
          <Text style={styles.statLabel}>ICU Beds</Text>
        </View>

        <View style={styles.statBox}>
          <Ionicons name="time-outline" size={24} color="#059669" />
          <Text style={styles.statValue}>{hospital.eta || '15'}m</Text>
          <Text style={styles.statLabel}>Est. Travel</Text>
        </View>
      </View>

      {/* Quick Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.callBtn]} 
          onPress={() => handleCall(hospital.hosPhone)}
        >
          <Ionicons name="call" size={18} color="#fff" />
          <Text style={styles.btnText}>Call ER</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionBtn, styles.navBtn]}
          onPress={() => Linking.openURL(`google.navigation:q=${hospital.lat},${hospital.lng}`)}
        >
          <Ionicons name="navigate" size={18} color="#fff" />
          <Text style={styles.btnText}>Directions</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 15,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  hosName: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  hosAddress: { fontSize: 13, color: '#64748b', marginTop: 2 },
  statusBadge: { backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { color: '#166534', fontSize: 11, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 15 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statBox: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginTop: 4 },
  statLabel: { fontSize: 11, color: '#64748b' },
  buttonRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 8 },
  callBtn: { backgroundColor: '#dc2626' },
  navBtn: { backgroundColor: '#2563eb' },
  btnText: { color: 'white', fontWeight: '700', fontSize: 15 }
});