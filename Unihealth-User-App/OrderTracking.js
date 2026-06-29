import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, SafeAreaView, Easing } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function OrderTracking({ navigation }) {
  const moveAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [status, setStatus] = useState("Preparing your meds...");

  useEffect(() => {
    // 1. Destination Pulse Animation (The Radar Effect)
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.5, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    // 2. Real-time Movement Simulation
    // We use Easing.bezier to make it start slow, speed up, and slow down at the end (organic)
    setTimeout(() => {
      setStatus("Partner is on the way!");
      Animated.timing(moveAnim, {
        toValue: 1,
        duration: 8000,
        easing: Easing.bezier(0.4, 0, 0.2, 1), 
        useNativeDriver: false,
      }).start(() => setStatus("Arrived! Please collect your order."));
    }, 3000);
  }, []);

  // Interpolate position and tilt
  const translateX = moveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, width - 80] // From Pharmacy to Home
  });

  const tilt = moveAnim.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: ['0deg', '10deg', '10deg', '0deg'] // Tilts forward while moving
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{status}</Text>
        <Text style={styles.subtitle}>Arriving in 8 mins</Text>
      </View>

      <View style={styles.mapSimulation}>
        {/* Road Track */}
        <View style={styles.roadTrack}>
          <View style={styles.dashedLine} />
          
          {/* Pharmacy Marker */}
          <View style={[styles.marker, { left: 10 }]}>
            <View style={styles.iconCircle}><Ionicons name="medical" size={20} color="#25a29a" /></View>
            <Text style={styles.markerText}>Pharmacy</Text>
          </View>

          {/* THE BIKE - Using MaterialCommunityIcons for a real Motorbike icon */}
          <Animated.View style={[styles.bikeContainer, { transform: [{ translateX }, { rotate: tilt }] }]}>
            <View style={styles.bikeWrapper}>
               <MaterialCommunityIcons name="motorbike" size={42} color="#1a3c5a" />
               <View style={styles.exhaustSmoke} />
            </View>
          </Animated.View>

          {/* Destination Marker with Pulse */}
          <View style={[styles.marker, { right: 10 }]}>
            <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
            <View style={[styles.iconCircle, { backgroundColor: '#e74c3c' }]}>
              <Ionicons name="home" size={20} color="#fff" />
            </View>
            <Text style={styles.markerText}>You</Text>
          </View>
        </View>
      </View>

      <View style={styles.footerInfo}>
        <Text style={styles.footerLabel}>Delivery Partner</Text>
        <Text style={styles.partnerName}>Rahul Sharma is bringing your order</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 30, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a3c5a' },
  subtitle: { color: '#25a29a', fontWeight: '600', marginTop: 5 },
  mapSimulation: { flex: 1, justifyContent: 'center' },
  roadTrack: { height: 100, backgroundColor: '#f8f9fa', justifyContent: 'center', marginHorizontal: 20, borderRadius: 20 },
  dashedLine: { position: 'absolute', width: '90%', height: 2, borderStyle: 'dashed', borderColor: '#bdc3c7', borderWidth: 1, alignSelf: 'center' },
  bikeContainer: { position: 'absolute', zIndex: 10 },
  marker: { position: 'absolute', alignItems: 'center', zIndex: 5 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8F6F5', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  markerText: { fontSize: 10, fontWeight: 'bold', marginTop: 5, color: '#7f8c8d' },
  pulseRing: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(231, 76, 60, 0.2)' },
  footerInfo: { padding: 40, borderTopWidth: 1, borderColor: '#eee' },
  footerLabel: { fontSize: 12, color: '#7f8c8d', textTransform: 'uppercase' },
  partnerName: { fontSize: 16, fontWeight: 'bold', color: '#1a3c5a', marginTop: 5 }
});