import React, { useEffect, useRef, useState, useCallback } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Animated, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ClinicNavbar from '../src/common/ClinicNavbar';
import DropdownMenu from '../src/common/DropdownMenu';
import { supabase } from '../src/lib/supabase';
import { getCurrentUserProfile } from '../src/lib/auth';
import { useClinicTheme } from '../src/lib/clinicTheme';

type Role = 'patient' | 'doctor' | 'clinic_admin' | 'platform_admin';

type Profile = {

  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: Role;
  active_clinic_id: string | null;
  phone: string | null;
  username: string | null;
  address: string | null;
  avatar_url: string | null;
  is_active?: boolean | null;
  deleted_at?: string | null;

};

type NewUserForm = {

  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: Role;
  username: string;
  phone: string;
  address: string;

};

type ClinicOption = {

  label: string;
  value: string;

};

const usernameRegex = /^[a-z0-9._]{3,20}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;
const phoneRegex = /^[0-9+\s().-]{7,20}$/;

const roles = [

  { label: 'Patient', value: 'patient' },
  { label: 'Doctor', value: 'doctor' },
  { label: 'Clinic Admin', value: 'clinic_admin' },
  { label: 'Platform Admin', value: 'platform_admin' },

];

function formatRole(role?: string | null) {
  return roles.find((item) => item.value === role)?.label || 'Unknown Role';
}

function cloneProfile(profile: Profile): Profile {
  return { ...profile };
}

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids.filter(Boolean)));
}

function HoverCard({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress: () => void;
}) {

  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const shadow = useRef(new Animated.Value(0)).current;

  const animateIn = () => {
    if (Platform.OS !== 'web') 
      return;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1.015, useNativeDriver: false, friction: 8 }),
      Animated.spring(translateY, { toValue: -5, useNativeDriver: false, friction: 8 }),
      Animated.timing(shadow, { toValue: 1, duration: 180, useNativeDriver: false }),
    ]).start();
  };

  const animateOut = () => {
    if (Platform.OS !== 'web') 
      return;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: false, friction: 8 }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: false, friction: 8 }),
      Animated.timing(shadow, { toValue: 0, duration: 180, useNativeDriver: false }),
    ]).start();
  };

  return (

    <Pressable
      style={styles.cardWrap}
      onPress={onPress}
      onHoverIn={animateIn}
      onHoverOut={animateOut}
      onPressIn={animateIn}
      onPressOut={animateOut}
    >
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ scale }, { translateY }],
            shadowOpacity: shadow.interpolate({
              inputRange: [0, 1],
              outputRange: [0.04, 0.12],
            }) as any,
            shadowRadius: shadow.interpolate({
              inputRange: [0, 1],
              outputRange: [8, 18],
            }) as any,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>

  );

}

