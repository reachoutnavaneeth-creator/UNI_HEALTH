// src/screens/LabTestCart.js

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const LAB_TEST_CATALOG = [
  {
    id: 'cbc',
    name: 'Complete Blood Count (CBC)',
    price: 400,
    reportTime: 'Same day',
    fasting: 'No fasting required',
    sample: 'EDTA blood sample',
    homeCollection: true,
    infoTag: 'Infection, anemia, overall health',
  },
  {
    id: 'rbs',
    name: 'Blood Sugar (Fasting / PP)',
    price: 350,
    reportTime: 'Same day',
    fasting: '8–12 hours fasting recommended',
    sample: 'Serum / plasma',
    homeCollection: true,
    infoTag: 'Diabetes screening & monitoring',
  },
  {
    id: 'lipid',
    name: 'Lipid Profile',
    price: 900,
    reportTime: '24 hours',
    fasting: '12 hours fasting required',
    sample: 'Serum',
    homeCollection: true,
    infoTag: 'Cholesterol, triglycerides, cardiac risk',
  },
  {
    id: 'thyroid',
    name: 'Thyroid Profile (T3, T4, TSH)',
    price: 700,
    reportTime: '24–36 hours',
    fasting: 'No strict fasting; avoid dose just before test',
    sample: 'Serum',
    homeCollection: true,
    infoTag: 'Thyroid function & hormone balance',
  },
];

export default function LabTestCart({ navigation }) {
  const [selectedTests, setSelectedTests] = useState({}); // {id: true}

  const toggleTest = id => {
    setSelectedTests(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const { totalItems, totalPrice } = useMemo(() => {
    let count = 0;
    let total = 0;
    LAB_TEST_CATALOG.forEach(t => {
      if (selectedTests[t.id]) {
        count += 1;
        total += t.price;
      }
    });
    return { totalItems: count, totalPrice: total };
  }, [selectedTests]);

  const handleProceed = () => {
    if (totalItems === 0) {
      alert('Please select at least one lab test.');
      return;
    }
    navigation.navigate('Checkout', {
      totalItems,
      totalPrice,
      source: 'lab',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#1a3c5a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lab Tests</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>Popular health checks</Text>

        {LAB_TEST_CATALOG.map(test => {
          const active = !!selectedTests[test.id];
          return (
            <TouchableOpacity
              key={test.id}
              style={[styles.card, active && styles.cardActive]}
              onPress={() => toggleTest(test.id)}
            >
              <View style={styles.cardTop}>
                <View style={styles.leftRow}>
                  <View
                    style={[
                      styles.iconCircle,
                      active && styles.iconCircleActive,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="test-tube"
                      size={20}
                      color={active ? '#0f172a' : '#0ea5e9'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.testName, active && styles.testNameActive]}
                      numberOfLines={2}
                    >
                      {test.name}
                    </Text>
                    <Text style={styles.infoTag}>{test.infoTag}</Text>
                  </View>
                </View>

                <View style={styles.priceBlock}>
                  <Text
                    style={[styles.price, active && styles.priceActive]}
                  >{`₹${test.price}`}</Text>
                  {active && <Text style={styles.selectedTag}>Selected</Text>}
                </View>
              </View>

              {/* DETAIL ROW */}
              <View style={styles.detailRow}>
                <View style={styles.detailChip}>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={14}
                    color="#4b5563"
                  />
                  <Text style={styles.detailText}>
                    Report: {test.reportTime}
                  </Text>
                </View>

                <View style={styles.detailChip}>
                  <MaterialCommunityIcons
                    name="food-off-outline"
                    size={14}
                    color="#4b5563"
                  />
                  <Text style={styles.detailText}>{test.fasting}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailChip}>
                  <MaterialCommunityIcons
                    name="flask-outline"
                    size={14}
                    color="#4b5563"
                  />
                  <Text style={styles.detailText}>
                    Sample: {test.sample}
                  </Text>
                </View>

                {test.homeCollection && (
                  <View style={styles.detailChip}>
                    <MaterialCommunityIcons
                      name="home-map-marker"
                      size={14}
                      color="#16a34a"
                    />
                    <Text style={[styles.detailText, { color: '#16a34a' }]}>
                      Home collection
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Selected tests: {totalItems}</Text>
          <Text style={styles.footerTotal}>₹{totalPrice}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.ctaBtn,
            totalItems === 0 && { backgroundColor: '#cbd5f5' },
          ]}
          disabled={totalItems === 0}
          onPress={handleProceed}
        >
          <Text style={styles.ctaText}>
            {totalItems === 0 ? 'Select tests' : 'Proceed to checkout'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: '#1a3c5a',
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#7f8c8d',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardActive: {
    borderColor: '#0ea5e9',
    backgroundColor: '#f0f9ff',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    paddingRight: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconCircleActive: {
    backgroundColor: '#7dd3fc',
  },
  testName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  testNameActive: {
    color: '#0f172a',
  },
  infoTag: {
    marginTop: 2,
    fontSize: 11,
    color: '#6b7280',
  },
  priceBlock: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  priceActive: {
    color: '#0ea5e9',
  },
  selectedTag: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '700',
    color: '#0f172a',
    backgroundColor: '#bae6fd',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    textTransform: 'uppercase',
  },
  detailRow: {
    flexDirection: 'row',
    marginTop: 10,
    justifyContent: 'space-between',
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
    marginRight: 6,
    flexShrink: 1,
  },
  detailText: {
    marginLeft: 4,
    fontSize: 11,
    color: '#4b5563',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footerTotal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1f2937',
    marginTop: 2,
  },
  ctaBtn: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  ctaText: {
    color: '#f9fafb',
    fontWeight: '800',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
});
