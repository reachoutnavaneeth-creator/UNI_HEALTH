// src/screens/TokenDashboard.js

import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  Alert,
  Dimensions,
  Vibration,
  Animated,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ref, onValue, update, push, serverTimestamp } from 'firebase/database';

// from src/screens/PatientHome.js
import { db } from '../../firebaseConfig';

const { width } = Dimensions.get('window');
const DEFAULT_HOSPITAL_ID = 'UH-HOS-00000';

// Match web + other RN screens
function getTodayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function TokenDashboard({ route, navigation }) {
  // 1. CONFIGURATION & STATE
  const hospitalId = route?.params?.hospitalId || DEFAULT_HOSPITAL_ID;

  const [tokens, setTokens] = useState([]);
  const [hospitalStats, setHospitalStats] = useState(null); // optional extra status
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const surgeAnim = useRef(new Animated.Value(0)).current;

  const todayKey = getTodayKey();

  // 2. DATABASE REFERENCES
  const rootRef = ref(db);
  // Web-compatible dated tokens node
  const tokensRef = ref(db, `Hospitals/${hospitalId}/tokens/${todayKey}`);
  // Optional emergency_dashboard (if you still use it elsewhere)
  const emergencyRef = ref(db, `Hospitals/${hospitalId}/emergency_dashboard`);
  const auditTokensRef = ref(db, `Audit/tokens/${hospitalId}`);

  // 3. SYNC ENGINE
  useEffect(() => {
    let isMounted = true;

    // A. Listen to Tokens for today
    const unsubTokens = onValue(tokensRef, snapshot => {
      if (!isMounted) return;
      const data = snapshot.val() || {};
      // Tokens are objects keyed by tokenId, each contains tokenId/status/etc.
      const mapped = Object.values(data);
      setTokens(mapped);
      setLoading(false);
    });

    // B. Emergency dashboard (optional status)
    const unsubEmergency = onValue(emergencyRef, snapshot => {
      if (!isMounted) return;
      setHospitalStats(snapshot.val() || null);
    });

    return () => {
      isMounted = false;
      unsubTokens();
      unsubEmergency();
    };
  }, [hospitalId, todayKey]);

  // 4. SURGE PROTOCOL
  const triggerSurgeWarning = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(surgeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(surgeAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  };

  useEffect(() => {
    const status = hospitalStats?.status || 'normal';
    if (status === 'overloaded' || status === 'busy') {
      triggerSurgeWarning();
    }
  }, [hospitalStats]);

  const surgeBg = surgeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#ffffff', '#fee2e2'],
  });

  // 5. DATA COMPUTATION

  // Convert web-style tokens into filters: emergency vs waiting
  const sortedTokens = useMemo(() => {
    let filtered = [...tokens];

    if (filter === 'emergency') {
      filtered = filtered.filter(
        t => (t.priority || '').toLowerCase() === 'emergency'
      );
    } else if (filter === 'waiting') {
      filtered = filtered.filter(
        t => (t.status || '').toLowerCase() === 'waiting'
      );
    }

    return filtered.sort((a, b) => {
      const pa = (a.priority || '') === 'emergency' ? 0 : 1;
      const pb = (b.priority || '') === 'emergency' ? 0 : 1;
      if (pa !== pb) return pa - pb;

      const aId = a.tokenId || '';
      const bId = b.tokenId || '';
      return String(aId).localeCompare(String(bId));
    });
  }, [tokens, filter]);

  // Derive simple live stats from tokens list
  const liveStats = useMemo(() => {
    const waiting = tokens.filter(
      t => (t.status || '').toLowerCase() === 'waiting'
    );
    const approved = tokens.filter(
      t => (t.status || '').toLowerCase() === 'approved'
    );

    const currentToken =
      approved.length > 0 ? approved[approved.length - 1].tokenId : '-';

    const avgWait = 15; // simple default; could compute from eta
    const todayTotal = tokens.length;
    const emergToday = tokens.filter(
      t => (t.priority || '').toLowerCase() === 'emergency'
    ).length;

    return {
      currentToken,
      waiting: waiting.length,
      avgWait,
      todayTotal,
      emergToday,
      hospitalStatus: hospitalStats?.status || 'normal',
      bedsAvailable: hospitalStats?.bedsAvailable ?? 0,
      icuAvailable: hospitalStats?.icuAvailable ?? 0,
    };
  }, [tokens, hospitalStats]);

  // 6. ACTION HANDLERS

  const handleUpdateStatus = useCallback(
    async (token, newStatusRaw) => {
      try {
        if (Platform.OS !== 'web') {
          Vibration.vibrate(70);
        }

        // Map to web-style capitalized statuses used by the hospital site
        const mapStatus = s => {
          const lower = s.toLowerCase();
          if (lower === 'approved') return 'Approved';
          if (lower === 'delayed') return 'Delayed';
          if (lower === 'cancelled' || lower === 'canceled') return 'Cancelled';
          return 'Waiting';
        };

        const oldStatus = (token.status || 'Waiting').toLowerCase();
        const newStatus = mapStatus(newStatusRaw);

        const updates = {};

        // 1. Update Token node at the dated path
        const tokenId = token.tokenId;
        if (!tokenId) {
          throw new Error('Token missing tokenId field');
        }

        updates[
          `Hospitals/${hospitalId}/tokens/${todayKey}/${tokenId}/status`
        ] = newStatus;
        updates[
          `Hospitals/${hospitalId}/tokens/${todayKey}/${tokenId}/updatedAt`
        ] = serverTimestamp();

        // No separate /queue node; queue is derived from tokens list.

        // 2. Batch update
        await update(rootRef, updates);

        // 3. Optional audit trail (keeping your existing Audit/tokens branch)
        await push(auditTokensRef, {
          timestamp: serverTimestamp(),
          tokenId,
          tokenNumber: token.tokenNumber || null,
          action: newStatus,
          performer: 'ADMIN_CONSOLE_MOBILE',
          hospitalStatusAtTime: liveStats.hospitalStatus,
        });
      } catch (err) {
        Alert.alert(
          'Cloud Sync Failure',
          'Database transaction interrupted. Please retry.'
        );
      }
    },
    [hospitalId, todayKey, rootRef, auditTokensRef, liveStats.hospitalStatus]
  );

  // 7. UI COMPONENTS

  const AnalyticsPill = ({ label, value, color }) => (
    <View
      style={{
        alignItems: 'center',
        paddingHorizontal: 10,
      }}
    >
      <Text style={[styles.mLab, { color: color || '#64748b' }]}>{label}</Text>
      <Text style={[styles.mVal, { color: color || '#fff' }]}>{value}</Text>
    </View>
  );

  const TokenItem = ({ item }) => {
    const rawStatus = item.status || 'Waiting';
    const status = rawStatus.toLowerCase();
    const isEmergency = (item.priority || '').toLowerCase() === 'emergency';

    const theme =
      status === 'approved'
        ? { color: '#10b981', icon: 'checkmark-circle' }
        : status === 'delayed'
        ? { color: '#f59e0b', icon: 'time' }
        : status === 'cancelled'
        ? { color: '#ef4444', icon: 'close-circle' }
        : { color: '#3b82f6', icon: 'hourglass' };

    const disabled = status === 'approved';

    return (
      <View
        style={[
          styles.tokenCard,
          isEmergency && styles.emergencyCard,
        ]}
      >
        <View style={styles.tokenHeader}>
          <View>
            <Text style={styles.tokenNum}>{item.tokenId || '-'}</Text>
            <Text style={styles.patientName}>
              {item.patientName || 'Unknown'}
            </Text>
          </View>
          <View style={styles.statusBox}>
            {isEmergency && (
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentText}>LIFE-CRITICAL</Text>
              </View>
            )}
            <View
              style={[
                styles.tag,
                { backgroundColor: `${theme.color}15` },
              ]}
            >
              <Ionicons name={theme.icon} size={16} color={theme.color} />
              <Text
                style={[
                  styles.tagText,
                  { color: theme.color },
                ]}
              >
                {rawStatus.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.reasonLabel}>
          {item.reason || 'General Outpatient Consultation'}
        </Text>

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.serveBtn,
              status === 'approved' && styles.disabledBtn,
            ]}
            onPress={() => handleUpdateStatus(item, 'approved')}
            disabled={status === 'approved'}
          >
            <Ionicons
              name="play-circle"
              size={18}
              color="#fff"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.btnTextMain}>SERVE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.delayBtn,
              (status === 'approved' || status === 'delayed') &&
                styles.disabledBtn,
            ]}
            onPress={() => handleUpdateStatus(item, 'delayed')}
            disabled={status === 'approved' || status === 'delayed'}
          >
            <Ionicons
              name="time"
              size={16}
              color="#f59e0b"
              style={{ marginRight: 4 }}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.cancelBtn,
              status === 'approved' && styles.disabledBtn,
            ]}
            onPress={() => handleUpdateStatus(item, 'cancelled')}
            disabled={status === 'approved'}
          >
            <Ionicons
              name="close"
              size={16}
              color="#ef4444"
              style={{ marginRight: 4 }}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // 8. PRIMARY RENDER

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingArea}>
          <ActivityIndicator size="small" color="#0f172a" />
          <Text style={styles.loadingMsg}>SYNCING WITH HOSPITAL ANALYTICS...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* TOP NAV */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.analyticsTrigger}
        >
          <Ionicons name="chevron-back" size={22} color="#e5e7eb" />
        </TouchableOpacity>

        <View style={styles.titleGroup}>
          <Text style={styles.mainTitle}>Queue Command</Text>
          <Text style={styles.subTitle}>
            {hospitalId} • Real-time Sync
          </Text>
        </View>

        <TouchableOpacity
          onPress={() =>
            navigation.navigate('EmergencyDashboard', { hospitalId })
          }
          style={styles.analyticsTrigger}
        >
          <Ionicons name="pulse" size={20} color="#e5e7eb" />
        </TouchableOpacity>
      </View>

      {/* SURGE BANNER */}
      <Animated.View style={[styles.surgeBanner, { backgroundColor: surgeBg }]}>
        <View style={styles.surgeRow}>
          <Ionicons
            name="alert-circle"
            size={18}
            color="#b91c1c"
          />
          <Text style={styles.surgeText}>
            STATUS: {liveStats.hospitalStatus.toUpperCase()}
          </Text>
        </View>
      </Animated.View>

      {/* PERFORMANCE DASHBOARD */}
      <View style={styles.dashboard}>
        <LinearGradient
          colors={['#0f172a', '#1f2937']}
          style={styles.gradCard}
        >
          <View style={styles.statGrid}>
            <AnalyticsPill
              label="NOW SERVING"
              value={liveStats.currentToken || '-'}
            />
            <View style={styles.vDivider} />
            <AnalyticsPill
              label="QUEUE SIZE"
              value={liveStats.waiting}
            />
            <View style={styles.vDivider} />
            <AnalyticsPill
              label="AVG WAIT"
              value={`${liveStats.avgWait}m`}
            />
          </View>

          <View style={styles.hDivider} />

          <View style={styles.footerStats}>
            <View style={styles.miniStat}>
              <Text style={styles.mVal}>{liveStats.todayTotal}</Text>
              <Text style={styles.mLab}>Check-ins</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={styles.mVal}>{liveStats.emergToday}</Text>
              <Text style={styles.mLab}>Emergencies</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* FILTERS */}
      <View style={styles.filterContainer}>
        {['all', 'emergency', 'waiting'].map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[
              styles.filterBtn,
              filter === f && styles.filterBtnActive,
            ]}
          >
            <Text
              style={[
                styles.filterBtnText,
                filter === f && styles.filterBtnTextActive,
              ]}
            >
              {f.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* TOKEN LIST */}
      <FlatList
        data={sortedTokens}
        keyExtractor={item => item.tokenId}
        renderItem={({ item }) => <TokenItem item={item} />}
        contentContainerStyle={styles.listArea}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyView}>
            <Ionicons
              name="checkmark-done-circle"
              size={40}
              color="#22c55e"
            />
            <Text style={styles.emptyTitle}>Queue Cleared</Text>
            <Text style={styles.emptySub}>
              No pending tokens for this category.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfdfd' },
  loadingArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingMsg: {
    marginTop: 15,
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1.5,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  titleGroup: { alignItems: 'center' },
  mainTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  subTitle: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  analyticsTrigger: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  surgeBanner: {
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  surgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  surgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: 8,
  },
  dashboard: { padding: 20 },
  gradCard: {
    borderRadius: 30,
    padding: 25,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  statGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  vDivider: {
    width: 1,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  hDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 20,
  },
  footerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  miniStat: { alignItems: 'center', flex: 1 },
  mVal: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  mLab: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  filterBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginRight: 10,
    backgroundColor: '#f1f5f9',
  },
  filterBtnActive: {
    backgroundColor: '#0f172a',
  },
  filterBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
  },
  filterBtnTextActive: {
    color: '#fff',
  },
  listArea: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  tokenCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 15,
    borderBottomWidth: 4,
    borderBottomColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  emergencyCard: {
    borderColor: '#ef444420',
    borderWidth: 2,
    borderBottomColor: '#ef4444',
  },
  tokenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  tokenNum: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1e293b',
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
  },
  statusBox: { alignItems: 'flex-end' },
  urgentBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 5,
  },
  urgentText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '900',
    marginLeft: 5,
  },
  reasonLabel: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  serveBtn: {
    flex: 2,
    backgroundColor: '#0f172a',
    marginRight: 10,
  },
  delayBtn: {
    flex: 0.6,
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    marginRight: 10,
  },
  cancelBtn: {
    flex: 0.6,
    borderWidth: 1.5,
    borderColor: '#ef4444',
  },
  btnTextMain: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  disabledBtn: {
    opacity: 0.2,
  },
  emptyView: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1e293b',
    marginTop: 20,
  },
  emptySub: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 5,
  },
});