export default function ManageUsersScreen() {

  const { clinicId, clinicName } = useLocalSearchParams<{
    clinicId?: string;
    clinicName?: string;
  }>();

  const { theme } = useClinicTheme(clinicId);
  const { width } = useWindowDimensions();
  const isMobile = width < 720;
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Profile[]>([]);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [originalEditing, setOriginalEditing] = useState<Profile | null>(null);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [showNewUserConfirmPassword, setShowNewUserConfirmPassword] = useState(false);
  const [newUser, setNewUser] = useState<NewUserForm>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'patient',
    username: '',
    phone: '',
    address: '',
  });
  const [newUserSubmitted, setNewUserSubmitted] = useState(false);
  const [clinics, setClinics] = useState<ClinicOption[]>([]);
  const [selectedClinicIds, setSelectedClinicIds] = useState<string[]>([]);
  const [editingClinicIds, setEditingClinicIds] = useState<string[]>([]);

  const loadUsers = useCallback(async () => {

    setLoading(true);

    const { user, profile } = await getCurrentUserProfile();

    if (!user) {
      router.replace('/login');
      return;
    }

    if (!profile || !['platform_admin', 'clinic_admin', 'doctor'].includes(profile.role)) {
      router.replace('/main-patient');
      return;
    }

    setCurrentRole(profile.role as Role);

    if (profile.role === 'platform_admin') {
      const { data: clinicRows, error: clinicError } = await supabase
        .from('clinics')
        .select('id, name')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (!clinicError) {
        setClinics(
          (clinicRows ?? []).map((clinic: any) => ({
            label: clinic.name,
            value: clinic.id,
          }))
        );
      }
    }

    if (profile.role !== 'platform_admin' && !clinicId) {
      router.replace('/clinic-selection');
      return;
    }

    let profileIds: string[] | null = null;

    if (profile.role === 'clinic_admin') {
      const { data: memberships, error: membershipsError } = await supabase
        .from('clinic_memberships')
        .select('profile_id')
        .eq('clinic_id', clinicId)
        .eq('is_active', true);

      if (membershipsError) {
        Alert.alert('Error', membershipsError.message);
        setUsers([]);
        setLoading(false);
        return;
      }

      const { data: appointmentPatients, error: appointmentsError } = await supabase
        .from('appointments')
        .select('patient_id')
        .eq('clinic_id', clinicId);

      if (appointmentsError) {
        Alert.alert('Error', appointmentsError.message);
        setUsers([]);
        setLoading(false);
        return;
      }

      profileIds = uniqueIds([ ...(memberships ?? []).map((item: any) => item.profile_id), ...(appointmentPatients ?? []).map((item: any) => item.patient_id), ]);
    }

    if (profile.role === 'doctor') {
      const { data: doctorData, error: doctorError } = await supabase
        .from('doctors')
        .select('id')
        .eq('clinic_id', clinicId)
        .or(`profile_id.eq.${user.id},email.eq.${profile.email}`)
        .maybeSingle();

      if (doctorError || !doctorData) {
        Alert.alert('Error', 'No doctor profile is connected to this account in this clinic.');
        setUsers([]);
        setLoading(false);
        return;
      }

      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('patient_id')
        .eq('clinic_id', clinicId)
        .eq('doctor_id', doctorData.id);

      if (appointmentsError) {
        Alert.alert('Error', appointmentsError.message);
        setUsers([]);
        setLoading(false);
        return;
      }

      profileIds = uniqueIds((appointments ?? []).map((item: any) => item.patient_id));
    }

    let query = supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role, active_clinic_id, phone, username, address, avatar_url, is_active, deleted_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (profileIds) {
      if (profileIds.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      query = query.in('id', profileIds);
    }

    const { data, error } = await query;

    if (error) {
      Alert.alert('Error', error.message);
      setUsers([]);
    } else {
      setUsers((data ?? []) as Profile[]);
    }

    setLoading(false);

  }, [clinicId]);

  useEffect(() => {
    loadUsers();
  }, [clinicId, loadUsers]);

  const uploadAvatar = async () => {
    if (!editing) return;

    if (Platform.OS !== 'web') {
      Alert.alert('Unavailable', 'Avatar upload is currently available on web.');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        setUploadingAvatar(true);

        const extension = file.name.split('.').pop() || 'jpg';
        const path = `${editing.id}/${Date.now()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, file, {
            upsert: true,
            contentType: file.type,
          });

        if (uploadError) {
          Alert.alert('Upload error', uploadError.message);
          return;
        }

        const { data } = supabase.storage.from('avatars').getPublicUrl(path);

        setEditing({
          ...editing,
          avatar_url: data.publicUrl,
        });
      } finally {
        setUploadingAvatar(false);
      }
    };

    input.click();
  };

  const hasUnsavedChanges = () => {
    if (!editing || !originalEditing) return false;
    return JSON.stringify(editing) !== JSON.stringify(originalEditing);
  };

  const closeEditing = () => {
    if (!hasUnsavedChanges()) {
      setEditing(null);
      setOriginalEditing(null);
      return;
    }

    setDiscardConfirmOpen(true);
  };

  const discardChanges = () => {
    setDiscardConfirmOpen(false);
    setEditing(null);
    setOriginalEditing(null);
  };


  const toggleClinicId = (
    clinicIdValue: string,
    selectedIds: string[],
    setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setSelectedIds((prev) =>
      prev.includes(clinicIdValue)
        ? prev.filter((id) => id !== clinicIdValue)
        : [...prev, clinicIdValue]
    );
  };

  const resetNewUser = () => {
    setNewUser({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'patient',
      username: '',
      phone: '',
      address: '',
    });
    setSelectedClinicIds([]);
    setNewUserSubmitted(false);
  };

  const openNewUser = () => {
    resetNewUser();
    setNewUserOpen(true);
  };

  const closeNewUser = () => {
    setNewUserOpen(false);
    resetNewUser();
  };

  const newUserFirstNameError = newUserSubmitted && !newUser.firstName.trim() ? 'First name is required' : '';
  const newUserLastNameError = newUserSubmitted && !newUser.lastName.trim() ? 'Last name is required' : '';
  const newUserUsernameError = newUserSubmitted && !newUser.username.trim() ? 'Username is required' : newUserSubmitted && !usernameRegex.test(newUser.username.trim().toLowerCase()) ? 'Username must be 3-20 characters and can contain lowercase letters, numbers, dots and underscores.' : '';
  const newUserEmailError = newUserSubmitted && !newUser.email.trim() ? 'Email is required' : newUserSubmitted && !emailRegex.test(newUser.email.trim().toLowerCase()) ? 'Please enter a valid email address.' : '';
  const newUserPasswordError = newUserSubmitted && !newUser.password ? 'Password is required' : newUserSubmitted && !passwordRegex.test(newUser.password) ? 'Password must be at least 8 characters long, include one uppercase letter and one special character.' : '';
  const newUserConfirmPasswordError = newUserSubmitted && !newUser.confirmPassword ? 'Please confirm your password' : newUserSubmitted && newUser.confirmPassword !== newUser.password ? 'Passwords do not match.' : '';
  const newUserClinicError = newUserSubmitted && currentRole === 'platform_admin' && ['doctor', 'clinic_admin'].includes(newUser.role) && selectedClinicIds.length === 0 ? 'Please choose at least one clinic for this role.' : '';

  const createUser = async () => {
    setNewUserSubmitted(true);

    const normalizedEmail = newUser.email.trim().toLowerCase();
    const normalizedUsername = newUser.username.trim().toLowerCase();
    const trimmedPhone = newUser.phone.trim();
    const trimmedAddress = newUser.address.trim();

    const assignedClinicIds =
      currentRole === 'platform_admin'
        ? selectedClinicIds
        : clinicId
          ? [clinicId]
          : [];

    const hasErrors =
      !newUser.firstName.trim() ||
      !newUser.lastName.trim() ||
      !normalizedUsername ||
      !usernameRegex.test(normalizedUsername) ||
      !normalizedEmail ||
      !emailRegex.test(normalizedEmail) ||
      !newUser.password ||
      !passwordRegex.test(newUser.password) ||
      !newUser.confirmPassword ||
      newUser.confirmPassword !== newUser.password ||
      (
        currentRole === 'platform_admin' &&
        ['doctor', 'clinic_admin'].includes(newUser.role) &&
        assignedClinicIds.length === 0
      );

    if (hasErrors) return;

    if (trimmedPhone && !phoneRegex.test(trimmedPhone)) {
      Alert.alert('Invalid phone', 'Please enter a valid phone number.');
      return;
    }

    if (currentRole === 'clinic_admin' && newUser.role === 'platform_admin') {
      Alert.alert('Not allowed', 'Clinic admins cannot create platform admins.');
      return;
    }

    if (currentRole === 'clinic_admin' && !clinicId) {
      Alert.alert('Missing clinic', 'Clinic admins must create users inside a clinic.');
      return;
    }

    try {
      setCreating(true);

      const payload = {
        firstName: newUser.firstName.trim(),
        lastName: newUser.lastName.trim(),
        email: normalizedEmail,
        password: newUser.password,
        role: newUser.role,
        username: normalizedUsername,
        phone: trimmedPhone || null,
        address: trimmedAddress || null,
        clinicIds: assignedClinicIds,
      };

      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: payload,
      });

      if (error || data?.error) {
        Alert.alert('Create user error', data?.error || error?.message || 'Could not create user.');
        return;
      }

      Alert.alert('Success', 'User created successfully.');
      closeNewUser();
      await loadUsers();
    } catch (error: any) {
      Alert.alert('Create user error', error?.message || 'Unknown error.');
    } finally {
      setCreating(false);
    }
  };

  const loadUserClinicMemberships = async (profileId: string) => {
    const { data, error } = await supabase
      .from('clinic_memberships')
      .select('clinic_id')
      .eq('profile_id', profileId)
      .eq('is_active', true);

    if (error) {
      Alert.alert('Error', error.message);
      setEditingClinicIds([]);
      return;
    }

    setEditingClinicIds((data ?? []).map((item: any) => item.clinic_id));
  };

  const deleteUser = () => {
    if (!editing) return;
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!editing) return;

    setDeleteConfirmOpen(false);
    setDeleting(true);

    const { data, error } = await supabase.functions.invoke('admin-delete-user', {
      body: {
        userId: editing.id,
      },
    });

    setDeleting(false);

    if (error || data?.error) {
      Alert.alert('Delete error', data?.error || error?.message || 'Could not delete user.');
      return;
    }

    setEditing(null);
    setOriginalEditing(null);
    setEditingClinicIds([]);
    loadUsers();
  };

  const saveUser = async () => {
    if (!editing || currentRole === 'doctor') 
      return;

    if (
      currentRole === 'platform_admin' &&
      ['doctor', 'clinic_admin'].includes(editing.role) &&
      editingClinicIds.length === 0
    ) {
      Alert.alert('Missing clinic', 'Please choose a clinic for this role.');
      return;
    }

    setSaving(true);

    const payload: Partial<Profile> & { updated_at: string } = {
      first_name: editing.first_name?.trim() || null,
      last_name: editing.last_name?.trim() || null,
      username: editing.username?.trim() || null,
      phone: editing.phone?.trim() || null,
      address: editing.address?.trim() || null,
      avatar_url: editing.avatar_url?.trim() || null,
      active_clinic_id:
        currentRole === 'platform_admin' &&
        ['doctor', 'clinic_admin'].includes(editing.role)
          ? editingClinicIds[0] || null
          : editing.active_clinic_id,
            updated_at: new Date().toISOString(),
    };

    if (currentRole === 'platform_admin')
      payload.role = editing.role;

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', editing.id);

    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    if (currentRole === 'platform_admin' && ['doctor', 'clinic_admin'].includes(editing.role)) {
      const { error: deactivateError } = await supabase
        .from('clinic_memberships')
        .update({ is_active: false })
        .eq('profile_id', editing.id);

      if (deactivateError) {
        Alert.alert('Membership error', deactivateError.message);
        return;
      }

      if (editingClinicIds.length > 0) {
        const rows = editingClinicIds.map((clinicIdValue) => ({
          clinic_id: clinicIdValue,
          profile_id: editing.id,
          role: editing.role,
          is_active: true,
        }));

        const { error: membershipError } = await supabase
          .from('clinic_memberships')
          .upsert(rows, { onConflict: 'clinic_id,profile_id' });

        if (membershipError) {
          Alert.alert('Membership error', membershipError.message);
          return;
        }
      }
    }

    setEditing(null);
    setOriginalEditing(null);
    loadUsers();
  };

  const getBackRoute = () => {
    if (currentRole === 'doctor') 
      return '/main-doctor';
    if (currentRole === 'clinic_admin') 
      return '/main-clinic-admin';
    return '/main-platform-admin';
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primary}/>
      </View>
    );
  }

  const createRoles = currentRole === 'platform_admin' ? roles : roles.filter((item) => item.value !== 'platform_admin');

  return (

    <>

      <ScrollView contentContainerStyle={styles.container} stickyHeaderIndices={[0]}>

        <ClinicNavbar
          clinicName={currentRole === 'platform_admin' ? 'MedSync Platform' : clinicName}
          clinicId={clinicId}
          primaryColor={theme.primary}
          roleLabel={
            currentRole === 'doctor'
              ? 'Doctor'
              : currentRole === 'clinic_admin'
                ? 'Clinic Admin'
                : 'Platform Admin'
          }
          showRolePill={false}
          showBackButton
          canChangeClinic={false}
          onBackPress={() =>
            router.replace({
              pathname: getBackRoute() as any,
              params: { clinicId, clinicName },
            })
          }
        />

        <View style={[styles.hero, { backgroundColor: theme.soft, borderColor: theme.borderSoft }]}>
          <Text style={[styles.eyebrow, { color: theme.primary }]}>Users</Text>
          <Text style={[styles.title, { color: theme.secondary }]}>
            {currentRole === 'platform_admin'
              ? 'Manage Platform Users'
              : currentRole === 'clinic_admin'
                ? 'Manage Clinic Users'
                : 'My Patients'}
          </Text>
          <Text style={styles.subtitle}>
            {currentRole === 'doctor'
              ? 'View patients connected to your appointments in this clinic.'
              : 'View users, update profile details and manage access.'}
          </Text>
          {currentRole !== 'doctor' && (
            <Pressable
            style={[
              styles.primaryButton,
              isMobile && styles.primaryButtonMobile,
              { backgroundColor: theme.primary },
            ]}
            onPress={openNewUser}
          >
            <Ionicons name="add-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>New User</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.list}>
          {users.map((userItem) => {
            const name =
              `${userItem.first_name || ''} ${userItem.last_name || ''}`.trim() ||
              'Unnamed user';

            return (

              <HoverCard
                key={userItem.id}
                onPress={() => {
                  const next = cloneProfile(userItem);
                  setEditing(next);
                  setOriginalEditing(cloneProfile(next));
                  loadUserClinicMemberships(next.id);
                }}
              >
                {isMobile ? (
                  <>
                    <View style={styles.mobileUserTopRow}>
                      <View style={styles.avatarSmall}>
                        {userItem.avatar_url ? (
                          <Image source={{ uri: userItem.avatar_url }} style={styles.avatarSmallImage}/>
                        ) : (
                          <Ionicons name="person-outline" size={22} color={theme.primary}/>
                        )}
                      </View>

                      <View style={styles.mobileUserTopRight}>
                        <View style={[styles.roleBadge, { backgroundColor: `${theme.primary}12` }]}>
                          <Text style={[styles.roleText, { color: theme.primary }]}>
                            {formatRole(userItem.role)}
                          </Text>
                        </View>

                        <Ionicons name="chevron-forward-outline" size={20} color="#94A3B8"/>
                      </View>
                    </View>

                    <View style={styles.mobileUserTextBlock}>
                      <Text numberOfLines={2} style={styles.userName}>{name}</Text>
                      <Text numberOfLines={1} style={styles.email}>{userItem.email || 'No email'}</Text>
                      <Text style={styles.cardHint}>Tap this card to view or edit user details.</Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.cardHeader}>
                    <View style={styles.avatarSmall}>
                      {userItem.avatar_url ? (
                        <Image source={{ uri: userItem.avatar_url }} style={styles.avatarSmallImage}/>
                      ) : (
                        <Ionicons name="person-outline" size={22} color={theme.primary}/>
                      )}
                    </View>

                    <View style={styles.cardTitleWrap}>
                      <Text style={styles.userName}>{name}</Text>
                      <Text style={styles.email}>{userItem.email || 'No email'}</Text>
                      <Text style={styles.cardHint}>Tap this card to view or edit user details.</Text>
                    </View>

                    <View style={styles.cardRight}>
                      <View style={[styles.roleBadge, { backgroundColor: `${theme.primary}12` }]}>
                        <Text style={[styles.roleText, { color: theme.primary }]}>
                          {formatRole(userItem.role)}
                        </Text>
                      </View>

                      <Ionicons name="chevron-forward-outline" size={20} color="#94A3B8" />
                    </View>
                  </View>
                )}

                <View style={styles.metaBlock}>
                  <DetailRow icon="person-outline" label="Username" value={userItem.username || 'Not set'} />
                  <DetailRow icon="call-outline" label="Phone" value={userItem.phone || 'Not set'} />
                  <DetailRow icon="location-outline" label="Address" value={userItem.address || 'Not set'} />
                </View>
              </HoverCard>

            );
          })}
        </View>
      
      </ScrollView>

      <Modal visible={!!editing} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardLarge}>
            <View style={styles.modalHeader}>
              <View style={[styles.avatarLarge, { borderColor: `${theme.primary}25`, backgroundColor: `${theme.primary}10` }]}>
                {editing?.avatar_url ? (
                  <Image source={{ uri: editing.avatar_url }} style={styles.avatarLargeImage}/>
                ) : (
                  <Ionicons name="person-outline" size={40} color={theme.primary}/>
                )}
              </View>

              <Text style={styles.modalTitle}>User Details</Text>
              <Text style={styles.modalSubtitle}>
                {currentRole === 'doctor'
                  ? 'Doctors can view patient information from this clinic.'
                  : 'Update profile information, avatar URL and access details.'}
              </Text>
            </View>

            {editing && (
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator
              >
                <Input
                  label="First Name"
                  value={editing.first_name || ''}
                  editable={currentRole !== 'doctor'}
                  onChangeText={(first_name) => setEditing({ ...editing, first_name })}
                />

                <Input
                  label="Last Name"
                  value={editing.last_name || ''}
                  editable={currentRole !== 'doctor'}
                  onChangeText={(last_name) => setEditing({ ...editing, last_name })}
                />

                <Input
                  label="Email"
                  value={editing.email || ''}
                  editable={false}
                  onChangeText={() => {}}
                />

                <Text style={styles.helperText}>Email is read-only because it is linked to the user authentication account.</Text>

                <Input
                  label="Username"
                  value={editing.username || ''}
                  editable={currentRole !== 'doctor'}
                  onChangeText={(username) => setEditing({ ...editing, username })}
                />

                <Input
                  label="Phone"
                  value={editing.phone || ''}
                  editable={currentRole !== 'doctor'}
                  onChangeText={(phone) => setEditing({ ...editing, phone })}
                />

                <Input
                  label="Address"
                  value={editing.address || ''}
                  multiline
                  editable={currentRole !== 'doctor'}
                  onChangeText={(address) => setEditing({ ...editing, address })}
                />

                <Input
                  label="Avatar URL"
                  value={editing.avatar_url || ''}
                  editable={currentRole !== 'doctor'}
                  onChangeText={(avatar_url) => setEditing({ ...editing, avatar_url })}
                />

                {currentRole !== 'doctor' && (
                  <View style={styles.avatarActions}>
                    <Pressable
                      style={[styles.avatarButton, uploadingAvatar && styles.buttonDisabled]}
                      onPress={uploadAvatar}
                      disabled={uploadingAvatar}
                    >
                        <Ionicons
                          name={editing.avatar_url ? 'image-outline' : 'cloud-upload-outline'}
                          size={16}
                          color="#0F172A"
                        />

                        <Text style={styles.avatarButtonText}>
                          {uploadingAvatar ? 'Uploading...' : editing.avatar_url ? 'Change' : 'Upload'}
                        </Text>
                    </Pressable>

                    {!!editing.avatar_url && (
                      <Pressable
                        style={styles.avatarDangerButton}
                        onPress={() => setEditing({ ...editing, avatar_url: '' })}
                      >
                        <Ionicons name="trash-outline" size={16} color="#BE123C"/>
                        <Text style={styles.avatarDangerText}>Remove</Text>
                      </Pressable>
                    )}
                  </View>
                )}

                <Text style={styles.inputLabel}>Platform Role</Text>

                {currentRole === 'platform_admin' ? (
                  <View style={styles.dropdownWrap}>
                    <DropdownMenu
                      value={editing.role}
                      onChange={(role) => setEditing({ ...editing, role: role as Role })}
                      items={roles}
                    />
                  </View>
                ) : (
                  <View style={styles.readOnlyRoleBox}>
                    <Text style={styles.readOnlyRoleText}>{formatRole(editing.role)}</Text>
                    <Text style={styles.readOnlyRoleHint}>Only platform admins can change the global platform role.</Text>
                  </View>
                )}

                {currentRole === 'platform_admin' &&
                  ['doctor', 'clinic_admin'].includes(editing.role) && (
                    <>
                      <Text style={styles.inputLabel}>Assigned clinics</Text>

                      <View style={styles.clinicPicker}>
                        {clinics.map((clinic) => {
                          const selected = editingClinicIds.includes(clinic.value);

                          return (
                            <Pressable
                              key={clinic.value}
                              style={[
                                styles.clinicChip,
                                selected && {
                                  backgroundColor: `${theme.primary}12`,
                                  borderColor: theme.primary,
                                },
                              ]}
                              onPress={() =>
                                toggleClinicId(clinic.value, editingClinicIds, setEditingClinicIds)
                              }
                            >
                              <Ionicons
                                name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                                size={18}
                                color={selected ? theme.primary : '#94A3B8'}
                              />

                              <Text
                                style={[
                                  styles.clinicChipText,
                                  selected && { color: theme.primary },
                                ]}
                              >
                                {clinic.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>

                      <Text style={styles.helperText}>
                        Doctors and clinic admins can belong to one or more clinics.
                      </Text>
                    </>
                  )}

              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={closeEditing}
                disabled={saving}
              >
                <Text style={styles.modalCancelText}>Close</Text>
              </Pressable>

              {['platform_admin', 'clinic_admin'].includes(currentRole || '') && editing?.id && (
                <Pressable
                  style={styles.modalDangerButton}
                  onPress={deleteUser}
                  disabled={saving || deleting}
                >
                  <Text style={styles.modalDangerText}>
                {deleting ? 'Deleting...' : 'Delete'}
              </Text>
                </Pressable>
              )}

              {currentRole !== 'doctor' && (
                <Pressable style={[styles.modalSaveButton, { backgroundColor: theme.primary }]} onPress={saveUser} disabled={saving}>
                  <Text style={styles.modalSaveText}>{saving ? 'Saving...' : 'Save User'}</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      
      </Modal>

      <Modal visible={newUserOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardLarge}>
            <View style={styles.modalHeader}>
              <View style={[styles.avatarLarge, { borderColor: `${theme.primary}25`, backgroundColor: `${theme.primary}10` }]}>
                <Ionicons name="person-add-outline" size={40} color={theme.primary}/>
              </View>

              <Text style={styles.modalTitle}>New User</Text>
              <Text style={styles.modalSubtitle}>
                Create an account and assign access.
              </Text>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
              <Input
                label="First Name"
                value={newUser.firstName}
                onChangeText={(firstName) => setNewUser({ ...newUser, firstName })}
              />
              {!!newUserFirstNameError && (
                <Text style={styles.inlineError}>{newUserFirstNameError}</Text>
              )}

              <Input
                label="Last Name"
                value={newUser.lastName}
                onChangeText={(lastName) => setNewUser({ ...newUser, lastName })}
              />
              {!!newUserLastNameError && (
                <Text style={styles.inlineError}>{newUserLastNameError}</Text>
              )}

              <Input
                label="Username"
                value={newUser.username}
                onChangeText={(username) => setNewUser({ ...newUser, username })}
              />
              {!!newUserUsernameError && (
                <Text style={styles.inlineError}>{newUserUsernameError}</Text>
              )}

              <Input
                label="Email"
                value={newUser.email}
                onChangeText={(email) => setNewUser({ ...newUser, email })}
              />
              {!!newUserEmailError && (
                <Text style={styles.inlineError}>{newUserEmailError}</Text>
              )}


      <Text style={styles.inputLabel}>Temporary Password</Text>
      <View style={styles.passwordWrapper}>
        <TextInput
          placeholder="Temporary Password"
          placeholderTextColor="#94A3B8"
          secureTextEntry={!showNewUserPassword}
          value={newUser.password}
          onChangeText={(password) => setNewUser({ ...newUser, password })}
          style={styles.passwordInput}
        />

        <Pressable
          onPress={() => setShowNewUserPassword((prev) => !prev)}
          style={styles.eyeButton}
        >
          <Ionicons
            name={showNewUserPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color="#64748B"
          />
        </Pressable>
      </View>
      {!!newUserPasswordError && (
        <Text style={styles.inlineError}>{newUserPasswordError}</Text>
      )}

      <Text style={styles.inputLabel}>Confirm Temporary Password</Text>
      <View style={styles.passwordWrapper}>
        <TextInput
          placeholder="Confirm Temporary Password"
          placeholderTextColor="#94A3B8"
          secureTextEntry={!showNewUserConfirmPassword}
          value={newUser.confirmPassword}
          onChangeText={(confirmPassword) => setNewUser({ ...newUser, confirmPassword })}
          style={styles.passwordInput}
        />

        <Pressable
          onPress={() => setShowNewUserConfirmPassword((prev) => !prev)}
          style={styles.eyeButton}
        >
          <Ionicons
            name={showNewUserConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color="#64748B"
          />
        </Pressable>
      </View>
      {!!newUserConfirmPasswordError && (
        <Text style={styles.inlineError}>{newUserConfirmPasswordError}</Text>
      )}

              <Input
                label="Phone optional"
                value={newUser.phone}
                onChangeText={(phone) => setNewUser({ ...newUser, phone })}
              />

              <Input
                label="Address optional"
                value={newUser.address}
                multiline
                onChangeText={(address) => setNewUser({ ...newUser, address })}
              />

              <Text style={styles.inputLabel}>Role</Text>
              <View style={styles.dropdownWrap}>
                <DropdownMenu
                  value={newUser.role}
                  onChange={(role) => setNewUser({ ...newUser, role: role as Role })}
                  items={createRoles}
                />
              </View>

              {currentRole === 'platform_admin' &&
                ['doctor', 'clinic_admin'].includes(newUser.role) && (
                  <>
                    <Text style={styles.inputLabel}>Assign to clinics</Text>

                    <View style={styles.clinicPicker}>
                      {clinics.map((clinic) => {
                        const selected = selectedClinicIds.includes(clinic.value);

                        return (
                          <Pressable
                            key={clinic.value}
                            style={[
                              styles.clinicChip,
                              selected && {
                                backgroundColor: `${theme.primary}12`,
                                borderColor: theme.primary,
                              },
                            ]}
                            onPress={() =>
                              toggleClinicId(clinic.value, selectedClinicIds, setSelectedClinicIds)
                            }
                          >
                            <Ionicons
                              name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                              size={18}
                              color={selected ? theme.primary : '#94A3B8'}
                            />

                            <Text
                              style={[
                                styles.clinicChipText,
                                selected && { color: theme.primary },
                              ]}
                            >
                              {clinic.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {!!newUserClinicError && (
                      <Text style={styles.inlineError}>{newUserClinicError}</Text>
                    )}

                    <Text style={styles.helperText}>
                      Doctors and clinic admins can be assigned to one or more clinics.
                    </Text>
                  </>
                )}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelButton} onPress={closeNewUser} disabled={creating}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.modalSaveButton, { backgroundColor: theme.primary }]}
                onPress={createUser}
                disabled={creating}
              >
                <Text style={styles.modalSaveText}>
                  {creating ? 'Creating...' : 'Create User'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={discardConfirmOpen} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <Ionicons name="warning-outline" size={28} color="#B45309" />
            </View>

            <Text style={styles.confirmTitle}>Discard unsaved changes?</Text>

            <Text style={styles.confirmText}>
              You have unsaved changes. If you close now, they will be lost.
            </Text>

            <View style={styles.confirmActions}>
              <Pressable
                style={styles.confirmCancelButton}
                onPress={() => setDiscardConfirmOpen(false)}
              >
                <Text style={styles.confirmCancelText}>Keep editing</Text>
              </Pressable>

              <Pressable style={styles.confirmDiscardButton} onPress={discardChanges}>
                <Text style={styles.confirmDiscardText}>Discard</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={deleteConfirmOpen} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <View style={[styles.confirmIcon, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="trash-outline" size={28} color="#DC2626" />
            </View>

            <Text style={styles.confirmTitle}>Delete user?</Text>

      <Text style={styles.confirmText}>
        This will permanently delete the user account, profile and clinic access. This action cannot be undone.
      </Text>

            <View style={styles.confirmActions}>
              <Pressable
                style={styles.confirmCancelButton}
                onPress={() => setDeleteConfirmOpen(false)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>

      <Pressable
        style={styles.confirmDiscardButton}
        onPress={confirmDeleteUser}
        disabled={deleting}
      >
        <Text style={styles.confirmDiscardText}>
          {deleting ? 'Deleting...' : 'Delete'}
        </Text>
      </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </>

  );

}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {

  const isEmpty = value === 'Not set';

  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={16} color="#64748B"/>
      <View style={styles.detailTextWrap}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, isEmpty && styles.emptyValue]}>{value}</Text>
      </View>
    </View>
  );

}

function Input({
  label,
  value,
  onChangeText,
  multiline,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  editable?: boolean;
}) {

  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        editable={editable}
        style={[styles.input, multiline && styles.textarea, !editable && styles.inputDisabled]}
        placeholder={label}
        placeholderTextColor="#94A3B8"
      />
    </View>
  );

}

const styles = StyleSheet.create({

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },

  container: {
    flexGrow: 1,
    padding: 24,
    gap: 18,
    backgroundColor: '#F8FAFC',
  },

  hero: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 24,
  },

  eyebrow: {
    fontWeight: '900',
    fontSize: 13,
    marginBottom: 8,
  },

  title: {
    fontWeight: '900',
    fontSize: 30,
    marginBottom: 8,
  },

  subtitle: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 24,
  },

  list: {
    gap: 16,
  },

  cardWrap: {
    width: '100%',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },

  cardHeader: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },

  mobileUserTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  mobileUserTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  mobileUserTextBlock: {
    marginTop: 14,
  },

  avatarSmall: {
    width: 54,
    height: 54,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  avatarSmallImage: {
    width: '100%',
    height: '100%',
  },

  cardTitleWrap: {
    flex: 1,
    minWidth: 0,
  },

  userName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    flexShrink: 1,
  },

  email: {
    color: '#64748B',
    fontWeight: '700',
    marginTop: 4,
    flexShrink: 1,
  },

  cardHint: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 12,
    marginTop: 4,
  },

  roleBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexShrink: 0,
  },

  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  roleText: {
    fontWeight: '900',
    fontSize: 12,
  },

  metaBlock: {
    gap: 10,
    marginTop: 16,
  },

  detailRow: {
    flexDirection: 'row',
    gap: 9,
    alignItems: 'flex-start',
  },

  detailTextWrap: {
    flex: 1,
  },

  detailLabel: {
    color: '#334155',
    fontWeight: '800',
    fontSize: 13,
  },

  detailValue: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 13,
    marginTop: 2,
  },

  emptyValue: {
    color: '#94A3B8',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  modalCardLarge: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'stretch',
  },

  modalHeader: {
    alignItems: 'center',
    marginBottom: 14,
  },

  avatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 14,
  },

  avatarLargeImage: {
    width: '100%',
    height: '100%',
  },

  modalTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },

  modalSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    color: '#64748B',
    fontWeight: '700',
    textAlign: 'center',
  },

  modalScroll: {
    width: '100%',
    maxHeight: 430,
  },

  modalScrollContent: {
    paddingBottom: 8,
  },

  inputWrap: {
    width: '100%',
    marginBottom: 18,
  },

  inputLabel: {
    fontWeight: '800',
    color: '#334155',
    fontSize: 14,
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 52,
    backgroundColor: '#FFFFFF',
    fontSize: 14,
    color: '#0F172A',
  },

  inputDisabled: {
    backgroundColor: '#F1F5F9',
    color: '#64748B',
  },

  textarea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },

  helperText: {
    marginTop: -10,
    marginBottom: 18,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  avatarActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: -4,
    marginBottom: 18,
  },

  avatarButton: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FFFFFF',
  },

  avatarButtonText: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 13,
  },

  avatarDangerButton: {
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FFF1F2',
  },

  avatarDangerText: {
    color: '#BE123C',
    fontWeight: '900',
    fontSize: 13,
  },

  dropdownWrap: {
    height: 64,
    marginBottom: 8,
  },

  readOnlyRoleBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 14,
    marginBottom: 8,
  },

  readOnlyRoleText: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 14,
  },

  readOnlyRoleHint: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 12,
    marginTop: 4,
  },

  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 18,
  },

  modalCancelButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalCancelText: {
    color: '#0F172A',
    fontWeight: '900',
  },

  modalSaveButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalSaveText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  confirmCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
  },

  confirmIcon: {
    width: 60,
    height: 60,
    borderRadius: 999,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  confirmTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },

  confirmText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 20,
},

  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },

  confirmCancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  confirmCancelText: {
    color: '#0F172A',
    fontWeight: '800',
  },

  confirmDiscardButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },

  confirmDiscardText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  primaryButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  primaryButtonMobile: {
    width: '100%',
    minHeight: 52,
    marginTop: 16,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },

  clinicPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },

  clinicChip: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
  },

  clinicChipText: {
    color: '#334155',
    fontWeight: '800',
    fontSize: 13,
  },

  modalDangerButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 999,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalDangerText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  inlineError: {
    color: '#DC2626',
    fontSize: 13,
    lineHeight: 18,
    marginTop: -8,
    marginBottom: 18,
  },

  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    marginBottom: 18,
    backgroundColor: '#FFFFFF',
  },

  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 52,
    fontSize: 14,
    color: '#0F172A',
  },

  eyeButton: {
    paddingHorizontal: 14,
  },

  cardHeaderMobile: {
    alignItems: 'flex-start',
  },

  cardTitleWrapMobile: {
    flex: 1,
    minWidth: 0,
  },

  cardRightMobile: {
    flexShrink: 0,
  },

});