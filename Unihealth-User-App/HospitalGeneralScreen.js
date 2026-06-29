// src/screens/HospitalGeneralScreen.js

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ref, onValue } from 'firebase/database';
import { db } from '../../firebaseConfig';

const { width } = Dimensions.get('window');
const FALLBACK_HOSPITAL_ID = 'UH-HOS-00000';

const TILE_WIDTH = (width - 60) / 2;

const Chip = ({ label }) => (
  <View style={styles.chip}>
    <Text style={styles.chipText}>{label}</Text>
  </View>
);

const HighlightCard = ({ icon, label, value }) => (
  <View style={styles.highlightCard}>
    <MaterialCommunityIcons name={icon} size={18} color="#0f766e" />
    <Text style={styles.highlightLabel}>{label}</Text>
    <Text style={styles.highlightValue}>{value}</Text>
  </View>
);

const ActionButton = ({ icon, label, desc, color, primary, onPress }) => (
  <TouchableOpacity
    style={[
      styles.actionBtn,
      primary && { backgroundColor: '#0f766e', borderColor: '#0f766e' },
    ]}
    onPress={onPress}
  >
    <View
      style={[
        styles.actionIcon,
        { backgroundColor: primary ? '#0f172a20' : color + '20' },
      ]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={22}
        color={primary ? '#ecfeff' : color}
      />
    </View>
    <View style={{ flex: 1 }}>
      <Text
        style={[
          styles.actionLabel,
          primary && { color: '#ecfeff' },
        ]}
      >
        {label}
      </Text>
      {desc ? (
        <Text
          style={[
            styles.actionDesc,
            primary && { color: '#d1fae5' },
          ]}
        >
          {desc}
        </Text>
      ) : null}
    </View>
    <Ionicons
      name="chevron-forward"
      size={18}
      color={primary ? '#bbf7d0' : '#9ca3af'}
    />
  </TouchableOpacity>
);

const DepartmentCard = ({ label, totalDoctors, nextSlot }) => (
  <View style={styles.deptCard}>
    <Text style={styles.deptName}>{label}</Text>
    <Text style={styles.deptMeta}>
      {totalDoctors} doctors • Next slot {nextSlot || '—'}
    </Text>
  </View>
);

// UPDATED: Doctor row now supports a Book button
const DoctorRow = ({ name, department, experience, onDuty, onBook }) => (
  <View style={styles.docRow}>
    <View style={styles.docAvatar}>
      <MaterialCommunityIcons name="doctor" size={20} color="#0f766e" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.docName}>{name}</Text>
      <Text style={styles.docMeta}>
        {department} • {experience ? `${experience} yrs exp` : 'Experience N/A'}
      </Text>
    </View>
    <View
      style={[
        styles.docBadge,
        { backgroundColor: onDuty ? '#dcfce7' : '#e5e7eb' },
      ]}
    >
      <Text
        style={[
          styles.docBadgeText,
          { color: onDuty ? '#15803d' : '#6b7280' },
        ]}
      >
        {onDuty ? 'Available' : 'Offline'}
      </Text>
    </View>

    {onDuty && (
      <TouchableOpacity style={styles.docBookBtn} onPress={onBook}>
        <Text style={styles.docBookText}>Book</Text>
      </TouchableOpacity>
    )}
  </View>
);

