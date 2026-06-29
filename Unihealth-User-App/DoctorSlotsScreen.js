// src/screens/DoctorSlotsScreen.js

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ref, onValue, push, set, serverTimestamp } from 'firebase/database';
import { db } from '../../firebaseConfig';
import { getAuth } from 'firebase/auth';

function formatDateLabel(date, index) {
  if (index === 0) return 'Today';
  if (index === 1) return 'Tomorrow';
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
  });
}

function getDateKey(date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function getWeekdayKey(date) {
  return date.toLocaleDateString('en-US', { weekday: 'short' }); // Mon, Tue...
}

function makeSlotsForWindow(start, end, durationMinutes) {
  const slots = [];
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let totalStart = sh * 60 + sm;
  const totalEnd = eh * 60 + em;

  while (totalStart + durationMinutes <= totalEnd) {
    const h = Math.floor(totalStart / 60);
    const m = totalStart % 60;
    const hh = h.toString().padStart(2, '0');
    const mm = m.toString().padStart(2, '0');
    slots.push(`${hh}:${mm}`);
    totalStart += durationMinutes;
  }
  return slots;
}

export default function DoctorSlotsScreen({ navigation, route }) {
  const { hospitalId, doctorId, doctorName, department } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [slotConfig, setSlotConfig] = useState(null);
  const [blockedSlots, setBlockedSlots] = useState({});
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const auth = getAuth();
  const user = auth.currentUser;

  // Build next 3 days
  const days = useMemo(() => {
    const today = new Date();
    const arr = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, []);

  useEffect(() => {
    if (!hospitalId || !doctorId) {
      Alert.alert('Error', 'Missing hospital or doctor information.');
      return;
    }

    const docRef = ref(db, `Hospitals/${hospitalId}/doctors/${doctorId}`);
    const unsub = onValue(docRef, snap => {
      if (snap.exists()) {
        const val = snap.val();
        setSlotConfig(val.slotConfig || null);
        setBlockedSlots(val.blockedSlots || {});
      } else {
        setSlotConfig(null);
        setBlockedSlots({});
      }
      setLoading(false);
    });

    return () => unsub();
  }, [hospitalId, doctorId]);

  const selectedDate = days[selectedDayIndex];
  const dateKey = selectedDate ? getDateKey(selectedDate) : null;
  const weekdayKey = selectedDate ? getWeekdayKey(selectedDate) : null;

  const generatedSlots = useMemo(() => {
    if (!slotConfig || !selectedDate) return [];

    // If day-of-week not allowed, no slots
    if (slotConfig.days && !slotConfig.days.includes(weekdayKey)) {
      return [];
    }

    const duration = slotConfig.slotDurationMinutes || 15;
    const allSlots = [];

    if (slotConfig.morning) {
      allSlots.push(
        ...makeSlotsForWindow(
          slotConfig.morning.start,
          slotConfig.morning.end,
          duration
        ).map(time => ({ time, label: time, part: 'Morning' }))
      );
    }

    if (slotConfig.afternoon) {
      allSlots.push(
        ...makeSlotsForWindow(
          slotConfig.afternoon.start,
          slotConfig.afternoon.end,
          duration
        ).map(time => ({ time, label: time, part: 'Afternoon' }))
      );
    }

    if (slotConfig.evening) {
      allSlots.push(
        ...makeSlotsForWindow(
          slotConfig.evening.start,
          slotConfig.evening.end,
          duration
        ).map(time => ({ time, label: time, part: 'Evening' }))
      );
    }

    const blockedForDay = blockedSlots[dateKey] || [];
    return allSlots.filter(s => !blockedForDay.includes(s.time));
  }, [slotConfig, blockedSlots, selectedDate, weekdayKey, dateKey]);

  const handleConfirm = async () => {
    if (!selectedSlot || !selectedDate) {
      Alert.alert('Select a slot', 'Please choose a time slot first.');
      return;
    }
    if (!hospitalId || !doctorId) {
      Alert.alert('Error', 'Missing hospital or doctor information.');
      return;
    }

    try {
      const tokensRef = ref(db, `Hospitals/${hospitalId}/tokens/${dateKey}`);
      const newTokenRef = push(tokensRef);

      const tokenData = {
        tokenId: newTokenRef.key,
        type: 'general',
        mode: 'general',
        status: 'booked',
        priority: 'normal',
        createdAt: serverTimestamp(),
        patientName: user?.email?.split('@')[0] || 'Patient',
        doctorId,
        doctorName,
        department,
        slot: `${dateKey}T${selectedSlot.time}:00`,
        notes: 'Booked via DoctorSlots',
      };

      await set(newTokenRef, tokenData);

      Alert.alert(
        'Appointment booked',
        `${doctorName} • ${selectedSlot.time} on ${dateKey}`,
        [
          {
            text: 'View my tokens',
            onPress: () =>
              navigation.navigate('MyTokenStatus', { hospitalId }),
          },
          { text: 'OK', style: 'cancel' },
        ]
      );
    } catch (e) {
      Alert.alert('Error', 'Could not book appointment. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#0f766e" />
        <Text style={styles.loadingText}>Loading doctor schedule…</Text>
      </View>
    );
  }

  if (!slotConfig) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>
          No schedule configured for this doctor yet.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      <Text style={styles.title}>{doctorName || 'Doctor'}</Text>
      <Text style={styles.subtitle}>
        {department || 'General Medicine'} • {hospitalId}
      </Text>

      {/* Day selector */}
      <View style={styles.daysRow}>
        {days.map((d, idx) => (
          <TouchableOpacity
            key={idx}
            style={[
              styles.dayChip,
              selectedDayIndex === idx && styles.dayChipActive,
            ]}
            onPress={() => {
              setSelectedDayIndex(idx);
              setSelectedSlot(null);
            }}
          >
            <Text
              style={[
                styles.dayText,
                selectedDayIndex === idx && styles.dayTextActive,
              ]}
            >
              {formatDateLabel(d, idx)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Select a time slot</Text>

      {generatedSlots.length === 0 ? (
        <Text style={styles.noSlotsText}>
          No slots available for this day.
        </Text>
      ) : (
        <View style={styles.slotGrid}>
          {generatedSlots.map(s => (
            <TouchableOpacity
              key={`${s.part}-${s.time}`}
              style={[
                styles.slotChip,
                selectedSlot?.time === s.time && styles.slotChipActive,
              ]}
              onPress={() => setSelectedSlot(s)}
            >
              <Text style={styles.slotPart}>{s.part}</Text>
              <Text
                style={[
                  styles.slotText,
                  selectedSlot?.time === s.time && styles.slotTextActive,
                ]}
              >
                {s.time}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
        <Text style={styles.confirmText}>Confirm appointment</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
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
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 16,
  },
  daysRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    marginRight: 8,
  },
  dayChipActive: {
    backgroundColor: '#0f766e',
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  dayTextActive: {
    color: '#ecfeff',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  noSlotsText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 16,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  slotChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#ffffff',
  },
  slotChipActive: {
    borderColor: '#0f766e',
    backgroundColor: '#dcfce7',
  },
  slotPart: {
    fontSize: 10,
    color: '#6b7280',
  },
  slotText: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
  },
  slotTextActive: {
    color: '#065f46',
  },
  confirmBtn: {
    marginTop: 24,
    backgroundColor: '#0f766e',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmText: {
    color: '#ecfeff',
    fontSize: 14,
    fontWeight: '800',
  },
});
