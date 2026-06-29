import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function TermsScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a3c5a', '#25a29a']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Privacy Policy</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Last Updated: December 2025</Text>
        
        <Text style={styles.sectionTitle}>1. Data Collection</Text>
        <Text style={styles.bodyText}>
          UNI-HEALTH collects personal health information (PHI), including Aadhar details, 
          medical history, and family contact information to provide emergency healthcare services.
        </Text>

        <Text style={styles.sectionTitle}>2. Emergency Access</Text>
        <Text style={styles.bodyText}>
          By registering, you authorize UNI-HEALTH to share your emergency contact 
          number and residential address with first responders in the event of a medical crisis.
        </Text>

        <Text style={styles.sectionTitle}>3. Family Data</Text>
        <Text style={styles.bodyText}>
          You confirm that you have obtained consent from the 25 family members listed 
          in your profile to share their Aadhar and age details for clinical registration.
        </Text>

        <Text style={styles.sectionTitle}>4. Data Encryption</Text>
        <Text style={styles.bodyText}>
          All data is stored using Firebase Security Rules and AES-256 encryption standards 
          to ensure patient confidentiality.
        </Text>

        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.closeBtnText}>I UNDERSTAND</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHeight: 100, paddingTop: 50, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 15 },
  content: { padding: 25 },
  lastUpdated: { color: '#bdc3c7', fontSize: 12, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1a3c5a', marginTop: 20, marginBottom: 10 },
  bodyText: { fontSize: 14, color: '#7f8c8d', lineHeight: 22 },
  closeBtn: { backgroundColor: '#25a29a', padding: 18, borderRadius: 15, marginTop: 40, alignItems: 'center' },
  closeBtnText: { color: '#fff', fontWeight: 'bold' }
});