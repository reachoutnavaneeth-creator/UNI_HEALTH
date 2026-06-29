// BedManagementScreen.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { getDatabase, ref, onValue, update, push } from 'firebase/database';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function BedManagementScreen({ route }) {
  const hospitalId = route?.params?.hospitalId;

  const [wards, setWards] = useState([]);
  const [icuData, setIcuData] = useState({ occupied: 0, total: 0 });

  const db = getDatabase();

  useEffect(() => {
    if (!hospitalId) return;

    // Match web structure: Hospitals/{hospitalId}/beds/{wardKey}
    const bedsRef = ref(db, `Hospitals/${hospitalId}/beds`);

    const unsub = onValue(bedsRef, snapshot => {
      const data = snapshot.val();

      if (data) {
        const list = Object.keys(data).map(key => {
          const node = data[key] || {};
          const total = node.total ?? 0;
          const occupied = node.occupied ?? 0;
          const available =
            node.available != null ? node.available : Math.max(total - occupied, 0);

          return {
            id: key,
            wardName: node.name || node.wardName || key,
            wardType: node.type || node.wardType || 'General',
            total,
            occupied,
            available,
            updatedAt: node.updatedAt || null,
          };
        });

        setWards(list);

        // ICU summary: find any ward whose type/name indicates ICU
        const icu = list.find(
          w =>
            (w.wardType || '').toLowerCase() === 'icu' ||
            (w.wardName || '').toUpperCase().includes('ICU')
        );

        if (icu) {
          setIcuData({ occupied: icu.occupied, total: icu.total });
        } else {
          setIcuData({ occupied: 0, total: 0 });
        }
      } else {
        setWards([]);
        setIcuData({ occupied: 0, total: 0 });
      }
    });

    return () => unsub();
  }, [hospitalId]);

  const updateBeds = (wardId, delta) => {
    const ward = wards.find(w => w.id === wardId);
    if (!ward || !hospitalId) return;

    const newOccupied = Math.max(0, Math.min(ward.occupied + delta, ward.total));
    const newAvailable = Math.max(ward.total - newOccupied, 0);
    const nowIso = new Date().toISOString();

    // Write back using web-compatible keys
    update(ref(db, `Hospitals/${hospitalId}/beds/${wardId}`), {
      name: ward.wardName,
      type: ward.wardType,
      total: ward.total,
      occupied: newOccupied,
      available: newAvailable,
      updatedAt: nowIso,
    });

    // Optional: your own mobile audit branch (does not affect web)
    push(ref(db, `Audit/bed/${hospitalId}`), {
      timestamp: Date.now(),
      action: 'bed-update',
      details: `${ward.wardName} updated to ${newOccupied}/${ward.total}`,
      user: 'Admin',
      role: 'Mobile Admin',
    });
  };

  const renderWard = ({ item }) => {
    const ratio = item.total === 0 ? 0 : item.occupied / item.total;
    let status = 'Stable';
    let colors = ['#dcfce7', '#bbf7d0'];
    let icon = 'bed-outline';

    if (ratio >= 0.9) {
      status = 'Critical';
      colors = ['#fee2e2', '#fecaca'];
      icon = 'alert-circle';
    } else if (ratio >= 0.75) {
      status = 'Near Full';
      colors = ['#fef3c7', '#fde68a'];
      icon = 'warning-outline';
    }

    return (
      <LinearGradient colors={colors} style={styles.bedCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.wardName}>{item.wardName}</Text>
            <Text style={styles.wardType}>{item.wardType || 'General'}</Text>
          </View>
          <Ionicons name={icon} size={24} color="#1e293b" />
        </View>

        <View style={styles.statsRow}>
          <View>
            <Text style={styles.label}>Total</Text>
            <Text style={styles.val}>{item.total}</Text>
          </View>
          <View>
            <Text style={styles.label}>Occupied</Text>
            <Text style={styles.val}>{item.occupied}</Text>
          </View>
          <View>
            <Text style={styles.label}>Available</Text>
            <Text style={styles.val}>{item.available}</Text>
          </View>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            onPress={() => updateBeds(item.id, -1)}
            style={styles.miniBtn}
          >
            <Text style={styles.btnText}>-</Text>
          </TouchableOpacity>

          <View style={styles.pill}>
            <Text style={styles.pillText}>{status}</Text>
          </View>

          <TouchableOpacity
            onPress={() => updateBeds(item.id, 1)}
            style={styles.miniBtn}
          >
            <Text style={styles.btnText}>+</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.updateText}>
          Updated:{' '}
          {item.updatedAt
            ? new Date(item.updatedAt).toLocaleTimeString()
            : 'Just now'}
        </Text>
      </LinearGradient>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.mainTitle}>Bed & ICU Management</Text>

      <View style={styles.icuPanel}>
        <View>
          <Text style={styles.icuTitle}>ICU Capacity</Text>
          <Text style={styles.icuAi}>
            AI:{' '}
            {icuData.total > 0 && icuData.occupied / icuData.total > 0.8
              ? 'Critical - Prepare overflow'
              : 'Monitor admissions'}
          </Text>
        </View>
        <View>
          <Text style={styles.icuBigNum}>
            {icuData.total - icuData.occupied}
          </Text>
          <Text style={styles.icuSmallNum}>
            / {icuData.total || 0} Free
          </Text>
        </View>
      </View>

      <FlatList
        data={wards}
        keyExtractor={item => item.id}
        renderItem={renderWard}
        contentContainerStyle={{ padding: 20 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    padding: 20,
    paddingBottom: 5,
  },
  icuPanel: {
    margin: 20,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    elevation: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 5,
    borderLeftColor: '#ef4444',
  },
  icuTitle: { fontSize: 16, fontWeight: '700' },
  icuAi: { fontSize: 12, color: '#64748b' },
  icuBigNum: { fontSize: 28, fontWeight: '900', color: '#ef4444' },
  icuSmallNum: { fontSize: 14, color: '#94a3b8' },
  bedCard: {
    padding: 15,
    borderRadius: 20,
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  wardName: { fontSize: 17, fontWeight: '700' },
  wardType: { fontSize: 12, opacity: 0.6 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 15,
    backgroundColor: 'rgba(255,255,255,0.4)',
    padding: 10,
    borderRadius: 12,
  },
  label: { fontSize: 10, fontWeight: '600', color: '#475569' },
  val: { fontSize: 18, fontWeight: '800' },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniBtn: {
    backgroundColor: '#fff',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: { fontSize: 20, fontWeight: 'bold' },
  pill: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pillText: { fontSize: 12, fontWeight: '800' },
  updateText: {
    fontSize: 10,
    marginTop: 10,
    opacity: 0.5,
    textAlign: 'center',
  },
});
