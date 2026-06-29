// src/screens/HospitalDashboard.js

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  ScrollView,
  SafeAreaView,
  Animated,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { ref, onValue, update, push, serverTimestamp } from "firebase/database";
import { db } from "../../firebaseConfig";

const { width } = Dimensions.get("window");

export default function HospitalDashboard({ route, navigation }) {
  const hospitalId = route?.params?.hospitalId || "VVR_001";

  // --- 1. STATE MANAGEMENT ---
  const [beds, setBeds] = useState("0");
  const [icuBeds, setIcuBeds] = useState("0");
  const [ventilators, setVentilators] = useState("0");
  const [isEmergencyFull, setIsEmergencyFull] = useState(false);
  const [hospitalData, setHospitalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Status");
  const [syncing, setSyncing] = useState(false);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideInAnim = useRef(new Animated.Value(0)).current;

  // --- 2. FIREBASE REFS ---
  const hospitalRef = ref(db, `Hospitals/${hospitalId}`);
  const auditRef = ref(db, `Audit/logs/${hospitalId}`);

  // --- 3. AI INSIGHT LOGIC (Replicating Web) ---
  const getAiInsight = () => {
    const icuNum = parseInt(icuBeds);
    const bedNum = parseInt(beds);
    if (isEmergencyFull) return "CRITICAL: Diversion protocols suggested.";
    if (icuNum < 3) return "AI: ICU nearing threshold. Prep overflow.";
    if (bedNum < 10) return "AI: General capacity decreasing.";
    return "AI: Capacity sufficient for current load.";
  };

  // --- 4. INITIALIZATION ---
  useEffect(() => {
    // Pulse Animation for the "Live" Dot
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Data Listener
    const unsubscribe = onValue(hospitalRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setHospitalData(data);
        setBeds(String(data.Bed ?? 0));
        setIcuBeds(String(data.icubeds ?? 0));
        setVentilators(String(data.ventilators ?? 0));
        setIsEmergencyFull(data.isEmergencyFull ?? false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [hospitalId]);

  // --- 5. CLOUD SYNC HANDLERS ---
  const handleLiveUpdate = async () => {
    setSyncing(true);
    const timestamp = new Date().toLocaleTimeString();

    const updates = {
      Bed: parseInt(beds),
      icubeds: parseInt(icuBeds),
      ventilators: parseInt(ventilators),
      lastupdated: timestamp,
      isEmergencyFull: isEmergencyFull,
      updatedAtMs: serverTimestamp(),
    };

    try {
      await update(hospitalRef, updates);

      // Member 2 Web Audit Log Link
      await push(auditRef, {
        timestamp: serverTimestamp(),
        action: "CAPACITY_UPDATE",
        details: `Beds: ${beds}, ICU: ${icuBeds}, Vents: ${ventilators}`,
        status: isEmergencyFull ? "BUSY" : "NORMAL",
        user: "Admin_Mobile",
      });

      Alert.alert("Broadcast Success", `Cloud updated at ${timestamp}`);
    } catch (error) {
      Alert.alert("Sync Failed", error.message);
    } finally {
      setSyncing(false);
    }
  };

  const changeValue = (type, op) => {
    if (type === "bed")
      setBeds((prev) =>
        String(
          op === "+"
            ? parseInt(prev) + 1
            : Math.max(0, parseInt(prev) - 1)
        )
      );
    if (type === "icu")
      setIcuBeds((prev) =>
        String(
          op === "+"
            ? parseInt(prev) + 1
            : Math.max(0, parseInt(prev) - 1)
        )
      );
    if (type === "vent")
      setVentilators((prev) =>
        String(
          op === "+"
            ? parseInt(prev) + 1
            : Math.max(0, parseInt(prev) - 1)
        )
      );
  };

  // --- 6. RENDER COMPONENTS ---
  const CounterRow = ({ label, value, type, icon, color }) => (
    <View style={styles.counterCard}>
      <View style={styles.counterLeft}>
        <View style={[styles.iconFrame, { backgroundColor: `${color}15` }]}>
          <MaterialCommunityIcons name={icon} size={22} color={color} />
        </View>
        <Text style={styles.counterLabel}>{label}</Text>
      </View>
      <View style={styles.counterRight}>
        <TouchableOpacity
          style={styles.roundBtn}
          onPress={() => changeValue(type, "-")}
        >
          <Ionicons name="remove" size={20} color="#475569" />
        </TouchableOpacity>
        <TextInput
          style={styles.valInput}
          value={value}
          keyboardType="numeric"
          onChangeText={(v) =>
            type === "bed"
              ? setBeds(v)
              : type === "icu"
              ? setIcuBeds(v)
              : setVentilators(v)
          }
        />
        <TouchableOpacity
          style={[styles.roundBtn, { backgroundColor: color }]}
          onPress={() => changeValue(type, "+")}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER SECTION */}
      <View style={styles.header}>
        <View style={styles.topRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.iconCircle}
          >
            <Ionicons name="arrow-back" size={22} color="#1e293b" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.subHeader}>HOSPITAL OPS DASHBOARD</Text>
            <Text style={styles.mainTitle}>
              {hospitalData?.Name || "UniHealth Main"}
            </Text>
          </View>
          <Animated.View
            style={[styles.liveIndicator, { transform: [{ scale: pulseAnim }] }]}
          />
        </View>

        {/* WEB-STYLE TAB SWITCHER */}
        <View style={styles.tabContainer}>
          {["Status", "Staff", "Logistics"].map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setActiveTab(t)}
              style={[styles.tab, activeTab === t && styles.activeTab]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === t && styles.activeTabLabel,
                ]}
              >
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollBody}
        showsVerticalScrollIndicator={false}
      >
        {/* EMERGENCY MASTER BANNER */}
        <View
          style={[
            styles.banner,
            isEmergencyFull ? styles.bannerRed : styles.bannerGreen,
          ]}
        >
          <MaterialCommunityIcons
            name="shield-alert"
            size={26}
            color={isEmergencyFull ? "#dc2626" : "#16a34a"}
          />
          <View style={styles.bannerTextGroup}>
            <Text
              style={[
                styles.bannerTitle,
                { color: isEmergencyFull ? "#991b1b" : "#14532d" },
              ]}
            >
              {isEmergencyFull ? "EMERGENCY OVERLOAD" : "STABLE OPERATIONS"}
            </Text>
            <Text style={styles.bannerAi}>{getAiInsight()}</Text>
          </View>
          <Switch
            value={isEmergencyFull}
            onValueChange={setIsEmergencyFull}
            trackColor={{ false: "#cbd5e1", true: "#fca5a5" }}
            thumbColor={isEmergencyFull ? "#ef4444" : "#f1f5f9"}
          />
        </View>

        {/* COUNTER SECTION */}
        <Text style={styles.sectionTitle}>Live Capacity Management</Text>
        <CounterRow
          label="General Beds"
          value={beds}
          type="bed"
          icon="bed-outline"
          color="#2563eb"
        />
        <CounterRow
          label="ICU Units"
          value={icuBeds}
          type="icu"
          icon="heart-pulse"
          color="#7c3aed"
        />
        <CounterRow
          label="Ventilators"
          value={ventilators}
          type="vent"
          icon="air-filter"
          color="#db2777"
        />

        {/* UPDATE BUTTON */}
        <TouchableOpacity
          style={styles.syncBtn}
          onPress={handleLiveUpdate}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <LinearGradient
              colors={["#1e293b", "#334155"]}
              style={styles.syncGradient}
            >
              <Text style={styles.syncText}>BROADCAST TO CLOUD</Text>
              <Ionicons name="cloud-done-outline" size={20} color="#fff" />
            </LinearGradient>
          )}
        </TouchableOpacity>

        {/* NEW: PATIENT-SIDE TOKEN BOOKING ENTRY */}
        <TouchableOpacity
  style={styles.tokenBtn}
  onPress={() =>
    navigation.navigate('RequestToken', {
      hospitalId,
      mode: route?.params?.mode || 'emergency',
    })
  }
