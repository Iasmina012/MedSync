import React, { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Animated, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ClinicNavbar from '../src/common/ClinicNavbar';
import { getCurrentUserProfile } from '../src/lib/auth';
import { supabase } from '../src/lib/supabase';
import { useClinicTheme } from '../src/lib/clinicTheme';

type Patient = {

  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  emergency_contact: string | null;
  avatar_url: string | null;
  gender: string | null;
  blood_type: string | null;
  allergies: string | null;
  chronic_conditions: string | null;
  insurance_provider: string | null;
  address: string | null;
  created_at: string | null;
  updated_at: string | null;
  lastAppointmentDate: string | null;
  totalAppointments: number;

};

function formatValue(value: string | number | null | undefined) {
  return value !== null && value !== undefined && String(value).trim() ? String(value) : 'Not set';
}

function getPatientName(patient?: Patient | null) {
  return `${patient?.first_name || ''} ${patient?.last_name || ''}`.trim() || 'Patient';
}

function HoverCard({ children, onPress, }: { children: React.ReactNode; onPress: () => void; }) {

  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const animateIn = () => {
    if (Platform.OS !== 'web') 
      return;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1.015, useNativeDriver: false, friction: 8 }),
      Animated.spring(translateY, { toValue: -5, useNativeDriver: false, friction: 8 }),
    ]).start();
  };

  const animateOut = () => {
    if (Platform.OS !== 'web') 
      return;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: false, friction: 8 }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: false, friction: 8 }),
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
      <Animated.View style={[styles.card, { transform: [{ scale }, { translateY }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );

}

export default function DoctorPatientsScreen() {

  const { clinicId, clinicName } = useLocalSearchParams<{
    clinicId?: string;
    clinicName?: string;
  }>();

  const { theme } = useClinicTheme(clinicId);
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selected, setSelected] = useState<Patient | null>(null);

  useEffect(() => {

    const loadPatients = async () => {
      if (!clinicId) 
        return router.replace('/clinic-selection');

      const { user, profile } = await getCurrentUserProfile();

      if (!user) 
        return router.replace('/login');
      if (profile?.role !== 'doctor') 
        return router.replace('/main-patient');

      const doctorFilter = profile.email ? `profile_id.eq.${user.id},email.eq.${profile.email}` : `profile_id.eq.${user.id}`;

      const { data: doctorData } = await supabase
        .from('doctors')
        .select('id')
        .eq('clinic_id', clinicId)
        .or(doctorFilter)
        .maybeSingle();

      if (!doctorData?.id) {
        setPatients([]);
        setLoading(false);
        return;
      }

      const { data: appointments } = await supabase
        .from('appointments')
        .select('id, patient_id, patient_first_name, patient_last_name, appointment_date')
        .eq('clinic_id', clinicId)
        .eq('doctor_id', doctorData.id)
        .order('appointment_date', { ascending: false });

      const appointmentRows = appointments ?? [];
      const patientIds = Array.from(new Set(appointmentRows.map((item: any) => item.patient_id).filter(Boolean)));
      let profiles: any[] = [];

      if (patientIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select(`id, first_name, last_name, username, email, phone, birth_date, emergency_contact, avatar_url, gender, blood_type, allergies, chronic_conditions, insurance_provider, address, created_at, updated_at`)
          .in('id', patientIds);

        profiles = data ?? [];
      }

      const grouped = new Map<string, Patient>();

      appointmentRows.forEach((appointment: any) => {
        const patientId = appointment.patient_id || appointment.id;
        const profileData = profiles.find((item) => item.id === appointment.patient_id);
        const existing = grouped.get(patientId);

        if (existing) {
          grouped.set(patientId, { ...existing, totalAppointments: existing.totalAppointments + 1, });
          return;
        }

        grouped.set(patientId, {
          id: patientId,
          first_name: profileData?.first_name || appointment.patient_first_name || null,
          last_name: profileData?.last_name || appointment.patient_last_name || null,
          username: profileData?.username || null,
          email: profileData?.email || null,
          phone: profileData?.phone || null,
          birth_date: profileData?.birth_date || null,
          emergency_contact: profileData?.emergency_contact || null,
          avatar_url: profileData?.avatar_url || null,
          gender: profileData?.gender || null,
          blood_type: profileData?.blood_type || null,
          allergies: profileData?.allergies || null,
          chronic_conditions: profileData?.chronic_conditions || null,
          insurance_provider: profileData?.insurance_provider || null,
          address: profileData?.address || null,
          created_at: profileData?.created_at || null,
          updated_at: profileData?.updated_at || null,
          lastAppointmentDate: appointment.appointment_date || null,
          totalAppointments: 1,
        });
      });

      setPatients(Array.from(grouped.values()));
      setLoading(false);
    };

    loadPatients();

  }, [clinicId]);

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
          clinicName={clinicName}
          clinicId={clinicId}
          primaryColor={theme.primary}
          roleLabel="Doctor"
          showRolePill={false}
          showBackButton
          canChangeClinic={false}
          onBackPress={() =>
            router.replace({
              pathname: '/main-doctor',
              params: { clinicId, clinicName },
            })
          }
        />

        <View style={[styles.hero, { backgroundColor: theme.soft, borderColor: theme.borderSoft }]}>
          <Text style={[styles.eyebrow, { color: theme.primary }]}>Doctor</Text>
          <Text style={[styles.title, { color: theme.secondary }]}>My Patients</Text>
          <Text style={styles.subtitle}>Patients connected to your appointments in this clinic.</Text>
        </View>

        {patients.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={34} color={theme.primary}/>
            <Text style={styles.emptyTitle}>No patients yet</Text>
            <Text style={styles.emptyText}>Patients will appear here after they have appointments with you.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {patients.map((patient) => (
              <HoverCard key={patient.id} onPress={() => setSelected(patient)}>
                <View style={styles.cardTop}>
                  <View style={[styles.avatar, { backgroundColor: `${theme.primary}12` }]}>
                    {patient.avatar_url ? (
                      <Image source={{ uri: patient.avatar_url }} style={styles.avatarImage}/>
                    ) : (
                      <Ionicons name="person-outline" size={24} color={theme.primary}/>
                    )}
                  </View>

                  <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>{getPatientName(patient)}</Text>
                    <View style={styles.subtitleRow}>
                      <Ionicons  name="calendar-outline" size={16} color={theme.primary}/>
                      <Text style={styles.cardSubtitle}>
                        {patient.totalAppointments} appointment
                        {patient.totalAppointments !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward-outline" size={20} color="#94A3B8"/>
                </View>
              </HoverCard>
            ))}
          </View>
        )}

      </ScrollView>

      <Modal visible={!!selected} transparent animationType="fade">

        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={[styles.avatarLarge, { backgroundColor: `${theme.primary}12` }]}>
                {selected?.avatar_url ? (
                  <Image source={{ uri: selected.avatar_url }} style={styles.avatarImage}/>
                ) : (
                  <Ionicons name="person-outline" size={40} color={theme.primary}/>
                )}
              </View>
              <Text style={styles.modalTitle}>{getPatientName(selected)}</Text>
              <Text style={styles.modalSubtitle}>Patient profile details</Text>
            </View>

            {selected && (
              <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
                <Text style={styles.sectionLabel}>Contact</Text>
                <DetailRow icon="mail-outline" label="Email" value={formatValue(selected.email)}/>
                <DetailRow icon="call-outline" label="Phone" value={formatValue(selected.phone)}/>
                <DetailRow icon="location-outline" label="Address" value={formatValue(selected.address)}/>
                <DetailRow icon="person-circle-outline" label="Username" value={formatValue(selected.username)}/>

                <Text style={styles.sectionLabel}>Personal Details</Text>
                <DetailRow icon="calendar-number-outline" label="Birth date" value={formatValue(selected.birth_date)}/>
                <DetailRow icon="male-female-outline" label="Gender" value={formatValue(selected.gender)}/>
                <DetailRow icon="shield-checkmark-outline" label="Insurance provider" value={formatValue(selected.insurance_provider)}/>
                <DetailRow icon="alert-circle-outline" label="Emergency contact" value={formatValue(selected.emergency_contact)}/>

                <Text style={styles.sectionLabel}>Medical Details</Text>
                <DetailRow icon="water-outline" label="Blood type" value={formatValue(selected.blood_type)}/>
                <DetailRow icon="warning-outline" label="Allergies" value={formatValue(selected.allergies)}/>
                <DetailRow icon="medkit-outline" label="Chronic conditions" value={formatValue(selected.chronic_conditions)}/>

                <Text style={styles.sectionLabel}>Appointment Summary</Text>
                <DetailRow icon="calendar-outline" label="Total appointments" value={String(selected.totalAppointments)}/>
                <DetailRow icon="time-outline" label="Last appointment" value={formatValue(selected.lastAppointmentDate)}/>
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <Pressable style={styles.closeButton} onPress={() => setSelected(null)}>
                <Text style={styles.closeButtonText}>Close</Text>
              </Pressable>

              {selected && (
                <Pressable
                  style={[styles.historyButton, { backgroundColor: theme.primary }]}
                  onPress={() => {
                    setSelected(null);
                    router.push({
                      pathname: '/my-patients-history' as any,
                      params: { clinicId, clinicName, patientId: selected.id },
                    });
                  }}
                >
                <Text numberOfLines={2} style={styles.historyButtonText}>View Patient History</Text>  
                </Pressable>
              )}
            </View>
          </View>
        </View>

      </Modal>

    </>

  );

}

function DetailRow({ icon, label, value, }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; }) {

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
  },

  hero: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 24,
  },

  eyebrow: {
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 8,
  },

  title: {
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 8,
  },

  subtitle: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 24,
  },

  grid: {
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
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  cardTop: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },

  avatar: {
    width: 54,
    height: 54,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  avatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 14,
  },

  avatarImage: {
    width: '100%',
    height: '100%',
  },

  cardText: {
    flex: 1,
    minWidth: 0,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },

  cardSubtitle: {
    color: '#64748B',
    fontWeight: '700',
    marginTop: 4,
  },

  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
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
    lineHeight: 20,
  },

  emptyValue: {
    color: '#94A3B8',
  },

  sectionLabel: {
    marginTop: 8,
    marginBottom: 2,
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 26,
    alignItems: 'center',
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },

  emptyText: {
    marginTop: 8,
    color: '#64748B',
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 22,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  modalCard: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
  },

  modalHeader: {
    alignItems: 'center',
    marginBottom: 14,
  },

  modalTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },

  modalSubtitle: {
    marginTop: 6,
    color: '#64748B',
    fontWeight: '700',
    textAlign: 'center',
  },

  modalScroll: {
    maxHeight: 390,
  },

  modalScrollContent: {
    gap: 12,
    paddingBottom: 8,
  },

  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 18,
  },

  historyButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  historyButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 19,
  },

  closeButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeButtonText: {
    color: '#0F172A',
    fontWeight: '900',
  },

});