import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function OrderSuccess({ route, navigation }) {
  const { orderDetails } = route.params;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* SUCCESS ICON */}
        <View style={styles.successCircle}>
          <Ionicons name="checkmark-done-outline" size={80} color="#fff" />
        </View>

        <Text style={styles.title}>Order Verified & Placed!</Text>
        <Text style={styles.subtitle}>Your medicine is being packed in a temperature-controlled kit.</Text>

        {/* LOGISTICS CARD */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <MaterialCommunityIcons name="shield-check" size={24} color="#25a29a" />
            <View style={styles.statusTextCol}>
              <Text style={styles.statusTitle}>Pharmacist Digitally Signed</Text>
              <Text style={styles.statusSub}>License ID: #IN-9928374</Text>
            </View>
          </View>

          <View style={[styles.statusRow, { marginTop: 20 }]}>
            <MaterialCommunityIcons name="thermometer-lines" size={24} color="#2980b9" />
            <View style={styles.statusTextCol}>
              <Text style={styles.statusTitle}>Live Cold Chain Status</Text>
              <Text style={styles.statusSub}>Current Box Temp: 5.2°C (Optimal)</Text>
            </View>
          </View>
        </View>

        {/* ACTION BUTTON */}
        <TouchableOpacity 
          style={styles.homeBtn} 
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.homeBtnText}>Track Live Location</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', justifyContent: 'center' },
  content: { alignItems: 'center', padding: 20 },
  successCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#25a29a', justifyContent: 'center', alignItems: 'center', marginBottom: 30, elevation: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a3c5a', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#7f8c8d', textAlign: 'center', marginTop: 10, paddingHorizontal: 30 },
  statusCard: { width: '100%', backgroundColor: '#f8f9fa', borderRadius: 25, padding: 25, marginTop: 40, borderWidth: 1, borderColor: '#eee' },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusTextCol: { marginLeft: 15 },
  statusTitle: { fontWeight: 'bold', color: '#1a3c5a', fontSize: 15 },
  statusSub: { color: '#7f8c8d', fontSize: 12 },
  homeBtn: { marginTop: 50, backgroundColor: '#1a3c5a', paddingVertical: 18, paddingHorizontal: 60, borderRadius: 20 },
  homeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});