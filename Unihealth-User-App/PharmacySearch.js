import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Modal,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// 1. IMPORT YOUR DATABASE CONNECTION
import { db } from '../../firebaseConfig';
import { ref, onValue } from 'firebase/database';

const { width } = Dimensions.get('window');

export default function PharmacySearch({ navigation, route }) {
 // Use the exact ID from Realtime DB: pharmacy_001
const pharmacyId = route?.params?.pharmacyId || 'pharmacy_001';
const pharmacyName = route?.params?.pharmacyName || 'Pharmacy Store';

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCat, setActiveCat] = useState('All');
  const [cart, setCart] = useState({});
  const [showRxModal, setShowRxModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [prescriptionAttached, setPrescriptionAttached] = useState(false);
  const [showSavingAlert, setShowSavingAlert] = useState(null);

  // 2. LIVE DATA STATE
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);

  // 3. FIREBASE REAL-TIME LISTENER (only path changed)
  useEffect(() => {
    setLoading(true);
    const inventoryRef = ref(db, `pharmacies/${pharmacyId}/inventory`);

    const unsubscribe = onValue(
      inventoryRef,
      snapshot => {
        const data = snapshot.val();
        if (data) {
          const liveList = Object.keys(data).map(key => ({
            id: key,
            ...data[key],
          }));
          setMedicines(liveList);
        } else {
          setMedicines([]); // Fallback if database is empty
        }
        setLoading(false);
      },
      error => {
        console.error(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [pharmacyId]);

  // --- SAFE CATEGORY GENERATION ---
  const categories = useMemo(() => {
    const uniqueCats = [
      ...new Set(medicines.map(item => item?.category).filter(Boolean)),
    ];
    return ['All', ...uniqueCats];
  }, [medicines]);

  // --- ROBUST FILTER LOGIC ---
  const filteredData = useMemo(() => {
    return medicines.filter(item => {
      const name = (item?.name || '').toLowerCase();
      const generic = (item?.generic || '').toLowerCase();
      const category = item?.category || '';
      const query = searchQuery.toLowerCase();

      const matchesSearch = name.includes(query) || generic.includes(query);
      const matchesCat = activeCat === 'All' || category === activeCat;

      return matchesSearch && matchesCat;
    });
  }, [searchQuery, activeCat, medicines]);

  // --- CART CALCULATIONS ---
  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);

  const totalPrice = useMemo(() => {
    return Object.keys(cart).reduce((sum, id) => {
      const item = medicines.find(m => m.id === id);
      return item ? sum + (item.price || 0) * cart[id] : sum;
    }, 0);
  }, [cart, medicines]);

  const rxRequiredInCart = useMemo(() => {
    return Object.keys(cart).some(
      id => medicines.find(m => m.id === id)?.rx
    );
  }, [cart, medicines]);

  const increment = id => {
    const item = medicines.find(m => m.id === id);
    if (!item) return;

    if ((item.stock || 0) <= (cart[id] || 0)) {
      Alert.alert('Out of Stock', 'This item is currently unavailable.');
      return;
    }

    if (item.price > 150 && !item.name?.includes('Gen-')) {
      setShowSavingAlert(item);
    }
    setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const decrement = id => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[id] > 1) newCart[id] -= 1;
      else delete newCart[id];
      return newCart;
    });
  };

  const simulateOCR = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setPrescriptionAttached(true);
      setShowRxModal(false);
      Alert.alert('AI Verification Success', 'Prescription verified.');
    }, 2500);
  };

  const renderMedItem = ({ item }) => {
    const qty = cart[item.id] || 0;
    const isOutOfStock = (item.stock || 0) === 0;

    return (
      <View style={[styles.medCard, isOutOfStock && { opacity: 0.6 }]}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons
            name={item.coldChain ? 'snowflake' : 'pill'}
            size={22}
            color={item.coldChain ? '#2980b9' : '#25a29a'}
          />
          <View style={styles.row}>
            {isOutOfStock ? (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: '#ffebee' },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: '#c62828' },
                  ]}
                >
                  OUT
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: '#e8f5e9' },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: '#2e7d32' },
                  ]}
                >
                  {item.stock} Left
                </Text>
              </View>
            )}
            {item.rx && (
              <View style={styles.rxBadge}>
                <Text style={styles.rxText}>Rx</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.medName} numberOfLines={2}>
          {item.name || 'Unknown Medicine'}
        </Text>
        <Text style={styles.genericText}>
          {item.generic || 'No Formula'}
        </Text>
        <Text style={styles.stripText}>
          {item.strip || '10 Tablets'}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.priceText}>₹{item.price || 0}</Text>
          {isOutOfStock ? (
            <View style={styles.disabledAdd}>
              <Ionicons
                name="close"
                size={18}
                color="#95a5a6"
              />
            </View>
          ) : qty === 0 ? (
            <TouchableOpacity
              style={styles.addIcon}
              onPress={() => increment(item.id)}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={styles.qtyBox}>
              <TouchableOpacity onPress={() => decrement(item.id)}>
                <Ionicons
                  name="remove"
                  size={18}
                  color="#1a3c5a"
                />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{qty}</Text>
              <TouchableOpacity onPress={() => increment(item.id)}>
                <Ionicons
                  name="add"
                  size={18}
                  color="#1a3c5a"
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        {/* UPDATED: use dynamic pharmacyName */}
        <Text style={styles.mainTitle}>{pharmacyName}</Text>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={20} color="#7f8c8d" />
          <TextInput
            placeholder="Search by name or salt"
            style={styles.input}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons
                name="close-circle"
                size={20}
                color="#bdc3c7"
                style={{ marginRight: 10 }}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() =>
              Alert.alert('Voice Search', 'Listening...')
            }
          >
            <Ionicons
              name="mic"
              size={22}
              color="#25a29a"
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.catWrapper}>
        <FlatList
          horizontal
          data={categories}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setActiveCat(item)}
              style={[
                styles.chip,
                activeCat === item && styles.activeChip,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  activeCat === item && styles.activeChipText,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={item => item}
        />
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#25a29a"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={filteredData}
          numColumns={2}
          renderItem={renderMedItem}
          contentContainerStyle={styles.listContainer}
          keyExtractor={item => item.id}
          ListEmptyComponent={
            <View
              style={{ alignItems: 'center', marginTop: 100 }}
            >
              <Ionicons
                name="search-outline"
                size={50}
                color="#bdc3c7"
              />
              <Text
                style={{ color: '#7f8c8d', marginTop: 10 }}
              >
                No medicines found
              </Text>
            </View>
          }
        />
      )}

      {totalItems > 0 && (
        <TouchableOpacity
          style={styles.checkoutBar}
          onPress={() =>
            rxRequiredInCart && !prescriptionAttached
              ? setShowRxModal(true)
              : navigation.navigate('Checkout', {
                  totalPrice,
                  totalItems,
                })
          }
        >
          <View>
            <Text style={styles.cartTotal}>
              ₹{totalPrice} | {totalItems} Items
            </Text>
            <Text style={styles.cartStatus}>
              {rxRequiredInCart && !prescriptionAttached
                ? '⚠️ Prescription Required'
                : 'Click to Review Order'}
            </Text>
          </View>
          <View style={styles.btnAction}>
            <Text style={styles.btnText}>View Cart</Text>
            <Ionicons
              name="cart-outline"
              size={18}
              color="#fff"
            />
          </View>
        </TouchableOpacity>
      )}

      <Modal visible={showRxModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.handle} />
            <MaterialCommunityIcons
              name="file-document-edit"
              size={40}
              color="#25a29a"
            />
            <Text style={styles.modalTitle}>
              Prescription Required
            </Text>
            <Text style={styles.modalSubtitle}>
              Some items in your cart require a valid doctor's
              prescription.
            </Text>
            <TouchableOpacity
              style={styles.scanBtn}
              onPress={simulateOCR}
              disabled={isScanning}
            >
              {isScanning ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name="camera"
                    size={24}
                    color="#fff"
                  />
                  <Text style={styles.scanBtnText}>
                    AI Smart Scan
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowRxModal(false)}
              style={{ marginTop: 20 }}
            >
              <Text style={{ color: '#e74c3c' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fbfc' },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    paddingBottom: 15,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a3c5a',
    marginBottom: 15,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f2f6',
    padding: 12,
    borderRadius: 15,
  },
  input: { flex: 1, marginLeft: 10, fontSize: 14 },
  catWrapper: { backgroundColor: '#fff', paddingBottom: 10 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginHorizontal: 8,
    borderRadius: 20,
    backgroundColor: '#f1f2f6',
  },
  activeChip: { backgroundColor: '#25a29a' },
  chipText: {
    color: '#7f8c8d',
    fontWeight: '600',
    fontSize: 13,
  },
  activeChipText: { color: '#fff' },
  listContainer: { padding: 10, paddingBottom: 120 },
  medCard: {
    backgroundColor: '#fff',
    width: width * 0.44,
    margin: width * 0.02,
    borderRadius: 20,
    padding: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  row: { flexDirection: 'row' },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    marginLeft: 4,
  },
  badgeText: { fontSize: 9, fontWeight: 'bold' },
  rxBadge: {
    backgroundColor: '#ffecec',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    marginLeft: 4,
  },
  rxText: {
    color: '#e74c3c',
    fontSize: 10,
    fontWeight: 'bold',
  },
  medName: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#1a3c5a',
    height: 38,
  },
  genericText: {
    fontSize: 10,
    color: '#25a29a',
    marginBottom: 2,
  },
  stripText: {
    fontSize: 10,
    color: '#95a5a6',
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1a3c5a',
  },
  addIcon: {
    backgroundColor: '#25a29a',
    padding: 6,
    borderRadius: 12,
  },
  disabledAdd: {
    backgroundColor: '#f1f2f6',
    padding: 6,
    borderRadius: 12,
  },
  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f6f5',
    borderRadius: 12,
    padding: 4,
  },
  qtyText: {
    marginHorizontal: 8,
    fontWeight: 'bold',
    fontSize: 14,
  },
  checkoutBar: {
    position: 'absolute',
    bottom: 30,
    left: 15,
    right: 15,
    backgroundColor: '#1a3c5a',
    padding: 18,
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 10,
  },
  cartTotal: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cartStatus: {
    color: '#25a29a',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  btnAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25a29a',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 12,
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    marginRight: 5,
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    padding: 30,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#eee',
    borderRadius: 2,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a3c5a',
    marginTop: 10,
  },
  modalSubtitle: {
    textAlign: 'center',
    color: '#7f8c8d',
    marginTop: 10,
    marginBottom: 30,
    lineHeight: 20,
  },
  scanBtn: {
    backgroundColor: '#25a29a',
    width: '100%',
    padding: 18,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },
});
