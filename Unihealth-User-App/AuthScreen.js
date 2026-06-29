import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function AuthScreen({ navigation }) {
  const [view, setView] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleUserLogin = () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter your credentials.");
      return;
    }
    // Log the USER in, then let them view the HOSPITAL'S live data
    console.log("User logged in:", email);
    navigation.replace('Home'); 
  };

  return (
    <LinearGradient colors={['#f8fafc', '#e2e8f0']} style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.heroSection}>
            <View style={styles.appBadge}>
              <Ionicons name="heart-pulse" size={16} color="#ef4444" />
              <Text style={styles.badgeText}>PATIENT PORTAL</Text>
            </View>
            <Text style={styles.heroTitle}>UniHealth</Text>
            <Text style={styles.heroSubtitle}>Live access to hospital emergency loads and medical services.</Text>
          </View>

          <View style={styles.authCard}>
            <Text style={styles.cardTitle}>{view === 'login' ? 'Welcome Back' : 'Create Account'}</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <TextInput 
                style={styles.input} 
                placeholder="name@example.com" 
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>PASSWORD</Text>
              <TextInput 
                style={styles.input} 
                placeholder="••••••••" 
                secureTextEntry 
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleUserLogin}>
              <Text style={styles.btnText}>{view === 'login' ? 'LOG IN' : 'SIGN UP'}</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setView(view === 'login' ? 'signup' : 'login')}>
              <Text style={styles.switchText}>
                {view === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.syncNotice}>
            <Ionicons name="refresh-circle" size={20} color="#64748b" />
            <Text style={styles.syncText}>
              Directly synced with UniHealth Hospital Management Systems.
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { padding: 30, flexGrow: 1, justifyContent: 'center' },
  appBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fee2e2', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 12 },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#b91c1c', marginLeft: 5 },
  heroTitle: { fontSize: 36, fontWeight: '900', color: '#0f172a' },
  heroSubtitle: { fontSize: 15, color: '#64748b', marginTop: 5, lineHeight: 22 },
  authCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 5, marginTop: 30 },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b', marginBottom: 20 },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 11, fontWeight: '700', color: '#94a3b8', marginBottom: 6 },
  input: { backgroundColor: '#f1f5f9', borderRadius: 12, padding: 15, fontSize: 16, color: '#1e293b' },
  primaryBtn: { backgroundColor: '#0f172a', padding: 18, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 10 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  switchText: { textAlign: 'center', color: '#0284c7', fontSize: 13, fontWeight: '600', marginTop: 20 },
  syncNotice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 40, gap: 8, paddingHorizontal: 20 },
  syncText: { fontSize: 12, color: '#64748b', textAlign: 'center', lineHeight: 18 }
});