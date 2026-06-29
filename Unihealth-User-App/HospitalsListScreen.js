import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { getDatabase, ref, onValue } from 'firebase/database';

const HospitalsListScreen = ({ navigation }) => {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getDatabase();
    const hospitalsRef = ref(db, 'Hospitals');

    const unsub = onValue(hospitalsRef, snapshot => {
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
          bedsAvailable,
          status: h?.emergency_dashboard?.status || 'normal',
        };
      });
      setHospitals(list);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a73e8" />
        <Text style={{ marginTop: 8 }}>Loading hospitals…</Text>
      </View>
    );
  }

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate('EmergencyDashboard', { hospitalId: item.id })
      }
      onLongPress={() =>
        navigation.navigate('NearbyHospitals', { focusHospitalId: item.id })
      }
    >
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
      <View style={styles.row}>
        <Text style={styles.badge}>{item.bedsAvailable} beds</Text>
        <Text style={styles.status}>Status: {item.status}</Text>
      </View>
      <Text style={styles.hint}>Long‑press to view on map</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={hospitals}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12 }}
      />
    </View>
  );
};

export default HospitalsListScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: '#fafafa',
    marginBottom: 10,
    borderRadius: 10,
    padding: 10,
    elevation: 2,
  },
  name: { fontWeight: '600', fontSize: 16, color: '#212121' },
  address: { fontSize: 12, color: '#757575', marginTop: 2 },
  row: { flexDirection: 'row', marginTop: 6, justifyContent: 'space-between' },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#1a73e8',
    color: '#fff',
    borderRadius: 999,
    fontSize: 12,
  },
  status: { fontSize: 12, color: '#424242' },
  hint: { marginTop: 4, fontSize: 10, color: '#6b7280' },
});
