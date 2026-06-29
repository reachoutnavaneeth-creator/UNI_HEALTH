import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Modal, TextInput, ScrollView, Alert, Dimensions 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { db } from '../../firebaseConfig';
import { ref, push, onValue, remove, update } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const { width } = Dimensions.get('window');

export default function FamilyHub() {
  const auth = getAuth();
  const [members, setMembers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [blood, setBlood] = useState('');
  const [healthIssues, setHealthIssues] = useState('');
  const [recordsLink, setRecordsLink] = useState(''); // e.g., Google Drive link or PDF ID

  // 1. Fetch Family Data
  useEffect(() => {
    if (!auth.currentUser) return;
    const familyRef = ref(db, `users/${auth.currentUser.uid}/family_members`);
    
    const unsubscribe = onValue(familyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setMembers(list);
      } else {
        setMembers([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Add New Member
  const addMember = () => {
    if (!name || !blood) {
      Alert.alert("Error", "Name and Blood Group are required");
      return;
    }

    const familyRef = ref(db, `users/${auth.currentUser.uid}/family_members`);
    push(familyRef, {
      name, age, blood, healthIssues, recordsLink,
      lastUpdated: new Date().toISOString()
    });

    setModalVisible(false);
    setName(''); setAge(''); setBlood(''); setHealthIssues(''); setRecordsLink('');
  };

  const deleteMember = (id) => {
    Alert.alert("Delete", "Remove this family member?", [
      { text: "Cancel" },
      { text: "Delete", onPress: () => remove(ref(db, `users/${auth.currentUser.uid}/family_members/${id}`)) }
    ]);
  };

  const renderMember = ({ item }) => (
    <View style={styles.memberCard}>
      <View style={styles.cardAccent} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.memberName}>{item.name}</Text>
          <View style={styles.bloodBadge}>
            <Text style={styles.bloodText}>{item.blood}</Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={14} color="#7f8c8d" />
            <Text style={styles.infoText}>{item.age} Years</Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="file-document-outline" size={14} color="#25a29a" />
            <Text style={[styles.infoText, {color: '#25a29a'}]}>Records Linked</Text>
          </View>
        </View>

        {item.healthIssues ? (
          <View style={styles.issueBox}>
            <Text style={styles.issueTitle}>Medical Notes:</Text>
            <Text style={styles.issueText}>{item.healthIssues}</Text>
          </View>
        ) : null}

        <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteMember(item.id)}>
          <Ionicons name="trash-outline" size={18} color="#e74c3c" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Family Hub</Text>
        <Text style={styles.subtitle}>{members.length} Members Registered</Text>
      </View>

      <FlatList 
        data={members}
        renderItem={renderMember}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="account-group-outline" size={80} color="#bdc3c7" />
            <Text style={styles.emptyText}>No family members added yet.</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Add Member Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add Family Member</Text>
            <ScrollView>
              <TextInput placeholder="Full Name" style={styles.input} value={name} onChangeText={setName} />
              <TextInput placeholder="Age" style={styles.input} keyboardType="numeric" value={age} onChangeText={setAge} />
              <TextInput placeholder="Blood Group (e.g. O+)" style={styles.input} value={blood} onChangeText={setBlood} />
              <TextInput 
                placeholder="Health Issues (Asthma, Diabetes, etc.)" 
                style={[styles.input, {height: 80}]} 
                multiline value={healthIssues} onChangeText={setHealthIssues} 
              />
              <TextInput 
                placeholder="Medical Records URL (Drive/Cloud)" 
                style={styles.input} value={recordsLink} onChangeText={setRecordsLink} 
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={() => setModalVisible(false)}>
                  <Text style={styles.btnTextBlack}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.saveBtn]} onPress={addMember}>
                  <Text style={styles.btnText}>Save Member</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafb' },
  header: { paddingTop: 60, paddingHorizontal: 20, backgroundColor: '#fff', paddingBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a3c5a' },
  subtitle: { color: '#7f8c8d', fontSize: 14 },
  list: { padding: 15 },
  memberCard: { backgroundColor: '#fff', borderRadius: 20, marginBottom: 15, flexDirection: 'row', overflow: 'hidden', elevation: 3 },
  cardAccent: { width: 6, backgroundColor: '#25a29a' },
  cardContent: { flex: 1, padding: 15 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  memberName: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
  bloodBadge: { backgroundColor: '#ffebee', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  bloodText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 12 },
  infoGrid: { flexDirection: 'row', marginTop: 10 },
  infoItem: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
  infoText: { fontSize: 12, color: '#7f8c8d', marginLeft: 5 },
  issueBox: { marginTop: 12, backgroundColor: '#f9f9f9', padding: 10, borderRadius: 10 },
  issueTitle: { fontSize: 11, fontWeight: 'bold', color: '#34495e' },
  issueText: { fontSize: 12, color: '#7f8c8d', marginTop: 2 },
  deleteBtn: { position: 'absolute', bottom: 10, right: 10 },
  fab: { position: 'absolute', bottom: 30, right: 30, backgroundColor: '#1a3c5a', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#1a3c5a' },
  input: { backgroundColor: '#f1f2f6', borderRadius: 12, padding: 15, marginBottom: 15, fontSize: 14 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  btn: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
  saveBtn: { backgroundColor: '#1a3c5a', marginLeft: 10 },
  cancelBtn: { backgroundColor: '#f1f2f6' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  btnTextBlack: { color: '#1a3c5a', fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#bdc3c7', marginTop: 10 }
});