// src/screens/NearbyPharmacies.js

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { db } from '../../firebaseConfig';
import { ref, onValue } from 'firebase/database';

// Haversine distance in km
function haversineKm(lat1, lon1, lat2, lon2) {
  if (
    typeof lat1 !== 'number' ||
    typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' ||
    typeof lon2 !== 'number'
  ) {
    return null;
  }

  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return +(R * c).toFixed(1);
}

export default function NearbyPharmacies({ navigation }) {
  const [locationStatus, setLocationStatus] = useState('checking'); // checking | granted | denied | error
  const [coords, setCoords] = useState(null);
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Ask for location and store lat/lng
  useEffect(() => {
    (async () => {
      try {
        const { status } =
          await Location.requestForegroundPermissionsAsync();
        console.log('Pharmacy location permission:', status);

        if (status !== 'granted') {
          setLocationStatus('denied');
          setLoading(false);
          return;
        }

        setLocationStatus('granted');
        const loc = await Location.getCurrentPositionAsync({});
        setCoords({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });
      } catch (e) {
        console.log('Pharmacy location error:', e);
        setLocationStatus('error');
        setLoading(false);
      }
    })();
  }, []);

  // Load pharmacy list from Realtime DB
  useEffect(() => {
    const pharmRef = ref(db, 'Pharmacies');
    const unsub = onValue(
      pharmRef,
      snapshot => {
        const data = snapshot.val();
        if (!data) {
          setPharmacies([]);
          setLoading(false);
          return;
        }

        const list = Object.keys(data).map(id => ({
          id,
          ...data[id],
        }));
        setPharmacies(list);
        setLoading(false);
      },
      error => {
        console.log('Pharmacies error:', error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Enrich with distance + simple ETA and sort by nearest
  const enrichedPharmacies = useMemo(() => {
    if (!coords) return pharmacies;

    return pharmacies
      .map(ph => {
        const distKm = haversineKm(
          coords.lat,
          coords.lng,
          ph.lat,
          ph.lng
        );
        const etaMinutes =
          ph.etaMinutes ||
          (distKm != null
            ? Math.max(5, Math.round(distKm * 4))
            : null); // crude: ~15 km/h

        return {
          ...ph,
          distKm,
          etaMinutes,
        };
      })
      .sort((a, b) => {
        if (a.distKm == null) return 1;
        if (b.distKm == null) return -1;
        return a.distKm - b.distKm;
      });
  }, [pharmacies, coords]);

  const renderItem = ({ item }) => {
    const open = item.isOpen !== false;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate('PharmacySearch', {
            pharmacyId: item.id,
            pharmacyName: item.name,
          })
        }
      >
        <View style={styles.cardHeader}>
          <Text style={styles.name}>{item.name || 'Pharmacy'}</Text>

          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: open ? '#dcfce7' : '#fee2e2',
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: open ? '#16a34a' : '#dc2626' },
              ]}
            />
            <Text style={styles.statusText}>
              {open ? 'OPEN' : 'CLOSED'}
            </Text>
          </View>
        </View>

        <Text style={styles.address}>
          {item.address || 'Address not available'}
        </Text>

        <View style={styles.metaRow}>
          {item.distKm != null && (
            <View style={styles.metaChip}>
              <MaterialCommunityIcons
                name="map-marker-distance"
                size={14}
                color="#0f172a"
              />
              <Text style={styles.metaChipText}>
                {item.distKm} km
              </Text>
            </View>
          )}

          {item.etaMinutes != null && (
            <View style={styles.metaChip}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={14}
                color="#0f172a"
              />
              <Text style={styles.metaChipText}>
                ~{item.etaMinutes} mins
              </Text>
            </View>
          )}

          {typeof item.rating === 'number' && (
            <View style={styles.metaChip}>
              <MaterialCommunityIcons
                name="star"
                size={14}
                color="#f59e0b"
              />
              <Text style={styles.metaChipText}>
                {item.rating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.footerRow}>
          <View style={styles.deliveryPill}>
            <MaterialCommunityIcons
              name="bike-fast"
              size={14}
              color="#065f46"
            />
            <Text style={styles.deliveryText}>
              Within {item.deliveryRadiusKm || 5} km delivery
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && pharmacies.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0f172a" />
        <Text style={styles.centerText}>
          Finding pharmacies near you…
        </Text>
      </View>
    );
  }

  if (locationStatus === 'denied') {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>
          Location permission denied. Enable it in settings to see
          nearby pharmacies sorted by distance.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={24}
            color="#0f172a"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nearby pharmacies</Text>
      </View>

      <FlatList
        data={enrichedPharmacies}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.centerText}>
              No pharmacies configured in this area yet.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  backBtn: {
    marginRight: 8,
    padding: 4,
    borderRadius: 999,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0f172a',
  },
  address: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
  },
  metaChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0f172a',
    marginLeft: 4,
  },
  footerRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deliveryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deliveryText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#065f46',
    marginLeft: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  centerText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});
