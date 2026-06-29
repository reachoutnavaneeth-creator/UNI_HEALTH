// src/screens/AuditLogsScreen.js

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { getDatabase, ref, onValue } from 'firebase/database';
import Ionicons from '@expo/vector-icons/Ionicons';

const HOSPITAL_ID = 'UH-HOS-00000';

export default function AuditLogsScreen() {
  const [bedsLogs, setBedsLogs] = useState([]);
  const [emergencyLogs, setEmergencyLogs] = useState([]);
  const [tokenLogs, setTokenLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('beds');
  const [loading, setLoading] = useState(true);

  const db = getDatabase();

  useEffect(() => {
    const bedsRef = ref(db, `Audit/beds/${HOSPITAL_ID}`);
    const emergencyRef = ref(db, `Audit/emergency/${HOSPITAL_ID}`);
    const tokensRef = ref(db, `Audit/tokens/${HOSPITAL_ID}`);

    let loadedA = false;
    let loadedB = false;
    let loadedC = false;

    const unsubBeds = onValue(bedsRef, snapshot => {
      const data = snapshot.val();
      const mapped = data
        ? Object.keys(data).map(k => ({ id: k, ...data[k] }))
        : [];
      setBedsLogs(mapped.reverse());
      loadedA = true;
      if (loadedA && loadedB && loadedC) setLoading(false);
    });

    const unsubEmergency = onValue(emergencyRef, snapshot => {
      const data = snapshot.val();
      const mapped = data
        ? Object.keys(data).map(k => ({ id: k, ...data[k] }))
        : [];
      setEmergencyLogs(mapped.reverse());
      loadedB = true;
      if (loadedA && loadedB && loadedC) setLoading(false);
    });

    const unsubTokens = onValue(tokensRef, snapshot => {
      const data = snapshot.val();
      const mapped = data
        ? Object.keys(data).map(k => ({ id: k, ...data[k] }))
        : [];
      setTokenLogs(mapped.reverse());
      loadedC = true;
      if (loadedA && loadedB && loadedC) setLoading(false);
    });

    return () => {
      unsubBeds();
      unsubEmergency();
      unsubTokens();
    };
  }, [db]);

  const currentLogs = useMemo(() => {
    if (activeTab === 'beds') return bedsLogs;
    if (activeTab === 'emergency') return emergencyLogs;
    return tokenLogs;
  }, [activeTab, bedsLogs, emergencyLogs, tokenLogs]);

  const renderItem = ({ item }) => (
    <View style={styles.logCard}>
      <Text style={styles.logTitle}>{item.action || 'EVENT'}</Text>
      {item.details && (
        <Text style={styles.logDetails}>{item.details}</Text>
      )}
      {item.patientName && (
        <Text style={styles.logDetails}>Patient: {item.patientName}</Text>
      )}
      {item.tokenNumber && (
        <Text style={styles.logDetails}>Token: {item.tokenNumber}</Text>
      )}
      <Text style={styles.logTime}>
        {item.timestampText ||
          item.timestamp ||
          'Time not recorded'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0f172a" />
          <Text style={styles.loadingText}>Loading audit logs...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>System Audit Logs</Text>
        <Text style={styles.headerSub}>{HOSPITAL_ID}</Text>
      </View>

      <View style={styles.tabBar}>
        {['beds', 'emergency', 'tokens'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabBtn,
              activeTab === tab && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={currentLogs}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="document-text-outline"
              size={60}
              color="#d4d4d8"
            />
            <Text style={styles.emptyText}>
              No logs available for this category.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 18,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f9fafb',
  },
  headerSub: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    padding: 8,
    marginHorizontal: 16,
    borderRadius: 999,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#f9fafb',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9ca3af',
  },
  tabTextActive: {
    color: '#0f172a',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  logCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  logTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  logDetails: {
    fontSize: 12,
    color: '#4b5563',
    marginTop: 2,
  },
  logTime: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 4,
  },
  empty: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    marginTop: 10,
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '600',
  },
});