export default function HospitalGeneralScreen({ navigation, route }) {
  const hospitalId = route?.params?.hospitalId || FALLBACK_HOSPITAL_ID;

  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveStatus, setLiveStatus] = useState(null); // live beds/ICU/doctors

  useEffect(() => {
    if (!hospitalId) {
      Alert.alert('Error', 'Hospital ID is missing.');
      setLoading(false);
      return;
    }

    const hospRef = ref(db, `Hospitals/${hospitalId}`);
    const unsub = onValue(hospRef, snap => {
      if (snap.exists()) {
        const data = snap.val();
        setHospital(data);
      } else {
        setHospital(null);
      }
      setLoading(false);
    });

    const statusRef = ref(db, `Hospitals/${hospitalId}/emergency_dashboard`);
    const unsubStatus = onValue(statusRef, snap => {
      setLiveStatus(snap.val() || null);
    });

    return () => {
      unsub();
      unsubStatus();
    };
  }, [hospitalId]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#0f766e" />
        <Text style={styles.loadingText}>Loading hospital details…</Text>
      </View>
    );
  }

  if (!hospital) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>
          Hospital details unavailable. Please try again.
        </Text>
      </View>
    );
  }

  const profile = hospital.profile || {};
  const opdInfo = hospital.opd_info || {};
  const departments = hospital.departments || {};
  const tags = profile.tags || [];
  const rating = hospital.rating || 4.0;

  const rawDoctors = hospital.doctors || {};
  let doctorsArray = [];

  if (Array.isArray(rawDoctors)) {
    doctorsArray = rawDoctors.filter(Boolean);
  } else if (rawDoctors && typeof rawDoctors === 'object') {
    doctorsArray = Object.keys(rawDoctors).map(key => ({
      id: key,
      ...rawDoctors[key],
    }));
  }

  if (doctorsArray.length === 0) {
    console.log('No doctors found for hospital', hospitalId);
  }

  const topDoctors = doctorsArray.slice(0, 3);

  const name = profile.name || hospital.Name || 'Hospital';
  const city = profile.city || profile.place || hospital.Place || '';
  const address = profile.address || hospital.address || '';
  const fee = opdInfo.avgConsultationFee || 0;

  const opening = opdInfo.openingTime || '—';
  const closing = opdInfo.closingTime || '—';
  const weekendOpen = opdInfo.weekendOpen ?? true;

  const departmentsCount = Object.keys(departments).length;
  const doctorsCount = doctorsArray.length;

  const handleViewAllDoctors = () => {
    if (!doctorsArray.length) {
      Alert.alert('Doctors', 'No doctors have been added for this hospital yet.');
      return;
    }
    navigation.navigate('PatientDoctorList', {
      hospitalId,
      hospitalName: name,
    });
  };

  const handleBookToken = () => {
    navigation.navigate('RequestToken', {
      hospitalId,
      mode: 'general',
    });
  };

  const handleViewHospitalsList = () => {
    navigation.navigate('HospitalsList');
  };

  const handleMyTokens = () => {
    navigation.navigate('MyTokenStatus', {
      hospitalId,
    });
  };

  const handleRecords = () => {
    navigation.navigate('MedicalRecords');
  };

  const handlePharmacies = () => {
    navigation.navigate('NearbyPharmacies');
  };

  // NEW: doctor-specific booking like Practo
  const handleBookDoctor = doc => {
    navigation.navigate('DoctorSlots', {
      hospitalId,
      doctorId: doc.id,
      doctorName: doc.name,
      department: doc.department || doc.specialisation || 'General Medicine',
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/* HERO HEADER */}
      <View style={styles.hero}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroTitle}>{name}</Text>
          <Text style={styles.heroSub}>
            {city ? `${city} • Multi-speciality` : 'Multi-speciality hospital'}
          </Text>
          <View style={styles.heroPill}>
            <MaterialCommunityIcons
              name="star"
              size={13}
              color="#fbbf24"
            />
            <Text style={styles.heroPillText}>{rating.toFixed(1)}</Text>
            <Text style={styles.heroDot}>•</Text>
            <MaterialCommunityIcons
              name="calendar-clock"
              size={13}
              color="#0f766e"
            />
            <Text style={[styles.heroPillText, { marginLeft: 4 }]}>
              OPD today
            </Text>
          </View>
        </View>
      </View>

      {/* TAGS */}
      {tags.length > 0 && (
        <View style={styles.chipRow}>
          {tags.map((t, idx) => (
            <Chip key={idx} label={t} />
          ))}
        </View>
      )}

      {/* HIGHLIGHTS STRIP */}
      <View style={styles.highlightsRow}>
        <HighlightCard
          icon="account-group-outline"
          label="Doctors"
          value={doctorsCount || '—'}
        />
        <HighlightCard
          icon="office-building-marker-outline"
          label="Departments"
          value={departmentsCount || '—'}
        />
        <HighlightCard
          icon="currency-inr"
          label="Avg. fee"
          value={fee ? `₹${fee}` : 'N/A'}
        />
      </View>

      {/* LIVE CAPACITY (beds, ICU, doctors) */}
      {liveStatus && (
        <View style={{ marginTop: 12, marginBottom: 4 }}>
          <Text style={styles.sectionTitle}>Live capacity</Text>
          <View style={styles.highlightsRow}>
            <HighlightCard
              icon="hospital-building"
              label="Beds free"
              value={liveStatus.bedsAvailable ?? '—'}
            />
            <HighlightCard
              icon="heart-pulse"
              label="ICU free"
              value={liveStatus.icuAvailable ?? '—'}
            />
            <HighlightCard
              icon="account-tie"
              label="On-duty doctors"
              value={liveStatus.doctorsOnDuty ?? '—'}
            />
          </View>
        </View>
      )}

      {/* CLINIC INFO */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Clinic information</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Address</Text>
          <Text style={styles.infoValue}>
            {address || 'Address not available'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>OPD timings</Text>
          <Text style={styles.infoValue}>
            {opening !== '—' && closing !== '—'
              ? `${opening} – ${closing}`
              : 'Timings not available'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Weekend</Text>
          <Text style={styles.infoValue}>
            {weekendOpen ? 'Open on weekends' : 'Closed on weekends'}
          </Text>
        </View>
      </View>

      {/* ACTIONS */}
      <View style={{ marginTop: 16 }}>
        <ActionButton
          icon="calendar-check"
          label="Book OPD token"
          desc="Reserve a slot for in-person consultation"
          color="#0f766e"
          primary
          onPress={handleBookToken}
        />
        <ActionButton
          icon="account-group-outline"
          label="View all doctors"
          desc="See specialists and their availability"
          color="#2563eb"
          onPress={handleViewAllDoctors}
        />
        <ActionButton
          icon="clipboard-list-outline"
          label="My bookings & tokens"
          desc="Track your active and past tokens"
          color="#7c3aed"
          onPress={handleMyTokens}
        />
      </View>

      {/* DEPARTMENTS */}
      {departmentsCount > 0 && (
        <View style={{ marginTop: 18 }}>
          <Text style={styles.sectionTitle}>Departments</Text>
          <View style={styles.deptGrid}>
            {Object.keys(departments).map(key => {
              const d = departments[key];
              return (
                <DepartmentCard
                  key={key}
                  label={d.label || key}
                  totalDoctors={d.total_doctors || 0}
                  nextSlot={d.next_available_slot}
                />
              );
            })}
          </View>
        </View>
      )}

      {/* TOP DOCTORS */}
      {topDoctors.length > 0 && (
        <View style={{ marginTop: 18 }}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Top doctors here</Text>
            <TouchableOpacity onPress={handleViewAllDoctors}>
              <Text style={styles.linkText}>View all</Text>
            </TouchableOpacity>
          </View>

          {topDoctors.map((doc, idx) => (
            <DoctorRow
              key={doc.id || idx}
              name={doc.name || `Doctor ${idx + 1}`}
              department={
                doc.department || doc.specialisation || 'General Medicine'
              }
              experience={doc.experience}
              onDuty={!!doc.onDuty}
              onBook={() => handleBookDoctor(doc)}
            />
          ))}
        </View>
      )}

      {/* OTHER SERVICES */}
      <View style={{ marginTop: 18 }}>
        <Text style={styles.sectionTitle}>More from this hospital</Text>
        <View style={styles.grid}>
          <TouchableOpacity style={styles.tile} onPress={handleViewHospitalsList}>
            <View
              style={[
                styles.tileIconContainer,
                { backgroundColor: '#2563eb20' },
              ]}
            >
              <MaterialCommunityIcons
                name="hospital-building"
                size={22}
                color="#2563eb"
              />
            </View>
            <View style={styles.tileTextContainer}>
              <Text style={styles.tileLabel}>Other branches</Text>
              <Text style={styles.tileDesc}>
                Explore UniHealth locations nearby
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tile} onPress={handleRecords}>
            <View
              style={[
                styles.tileIconContainer,
                { backgroundColor: '#7c3aed20' },
              ]}
            >
              <MaterialCommunityIcons
                name="file-document-outline"
                size={22}
                color="#7c3aed"
              />
            </View>
            <View style={styles.tileTextContainer}>
              <Text style={styles.tileLabel}>Medical records</Text>
              <Text style={styles.tileDesc}>
                Access prescriptions and visit history
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tile} onPress={handlePharmacies}>
            <View
              style={[
                styles.tileIconContainer,
                { backgroundColor: '#0f766e20' },
              ]}
            >
              <MaterialCommunityIcons
                name="pill"
                size={22}
                color="#0f766e"
              />
            </View>
            <View style={styles.tileTextContainer}>
              <Text style={styles.tileLabel}>Nearby pharmacies</Text>
              <Text style={styles.tileDesc}>
                Order medicines from trusted stores
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  loading: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  hero: {
    backgroundColor: '#ecfeff',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  heroLeft: { flex: 1 },
  heroTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  heroSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#0f766e15',
  },
  heroPillText: {
    fontSize: 11,
    color: '#0f766e',
    fontWeight: '700',
    marginLeft: 4,
  },
  heroDot: {
    marginHorizontal: 4,
    color: '#0f766e',
    fontWeight: '900',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  chip: {
    backgroundColor: '#e0f2fe',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  chipText: {
    fontSize: 11,
    color: '#0369a1',
    fontWeight: '600',
  },
  highlightsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  highlightCard: {
    flex: 1,
    marginRight: 8,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  highlightLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  highlightValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  infoRow: {
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '700',
    marginTop: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  actionDesc: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  deptGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  deptCard: {
    width: TILE_WIDTH,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  deptName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  deptMeta: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  docAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ecfeff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  docName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  docMeta: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  docBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  docBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  docBookBtn: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#0f766e',
  },
  docBookText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ecfeff',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  tile: {
    width: TILE_WIDTH,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 14,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'flex-start',
  },
  tileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  tileTextContainer: {
    alignItems: 'flex-start',
  },
  tileLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  tileDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '600',
  },
});
