// src/screens/RegisterScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { db, auth } from '../../firebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set, get } from 'firebase/database';

export default function RegisterScreen({ navigation }) {
  // core state
  const [aadhar, setAadhar] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [phone1, setPhone1] = useState('');
  const [phone2, setPhone2] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [address, setAddress] = useState('');
  const [otp, setOtp] = useState('');

  // UI state
  const [currentStep, setCurrentStep] = useState(1);
  const [consent, setConsent] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(false);      // GPS + final register
  const [otpLoading, setOtpLoading] = useState(false); // only OTP
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [familyMembers, setFamilyMembers] = useState([]);

  // tiles
  const [activeTile, setActiveTile] = useState('personal'); // 'personal' | 'medical' | 'lifestyle'
  const [openPickerKey, setOpenPickerKey] = useState(null); // which medical/lifestyle row is open

  // extra personal fields
  const [gender, setGender] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  // medical fields
  const [allergies, setAllergies] = useState('');
  const [currentMeds, setCurrentMeds] = useState('');
  const [pastMeds, setPastMeds] = useState('');
  const [chronicDiseases, setChronicDiseases] = useState('');
  const [injuries, setInjuries] = useState('');
  const [surgeries, setSurgeries] = useState('');

  // lifestyle fields
  const [smokingHabits, setSmokingHabits] = useState('');
  const [alcoholUse, setAlcoholUse] = useState('');
  const [activityLevel, setActivityLevel] = useState('');
  const [foodPreference, setFoodPreference] = useState('');
  const [occupation, setOccupation] = useState('');

  // refs for focus chain
  const aadharRef = useRef(null);
  const nameRef = useRef(null);
  const ageRef = useRef(null);
  const dobRef = useRef(null);
  const genderRef = useRef(null);
  const maritalRef = useRef(null);
  const heightRef = useRef(null);
  const weightRef = useRef(null);
  const phoneRef = useRef(null);
  const otpRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  // Aadhar formatter
  const handleAadharChange = (text) => {
    const cleaned = text.replace(/\D/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    setAadhar(formatted.substring(0, 14));
  };

  // OTP timer
  useEffect(() => {
    if (!otpSent || isVerified) return;
    if (timer <= 0) {
      setCanResend(true);
      return;
    }
    const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [otpSent, timer, isVerified]);

  // validation
  const validate = () => {
    if (aadhar.replace(/\s/g, '').length !== 12) {
      Alert.alert('Error', 'Aadhar must be 12 digits.');
      return false;
    }
    if (!email.includes('@')) {
      Alert.alert('Error', 'Invalid Email.');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password too short.');
      return false;
    }
    if (!consent) {
      Alert.alert('Consent required', 'Please agree to the medical data terms.');
      return false;
    }
    return true;
  };

  // GPS logic
  const requestLocation = async () => {
    setLoading(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied');
      setLoading(false);
      return;
    }
    try {
      const loc = await Location.getCurrentPositionAsync({});
      const res = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (res.length > 0) {
        setAddress(`${res[0].name}, ${res[0].city}, ${res[0].postalCode}`);
      }
    } catch (e) {
      Alert.alert('GPS Error', 'Enter address manually.');
    } finally {
      setLoading(false);
    }
  };

  // family logic
  const addFamily = () =>
    setFamilyMembers((prev) => [...prev, { aadhar: '', age: '' }]);

  const removeFamily = (i) =>
    setFamilyMembers((prev) => prev.filter((_, idx) => idx !== i));

  // OTP actions
  const handleSendOtp = async () => {
    if (phone1.length < 10) {
      Alert.alert('Error', 'Invalid Phone.');
      return;
    }
    setOtpLoading(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      await set(ref(db, `temp_otps/${phone1}`), { code, time: Date.now() });
      setOtpSent(true);
      setTimer(60);
      setCanResend(false);
      Alert.alert('Code Sent', `Your OTP is: ${code}`);
      otpRef.current?.focus();
    } catch (e) {
      Alert.alert('Database Error', e.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpLoading(true);
    try {
      const snap = await get(ref(db, `temp_otps/${phone1}`));
      if (snap.exists() && snap.val().code === otp) {
        setIsVerified(true);
        Alert.alert('Verified', 'Mobile number verified successfully.');
      } else {
        Alert.alert('Error', 'Wrong OTP.');
      }
    } catch (e) {
      Alert.alert('Error', 'Verification failed.');
    } finally {
      setOtpLoading(false);
    }
  };

  // final register
  const handleFinalRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      await set(ref(db, `patients/${userCred.user.uid}`), {
        aadhar,
        name,
        age,
        dob,
        phone1,
        phone2,
        emergencyPhone,
        address,
        familyMembers,
        email,
        role: 'user',
        gender,
        maritalStatus,
        height,
        weight,
        allergies,
        currentMeds,
        pastMeds,
        chronicDiseases,
        injuries,
        surgeries,
        smokingHabits,
        alcoholUse,
        activityLevel,
        foodPreference,
        occupation,
        createdAt: new Date().toISOString(),
      });
      Alert.alert('Success', 'Account Registered!');
      navigation.navigate('Login');
    } catch (e) {
      Alert.alert('Registration Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  // tile row
  const TileRow = () => (
    <View style={styles.tileRow}>
      {['personal', 'medical', 'lifestyle'].map((key) => (
        <TouchableOpacity
          key={key}
          style={[
            styles.tileItem,
            activeTile === key && styles.tileItemActive,
          ]}
          onPress={() => {
            setActiveTile(key);
            setOpenPickerKey(null);
          }}
        >
          <Text
            style={[
              styles.tileText,
              activeTile === key && styles.tileTextActive,
            ]}
          >
            {key === 'personal'
              ? 'Personal'
              : key === 'medical'
              ? 'Medical'
              : 'Lifestyle'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // non-typable row for options
  const OptionRow = ({ label, value, onPress }) => (
    <TouchableOpacity style={styles.optionRow} onPress={onPress}>
      <Text style={styles.optionLabel}>{label}</Text>
      <Text style={styles.optionValue}>{value || 'add details'}</Text>
    </TouchableOpacity>
  );

  // inline picker box
  const OptionPicker = ({ visible, options, onSelect }) => {
    if (!visible) return null;
    return (
      <View style={styles.pickerBox}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={styles.pickerItem}
            onPress={() => onSelect(opt)}
          >
            <Text style={styles.pickerText}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // sections
  const PersonalSection = React.useMemo(() => (
    <>
      <Text style={styles.sectionTitle}>Personal details</Text>

      {/* Aadhar */}
      <TextInput
        ref={aadharRef}
        style={styles.input}
        placeholder="Aadhar Number"
        value={aadhar}
        onChangeText={handleAadharChange}
        keyboardType="number-pad"
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => nameRef.current?.focus()}
      />

      {/* Full Name */}
      <TextInput
        ref={nameRef}
        style={styles.input}
        placeholder="Full name"
        value={name}
        onChangeText={setName}
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => ageRef.current?.focus()}
      />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        {/* Age */}
        <TextInput
          ref={ageRef}
          style={[styles.input, { flex: 1 }]}
          placeholder="Age"
          value={age}
          onChangeText={setAge}
          keyboardType="number-pad"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => dobRef.current?.focus()}
        />
        {/* DOB */}
        <TextInput
          ref={dobRef}
          style={[styles.input, { flex: 1 }]}
          placeholder="DOB (DD/MM/YYYY)"
          value={dob}
          onChangeText={setDob}
          keyboardType="number-pad"
          returnKeyType="done"
          blurOnSubmit={true}
        />
      </View>

      {/* Gender */}
      <TextInput
        ref={genderRef}
        style={styles.input}
        placeholder="Gender"
        value={gender}
        onChangeText={setGender}
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => maritalRef.current?.focus()}
      />

      {/* Marital Status */}
      <TextInput
        ref={maritalRef}
        style={styles.input}
        placeholder="Marital status"
        value={maritalStatus}
        onChangeText={setMaritalStatus}
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => heightRef.current?.focus()}
      />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        {/* Height */}
        <TextInput
          ref={heightRef}
          style={[styles.input, { flex: 1 }]}
          placeholder="Height (cm)"
          value={height}
          onChangeText={setHeight}
          keyboardType="number-pad"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => weightRef.current?.focus()}
        />
        {/* Weight */}
        <TextInput
          ref={weightRef}
          style={[styles.input, { flex: 1 }]}
          placeholder="Weight (kg)"
          value={weight}
          onChangeText={setWeight}
          keyboardType="number-pad"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => phoneRef.current?.focus()}
        />
      </View>

      <Text style={styles.sectionTitle}>Contact & login</Text>

      {/* Primary Phone */}
      <TextInput
        ref={phoneRef}
        style={styles.input}
        placeholder="Primary mobile number"
        value={phone1}
        onChangeText={setPhone1}
        keyboardType="phone-pad"
        maxLength={10}
        textContentType="telephoneNumber"
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => otpRef.current?.focus()}
      />

      {/* OTP */}
      <TextInput
        ref={otpRef}
        style={styles.input}
        placeholder="Enter 6-digit OTP"
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
        maxLength={6}
        editable={otpSent}
        selectTextOnFocus={otpSent}
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => emailRef.current?.focus()}
      />

      <TouchableOpacity
        style={styles.actionBtn}
        onPress={otpSent ? handleVerifyOtp : handleSendOtp}
        disabled={otpLoading}
      >
        {otpLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.actionBtnText}>
            {otpSent ? 'VERIFY OTP' : 'SEND OTP'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Email */}
      <TextInput
        ref={emailRef}
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => passwordRef.current?.focus()}
      />

      {/* Password */}
      <View style={styles.passwordWrapper}>
        <TextInput
          ref={passwordRef}
          style={[styles.input, { flex: 1, borderBottomWidth: 0 }]}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!isPasswordVisible}
          returnKeyType="done"
        />
        <TouchableOpacity
          onPress={() => setIsPasswordVisible((v) => !v)}
          style={styles.eyeBtn}
        >
          <Ionicons
            name={isPasswordVisible ? 'eye-off' : 'eye'}
            size={20}
            color="#7f8c8d"
          />
        </TouchableOpacity>
      </View>
    </>
  )
  );


  const MedicalSection=React.useMemo(() => (
    <>
      <Text style={styles.sectionTitle}>Medical</Text>

      <OptionRow
        label="Allergies"
        value={allergies}
        onPress={() =>
          setOpenPickerKey(openPickerKey === 'allergies' ? null : 'allergies')
        }
      />
      <OptionPicker
        visible={openPickerKey === 'allergies'}
        options={[
          'No known allergies',
          'Drug allergy',
          'Food allergy',
          'Dust / pollen',
          'Other',
        ]}
        onSelect={(v) => {
          setAllergies(v);
          setOpenPickerKey(null);
        }}
      />

      <OptionRow
        label="Current medications"
        value={currentMeds}
        onPress={() =>
          setOpenPickerKey(
            openPickerKey === 'currentMeds' ? null : 'currentMeds',
          )
        }
      />
      <OptionPicker
        visible={openPickerKey === 'currentMeds'}
        options={['None', 'Occasional painkillers', 'Regular medications']}
        onSelect={(v) => {
          setCurrentMeds(v);
          setOpenPickerKey(null);
        }}
      />

      <OptionRow
        label="Past medications"
        value={pastMeds}
        onPress={() =>
          setOpenPickerKey(openPickerKey === 'pastMeds' ? null : 'pastMeds')
        }
      />
      <OptionPicker
        visible={openPickerKey === 'pastMeds'}
        options={['None', 'Completed long-term course', 'Past surgery meds']}
        onSelect={(v) => {
          setPastMeds(v);
          setOpenPickerKey(null);
        }}
      />

      <OptionRow
        label="Chronic diseases"
        value={chronicDiseases}
        onPress={() =>
          setOpenPickerKey(
            openPickerKey === 'chronicDiseases' ? null : 'chronicDiseases',
          )
        }
      />
      <OptionPicker
        visible={openPickerKey === 'chronicDiseases'}
        options={['None', 'Diabetes', 'Hypertension', 'Heart disease', 'Other']}
        onSelect={(v) => {
          setChronicDiseases(v);
          setOpenPickerKey(null);
        }}
      />

      <OptionRow
        label="Injuries"
        value={injuries}
        onPress={() =>
          setOpenPickerKey(openPickerKey === 'injuries' ? null : 'injuries')
        }
      />
      <OptionPicker
        visible={openPickerKey === 'injuries'}
        options={['None', 'Fracture', 'Sports injury', 'Other']}
        onSelect={(v) => {
          setInjuries(v);
          setOpenPickerKey(null);
        }}
      />

      <OptionRow
        label="Surgeries"
        value={surgeries}
        onPress={() =>
          setOpenPickerKey(openPickerKey === 'surgeries' ? null : 'surgeries')
        }
      />
      <OptionPicker
        visible={openPickerKey === 'surgeries'}
        options={['None', 'Minor surgery', 'Major surgery']}
        onSelect={(v) => {
          setSurgeries(v);
          setOpenPickerKey(null);
        }}
      />
    </>
  )
  );

  const LifestyleSection = React.useMemo(() => (
    <>
      <Text style={styles.sectionTitle}>Lifestyle</Text>

      <OptionRow
        label="Smoking habits"
        value={smokingHabits}
        onPress={() =>
          setOpenPickerKey(
            openPickerKey === 'smoking' ? null : 'smoking',
          )
        }
      />
      <OptionPicker
        visible={openPickerKey === 'smoking'}
        options={['Non-smoker', 'Occasional', 'Regular']}
        onSelect={(v) => {
          setSmokingHabits(v);
          setOpenPickerKey(null);
        }}
      />

      <OptionRow
        label="Alcohol consumption"
        value={alcoholUse}
        onPress={() =>
          setOpenPickerKey(
            openPickerKey === 'alcohol' ? null : 'alcohol',
          )
        }
      />
      <OptionPicker
        visible={openPickerKey === 'alcohol'}
        options={['Never', 'Occasional', 'Regular']}
        onSelect={(v) => {
          setAlcoholUse(v);
          setOpenPickerKey(null);
        }}
      />

      <OptionRow
        label="Activity level"
        value={activityLevel}
        onPress={() =>
          setOpenPickerKey(
            openPickerKey === 'activity' ? null : 'activity',
          )
        }
      />
      <OptionPicker
        visible={openPickerKey === 'activity'}
        options={[
          'Sedentary',
          'Lightly active',
          'Moderately active',
          'Very active',
        ]}
        onSelect={(v) => {
          setActivityLevel(v);
          setOpenPickerKey(null);
        }}
      />

      <OptionRow
        label="Food preference"
        value={foodPreference}
        onPress={() =>
          setOpenPickerKey(openPickerKey === 'food' ? null : 'food')
        }
      />
      <OptionPicker
        visible={openPickerKey === 'food'}
        options={['Vegetarian', 'Non vegetarian', 'Eggetarian', 'Vegan']}
        onSelect={(v) => {
          setFoodPreference(v);
          setOpenPickerKey(null);
        }}
      />

      <OptionRow
        label="Occupation"
        value={occupation}
        onPress={() =>
          setOpenPickerKey(
            openPickerKey === 'occupation' ? null : 'occupation',
          )
        }
      />
      <OptionPicker
        visible={openPickerKey === 'occupation'}
        options={['Student', 'Homemaker', 'IT professional', 'Self-employed', 'Other']}
        onSelect={(v) => {
          setOccupation(v);
          setOpenPickerKey(null);
        }}
      />
    </>
  )
  );

  return (
    <LinearGradient colors={['#1a3c5a', '#25a29a']} style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.card}>
            {/* stepper */}
            <View style={styles.stepperContainer}>
              {[1, 2, 3].map((s) => (
                <View key={s} style={styles.stepUnit}>
                  <View
                    style={[
                      styles.stepCircle,
                      currentStep >= s && styles.activeStepCircle,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stepNum,
                        currentStep >= s && styles.activeStepNum,
                      ]}
                    >
                      {s}
                    </Text>
                  </View>
                  {s < 3 && (
                    <View
                      style={[
                        styles.stepLine,
                        currentStep > s && styles.activeStepLine,
                      ]}
                    />
                  )}
                </View>
              ))}
            </View>

            <Text style={styles.mainHeader}>UNI-HEALTH</Text>
            <Text style={styles.subHeader}>
              STEP {currentStep}:{' '}
              {currentStep === 1
                ? 'PROFILE'
                : currentStep === 2
                ? 'LOCATION'
                : 'FAMILY'}
            </Text>

            {currentStep === 1 && (
              <View>
                <TileRow />

                {activeTile === 'personal' && PersonalSection }
                {activeTile === 'medical' && MedicalSection }
                {activeTile === 'lifestyle' && LifestyleSection }

                <TouchableOpacity
                  style={[styles.nextBtn, { marginTop: 16 }]}
                  onPress={() => {
                    if (!isVerified) {
                      Alert.alert(
                        'Verification needed',
                        'Verify your mobile in the Personal tab before continuing.',
                      );
                      setActiveTile('personal');
                      return;
                    }
                    setCurrentStep(2);
                  }}
                >
                  <Text style={styles.nextBtnText}>
                    CONTINUE TO LOCATION
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {currentStep === 2 && (
              <View>
                <TextInput
                  style={styles.input}
                  placeholder="Secondary Phone"
                  value={phone2}
                  onChangeText={setPhone2}
                  keyboardType="phone-pad"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Emergency Contact"
                  value={emergencyPhone}
                  onChangeText={setEmergencyPhone}
                  keyboardType="phone-pad"
                />
                <TouchableOpacity
                  onPress={requestLocation}
                  style={styles.ghostBtn}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#1a3c5a" />
                  ) : (
                    <Text style={styles.ghostBtnText}>
                      📍 SYNC GPS LOCATION
                    </Text>
                  )}
                </TouchableOpacity>
                <TextInput
                  style={[styles.input, { height: 60 }]}
                  placeholder="Residential Address"
                  value={address}
                  onChangeText={setAddress}
                  multiline
                />
                <TouchableOpacity
                  style={styles.nextBtn}
                  onPress={() => setCurrentStep(3)}
                >
                  <Text style={styles.nextBtnText}>CONTINUE</Text>
                </TouchableOpacity>
              </View>
            )}

            {currentStep === 3 && (
              <View>
                {familyMembers.map((m, i) => (
                  <View key={i} style={styles.familyBox}>
                    <TouchableOpacity
                      onPress={() => removeFamily(i)}
                      style={styles.removeBtn}
                    >
                      <Ionicons
                        name="close-circle"
                        size={20}
                        color="#e74c3c"
                      />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.miniInput}
                      placeholder="Member Aadhar"
                      keyboardType="numeric"
                      onChangeText={(v) => {
                        m.aadhar = v;
                      }}
                    />
                  </View>
                ))}

                <TouchableOpacity
                  onPress={addFamily}
                  style={styles.dottedBtn}
                >
                  <Text style={styles.dottedBtnText}>
                    + ADD FAMILY MEMBER
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.consentRow}
                  onPress={() => setConsent((v) => !v)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      consent && styles.checkboxChecked,
                    ]}
                  />
                  <Text style={styles.consentText}>
                    I agree to the medical data terms.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    (!consent || loading) && { backgroundColor: '#ccc' },
                  ]}
                  onPress={handleFinalRegister}
                  disabled={!consent || loading}
                >
                  <Text style={styles.submitBtnText}>
                    FINALIZE ACCOUNT
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={{ marginTop: 20 }}
          >
            <Text
              style={{
                fontSize: 12,
                color: '#fff',
                textAlign: 'center',
                fontWeight: '600',
              }}
            >
              Already have an account? Log in
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingVertical: 40, alignItems: 'center' },
  card: {
    width: '92%',
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 35,
    elevation: 10,
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
  },
  stepUnit: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f2f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeStepCircle: { backgroundColor: '#25a29a' },
  stepNum: { fontSize: 14, fontWeight: 'bold', color: '#7f8c8d' },
  activeStepNum: { color: '#fff' },
  stepLine: {
    width: 35,
    height: 3,
    backgroundColor: '#f1f2f6',
    marginHorizontal: 5,
  },
  activeStepLine: { backgroundColor: '#25a29a' },
  mainHeader: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1a3c5a',
    textAlign: 'center',
  },
  subHeader: {
    fontSize: 10,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#25a29a',
    marginTop: 20,
    marginBottom: 10,
  },
  input: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#f1f2f6',
    padding: 12,
    marginBottom: 15,
    fontSize: 15,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: '#f1f2f6',
    marginBottom: 15,
  },
  eyeBtn: { padding: 10 },
  actionBtn: {
    backgroundColor: '#1a3c5a',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionBtnText: { color: '#fff', fontWeight: 'bold' },
  ghostBtn: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 12,
    marginVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  ghostBtnText: { color: '#1a3c5a', fontWeight: 'bold', fontSize: 12 },
  nextBtn: {
    backgroundColor: '#25a29a',
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  nextBtnText: { color: '#fff', fontWeight: 'bold' },
  familyBox: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 15,
    marginBottom: 12,
  },
  removeBtn: { position: 'absolute', right: -5, top: -5, zIndex: 1 },
  miniInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    padding: 8,
    fontSize: 14,
    marginBottom: 10,
  },
  dottedBtn: {
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: '#25a29a',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginVertical: 15,
  },
  dottedBtnText: { color: '#25a29a', fontWeight: 'bold' },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#25a29a',
    borderRadius: 6,
    marginRight: 10,
  },
  checkboxChecked: { backgroundColor: '#25a29a' },
  consentText: { color: '#7f8c8d', fontSize: 12 },
  submitBtn: {
    backgroundColor: '#1a3c5a',
    padding: 20,
    borderRadius: 18,
    alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  tileRow: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    padding: 4,
  },
  tileItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  tileItemActive: {
    backgroundColor: '#fff',
    elevation: 2,
  },
  tileText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  tileTextActive: {
    color: '#1e293b',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  optionLabel: {
    fontSize: 14,
    color: '#1f2933',
  },
  optionValue: {
    fontSize: 13,
    color: '#9ca3af',
  },
  pickerBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
    overflow: 'hidden',
  },
  pickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  pickerText: {
    fontSize: 13,
    color: '#111827',
  },
});
