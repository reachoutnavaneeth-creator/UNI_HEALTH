// src/screens/LoginScreen.js

import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons'; 

// --- 1. UPDATED: IMPORT FROM SHARED CONFIG ---
import { auth } from '../../firebaseConfig'; 
import { signInWithEmailAndPassword } from 'firebase/auth';

// Added SecureStore for Remember Me logic
import * as SecureStore from 'expo-secure-store';

export default function LoginScreen({ navigation }) {
  // --- State Management ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // --- 2. Check for saved credentials on load ---
  useEffect(() => {
    checkSavedCredentials();
  }, []);

  const checkSavedCredentials = async () => {
    try {
      const savedEmail = await SecureStore.getItemAsync('userEmail');
      const savedPass = await SecureStore.getItemAsync('userPassword');
      if (savedEmail && savedPass) {
        setEmail(savedEmail);
        setPassword(savedPass);
        setRememberMe(true);
      }
    } catch (e) {
      console.log('Error loading saved credentials');
    }
  };

  // --- 3. Login Logic ---
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Input Required', 'Please enter your registered Email and Password.');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);

      if (rememberMe) {
        await SecureStore.setItemAsync('userEmail', email);
        await SecureStore.setItemAsync('userPassword', password);
      } else {
        await SecureStore.deleteItemAsync('userEmail');
        await SecureStore.deleteItemAsync('userPassword');
      }

      Alert.alert('Authorized', 'Welcome back to UNI-HEALTH!');
      // NORMAL PATIENT: isGuest = false
      navigation.navigate('Home', { isGuest: false });
    } catch (error) {
      let msg = 'Invalid email or password. Please try again.';
      if (error.code === 'auth/user-not-found') msg = 'No patient record found with this email.';
      if (error.code === 'auth/wrong-password') msg = 'Incorrect password. Please verify and retry.';
      Alert.alert('Access Denied', msg);
    } finally {
      setLoading(false);
    }
  };

  // --- 4. Guest Login Logic ---
  const handleGuestLogin = () => {
    console.log('Guest entry triggered');
    // GUEST: mark isGuest = true → PatientHome will lock non‑emergency features
    navigation.navigate('Home', { isGuest: true });
  };

  return (
    <LinearGradient colors={['#1a3c5a', '#25a29a']} style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.innerContainer}
      >
        <View style={styles.card}>
          <Text style={styles.brand}>UNI-HEALTH</Text>
          <Text style={styles.title}>SECURE LOGIN</Text>

          {/* Email Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Registered Email</Text>
            <TextInput
              style={styles.input}
              placeholder="patient@unihealth.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor="#bdc3c7"
            />
          </View>

          {/* Password Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Access Password</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder="********"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!isPasswordVisible}
                placeholderTextColor="#bdc3c7"
              />
              <TouchableOpacity 
                style={styles.eyeIcon} 
                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
              >
                <Ionicons 
                  name={isPasswordVisible ? 'eye-off' : 'eye'} 
                  size={22} 
                  color="#95a5a6" 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Remember Me Toggle */}
          <TouchableOpacity 
            activeOpacity={0.7}
            style={styles.rememberRow} 
            onPress={() => setRememberMe(!rememberMe)}
          >
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && <Text style={styles.checkMark}>✓</Text>}
            </View>
            <Text style={styles.rememberText}>Remember my credentials</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity 
            style={[styles.loginBtn, loading && { backgroundColor: '#bdc3c7' }]} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>AUTHENTICATE</Text>
            )}
          </TouchableOpacity>

          {/* Guest Link */}
          <TouchableOpacity 
            onPress={handleGuestLogin} 
            style={styles.guestLinkWrapper}
            disabled={loading}
          >
            <Text style={styles.guestText}>
              Not a member yet? <Text style={styles.guestLink}>Login as Guest</Text>
            </Text>
          </TouchableOpacity>

          {/* Footer */}
          <TouchableOpacity 
            onPress={() => navigation.navigate('Register')}
            style={styles.footer}
          >
            <Text style={styles.footerText}>
              Need a full patient account? <Text style={styles.link}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  innerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { 
    width: '88%', 
    backgroundColor: '#ffffff', 
    paddingHorizontal: 25, 
    paddingVertical: 40, 
    borderRadius: 35, 
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  brand: { fontSize: 34, fontWeight: '900', color: '#1a3c5a', textAlign: 'center', letterSpacing: 2 },
  title: { fontSize: 12, color: '#25a29a', textAlign: 'center', marginBottom: 40, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '800', color: '#7f8c8d', marginBottom: 8, marginLeft: 5, textTransform: 'uppercase' },
  input: { backgroundColor: '#f8f9fa', padding: 16, borderRadius: 15, fontSize: 16, color: '#2c3e50', borderWidth: 1, borderColor: '#f1f2f6' },
  passwordWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f8f9fa', 
    borderRadius: 15, 
    borderWidth: 1, 
    borderColor: '#f1f2f6',
  },
  passwordInput: { flex: 1, padding: 16, fontSize: 16, color: '#2c3e50' },
  eyeIcon: { paddingHorizontal: 15 },
  rememberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 25, marginLeft: 5 },
  checkbox: { width: 22, height: 22, borderWidth: 2, borderColor: '#25a29a', borderRadius: 6, marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#25a29a' },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  rememberText: { color: '#7f8c8d', fontSize: 14, fontWeight: '600' },
  loginBtn: { backgroundColor: '#1a3c5a', padding: 20, borderRadius: 15, alignItems: 'center', marginTop: 10, elevation: 5 },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 1.5 },
  guestLinkWrapper: { marginTop: 20, alignItems: 'center' },
  guestText: { color: '#95a5a6', fontSize: 13, fontWeight: '500' },
  guestLink: { color: '#1a3c5a', fontWeight: 'bold', textDecorationLine: 'underline' },
  footer: { marginTop: 25, alignItems: 'center' },
  footerText: { color: '#95a5a6', fontWeight: '600' },
  link: { color: '#25a29a', fontWeight: '800' },
});
