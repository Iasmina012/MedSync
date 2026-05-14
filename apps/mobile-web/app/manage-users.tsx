import React, { useEffect, useRef, useState, useCallback } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Animated, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ClinicNavbar from '../src/common/ClinicNavbar';
import SortDropdown from '../src/common/SortDropdown';
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

};

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
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Profile[]>([]);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

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
      .select('id, first_name, last_name, email, role, active_clinic_id, phone, username, address, avatar_url')
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

  const saveUser = async () => {
    if (!editing || currentRole === 'doctor') 
      return;

    setSaving(true);

    const payload: Partial<Profile> & { updated_at: string } = {
      first_name: editing.first_name?.trim() || null,
      last_name: editing.last_name?.trim() || null,
      username: editing.username?.trim() || null,
      phone: editing.phone?.trim() || null,
      address: editing.address?.trim() || null,
      avatar_url: editing.avatar_url?.trim() || null,
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

    setEditing(null);
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
        </View>

        <View style={styles.list}>
          {users.map((userItem) => {
            const name =
              `${userItem.first_name || ''} ${userItem.last_name || ''}`.trim() ||
              'Unnamed user';

            return (
              <HoverCard key={userItem.id} onPress={() => setEditing(cloneProfile(userItem))}>
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

                    <Ionicons name="chevron-forward-outline" size={20} color="#94A3B8"/>
                  </View>
                </View>

                <View style={styles.metaBlock}>
                  <DetailRow icon="person-outline" label="Username" value={userItem.username || 'Not set'}/>
                  <DetailRow icon="call-outline" label="Phone" value={userItem.phone || 'Not set'}/>
                  <DetailRow icon="location-outline" label="Address" value={userItem.address || 'Not set'}/>
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
                      style={styles.avatarButton}
                      onPress={() => Alert.alert('Upload')}
                    >
                      <Ionicons name="cloud-upload-outline" size={16} color="#0F172A"/>
                      <Text style={styles.avatarButtonText}>Upload</Text>
                    </Pressable>

                    <Pressable
                      style={styles.avatarButton}
                      onPress={() => Alert.alert('Change')}
                    >
                      <Ionicons name="image-outline" size={16} color="#0F172A"/>
                      <Text style={styles.avatarButtonText}>Change</Text>
                    </Pressable>

                    <Pressable
                      style={styles.avatarDangerButton}
                      onPress={() => setEditing({ ...editing, avatar_url: '' })}
                    >
                      <Ionicons name="trash-outline" size={16} color="#BE123C"/>
                      <Text style={styles.avatarDangerText}>Remove</Text>
                    </Pressable>
                  </View>
                )}

                <Text style={styles.inputLabel}>Platform Role</Text>

                {currentRole === 'platform_admin' ? (
                  <View style={styles.dropdownWrap}>
                    <SortDropdown
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
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setEditing(null)}
                disabled={saving}
              >
                <Text style={styles.modalCancelText}>Close</Text>
              </Pressable>

              {currentRole !== 'doctor' && (
                <Pressable style={[styles.modalSaveButton, { backgroundColor: theme.primary }]} onPress={saveUser} disabled={saving}>
                  <Text style={styles.modalSaveText}>{saving ? 'Saving...' : 'Save User'}</Text>
                </Pressable>
              )}
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
  },

  email: {
    color: '#64748B',
    fontWeight: '700',
    marginTop: 4,
  },

  cardHint: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 12,
    marginTop: 4,
  },

  roleBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
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

});