// src/screens/HospitalModeScreen.js

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

const ModeTile = ({ label, desc, icon, bgColor, iconColor, onPress }) => (
  <TouchableOpacity style={styles.tile} onPress={onPress}>
    <View
      style={[
        styles.iconContainer,
        { backgroundColor: bgColor || '#eff6ff' },
      ]}
    >
      <MaterialCommunityIcons name={icon} size={30} color={iconColor} />
    </View>
    <View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.desc}>{desc}</Text>
    </View>
  </TouchableOpacity>
);

export default function HospitalModeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hospital</Text>
      <Text style={styles.subtitle}>Choose your visit type</Text>

      <View style={styles.grid}>
        {/* EMERGENCY → passes mode=emergency for location-based filtering */}
        <ModeTile
          label="Emergency"
          desc="Critical & urgent care"
          icon="alarm-light"
          bgColor="#fee2e2"
          iconColor="#b91c1c"
          onPress={() =>
            navigation.navigate('NearbyHospitals', {
              mode: 'emergency',
              // optional: focus on UniHealth demo or others later
            })
          }
        />

        {/* GENERAL → opens UniHealth demo hospital with tokens & OPD */}
        <ModeTile
          label="General"
          desc="OPD, doctors & tokens"
          icon="stethoscope"
          bgColor="#eff6ff"
          iconColor="#2563eb"
          onPress={() =>
            navigation.navigate('HospitalGeneral', {
              hospitalId: 'UH-HOS-00000', // UniHealth demo hospital
              mode: 'general',
            })
          }
        />
      </View>
    </View>
  );
}

const BOX_SIZE = (width - 60) / 2; // two square boxes with margin

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 6,
    marginBottom: 20,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tile: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 14,
    elevation: 6,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  desc: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 4,
  },
});
