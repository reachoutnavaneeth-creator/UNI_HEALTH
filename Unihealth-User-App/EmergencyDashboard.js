// src/screens/EmergencyDashboard.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ref, onValue } from 'firebase/database';
import { db } from '../../firebaseConfig';
import Ionicons from '@expo/vector-icons/Ionicons';

const HOSPITAL_ID = 'UH-HOS-00000';

export default function EmergencyDashboard({ route }) {
  const hospitalId = route?.params?.hospitalId || HOSPITAL_ID;

  const [emergencyData, setEmergencyData] = useState(null);
  const [hospitalData, setHospitalData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hospRef = ref(db, `Hospitals/${hospitalId}`);
    const emergencyRef = ref(db, `Hospitals/${hospitalId}/emergency_dashboard`);

    let loadedA = false;
    let loadedB = false;

    const unsubHosp = onValue(hospRef, snapshot => {
      setHospitalData(snapshot.exists() ? snapshot.val() : null);
      loadedA = true;
      if (loadedB) setLoading(false);
    });

    const unsubEmer = onValue(emergencyRef, snapshot => {
      setEmergencyData(snapshot.exists() ? snapshot.val() : null);
      loadedB = true;
      if (loadedA) setLoading(false);
    });

    return () => {
      unsubHosp();
      unsubEmer();
    };
  }, [hospitalId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1d4ed8" />
        <Text style={styles.loadingText}>Syncing with Hospital OS...</Text>
      </View>
    );
  }

  const status = emergencyData?.status || 'normal';
  const bedsAvailable = emergencyData?.bedsAvailable ?? 0;
  const icuAvailable = emergencyData?.icuAvailable ?? 0;
  const avgWait = emergencyData?.avgWait ?? '15m';
  const doctorsOnDuty = emergencyData?.doctorsOnDuty ?? 0;
  const occupancy = emergencyData?.occupancy ?? 0;

  const generalBedStatus = emergencyData?.general_bed_status || 'available';
  const icuBedStatus = emergencyData?.icu_bed_status || 'available';
  const emergencyBedStatus =
    emergencyData?.emergency_bed_status || 'available';

  const specialties = hospitalData?.specialties || {};
  const specialtiesArray = Object.values(specialties);

  const isOverloaded = status.toLowerCase() === 'overloaded';
  const isBusy = status.toLowerCase() === 'busy';

  const bannerStyle =
    isOverloaded ? styles.statusOver : isBusy ? styles.statusBusy : styles.statusNormal;
  const bannerIcon = isOverloaded ? 'alert-circle' : isBusy ? 'warning' : 'checkmark-circle';
  const bannerColor = isOverloaded ? '#b91c1c' : isBusy ? '#a16207' : '#166534';

  // DOCTORS: normalize current Firebase structure (object keyed by timestamps/ids)
  const rawDoctors = hospitalData?.doctors || {};
  const doctorsArray =
    Array.isArray(rawDoctors) ? rawDoctors : Object.values(rawDoctors);

  const bedsObject = hospitalData?.beds || null;

  const mapStatusLabel = val => {
    if (val === 'available') return 'Available';
    if (val === 'limited') return 'Limited';
    return 'Fully occupied';
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={['#020617', '#0f172a', '#020617']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>
          {hospitalData?.Name || hospitalData?.profile?.name || 'UniHealth Hospital'}
        </Text>
        <Text style={styles.headerSub}>
          {hospitalData?.Place || hospitalData?.profile?.place || 'Mysuru'} • Live Emergency
          Dashboard
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        <ScrollView
          contentContainerStyle={{ padding: 18, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* STATUS BANNER */}
          <View style={[styles.statusBanner, bannerStyle]}>
            <Ionicons
              name={bannerIcon}
              size={20}
              color={bannerColor}
              style={{ marginRight: 10 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusTitle, { color: bannerColor }]}>
                HOSPITAL STATUS • {status.toUpperCase()}
              </Text>
              <Text style={styles.statusSubtitle}>
                {isOverloaded
                  ? 'Emergency overloaded. Diversion protocols recommended.'
                  : isBusy
                  ? 'High demand. Expect increased waiting time.'
                  : 'Operations stable. Capacity within safe limits.'}
              </Text>
            </View>
          </View>

          {/* CAPACITY CARD */}
          <LinearGradient
            colors={['#020617', '#020617', '#020617']}
            style={styles.metricsCard}
          >
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>BEDS FREE</Text>
                <Text style={styles.metricValue}>{bedsAvailable}</Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>ICU FREE</Text>
                <Text style={styles.metricValue}>{icuAvailable}</Text>
              </View>
            </View>

            <View style={styles.metricsFooter}>
              <View style={styles.metricFooterItem}>
                <Text style={styles.metricFooterValue}>{avgWait}</Text>
                <Text style={styles.metricFooterLabel}>Avg Wait</Text>
              </View>
              <View style={styles.metricFooterItem}>
                <Text style={styles.metricFooterValue}>{doctorsOnDuty}</Text>
                <Text style={styles.metricFooterLabel}>Doctors</Text>
              </View>
              <View style={styles.metricFooterItem}>
                <Text style={styles.metricFooterValue}>{occupancy}%</Text>
                <Text style={styles.metricFooterLabel}>Occupancy</Text>
              </View>
            </View>
          </LinearGradient>

          {/* FACILITY SNAPSHOT */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Facility Snapshot</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total Beds</Text>
              <Text style={styles.infoValue}>{hospitalData?.Bed ?? '-'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ICU Units</Text>
              <Text style={styles.infoValue}>
                {hospitalData?.icubeds ?? hospitalData?.icu_beds ?? '-'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ventilators</Text>
              <Text style={styles.infoValue}>{hospitalData?.ventilators ?? '-'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Updated</Text>
              <Text style={styles.infoValue}>
                {hospitalData?.lastupdated || hospitalData?.last_updated || 'Unknown'}
              </Text>
            </View>
          </View>

          {/* 3-STATE BED STATUS */}
          <View style={[styles.infoCard, { marginTop: 16 }]}>
            <Text style={styles.infoTitle}>Emergency Capacity</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>General beds</Text>
              <Text style={styles.infoValue}>{mapStatusLabel(generalBedStatus)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ICU beds</Text>
              <Text style={styles.infoValue}>{mapStatusLabel(icuBedStatus)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Emergency beds</Text>
              <Text style={styles.infoValue}>{mapStatusLabel(emergencyBedStatus)}</Text>
            </View>
          </View>

          {/* SPECIALTIES */}
          {specialtiesArray.length > 0 && (
            <View style={[styles.infoCard, { marginTop: 16 }]}>
              <Text style={styles.infoTitle}>Specialties on Duty</Text>

              {specialtiesArray.map((sp, idx) => (
                <View key={idx} style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{sp.label || 'Specialty'}</Text>
                  <Text style={styles.infoValue}>{mapStatusLabel(sp.status)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* WARD BREAKDOWN */}
          {bedsObject && (
            <View style={[styles.infoCard, { marginTop: 16 }]}>
              <Text style={styles.infoTitle}>Ward Breakdown</Text>
              {Object.keys(bedsObject).map(key => {
                const ward = bedsObject[key];
                const total = ward?.total ?? 0;
                const available = ward?.available ?? 0;
                const name = ward?.name || key;
                const icuUnits = ward?.icuUnits ?? ward?.icuunits ?? 0;

                return (
                  <View key={key} style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{name}</Text>
                    <Text style={styles.infoValue}>
                      {available}/{total} beds • ICU: {icuUnits}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* DOCTORS ON DUTY */}
          {doctorsArray.length > 0 && (
            <View style={[styles.infoCard, { marginTop: 16 }]}>
              <Text style={styles.infoTitle}>Doctors on Duty</Text>
              {doctorsArray.map((doc, index) => {
                const name = doc?.name || `Doctor ${index + 1}`;
                const dept =
                  doc?.department || doc?.specialisation || 'General';
                const onDuty = doc?.onDuty ? 'On Duty' : 'Off Duty';

                return (
                  <View key={index} style={styles.infoRow}>
                    <Text style={styles.infoLabel}>• {name}</Text>
                    <Text style={styles.infoValue}>
                      {dept} • {onDuty}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  headerSub: {
    color: '#cbd5f5',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  body: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 20,
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
  statusTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  statusSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: '#4b5563',
  },
  metricsCard: {
    borderRadius: 28,
    padding: 24,
    marginBottom: 22,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 6,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  metricValue: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '900',
    marginTop: 4,
  },
  metricDivider: {
    width: 1,
    height: 60,
    backgroundColor: 'rgba(148,163,184,0.5)',
  },
  metricsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
  },
  metricFooterItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricFooterValue: {
    color: '#e5e7eb',
    fontSize: 15,
    fontWeight: '800',
  },
  metricFooterLabel: {
    color: '#9ca3af',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '700',
  },
});
