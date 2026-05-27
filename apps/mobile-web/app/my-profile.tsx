import React, { useEffect, useState, } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Platform, useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../src/lib/supabase';
import { getCurrentUserProfile } from '../src/lib/auth';
import { getBackPathWithClinicFallback } from '../src/lib/navigation';
import { useClinicTheme } from '../src/lib/clinicTheme';
import ClinicNavbar from '../src/common/ClinicNavbar';
import { getUserClinicCount } from '../src/lib/adminData';
import DropdownMenu from '../src/common/DropdownMenu';

export default function MyProfileScreen() {

  const { clinicId, clinicName } = useLocalSearchParams<{
    clinicId?: string;
    clinicName?: string;
  }>();

  const { theme } = useClinicTheme(clinicId);
  const { width } = useWindowDimensions();
  const isMobile = width < 720;
  const [canChangeClinic, setCanChangeClinic] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [role, setRole] = useState('patient');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [gender, setGender] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [allergies, setAllergies] = useState('');
  const [conditions, setConditions] = useState('');
  const [insurance, setInsurance] = useState('');
  const [insuranceDetails, setInsuranceDetails] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {

    const load = async () => {
      const { user, profile } = await getCurrentUserProfile();

      if (!user || !profile) {
        router.replace('/login');
        return;
      }

      setFirstName(profile.first_name ?? '');
      setLastName(profile.last_name ?? '');
      setUsername(profile.username ?? '');
      setPhone(profile.phone ?? '');
      setBirthDate(profile.birth_date ?? '');
      setEmergencyContact(profile.emergency_contact ?? '');
      setEmail(profile.email ?? user.email ?? '');
      setAvatarUrl(profile.avatar_url ?? null);
      setRole(profile.role ?? 'patient');

      if (profile.role === 'clinic_admin' || profile.role === 'doctor') {
        const clinicCount = await getUserClinicCount(user.id);
        setCanChangeClinic(clinicCount > 1);
      } else {
        setCanChangeClinic(false);
      }

      setGender(profile.gender ?? '');
      setBloodType(profile.blood_type ?? '');
      setAllergies(profile.allergies ?? '');
      setConditions(profile.chronic_conditions ?? '');
      setInsurance(profile.insurance_provider ?? '');
      setInsuranceDetails(profile.insurance_details ?? '');
      setAddress(profile.address ?? '');

      setLoading(false);
    };

    load();

  }, []);

  const isPatient = role === 'patient';

  const handleSave = async () => {

    try {
      setSaving(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      const updatePayload: Record<string, any> = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        username: username.trim().toLowerCase(),
        phone: phone.trim() || null,
        birth_date: birthDate.trim() || null,
        emergency_contact: emergencyContact.trim() || null,
        avatar_url: avatarUrl,
      };

      if (isPatient) {
        updatePayload.gender = gender.trim() || null;
        updatePayload.blood_type = bloodType.trim() || null;
        updatePayload.allergies = allergies.trim() || null;
        updatePayload.chronic_conditions = conditions.trim() || null;
        updatePayload.insurance_provider = insurance || null;
        updatePayload.insurance_details = insurance === 'other' ? insuranceDetails.trim() || null : null;
        updatePayload.address = address.trim() || null;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', user.id);

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert('Success', 'Profile updated successfully.');
    } finally {
      setSaving(false);
    }

  };

  const handlePickImage = async () => {

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow access to photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as any,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      await uploadAvatar(asset.uri, asset.mimeType);
    } catch {
      Alert.alert('Error', 'Could not select image.');
    }

  };

  const uploadAvatar = async (uri: string, mimeType = 'image/jpeg') => {

    try {
      setUploadingPhoto(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      const ext =
        mimeType.includes('png') ? 'png' :
        mimeType.includes('webp') ? 'webp' :
        'jpg';

      const filePath = `${user.id}/avatar-${Date.now()}.${ext}`;

      let fileBody: Blob | ArrayBuffer;

      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        fileBody = await response.blob();
      } else {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: 'base64' as any,
        });

        fileBody = decode(base64);
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, fileBody, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) {
        Alert.alert('Upload error', uploadError.message);
        return;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (profileError) {
        Alert.alert('Error', profileError.message);
        return;
      }

      setAvatarUrl(null);

      setTimeout(() => {
        setAvatarUrl(publicUrl);
      }, 50);

      Alert.alert('Success', 'Profile photo updated.');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not upload avatar.');
    } finally {
      setUploadingPhoto(false);
    }

  };

  const handleRemovePhoto = async () => {

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      setAvatarUrl(null);
      Alert.alert('Success', 'Profile photo removed.');
    } catch {
      Alert.alert('Error', 'Could not remove profile photo.');
    }

  };

  const handleSendPasswordReset = async () => {

    try {
      if (!email) {
        Alert.alert('Error', 'No email found for this account.');
        return;
      }

      setSendingReset(true);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {redirectTo: Platform.OS === 'web' ? `${window.location.origin}/reset-password` : 'medsync://reset-password',});

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert('Success', 'Password reset email sent.');
    } finally {
      setSendingReset(false);
    }

  };

  const backRoute = getBackPathWithClinicFallback(role, clinicId, clinicName);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const genderOptions = [

    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' },
    { label: 'Prefer not to say', value: 'prefer_not_to_say' },

  ];

  const bloodTypeOptions = [

    { label: 'A+', value: 'A+' },
    { label: 'A-', value: 'A-' },
    { label: 'B+', value: 'B+' },
    { label: 'B-', value: 'B-' },
    { label: 'AB+', value: 'AB+' },
    { label: 'AB-', value: 'AB-' },
    { label: 'O+', value: 'O+' },
    { label: 'O-', value: 'O-' },
    { label: 'Unknown', value: 'unknown' },

  ];

  const insuranceOptions = [

    { label: 'Public insurance', value: 'public_insurance' },
    { label: 'Private insurance', value: 'private_insurance' },
    { label: 'Self Pay', value: 'self_pay' },
    { label: 'Other', value: 'other' },
  
  ];

  return (

    <ScrollView contentContainerStyle={styles.container} stickyHeaderIndices={[0]}>

      <ClinicNavbar
        clinicId={clinicId}
        clinicName={clinicName}
        primaryColor={theme.primary}
        roleLabel="Profile"
        showRolePill={false}
        onChangeClinic={() => router.replace('/clinic-selection')}
        canChangeClinic={canChangeClinic}
        showBackButton
        onBackPress={() => router.replace(backRoute as any)}
      />

      <View
        style={[
          styles.hero,
          { backgroundColor: theme.soft, borderColor: theme.borderSoft },
        ]}
      >
        <Text style={[styles.heroEyebrow, { color: theme.primary }]}>
          My Profile
        </Text>
        <Text style={[styles.heroTitle, { color: theme.secondary }]}>
          Manage Your Account Details
        </Text>
        <Text style={styles.heroSubtitle}>
          Update your personal information, profile photo and account security.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Profile Photo</Text>

        <View style={styles.avatarSection}>
          <View style={[styles.avatarWrap, { borderColor: `${theme.primary}22` }]}>
            {avatarUrl ? (
              <Image
                key={avatarUrl}
                source={{ uri: avatarUrl }}
                style={styles.avatarImage}
              />
            ) : (
              <View
                style={[
                  styles.avatarFallback,
                  { backgroundColor: `${theme.primary}12` },
                ]}
              >
                <Ionicons name="person-outline" size={44} color={theme.primary}/>
              </View>
            )}
          </View>

          <View style={styles.avatarActions}>
            <Pressable
              style={[
                styles.secondaryButton,
                uploadingPhoto && styles.buttonDisabled,
                isMobile && styles.mobileFullButton,
              ]}
              onPress={handlePickImage}
              disabled={uploadingPhoto}
            >
              <Text style={styles.secondaryButtonText}>
                {uploadingPhoto ? 'Uploading...' : 'Change photo'}
              </Text>
            </Pressable>

            {!!avatarUrl && (
              <Pressable
                style={[styles.removeButton, isMobile && styles.mobileFullButton]}
                onPress={handleRemovePhoto}
              >
                <Text style={styles.removeButtonText}>Remove photo</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Personal Information</Text>

        <View style={styles.row}>
          <View style={styles.field}>
            <Text style={styles.label}>First name</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Last name</Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.field}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g. 07xx xxx xxx"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.field}>
            <Text style={styles.label}>Birth date</Text>
            <TextInput
              value={birthDate}
              onChangeText={setBirthDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Emergency contact</Text>
            <TextInput
              value={emergencyContact}
              onChangeText={setEmergencyContact}
              placeholder="Emergency contact"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.fieldFull}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            editable={false}
            placeholder="Email address"
            placeholderTextColor="#94A3B8"
            style={[styles.input, styles.inputDisabled]}
          />
          <Text style={styles.helperText}>Email is managed by authentication.</Text>
        </View>

        <Pressable
          style={[
            styles.primaryButton,
            isMobile && styles.mobileFullButton,
            { backgroundColor: theme.primary },
            saving && styles.buttonDisabled,
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.primaryButtonText}>
            {saving ? 'Saving...' : 'Save changes'}
          </Text>
        </Pressable>
      </View>

      {isPatient && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Medical Information</Text>

          <View style={styles.row}>
          <View style={styles.field}>
            <Text style={styles.label}>Gender</Text>
            <DropdownMenu
              value={gender}
              onChange={setGender}
              items={genderOptions}
              placeholder="Select gender"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Blood type</Text>
            <DropdownMenu
              value={bloodType}
              onChange={setBloodType}
              items={bloodTypeOptions}
              placeholder="Select blood type"
            />
          </View>
          </View>

          <View style={styles.fieldFull}>
            <Text style={styles.label}>Allergies</Text>
            <TextInput
              value={allergies}
              onChangeText={setAllergies}
              placeholder="e.g. peanuts, penicillin"
              placeholderTextColor="#94A3B8"
              style={[styles.input, styles.textarea]}
              multiline
            />
          </View>

          <View style={styles.fieldFull}>
            <Text style={styles.label}>Chronic conditions</Text>
            <TextInput
              value={conditions}
              onChangeText={setConditions}
              placeholder="e.g. asthma, diabetes"
              placeholderTextColor="#94A3B8"
              style={[styles.input, styles.textarea]}
              multiline
            />
          </View>

          <View style={styles.row}>
          <View style={styles.fieldFull}>
            <Text style={styles.label}>Insurance</Text>
            <DropdownMenu
              value={insurance}
              onChange={setInsurance}
              items={insuranceOptions}
              placeholder="Select insurance type"
            />
          </View>

            {insurance === 'other' && (
              <View style={styles.field}>
                <Text style={styles.label}>Insurance details</Text>
                <TextInput
                  value={insuranceDetails}
                  onChangeText={setInsuranceDetails}
                  placeholder="Please describe your insurance/payment option"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                />
              </View>
            )}
          </View>

          <View style={styles.fieldFull}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="Home address"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />
          </View>

          <Pressable
            style={[
              styles.primaryButton,
              isMobile && styles.mobileFullButton,
              { backgroundColor: theme.primary },
              saving && styles.buttonDisabled,
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.primaryButtonText}>
              {saving ? 'Saving...' : 'Save medical info'}
            </Text>
          </Pressable>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Password & Security</Text>
        <Text style={styles.securityText}>For security, password changes are handled through a reset link sent to your account email.</Text>
        <Pressable
          style={[
            styles.secondaryButton,
            isMobile && styles.mobileFullButton,
            sendingReset && styles.buttonDisabled,
          ]}
          onPress={handleSendPasswordReset}
          disabled={sendingReset}
        >
          <Text style={styles.secondaryButtonText}>
            {sendingReset ? 'Sending...' : 'Send password reset email'}
          </Text>
        </Pressable>
      </View>

    </ScrollView>

  );

}

const styles = StyleSheet.create({

  centered: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  container: {
    flexGrow: 1,
    backgroundColor: '#F8FAFC',
    padding: 24,
    gap: 18,
    //overflow: 'visible',
  },

  hero: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
  },

  heroEyebrow: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },

  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 10,
  },

  heroSubtitle: {
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 22,
    gap: 14,
    overflow: Platform.OS === 'web' ? ('visible' as any) : 'hidden',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },

  avatarSection: {
    flexDirection: 'row',
    gap: 18,
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  avatarWrap: {
    width: 120,
    height: 120,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },

  avatarImage: {
    width: '100%',
    height: '100%',
  },

  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarActions: {
    gap: 10,
  },

  row: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
    overflow: 'visible',
  },

  field: {
    flex: 1,
    minWidth: 240,
    position: 'relative',
    overflow: 'visible',
  },

  fieldFull: {
    width: '100%',
    position: 'relative',
    overflow: 'visible',
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
  },

  inputDisabled: {
    backgroundColor: '#F8FAFC',
    color: '#64748B',
  },

  helperText: {
    marginTop: 6,
    fontSize: 12,
    color: '#64748B',
  },

  textarea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },

  securityText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
  },

  primaryButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 4,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },

  secondaryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },

  secondaryButtonText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 14,
  },

  removeButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },

  removeButtonText: {
    color: '#BE123C',
    fontWeight: '700',
    fontSize: 14,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  mobileFullButton: {
    width: '100%',
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },

  insuranceDetailsField: {
    width: '100%',
    position: 'relative',
    overflow: 'visible',
    marginTop: 14,
  },
  
});