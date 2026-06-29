// src/screens/MyTokenStatus.js

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { getDatabase, ref, onValue } from 'firebase/database';
import Ionicons from '@expo/vector-icons/Ionicons';

const HOSPITAL_ID = 'UH-HOS-00000';

// Same helper as web + RequestToken
function getTodayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function MyTokenStatus({ route, navigation }) {
  const hospitalId = route?.params?.hospitalId || HOSPITAL_ID;
  const tokenId = route?.params?.tokenId || null;
  const dateKeyFromRoute = route?.params?.dateKey || null;

  const dateKey = dateKeyFromRoute || getTodayKey();

  const [token, setToken] = useState(null);
  const [queue, setQueue] = useState(null);
  const [loading, setLoading] = useState(true);

  const db = getDatabase();

  useEffect(() => {
    if (!tokenId) {
      setLoading(false);
      return;
    }

    // Listen to all tokens for this date under:
    // Hospitals/{hospitalId}/tokens/{dateKey}
    const tokensRef = ref(db, `Hospitals/${hospitalId}/tokens/${dateKey}`);

    const unsub = onValue(tokensRef, snapshot => {
      const data = snapshot.val() || {};
      const list = Object.values(data);

      const myToken = list.find(t => t.tokenId === tokenId) || null;
      setToken(myToken);

      // Derive simple queue info from tokens list
      const waitingList = list.filter(t => t.status === 'Waiting');
      const approvedList = list.filter(t => t.status === 'Approved');

      const currentTokenObj =
        approvedList.length > 0 ? approvedList[approvedList.length - 1] : null;

      const currentToken = currentTokenObj?.tokenId || 0;
      const waitingCount = waitingList.length;

      // Simple average wait; you can improve later
      const avgWaitMinutes = 15;

      setQueue({
        currentToken,
        waitingCount,
        averageWaitMinutes: avgWaitMinutes,
      });

      setLoading(false);
    });

    return () => {
      unsub();
    };
  }, [db, hospitalId, tokenId, dateKey]);

  if (!tokenId) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.title}>No Active Token</Text>
          <Text style={styles.sub}>
            Request a token from the booking screen to track your queue status.
          </Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => navigation.navigate('RequestToken', { hospitalId })}
          >
            <Text style={styles.btnText}>REQUEST TOKEN</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="small" color="#38bdf8" />
          <Text style={styles.loadingText}>Syncing with hospital queue...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!token) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.title}>Token Not Found</Text>
          <Text style={styles.sub}>
            The token may have been completed, cancelled, or expired.
          </Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => navigation.navigate('RequestToken', { hospitalId })}
          >
            <Text style={styles.btnText}>NEW TOKEN REQUEST</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentToken = queue?.currentToken ?? 0;
  const waitingCount = queue?.waitingCount ?? 0;
  const avgWaitMinutes = queue?.averageWaitMinutes ?? 15;

  // For now map tokenId string to a number-ish display if needed
  const myNumber = token.tokenNumber ?? token.tokenId ?? 0;

  let numericMyNumber =
    typeof myNumber === 'number'
      ? myNumber
      : parseInt(String(myNumber).replace(/\D/g, ''), 10) || 0;

  let numericCurrent =
    typeof currentToken === 'number'
      ? currentToken
      : parseInt(String(currentToken).replace(/\D/g, ''), 10) || 0;

  const peopleAhead =
    numericMyNumber > numericCurrent ? numericMyNumber - numericCurrent : 0;

  const status = (token.status || 'Waiting').toLowerCase();
  const statusColor =
    status === 'approved'
      ? '#16a34a'
      : status === 'delayed'
      ? '#f59e0b'
      : status === 'cancelled'
      ? '#ef4444'
      : '#3b82f6';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#f9fafb" />
        </TouchableOpacity>
        <View style={{ marginTop: 10 }}>
          <Text style={styles.headerTitle}>My Token Status</Text>
          <Text style={styles.headerSub}>{hospitalId}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>TOKEN NUMBER</Text>
        <Text style={styles.tokenNumber}>{myNumber || '-'}</Text>

        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {status.toUpperCase()}
          </Text>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.smallLabel}>PEOPLE AHEAD</Text>
            <Text style={styles.bigValue}>{peopleAhead}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.smallLabel}>AVG WAIT</Text>
            <Text style={styles.bigValue}>{avgWaitMinutes}m</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.smallLabel}>NOW SERVING</Text>
            <Text style={styles.bigValue}>{currentToken || '-'}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.smallLabel}>TOTAL WAITING</Text>
            <Text style={styles.bigValue}>{waitingCount}</Text>
          </View>
        </View>

        <Text style={styles.reasonTitle}>Reason</Text>
        <Text style={styles.reasonText}>{token.reason}</Text>
      </View>

      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => navigation.navigate('RequestToken', { hospitalId })}
      >
        <Text style={styles.secondaryBtnText}>NEW TOKEN REQUEST</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // unchanged styling from your original file
  safe: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
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
  },
  headerTitle: {
    color: '#f9fafb',
    fontSize: 22,
    fontWeight: '800',
  },
  headerSub: {
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#ffffff',
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6b7280',
    letterSpacing: 1,
  },
  tokenNumber: {
    fontSize: 40,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    marginTop: 24,
    justifyContent: 'space-between',
  },
  col: {
    flex: 1,
    alignItems: 'center',
  },
  smallLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
  },
  bigValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginTop: 4,
  },
  reasonTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6b7280',
    marginTop: 26,
    marginBottom: 6,
  },
  reasonText: {
    fontSize: 14,
    color: '#111827',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 10,
  },
  sub: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  btn: {
    marginTop: 18,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#0f172a',
  },
  btnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  secondaryBtn: {
    backgroundColor: '#111827',
    paddingVertical: 14,
    margin: 20,
    borderRadius: 999,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#e5e7eb',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 1,
  },
});
