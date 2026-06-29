// src/screens/AdvancedHospitalView.js

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ref, onValue } from 'firebase/database';
import { db } from '../../firebaseConfig';

export default function AdvancedHospitalView({ navigation }) {
  const [hospitals, setHospitals] = useState([]);
  const [filter, setFilter] = useState('All');
  const [selectedHospital, setSelectedHospital] = useState(null);

  // live hospitals list from DB
  useEffect(() => {
    const hospitalsRef = ref(db, 'Hospitals');

    const unsub = onValue(hospitalsRef, snapshot => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({
          id: key,
          ...data[key],
        }));
        setHospitals(list);
      } else {
        setHospitals([]);
      }
    });

    return () => unsub();
  }, []);

  const filteredHospitals = useMemo(() => {
    if (filter === 'All') return hospitals;
    return hospitals.filter(h =>
      h.specialty?.toLowerCase().includes(filter.toLowerCase())
    );
  }, [filter, hospitals]);

  const renderCard = ({ item }) => {
    const bed = item.Bed ?? 0;
    const icu = item.icubeds ?? item.icu_beds ?? 0;

    const statusColor =
      bed > 5 ? '#10b981' : bed > 0 ? '#f59e0b' : '#ef4444';

    const emergency = item.emergency_dashboard || {};
    const generalBedStatus = emergency.general_bed_status || 'available';
    const icuBedStatus = emergency.icu_bed_status || 'available';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setSelectedHospital(item)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.name}>
            {item.Name || item.profile?.name || 'Hospital'}
          </Text>
          <View
            style={[styles.statusDot, { backgroundColor: statusColor }]}
          />
        </View>

        <View style={styles.statsRow}>
          <Text style={styles.statText}>Beds: {bed}</Text>
          <Text style={styles.statText}>ICU: {icu}</Text>
        </View>

        <Text style={styles.timestamp}>
          Last update:{' '}
          {item.lastupdated || item.last_updated || 'Unknown'}
        </Text>

        {/* quick view of new 3‑state status */}
        <Text style={styles.timestamp}>
          General: {generalBedStatus} • ICU: {icuBedStatus}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hospitals Live</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* filter chips */}
      <View style={styles.filterBar}>
        {['All', 'ER', 'Cardiac', 'Trauma'].map(cat => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.filterBtn,
              filter === cat && styles.filterBtnActive,
            ]}
            onPress={() => setFilter(cat)}
          >
            <Text
              style={[
                styles.filterText,
                filter === cat && styles.filterTextActive,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* list */}
      <FlatList
        data={filteredHospitals}
        keyExtractor={item => item.id}
        renderItem={renderCard}
        contentContainerStyle={{ paddingBottom: 40 }}
      />

      {/* bottom sheet with details */}
      <Modal
        animationType="slide"
        transparent
        visible={!!selectedHospital}
        onRequestClose={() => setSelectedHospital(null)}
      >
        {selectedHospital && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />

              <ScrollView
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.modalName}>
                  {selectedHospital.Name ||
                    selectedHospital.profile?.name ||
                    'Hospital'}
                </Text>

                <Text style={styles.sectionTitle}>Overview</Text>
                <Text style={styles.detailText}>
                  Beds: {selectedHospital.Bed ?? 0} | ICU:{' '}
                  {selectedHospital.icubeds ??
                    selectedHospital.icu_beds ??
                    0}
                </Text>
                <Text style={styles.detailText}>
                  Last update:{' '}
                  {selectedHospital.lastupdated ||
                    selectedHospital.last_updated ||
                    'Unknown'}
                </Text>

                {/* NEW: emergency capacity from 3‑state fields */}
                {selectedHospital.emergency_dashboard && (
                  <>
                    <Text style={styles.sectionTitle}>
                      Emergency Capacity
                    </Text>
                    <Text style={styles.detailText}>
                      General beds:{' '}
                      {selectedHospital.emergency_dashboard
                        .general_bed_status || 'unknown'}
                    </Text>
                    <Text style={styles.detailText}>
                      ICU beds:{' '}
                      {selectedHospital.emergency_dashboard
                        .icu_bed_status || 'unknown'}
                    </Text>
                    <Text style={styles.detailText}>
                      Emergency beds:{' '}
                      {selectedHospital.emergency_dashboard
                        .emergency_bed_status || 'unknown'}
                    </Text>
                  </>
                )}

                {/* NEW: specialties summary */}
                {selectedHospital.specialties && (
                  <>
                    <Text style={styles.sectionTitle}>
                      Specialties
                    </Text>
                    {Object.values(
                      selectedHospital.specialties
                    ).map((sp, i) => (
                      <Text key={i} style={styles.detailText}>
                        {sp.label}: {sp.status}
                      </Text>
                    ))}
                  </>
                )}

                {/* existing simple doctors text if array */}
                {Array.isArray(selectedHospital.doctors) && (
                  <>
                    <Text style={styles.sectionTitle}>
                      Doctors on duty
                    </Text>
                    {selectedHospital.doctors.map((d, i) => (
                      <Text key={i} style={styles.detailText}>
                        • {d}
                      </Text>
                    ))}
                  </>
                )}
              </ScrollView>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setSelectedHospital(null)}
              >
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingTop: 40 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    columnGap: 8,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterBtnActive: {
    backgroundColor: '#1e293b',
    borderColor: '#1e293b',
  },
  filterText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 14,
    marginVertical: 6,
    padding: 14,
    borderRadius: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statsRow: {
    flexDirection: 'row',
    columnGap: 16,
    marginTop: 8,
  },
  statText: { fontSize: 13, color: '#475569' },
  timestamp: { fontSize: 11, color: '#94a3b8', marginTop: 6 },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15,23,42,0.35)',
  },
  modalContent: {
    maxHeight: '70%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 4,
  },
  detailText: { fontSize: 13, color: '#475569', marginTop: 2 },
  closeBtn: {
    marginTop: 20,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#1e293b',
  },
  closeText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
});
