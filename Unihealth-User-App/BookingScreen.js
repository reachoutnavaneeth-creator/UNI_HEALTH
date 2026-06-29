import React, { useState } from "react";
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  Alert, SafeAreaView, ScrollView 
} from "react-native";
import { ref, push, set, serverTimestamp } from "firebase/database";
import { db, auth } from "../../firebaseConfig"; // Ensure this path is correct
import Ionicons from "@expo/vector-icons/Ionicons";

export default function BookingScreen({ route, navigation }) {
  // Extract doctor data passed from PatientDoctorList.js
  const { doctor } = route.params || { doctor: { name: "Specialist", specialty: "General" } };
  const [selectedSlot, setSelectedSlot] = useState(null);

  const slots = ["09:00 AM", "10:30 AM", "02:00 PM", "04:30 PM"];

  const handleConfirmBooking = async () => {
    if (!selectedSlot) {
      Alert.alert("Selection Required", "Please select a time slot before proceeding.");
      return;
    }

    const hospitalId = "UH-HOS-00000"; // Must match Member 2's Admin ID
    const user = auth.currentUser;

    try {
      // 1. Generate the Token in Member 2's "Active Tokens" node
      const tokenRef = push(ref(db, `Hospitals/${hospitalId}/active_tokens`));
      const tokenData = {
        patientEmail: user?.email || "Anonymous",
        patientUid: user?.uid || "guest",
        doctorId: doctor.id || "unknown",
        doctorName: doctor.name,
        slot: selectedSlot,
        status: "Waiting", // Member 2 will update this to "Called" in their dashboard
        timestamp: serverTimestamp()
      };

      await set(tokenRef, tokenData);

      // 2. Notify Member 2's "Recent Activity" sidebar
      const logRef = push(ref(db, `Hospitals/${hospitalId}/audit_logs`));
      await set(logRef, {
        type: "Booking",
        details: `New Token Generated for ${doctor.name} by ${user?.email || "Guest"}`,
        time: new Date().toLocaleTimeString(),
        timestamp: serverTimestamp()
      });

      Alert.alert("Token Generated", "Your appointment is confirmed. Member 2 can now see you in the live queue.", [
        { text: "View Status", onPress: () => navigation.navigate("Home") }
      ]);
    } catch (error) {
      Alert.alert("Booking Error", "Unable to sync with hospital database: " + error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.padding}>
        <View style={styles.navRow}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color="#1e293b" />
            </TouchableOpacity>
            <Text style={styles.title}>Confirm Booking</Text>
        </View>
        
        <View style={styles.doctorCard}>
          <View style={styles.iconCircle}>
             <Ionicons name="medical" size={30} color="#0284c7" />
          </View>
          <View style={{ marginLeft: 15 }}>
            <Text style={styles.drName}>{doctor.name}</Text>
            <Text style={styles.drSpec}>{doctor.specialty}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Select Appointment Time</Text>
        <View style={styles.slotGrid}>
          {slots.map(slot => (
            <TouchableOpacity 
              key={slot} 
              style={[styles.slot, selectedSlot === slot && styles.selectedSlot]}
              onPress={() => setSelectedSlot(slot)}
            >
              <Text style={[styles.slotText, selectedSlot === slot && styles.selectedSlotText]}>{slot}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmBooking}>
          <Text style={styles.confirmBtnText}>GENERATE LIVE TOKEN</Text>
        </TouchableOpacity>
        
        <Text style={styles.footerNote}>
            Note: This token will be visible on the Hospital Admin Dashboard instantly.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  padding: { padding: 25 },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 25 },
  title: { fontSize: 22, fontWeight: "900", color: "#0f172a" },
  doctorCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", padding: 20, borderRadius: 24, marginBottom: 35, borderWidth: 1, borderColor: '#f1f5f9' },
  iconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#e0f2fe', justifyContent: 'center', alignItems: 'center' },
  drName: { fontSize: 18, fontWeight: "800", color: "#1e293b" },
  drSpec: { fontSize: 14, color: "#64748b", marginTop: 2 },
  sectionLabel: { fontSize: 12, fontWeight: "800", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 15 },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 40 },
  slot: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: 15, borderWidth: 2, borderColor: "#f1f5f9", minWidth: '45%' },
  selectedSlot: { backgroundColor: "#0284c7", borderColor: "#0284c7" },
  slotText: { fontWeight: "700", color: "#475569", textAlign: 'center' },
  selectedSlotText: { color: "#fff" },
  confirmBtn: { backgroundColor: "#0f172a", padding: 22, borderRadius: 20, alignItems: "center", elevation: 4 },
  confirmBtnText: { color: "#fff", fontWeight: "900", fontSize: 16, letterSpacing: 1 },
  footerNote: { textAlign: 'center', marginTop: 20, color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }
});