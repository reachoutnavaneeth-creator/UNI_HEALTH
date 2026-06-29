// src/screens/PatientDoctorList.js

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ref, onValue } from 'firebase/database';
import { db } from '../../firebaseConfig';

export default function PatientDoctorList({ route, navigation }) {
  const { hospitalId, hospitalName } = route.params || {
    hospitalId: 'UH-HOS-00000',
    hospitalName: 'UniHealth Central',
  };

  const [doctors, setDoctors] = useState([]);
  const [wards, setWards] = useState({
    generalA: { available: 0, total: 0 },
    generalB: { available: 0, total: 0 },
    emergency: { available: 0, total: 0 },
    icu: { available: 0, total: 0 },
  });
  const [emergencyStatus, setEmergencyStatus] = useState('normal');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const wardRef = ref(db, `Hospitals/${hospitalId}/wards`);
    const unsubWards = onValue(wardRef, snapshot => {
      if (snapshot.exists()) setWards(snapshot.val());
    });

    const docRef = ref(db, `Hospitals/${hospitalId}/doctors`);
    const unsubDocs = onValue(docRef, snapshot => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setDoctors(list);
      } else {
        setDoctors([]);
      }
      setLoading(false);
    });

    const statusRef = ref(db, `Hospitals/${hospitalId}/emergencyStatus`);
    const unsubStatus = onValue(statusRef, snapshot => {
      if (snapshot.exists()) setEmergencyStatus(snapshot.val());
    });

    return () => {
      unsubWards();
      unsubDocs();
      unsubStatus();
    };
  }, [hospitalId]);

  const filteredDoctors = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return doctors.filter(doc => {
      const name = (doc.name || '').toLowerCase();
      const spec =
        (doc.specialization || doc.specialisation || '').toLowerCase();
      return name.includes(q) || spec.includes(q);
    });
  }, [doctors, searchQuery]);

  const getTheme = () => {
    switch (emergencyStatus) {
      case 'overloaded':
        return { color: '#ef4444', label: 'CRITICAL LOAD', icon: 'warning' };
      case 'busy':
        return { color: '#f59e0b', label: 'MODERATE LOAD', icon: 'people' };
      default:
        return {
          color: '#10b981',
          label: 'NORMAL FLOW',
          icon: 'checkmark-circle',
        };
    }
  };

  const theme = getTheme();

  const WardCard = ({ title, data, color }) => (
    <View style={[styles.wardCard, { borderLeftColor: color }]}>
      <Text style={styles.wardTitle}>{title}</Text>
      <Text style={styles.wardCount}>{data.available}</Text>
      <Text style={styles.wardTotal}>
        {data.available} / {data.total} Free
      </Text>
    </View>
  );

  const DoctorCard = ({ item }) => {
    const onPress = () => {
      if (!item.onDuty) return;
      navigation.navigate('BookingScreen', {
        doctor: item,
        hospitalId,
      });
    };

    return (
      <TouchableOpacity
        style={[styles.docCard, !item.onDuty && styles.offDutyCard]}
        onPress={onPress}
        activeOpacity={item.onDuty ? 0.8 : 1}
      >
        <View style={styles.cardContent}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarTxt}>
              {(item.name || 'D')[0].toUpperCase()}
            </Text>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: item.onDuty ? '#22c55e' : '#9ca3af' },
              ]}
            />
          </View>

          <View style={styles.docInfo}>
            <Text style={styles.docName}>{item.name || 'Doctor'}</Text>
            <Text style={styles.docSpec}>
              {item.specialization ||
                item.specialisation ||
                'General Medicine'}
            </Text>

            <View style={styles.tagRow}>
              {item.experience && (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>
                    {item.experience} yrs exp
                  </Text>
                </View>
              )}
              {item.roomNumber && (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>
                    ROOM {item.roomNumber}
                  </Text>
                </View>
              )}
              <View style={styles.tag}>
                <Text style={styles.tagText}>
                  {item.todayTokens || 0} tokens today
                </Text>
              </View>
            </View>
          </View>

          <View>
            <Text
              style={[
                styles.dutyLabel,
                { color: item.onDuty ? '#16a34a' : '#9ca3af' },
              ]}
            >
              {item.onDuty ? 'AVAILABLE' : 'AWAY'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <>
      {/* DYNAMIC HEADER */}
      <View style={[styles.header, { backgroundColor: theme.color }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.hospitalName}>{hospitalName}</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.statusBox}>
          <View style={styles.statusBadge}>
            <Ionicons name={theme.icon} size={14} color={theme.color} />
            <Text style={styles.statusBadgeTxt}>{theme.label}</Text>
          </View>
          <Text style={styles.statusMsg}>
            Live updates synced with HMS Registry
          </Text>
        </View>
      </View>

      {/* WARD SECTION */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Real-time Bed Availability</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          <WardCard
            title="GENERAL WARD A"
            data={wards.generalA}
            color="#3b82f6"
          />
          <WardCard
            title="GENERAL WARD B"
            data={wards.generalB}
            color="#0ea5e9"
          />
          <WardCard
            title="EMERGENCY"
            data={wards.emergency}
            color="#ef4444"
          />
          <WardCard title="ICU" data={wards.icu} color="#8b5cf6" />
        </ScrollView>
      </View>

      {/* DOCTOR SECTION HEADER + SEARCH */}
      <View style={styles.listSection}>
        <Text style={styles.sectionLabel}>Consult Today</Text>

        <View style={styles.searchBar}>
          <Ionicons
            name="search-outline"
            size={18}
            color="#94a3b8"
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search specialists..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      {loading ? (
        <>
          {renderHeader()}
          <ActivityIndicator
            style={{ marginTop: 20 }}
            color="#0f172a"
          />
        </>
      ) : (
        <FlatList
          data={filteredDoctors}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <DoctorCard item={item} />}
          ListHeaderComponent={renderHeader}
          ListHeaderComponentStyle={{ marginBottom: 10 }}
          ListEmptyComponent={
            <Text style={styles.empty}>No doctors found.</Text>
          }
          contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 20 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    padding: 20,
    paddingBottom: 40,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  hospitalName: { color: '#fff', fontSize: 18, fontWeight: '900' },
  statusBox: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 15,
    borderRadius: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
    alignItems: 'center',
  },
  statusBadgeTxt: { fontSize: 10, fontWeight: '900', marginLeft: 5 },
  statusMsg: {
    color: '#fff',
    fontSize: 12,
    marginTop: 10,
    fontWeight: '600',
  },
  section: { padding: 20, paddingBottom: 10 },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 15,
  },
  wardCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 20,
    marginRight: 15,
    width: 150,
    borderLeftWidth: 5,
    elevation: 2,
  },
  wardTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  wardCount: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 5,
  },
  wardTotal: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  listSection: { paddingHorizontal: 20 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 55,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontWeight: '600',
    color: '#1e293b',
  },
  docCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    marginBottom: 15,
    elevation: 1,
  },
  offDutyCard: { opacity: 0.6 },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: {
    width: 55,
    height: 55,
    borderRadius: 20,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTxt: { fontSize: 22, fontWeight: 'bold', color: '#3b82f6' },
  statusDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#fff',
  },
  docInfo: { flex: 1, marginLeft: 15 },
  docName: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  docSpec: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  tagRow: { flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' },
  tag: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tagText: { fontSize: 9, fontWeight: '800', color: '#64748b' },
  dutyLabel: { fontSize: 10, fontWeight: '900' },
  empty: {
    textAlign: 'center',
    marginTop: 30,
    color: '#94a3b8',
    fontWeight: '600',
  },
});