>

          <Text style={styles.tokenBtnText}>
    {route?.params?.mode === 'emergency'
      ? 'Book Emergency Token'
      : 'Book General OPD Token'}
  </Text>
          <Text style={styles.tokenBtnText}>Book Patient Token</Text>
          <Text style={styles.tokenBtnSub}>
            Live sync with UniHealth token dashboard (Member 2)
          </Text>
        </TouchableOpacity>

        {/* QUICK LINKS SECTION */}
        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={styles.gridBtn}
            onPress={() =>
              navigation.navigate("TokenDashboard", { hospitalId })
            }
          >
            <Ionicons
              name="people-circle-outline"
              size={30}
              color="#1e293b"
            />
            <Text style={styles.gridBtnLabel}>Token Queue</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.gridBtn}
            onPress={() => navigation.navigate("AuditLogs", { hospitalId })}
          >
            <Ionicons
              name="document-text-outline"
              size={30}
              color="#1e293b"
            />
            <Text style={styles.gridBtnLabel}>Audit Logs</Text>
          </TouchableOpacity>
        </View>

        {/* DOCTOR STATUS LIST */}
        <View className={styles.doctorPanel}>
          <Text style={styles.panelTitle}>Specialists on Duty</Text>
          {hospitalData?.doctors?.map((doc, i) => (
            <View key={i} style={styles.docRow}>
              <View style={styles.docAvatar}>
                <Text style={styles.avatarTxt}>{doc[0]}</Text>
              </View>
              <Text style={styles.docName}>{doc}</Text>
              <View style={styles.statusPill}>
                <Text style={styles.statusTxt}>ACTIVE</Text>
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
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  titleContainer: { flex: 1, marginLeft: 15 },
  subHeader: {
    fontSize: 10,
    fontWeight: "900",
    color: "#64748b",
    letterSpacing: 1,
  },
  mainTitle: { fontSize: 20, fontWeight: "800", color: "#0f172a" },
  liveIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ef4444",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 4,
    marginTop: 20,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 10 },
  activeTab: { backgroundColor: "#fff", elevation: 2 },
  tabLabel: { fontSize: 13, fontWeight: "700", color: "#94a3b8" },
  activeTabLabel: { color: "#1e293b" },
  scrollBody: { padding: 20 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 20,
    marginBottom: 25,
  },
  bannerRed: { backgroundColor: "#fee2e2", borderWidth: 1, borderColor: "#fecaca" },
  bannerGreen: { backgroundColor: "#dcfce7", borderWidth: 1, borderColor: "#bbf7d0" },
  bannerTextGroup: { flex: 1, marginLeft: 12 },
  bannerTitle: { fontSize: 14, fontWeight: "900" },
  bannerAi: { fontSize: 11, color: "#64748b", marginTop: 2 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#334155",
    marginBottom: 15,
  },
  counterCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 18,
    marginBottom: 12,
    elevation: 1,
  },
  counterLeft: { flex: 1, flexDirection: "row", alignItems: "center" },
  iconFrame: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  counterLabel: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
  },
  counterRight: { flexDirection: "row", alignItems: "center" },
  roundBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  valInput: { width: 45, textAlign: "center", fontSize: 18, fontWeight: "800" },
  syncBtn: { marginTop: 10, borderRadius: 15, overflow: "hidden" },
  syncGradient: {
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  syncText: { color: "#fff", fontWeight: "900", marginRight: 10 },

  quickGrid: { flexDirection: "row", gap: 12, marginTop: 25 },
  gridBtn: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    elevation: 2,
  },
  gridBtnLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
    color: "#475569",
  },

  doctorPanel: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginTop: 25,
    elevation: 2,
  },
  panelTitle: { fontSize: 15, fontWeight: "800", marginBottom: 15 },
  docRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  docAvatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarTxt: { fontWeight: "bold", color: "#475569" },
  docName: { flex: 1, marginLeft: 12, fontWeight: "600", color: "#334155" },
  statusPill: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusTxt: { fontSize: 10, color: "#16a34a", fontWeight: "900" },

  // NEW styles for token button
  tokenBtn: {
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#0f172a",
  },
  tokenBtnText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 14,
  },
  tokenBtnSub: {
    color: "#e5e7eb",
    fontSize: 11,
    marginTop: 4,
  },
});
