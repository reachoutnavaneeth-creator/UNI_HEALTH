import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MedicalRecords() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Patient Medical Records</Text>
      <Text style={styles.subText}>Syncing with UniHealth Database...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  text: { fontSize: 20, fontWeight: 'bold' },
  subText: { color: 'gray', marginTop: 10 }
});