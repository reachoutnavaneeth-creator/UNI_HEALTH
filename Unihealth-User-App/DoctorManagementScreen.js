import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
  SafeAreaView,
  StatusBar,
  Alert,
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getDatabase, ref, onValue, update, push, set, remove } from "firebase/database";

const { width, height } = Dimensions.get("window");

/**
 * DOCTOR MANAGEMENT SYSTEM - ENTERPRISE EDITION
 * The "Control Tower" for Member 2's Hospital Management System.
 * Every toggle here reflects live on the PatientDoctorList.js.
 */
export default function DoctorManagement({ route, navigation }) {
  // 1. STATE & CORE CONFIG
  const hospitalId = route?.params?.hospitalId || "UH-HOS-00000";
  const [doctors, setDoctors] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [emergencyStatus, setEmergencyStatus] = useState("normal");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");

  // Form State for Registration
  const [newDoc, setNewDoc] = useState({
    name: "",
    specialization: "",
    experience: "5",
    startTime: "09:00",
    endTime: "17:00",
    languages: "English, Hindi",
    roomNumber: "",
    bio: "",
    qualification: "MBBS",
    onDuty: true,
    todayTokens: 0
  });

  const db = getDatabase();
  const scrollY = useRef(new Animated.Value(0)).current;

  // 2. REAL-TIME DATA SYNCHRONIZATION
  useEffect(() => {
    if (!hospitalId) return;

    const docRef = ref(db, `hospitals/${hospitalId}/doctors`);
    const statusRef = ref(db, `hospitals/${hospitalId}/emergencyStatus`);

    // Listen for Staff Changes
    const unsubDocs = onValue(docRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        setDoctors(list);
      } else {
        setDoctors([]);
      }
      setLoading(false);
    });

    // Listen for Load Changes (From Web or other Admin)
    const unsubStatus = onValue(statusRef, (snapshot) => {
      if (snapshot.exists()) setEmergencyStatus(snapshot.val());
    });

    return () => {
      unsubDocs();
      unsubStatus();
    };
  }, [hospitalId]);

  // 3. COMPUTED LOGIC
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            doc.specialization.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = 
        activeTab === "All" || 
        (activeTab === "Live" && doc.onDuty) || 
        (activeTab === "Away" && !doc.onDuty);
      return matchesSearch && matchesTab;
    });
  }, [doctors, searchQuery, activeTab]);

  const stats = {
    total: doctors.length,
    onDuty: doctors.filter(d => d.onDuty).length,
    rooms: new Set(doctors.map(d => d.roomNumber)).size,
    busyRate: emergencyStatus === "overloaded" ? "95%" : emergencyStatus === "busy" ? "70%" : "35%"
  };

  // 4. DATABASE HANDLERS
  const updateEmergencyStatus = async (val) => {
    setEmergencyStatus(val);
    await set(ref(db, `hospitals/${hospitalId}/emergencyStatus`), val);
  };

  const toggleDuty = async (docId, currentStatus) => {
    try {
      await update(ref(db, `hospitals/${hospitalId}/doctors/${docId}`), {
        onDuty: !currentStatus,
      });
    } catch (error) {
      Alert.alert("Sync Error", "Website-to-App connection interrupted.");
    }
  };

  const resetTokens = (docId) => {
    Alert.alert("Reset Tokens?", "This will set today's token count to 0.", [
      { text: "Cancel" },
      { text: "Reset", onPress: () => update(ref(db, `hospitals/${hospitalId}/doctors/${docId}`), { todayTokens: 0 }) }
    ]);
  };

  const deleteDoctor = (id) => {
    Alert.alert("Remove Specialist?", "This doctor will disappear from the Patient App instantly.", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive", 
        onPress: async () => await remove(ref(db, `hospitals/${hospitalId}/doctors/${id}`)) 
      },
    ]);
  };

  const handleSaveDoctor = async () => {
    if (!newDoc.name || !newDoc.specialization || !newDoc.roomNumber) {
      Alert.alert("Validation Error", "Name, Specialty, and Room are required.");
      return;
    }

    try {
      const doctorsListRef = ref(db, `hospitals/${hospitalId}/doctors`);
      await push(doctorsListRef, {
        ...newDoc,
        createdAt: new Date().toISOString(),
      });
      setIsModalVisible(false);
      setNewDoc({
        name: "", specialization: "", experience: "5",
        startTime: "09:00", endTime: "17:00",
        languages: "English, Hindi", roomNumber: "", bio: "",
        qualification: "MBBS", onDuty: true, todayTokens: 0
      });
    } catch (e) {
      Alert.alert("Database Error", "Check your Firebase rules.");
    }
  };

  // 5. SUB-COMPONENTS
  const StatCard = ({ title, value, icon, color }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </View>
  );

  const DoctorCard = ({ doc }) => {
    const onDuty = !!doc.onDuty;
    return (
      <View style={[styles.docCard, !onDuty && styles.offDutyCard]}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatarBox, { backgroundColor: onDuty ? "#e0f2fe" : "#f1f5f9" }]}>
            <Text style={[styles.avatarTxt, { color: onDuty ? "#0284c7" : "#64748b" }]}>
              {doc.name?.charAt(0)}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
              {onDuty && <View style={styles.livePulse} />}
            </View>
            <Text style={styles.specialtyTxt}>{doc.specialization} • {doc.qualification}</Text>
          </View>
          <TouchableOpacity onPress={() => deleteDoctor(doc.id)} style={styles.deleteBtn}>
            <Ionicons name="trash-bin-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoPill}>
            <Ionicons name="business" size={14} color="#64748b" />
            <Text style={styles.pillText}>Room {doc.roomNumber}</Text>
          </View>
          <View style={styles.infoPill}>
            <Ionicons name="ticket" size={14} color="#0284c7" />
            <Text style={[styles.pillText, {color: '#0284c7'}]}>{doc.todayTokens || 0} Tokens</Text>
          </View>
        </View>

        <View style={styles.footerAction}>
          <TouchableOpacity style={styles.resetBtn} onPress={() => resetTokens(doc.id)}>
             <Text style={styles.resetBtnTxt}>RESET TOKENS</Text>
          </TouchableOpacity>
          <View style={styles.statusToggle}>
            <Text style={styles.statusLabel}>{onDuty ? "LIVE" : "OFF"}</Text>
            <Switch
              value={onDuty}
              onValueChange={() => toggleDuty(doc.id, onDuty)}
              trackColor={{ false: "#cbd5e1", true: "#bae6fd" }}
              thumbColor={onDuty ? "#0284c7" : "#94a3b8"}
            />
          </View>
        </View>
      </View>
    );
  };

  // 6. MAIN RENDER
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* HEADER SECTION */}
      <View style={styles.topNav}>
        <View>
          <Text style={styles.greeting}>Staff Management</Text>
          <Text style={styles.subGreeting}>{hospitalId} Dashboard</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setIsModalVisible(true)}>
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        stickyHeaderIndices={[2]} 
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
      >
        {/* ANALYTICS DASHBOARD */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsRow}>
          <StatCard title="Active Now" value={stats.onDuty} icon="pulse" color="#10b981" />
          <StatCard title="Total Staff" value={stats.total} icon="people" color="#3b82f6" />
          <StatCard title="Load Level" value={stats.busyRate} icon="analytics" color="#f59e0b" />
          <StatCard title="Clinical Rooms" value={stats.rooms} icon="home" color="#8b5cf6" />
        </ScrollView>

        {/* EMERGENCY CONTROL PANEL (Member 2 Authority) */}
        <View style={styles.controlPanel}>
          <View style={styles.panelHeader}>
            <Ionicons name="warning" size={20} color="#ef4444" />
            <Text style={styles.panelTitle}>HOSPITAL OPERATING STATUS</Text>
          </View>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={emergencyStatus}
              onValueChange={updateEmergencyStatus}
              style={styles.pickerStyle}
            >
              <Picker.Item label="🟢 Normal Flow" value="normal" />
              <Picker.Item label="🟡 Busy (Wait times increased)" value="busy" />
              <Picker.Item label="🔴 Critical / Overloaded" value="overloaded" />
            </Picker>
          </View>
          <View style={styles.aiAdvisory}>
             <Ionicons name="bulb-outline" size={16} color="#0369a1" />
             <Text style={styles.aiText}>
                {emergencyStatus === 'overloaded' 
                  ? "Alert: Wards are at capacity. Recommend diverting non-emergencies." 
                  : "Status stable. Monitor token flow for Pediatrics and General."}
             </Text>
          </View>
        </View>

        {/* SEARCH & FILTER TABS */}
        <View style={styles.filterSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#94a3b8" />
            <TextInput
              placeholder="Search by name or department..."
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#94a3b8"
            />
          </View>
          <View style={styles.tabRow}>
            {["All", "Live", "Away"].map((tab) => (
              <TouchableOpacity 
                key={tab} 
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* DOCTOR LISTING */}
        <View style={styles.listContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 50 }} />
          ) : filteredDoctors.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="medkit-outline" size={80} color="#e2e8f0" />
              <Text style={styles.emptyTitle}>Registry Empty</Text>
              <Text style={styles.emptySub}>No specialists found in this category.</Text>
            </View>
          ) : (
            filteredDoctors.map((doc) => <DoctorCard key={doc.id} doc={doc} />)
          )}
        </View>
        
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* REGISTRATION MODAL (The Form) */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"} 
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Staff Entry</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={28} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>PHYSICIAN NAME *</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Dr. Alexander Pierce"
                onChangeText={(t) => setNewDoc({...newDoc, name: t})} 
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 15 }}>
                  <Text style={styles.fieldLabel}>SPECIALTY *</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Neurology" 
                    onChangeText={(t) => setNewDoc({...newDoc, specialization: t})}
                  />
                </View>
                <View style={{ width: 100 }}>
                  <Text style={styles.fieldLabel}>ROOM *</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="B-12" 
                    onChangeText={(t) => setNewDoc({...newDoc, roomNumber: t})}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>PROFESSIONAL QUALIFICATION</Text>
              <TextInput style={styles.input} defaultValue="MBBS, MD" onChangeText={(t) => setNewDoc({...newDoc, qualification: t})} />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 15 }}>
                  <Text style={styles.fieldLabel}>START TIME</Text>
                  <TextInput style={styles.input} defaultValue="09:00" onChangeText={(t) => setNewDoc({...newDoc, startTime: t})} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>END TIME</Text>
                  <TextInput style={styles.input} defaultValue="17:00" onChangeText={(t) => setNewDoc({...newDoc, endTime: t})} />
                </View>
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveDoctor}>
                <Text style={styles.saveBtnText}>COMMIT TO REGISTRY</Text>
              </TouchableOpacity>
              <View style={{height: 40}} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// 7. STYLESHEET
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  topNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  greeting: { fontSize: 24, fontWeight: "900", color: "#0f172a" },
  subGreeting: { fontSize: 13, color: "#94a3b8", fontWeight: "600", marginTop: 2 },
  addBtn: {
    backgroundColor: "#0284c7",
    width: 54,
    height: 54,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#0284c7",
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  statsRow: { paddingLeft: 24, marginVertical: 15 },
  statCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 24,
    marginRight: 16,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 150,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  statIconContainer: { padding: 10, borderRadius: 14, marginRight: 14 },
  statValue: { fontSize: 20, fontWeight: "800", color: "#1e293b" },
  statTitle: { fontSize: 11, color: "#94a3b8", fontWeight: "700", textTransform: 'uppercase' },
  controlPanel: {
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  panelHeader: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  panelTitle: { fontSize: 11, fontWeight: "900", color: "#ef4444", marginLeft: 10, letterSpacing: 1.5 },
  pickerContainer: { backgroundColor: "#f8fafc", borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: '#e2e8f0' },
  pickerStyle: { height: 55 },
  aiAdvisory: { marginTop: 15, backgroundColor: "#f0f9ff", padding: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center' },
  aiText: { flex: 1, fontSize: 12, color: "#0369a1", fontStyle: "italic", marginLeft: 10, fontWeight: '600' },
  filterSection: { backgroundColor: "#f8fafc", paddingHorizontal: 24, paddingVertical: 15 },
  searchBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 18,
    borderRadius: 20,
    height: 60,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: '600', color: "#1e293b" },
  tabRow: { flexDirection: "row", marginTop: 20 },
  tab: { paddingHorizontal: 25, paddingVertical: 10, borderRadius: 20, marginRight: 12, backgroundColor: "#e2e8f0" },
  activeTab: { backgroundColor: "#0f172a" },
  tabText: { fontSize: 14, fontWeight: "800", color: "#64748b" },
  activeTabText: { color: "#fff" },
  listContainer: { padding: 24 },
  docCard: {
    backgroundColor: "#fff",
    borderRadius: 30,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.03,
  },
  offDutyCard: { opacity: 0.6 },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  avatarBox: { width: 55, height: 55, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  avatarTxt: { fontSize: 24, fontWeight: "800" },
  headerInfo: { flex: 1, marginLeft: 18 },
  nameRow: { flexDirection: "row", alignItems: "center" },
  docName: { fontSize: 18, fontWeight: "800", color: "#1e293b" },
  livePulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#22c55e", marginLeft: 10 },
  specialtyTxt: { fontSize: 13, color: "#94a3b8", fontWeight: "600", marginTop: 3 },
  deleteBtn: { padding: 8 },
  cardBody: { flexDirection: "row", marginTop: 18 },
  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 10,
  },
  pillText: { fontSize: 12, fontWeight: "800", color: "#475569", marginLeft: 6 },
  footerAction: {
    marginTop: 20,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  resetBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  resetBtnTxt: { fontSize: 9, fontWeight: '900', color: '#64748b' },
  statusToggle: { flexDirection: "row", alignItems: "center" },
  statusLabel: { fontSize: 11, fontWeight: "900", color: "#94a3b8", marginRight: 10, letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.8)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 30,
    maxHeight: height * 0.85,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 30 },
  modalTitle: { fontSize: 24, fontWeight: "900", color: "#0f172a" },
  fieldLabel: { fontSize: 11, fontWeight: "900", color: "#94a3b8", marginBottom: 10, letterSpacing: 1 },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 18,
    padding: 18,
    fontSize: 15,
    color: "#1e293b",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 22,
    fontWeight: '600'
  },
  row: { flexDirection: "row" },
  saveBtn: {
    backgroundColor: "#0284c7",
    padding: 22,
    borderRadius: 22,
    alignItems: "center",
    marginTop: 15,
  },
  saveBtnText: { color: "#fff", fontWeight: "900", fontSize: 16, letterSpacing: 1 },
  emptyContainer: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: "#1e293b", marginTop: 20 },
  emptySub: { fontSize: 15, color: "#94a3b8", marginTop: 8 },
});