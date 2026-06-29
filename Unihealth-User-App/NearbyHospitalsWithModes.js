// src/screens/NearbyHospitalsWithModes.js

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import * as Location from 'expo-location';
import { getDatabase, ref, onValue } from 'firebase/database';

const R_EARTH_KM = 6371;

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R_EARTH_KM * c;
}

function calculateEstimatedTimeMinutes(distanceKm, traffic = 'normal', emergencyMode = false) {
  if (distanceKm == null) return null;
  let baseSpeed = 40;
  if (traffic === 'moderate') baseSpeed = 30;
  else if (traffic === 'high') baseSpeed = 20;
  if (emergencyMode) baseSpeed *= 1.5;
  const timeHours = distanceKm / baseSpeed;
  let minutes = timeHours * 60;
  minutes = Math.round(minutes / 5) * 5;
  return Math.max(5, minutes);
}

function getPriority(bedsAvailable) {
  if (bedsAvailable >= 2) return 'high';
  if (bedsAvailable === 1) return 'medium';
  return 'low';
}

const NearbyHospitalsWithModes = ({ navigation, route }) => {
  const [userLocation, setUserLocation] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);

  const initialMode = route?.params?.mode || 'emergency'; // 'emergency' | 'general'
  const [mode, setMode] = useState(initialMode);
  const [emergencyMode, setEmergencyMode] = useState(initialMode === 'emergency');
  const [currentSort, setCurrentSort] = useState('priority'); // 'priority' | 'distance' | 'beds'
  const [maxDistanceKm, setMaxDistanceKm] = useState(null); // radius for filtering

  const focusHospitalId = route?.params?.focusHospitalId || null;

  useEffect(() => {
    let isMounted = true;

    async function getLocationAndData() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          if (!isMounted) return;
          setUserLocation({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          });
        }

        const db = getDatabase();
        const hospitalsRef = ref(db, 'Hospitals');

        onValue(hospitalsRef, snapshot => {
          if (!isMounted) return;
          const val = snapshot.val() || {};

          const list = Object.entries(val).map(([id, h]) => {
            const bedsAvailable =
              h?.emergency_dashboard?.bedsAvailable ??
              h?.bedSummary?.availableBeds ??
              h?.Bed ??
              0;

            return {
              id,
              name: h?.profile?.name || h?.Name || 'Hospital',
              address: h?.profile?.address || h?.Place || '',
              latitude: h?.latitude,
              longitude: h?.longitude,
              beds_available: bedsAvailable,
              traffic_time: h?.traffic_time || 'normal',
              rating: h?.rating || 4.0,
            };
          });

          setHospitals(list);
          setLoading(false);
        });
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    }

    getLocationAndData();

    return () => {
      isMounted = false;
    };
  }, []);

  const processedHospitals = useMemo(() => {
    if (!hospitals.length || !userLocation) return [];

    const enriched = hospitals.map(h => {
      const distance = calculateDistanceKm(
        userLocation.lat,
        userLocation.lng,
        h.latitude,
        h.longitude
      );
      const estimatedTime = calculateEstimatedTimeMinutes(
        distance,
        h.traffic_time,
        emergencyMode
      );
      const priority = getPriority(h.beds_available);

      return {
        ...h,
        distance,
        estimatedTime,
        priority,
      };
    });

    // optional radius filter
    const filtered = enriched.filter(h => {
      if (maxDistanceKm == null || h.distance == null) return true;
      return h.distance <= maxDistanceKm;
    });

    filtered.sort((a, b) => {
      if (currentSort === 'priority') {
        const order = { high: 1, medium: 2, low: 3 };
        if (order[a.priority] !== order[b.priority]) {
          return order[a.priority] - order[b.priority];
        }
        return (a.estimatedTime ?? Infinity) - (b.estimatedTime ?? Infinity);
      }
      if (currentSort === 'distance') {
        return (a.distance ?? Infinity) - (b.distance ?? Infinity);
      }
      if (currentSort === 'beds') {
        return (b.beds_available ?? 0) - (a.beds_available ?? 0);
      }
      return 0;
    });

    return filtered;
  }, [hospitals, userLocation, emergencyMode, currentSort, maxDistanceKm]);

 const handleOpenHospital = hospital => {
  // Read the current mode from route params or local state
  const currentMode = route?.params?.mode || mode || 'emergency';

  if (currentMode === 'emergency') {
  navigation.navigate('EmergencyDashboard', {
    hospitalId: hospital.id,
    mode: 'emergency',
  });
} else {
  navigation.navigate('HospitalGeneral', {
    hospitalId: hospital.id,
  });
}
 };


  const handleOpenInMaps = hospital => {
    if (!hospital.latitude || !hospital.longitude) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${hospital.latitude},${hospital.longitude}`;
    Linking.openURL(url);
  };

  if (loading || !userLocation) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a73e8" />
        <Text style={{ marginTop: 8, color: '#424242' }}>
          Loading hospitals & location…
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Mode-aware toolbar */}
      <View style={styles.toolbar}>
        <Text style={styles.title}>
          {mode === 'emergency'
            ? 'Emergency hospitals near you'
            : 'Hospitals for general appointments'}
        </Text>

        {mode === 'emergency' && (
          <TouchableOpacity
            style={styles.btnMode}
            onPress={() => setEmergencyMode(prev => !prev)}
          >
            <Text style={styles.btnModeText}>
              {emergencyMode ? 'EMERGENCY ON' : 'Emergency mode'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Sort chips */}
        <View style={styles.sortRow}>
          {['priority', 'distance', 'beds'].map(key => (
            <TouchableOpacity
              key={key}
              style={[
                styles.sortChip,
                currentSort === key && styles.sortChipActive,
              ]}
              onPress={() => setCurrentSort(key)}
            >
              <Text style={styles.sortChipText}>
                {key === 'priority'
                  ? 'Best first'
                  : key === 'distance'
                  ? 'Nearest'
                  : 'Most beds'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Radius filter */}
        <View style={[styles.sortRow, { marginTop: 6 }]}>
          {[null, 5, 10, 20].map(v => (
            <TouchableOpacity
              key={v === null ? 'all' : v}
              style={[
                styles.sortChip,
                maxDistanceKm === v && styles.sortChipActive,
              ]}
              onPress={() => setMaxDistanceKm(v)}
            >
              <Text style={styles.sortChipText}>
                {v === null ? 'All distances' : `≤ ${v} km`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={processedHospitals}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 12, paddingHorizontal: 12 }}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleOpenHospital(item)}
            onLongPress={() => handleOpenInMaps(item)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.rank}>{index + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.address} numberOfLines={2}>
                  {item.address}
                </Text>

                {/* Extra detailing for general mode */}
                {mode === 'general' && (
                  <Text
                    style={{
                      fontSize: 11,
                      color: '#616161',
                      marginTop: 2,
                    }}
                  >
                    Beds: {item.beds_available} • Traffic: {item.traffic_time} •
                    Rating: {item.rating.toFixed(1)}
                  </Text>
                )}
              </View>
              {item.distance != null && (
                <Text style={styles.distance}>
                  {item.distance.toFixed(1)} km
                </Text>
              )}
            </View>

            <View style={styles.cardRow}>
              <Text
                style={[
                  styles.badge,
                  item.priority === 'high'
                    ? styles.badgeHigh
                    : item.priority === 'medium'
                    ? styles.badgeMedium
                    : styles.badgeLow,
                ]}
              >
                {item.beds_available} beds • {item.priority.toUpperCase()}
              </Text>

              {mode === 'emergency' && item.estimatedTime != null && (
                <Text style={[styles.badge, styles.badgeTime]}>
                  ~{item.estimatedTime} min
                </Text>
              )}

              {mode === 'general' && (
                <Text style={[styles.badge, styles.badgeTime]}>
                  Appointment & OPD info
                </Text>
              )}

              <Text style={[styles.badge, styles.badgeTraffic]}>
                {item.traffic_time}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={{ color: '#6b7280' }}>
              No hospitals match the selected filters.
            </Text>
          </View>
        }
      />
    </View>
  );
};

export default NearbyHospitalsWithModes;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toolbar: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#fafafa',
  },
  title: { fontSize: 14, fontWeight: '600', marginBottom: 4, color: '#111827' },
  btnMode: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#e3f2fd',
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  btnModeText: { color: '#0d47a1', fontWeight: '600', fontSize: 12 },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sortChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: '#e0e0e0',
    marginRight: 4,
    marginBottom: 4,
  },
  sortChipActive: { backgroundColor: '#1a73e8' },
  sortChipText: { fontSize: 12, color: '#424242' },
  card: {
    backgroundColor: '#fff',
    marginVertical: 4,
    borderRadius: 10,
    padding: 10,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  rank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1a73e8',
    color: '#fff',
    textAlign: 'center',
    textAlignVertical: 'center',
    marginRight: 8,
    fontWeight: '700',
    fontSize: 12,
  },
  name: { fontWeight: '600', fontSize: 14, color: '#212121' },
  address: { fontSize: 11, color: '#757575', marginTop: 2 },
  distance: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a73e8',
    marginLeft: 8,
  },
  cardRow: { flexDirection: 'row', marginTop: 8, gap: 6 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    fontSize: 11,
    overflow: 'hidden',
    color: '#fff',
  },
  badgeHigh: { backgroundColor: '#43a047' },
  badgeMedium: { backgroundColor: '#fb8c00' },
  badgeLow: { backgroundColor: '#9e9e9e' },
  badgeTime: { backgroundColor: '#1a73e8' },
  badgeTraffic: { backgroundColor: '#5c6bc0' },
});
