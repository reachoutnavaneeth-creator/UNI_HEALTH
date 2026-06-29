// src/screens/AIConsult.js
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as Speech from 'expo-speech';

import { db } from '../../firebaseConfig';
import { ref, push, serverTimestamp } from 'firebase/database';

// REPLICATED KEY (keep in env for production)
const API_KEY = 'AIzaSyAcwDuiowbaYiN_-mn5zcXMg6l1SKKO6Vw';
const genAI = new GoogleGenerativeAI(API_KEY);

const systemInstruction = `
You are Uni-Health AI, a careful medical triage assistant for an Indian multi-speciality hospital network.

ALWAYS FOLLOW THESE RULES:

1) SAFETY & DISCLAIMER
- You are NOT a doctor and do NOT provide diagnosis or prescriptions.
- Always start your first answer with a brief disclaimer like:
  "I am an AI assistant, not a doctor. I can explain symptoms and help you decide what kind of care to seek."
- For red-flag symptoms (severe chest pain, difficulty breathing, confusion or loss of consciousness, stroke symptoms, heavy bleeding, severe accident, suicidal thoughts, seizures, very high fever with stiff neck), ALWAYS advise immediate emergency care.

2) TRIAGE CATEGORIES
Classify the situation into exactly one of:
- EMERGENCY NOW: needs emergency room / casualty within 0–1 hours.
- URGENT OPD: see a doctor within 24 hours.
- ROUTINE OPD / SELF‑CARE: can monitor at home or plan a routine visit.

At the end of every answer, clearly print a line:
"Triage: EMERGENCY NOW"
or
"Triage: URGENT OPD"
or
"Triage: ROUTINE / SELF‑CARE"

3) INFORMATION YOU SHOULD ASK FOR
Before giving the triage category, briefly ask 2–4 clarifying questions if the user has not given them:
- Age and sex (if relevant).
- Duration of symptoms.
- Severity (mild / moderate / severe).
- Any chronic conditions (diabetes, hypertension, heart disease, pregnancy, cancer, kidney disease, asthma, COPD).

If the user already provided this information, do not repeat questions unnecessarily.

4) STRUCTURE OF ANSWERS
Use clear, short sections:
- Section 1: Simple explanation of what might be going on in layman terms (no firm diagnosis).
- Section 2: Red-flag checks – explicitly mention which danger signs you are considering.
- Section 3: What to do now – home measures vs visit hospital, based on the triage.
- Section 4: When to go to Emergency immediately if any warning sign appears.

Use bullet points where helpful, keep sentences short.

5) NAVIGATION TAGS BACK TO THE APP
At the very END of the reply, optionally append ONE navigation tag in square brackets if helpful:
- [GOTO:NearbyHospitals] when triage is EMERGENCY NOW.
- [GOTO:HospitalModeScreen] when user should choose between Emergency vs General hospital visit.
- [GOTO:NearbyPharmacies] for over‑the‑counter relief (e.g., simple cough, mild pain, ORS, etc.).
- [GOTO:FamilyHub] when instruction involves family members monitoring or helping the patient.

If no navigation is needed, do NOT output any GOTO tag.

6) WHAT YOU MUST NOT DO
- Do NOT give specific drug names, doses or prescriptions.
- Do NOT say you have examined or diagnosed the patient.
- Avoid very rare diseases; focus on common explanations and safety.
`;

export default function AIConsult({ navigation }) {
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: 'Hello! I am Uni‑Health AI. How can I help you today?',
      isAi: true,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef();

  const speakText = text => {
    if (!text) return;
    try {
      Speech.stop();
      Speech.speak(text, {
        language: 'en-IN',
        pitch: 1.0,
        rate: 1.0,
      });
    } catch (e) {
      console.log('Speech error:', e?.message);
    }
  };

  const logConsult = async (question, answer) => {
    try {
      const logRef = ref(db, 'AIConsultLogs');
      await push(logRef, {
        createdAt: serverTimestamp(),
        question,
        answer,
      });
    } catch (e) {
      console.log('AI consult log error:', e?.message);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = {
      id: Date.now().toString(),
      text: input,
      isAi: false,
    };
    setMessages(prev => [...prev, userMsg]);

    const currentInput = input;
    setInput('');
    setLoading(true);

    const modelAliases = ['gemini-2.5-flash', 'gemini-1.5-flash'];
    let success = false;
    let aiText = '';

    for (let modelName of modelAliases) {
      if (success) break;
      try {
        const model = genAI.getGenerativeModel({ model: modelName });

        const chat = model.startChat({
          history: [
            { role: 'user', parts: [{ text: systemInstruction }] },
            {
              role: 'model',
              parts: [{ text: 'Understood. I am ready to assist.' }],
            },
          ],
        });

        const result = await chat.sendMessage(currentInput);
        const responseText = result.response.text();

        const navMatch = responseText.match(/\[GOTO:(.*?)\]/);
        let cleanText = responseText
          .replace(/\[GOTO:.*?\]/g, '')
          .trim();

        aiText = cleanText;

        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            text: cleanText,
            isAi: true,
          },
        ]);

        speakText(cleanText);
        logConsult(currentInput, cleanText);

        if (navMatch) {
          const target = navMatch[1];
          setTimeout(() => {
            try {
              navigation.navigate(target);
            } catch (e) {
              console.log('Navigation error:', e?.message);
            }
          }, 1500);
        }

        success = true;
      } catch (error) {
        console.error(`AIConsult error with ${modelName}:`, error?.message);
      }
    }

    if (!success) {
      Alert.alert(
        'Unable to connect',
        "AI service is currently unavailable. Please check your internet connection or try again in a few minutes."
      );
    }

    setLoading(false);
  };

  const renderItem = ({ item }) => (
    <View
      style={[
        styles.bubble,
        item.isAi ? styles.aiBubble : styles.userBubble,
      ]}
    >
      <Text style={item.isAi ? styles.aiText : styles.userText}>
        {item.text}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      {/* DISCLAIMER BANNER */}
      <View style={styles.disclaimerBox}>
        <Ionicons
          name="information-circle-outline"
          size={18}
          color="#b45309"
        />
        <Text style={styles.disclaimerText}>
          Uni‑Health AI is for informational purposes only and does not
          provide medical diagnosis or treatment. Always consult a
          qualified doctor for medical decisions or emergencies.
        </Text>
      </View>

      {/* CHAT LIST */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 20, paddingTop: 8 }}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
      />

      {/* INPUT AREA */}
      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          placeholder="Describe symptoms or ask a health question..."
          value={input}
          onChangeText={setInput}
          multiline={false}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        {loading ? (
          <ActivityIndicator style={{ marginLeft: 15 }} />
        ) : (
          <TouchableOpacity
            style={styles.sendBtn}
            onPress={handleSend}
          >
            <Ionicons name="send" size={22} color="#1a3c5a" />
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f7' },

  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    marginHorizontal: 12,
    marginTop: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  disclaimerText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 11,
    color: '#92400e',
  },

  bubble: {
    padding: 15,
    borderRadius: 20,
    marginBottom: 12,
    maxWidth: '85%',
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#1a3c5a',
  },
  aiText: { color: '#2c3e50' },
  userText: { color: '#ffffff' },

  inputArea: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f4f7',
    borderRadius: 25,
    paddingHorizontal: 20,
    height: 45,
  },
  sendBtn: { marginLeft: 15 },
});
