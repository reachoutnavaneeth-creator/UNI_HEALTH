/**
 * EMERGENCY CONTROL DASHBOARD - V4.0 (MOBILE INTEGRATED)
 * Original Member 2 Web Logic -> React Native Conversion
 * Features: Live Bed Tracking, ICU Capacity, Surge Status Select
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ref, onValue, update, push, serverTimestamp } from "firebase/database";
import { db } from "../../firebaseConfig";

export default function EmergencyDashboard({ route, navigation }) {
  const hospitalId = route?.params?.hospitalId || "ID1";

  // --- 1. STATE ---
  const [emData, setEmData] = useState({
    status: "normal",
    bedsAvailable: 0,
    bedsTotal: 0,
    icuAvailable: 0,
    avgWait: "0m",
    doctorsOnDuty: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- 2. FIREBASE SYNC ---
  useEffect(() => {
    const emRef = ref(db, `Hospitals/${hospitalId}/emergency`);
    const activityRef = ref(db, `Hospitals/${hospitalId}/emergencyActivity`);

    const unsubEm = onValue(emRef, (snapshot) => {
      if (snapshot.exists()) setEmData(snapshot.val());
      setLoading(false);
    });

    const unsubActivity = onValue(activityRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data)
          .map((key) => ({ id: key, ...data[key] }))
          .reverse(); // Newest first
        setRecentActivity(list.slice(0, 5)); // Keep last 5
      }
    });

    return () => {
      unsubEm();
      unsubActivity();
    };
  }, [hospitalId]);

  // --- 3. LOGIC HANDLERS ---
  const updateStatus = async (newStatus) => {
    try {
      const emRef = ref(db, `Hospitals/${hospitalId}/emergency`);
      const activityRef = ref(db, `Hospitals/${hospitalId}/emergencyActivity`);

      await update(emRef, { status: newStatus, lastUpdated: serverTimestamp() });
      
      await push(activityRef, {
        type: "status_change",
        status: newStatus,
        timestamp: serverTimestamp(),
        admin: "Staff_01",
      });
    } catch (err) {
      Alert.alert("Sync Error", "Could not update emergency status.");
    }
  };

  // --- 4. UI COMPONENTS ---
  const MetricCard = ({ label, value, sub, icon, color, bgColor }) => (
    <View style={styles.metricCard}>
      <View style={styles.metricContent}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricSub}>{sub}</Text>
      </View>
      <View style={[styles.metricIcon, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
    </View>
  );

  const StatusPill = ({ label, active, color, onPress }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.statusPill,
        active ? { backgroundColor: color } : { backgroundColor: "#f1f5f9" },
      ]}
    >
      <Text style={[styles.statusPillText, active && { color: "#fff" }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  // --- 5. RENDER ---
  const statusTheme = {
    normal: { color: "#10b981", bg: ["#dcfce7", "#ffffff"], label: "NORMAL" },
    busy: { color: "#f59e0b", bg: ["#fef3c7", "#ffffff"], label: "BUSY" },
    overloaded: { color: "#ef4444", bg: ["#fee2e2", "#ffffff"], label: "OVERLOADED" },
  }[emData.status || "normal"];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Emergency Control</Text>
            <Text style={styles.subtitle}>UniHealth Hospital Readiness</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close-circle" size={32} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        {/* Dynamic Banner (Replaces Member 2's Banner) */}
        <LinearGradient colors={statusTheme.bg} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.banner}>
          <View style={[styles.badge, { backgroundColor: statusTheme.color }]}>
            <Text style={styles.badgeText}>{statusTheme.label}</Text>
          </View>
          <Text style={styles.bannerText}>
            Mode Active: <Text style={{ fontWeight: "800" }}>{emData.status.toUpperCase()}</Text>
          </Text>
        </LinearGradient>

        {/* Status Selector */}
        <View style={styles.pillRow}>
          <StatusPill label="Normal" active={emData.status === "normal"} color="#10b981" onPress={() => updateStatus("normal")} />
          <StatusPill label="Busy" active={emData.status === "busy"} color="#f59e0b" onPress={() => updateStatus("busy")} />
          <StatusPill label="Overloaded" active={emData.status === "overloaded"} color="#ef4444" onPress={() => updateStatus("overloaded")} />
        </View>

        {/* Metrics Grid */}
        <View style={styles.grid}>
          <MetricCard label="Available Beds" value={emData.bedsAvailable} sub={`of ${emData.bedsTotal} total`} icon="bed-outline" color="#1d4ed8" bgColor="#e0f2fe" />
          <MetricCard label="ICU Vacancy" value={emData.icuAvailable} sub="Critical Care" icon="heart-half-outline" color="#b91c1c" bgColor="#fee2e2" />
          <MetricCard label="Avg Wait" value={emData.avgWait} sub="Triage to Dr." icon="time-outline" color="#92400e" bgColor="#fef3c7" />
          <MetricCard label="Specialists" value={emData.doctorsOnDuty} sub="On-duty now" icon="medical-outline" color="#166534" bgColor="#dcfce7" />
        </View>

        {/* Occupancy Section */}
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Occupancy Rate</Text>
          <View style={styles.occupancyRow}>
            <Text style={styles.occupancyValue}>
              {Math.round(( (emData.bedsTotal - emData.bedsAvailable) / emData.bedsTotal) * 100) || 0}%
            </Text>
            <Text style={styles.thresholdText}>Threshold: 85%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: '64%' }]} />
          </View>
        </View>

        {/* Activity List */}
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Recent Logs</Text>
          {recentActivity.map((log) => (
            <View key={log.id} style={styles.activityItem}>
              <View style={styles.activityDot} />
              <View>
                <Text style={styles.activityText}>Mode: {log.status}</Text>
                <Text style={styles.activityMeta}>Admin • {new Date(log.timestamp).toLocaleTimeString()}</Text>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  scroll: { padding: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "800", color: "#0f172a" },
  subtitle: { color: "#64748b", fontSize: 13 },
  banner: { padding: 12, borderRadius: 16, flexDirection: "row", alignItems: "center", marginBottom: 15, borderWidth: 1, borderColor: "#e2e8f0" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginRight: 12 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "900" },
  bannerText: { fontSize: 14, color: "#1e293b" },
  pillRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  statusPill: { flex: 1, marginHorizontal: 4, paddingVertical: 10, borderRadius: 12, alignItems: "center" },
  statusPillText: { fontSize: 12, fontWeight: "700", color: "#64748b" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  metricCard: { width: "48%", backgroundColor: "#fff", padding: 15, borderRadius: 20, marginBottom: 15, flexDirection: "row", justifyContent: "space-between", elevation: 2 },
  metricLabel: { fontSize: 10, fontWeight: "700", color: "#94a3b8" },
  metricValue: { fontSize: 22, fontWeight: "800", color: "#1e293b", marginVertical: 4 },
  metricSub: { fontSize: 9, color: "#64748b" },
  metricIcon: { width: 35, height: 35, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  panel: { backgroundColor: "#fff", padding: 20, borderRadius: 24, marginBottom: 15, elevation: 1 },
  panelTitle: { fontSize: 15, fontWeight: "700", color: "#1e293b", marginBottom: 15 },
  occupancyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 },
  occupancyValue: { fontSize: 28, fontWeight: "900", color: "#0f172a" },
  thresholdText: { fontSize: 10, color: "#94a3b8" },
  progressBarBg: { height: 10, backgroundColor: "#f1f5f9", borderRadius: 5, overflow: "hidden" },
  progressBarFill: { height: "100%", backgroundColor: "#3b82f6" },
  activityItem: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  activityDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#3b82f6", marginRight: 12 },
  activityText: { fontSize: 12, color: "#1e293b", fontWeight: "600" },
  activityMeta: { fontSize: 10, color: "#94a3b8" }
});