import React, { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions, } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUserProfile } from '../src/lib/auth';
import { supabase } from '../src/lib/supabase';
import ClinicNavbar from '../src/common/ClinicNavbar';
import AnimatedStatsCard from '../src/common/AnimatedStatsCard';
import FeaturesCard from '../src/common/FeaturesCard';
import { useClinicTheme } from '../src/lib/clinicTheme';
import FloatingChatButton from '../src/common/FloatingChatButton';
import { getUserClinicCount } from '../src/lib/adminData';

type AppointmentRow = {

  id: string;
  appointment_date: string;
  start_time: string;
  patient_first_name: string | null;
  patient_last_name: string | null;
  doctors: 
    | { first_name: string | null; last_name: string | null; }
    | { first_name: string | null; last_name: string | null; } []
    | null;
  clinic_services:
    | { title: string | null; }
    | { title: string | null; } []
    | null;
  
};

function hexToRgb(hex: string) {

  const clean = hex.replace('#', '');
  const normalized =
    clean.length === 3
      ? clean
          .split('')
          .map((char) => char + char)
          .join('')
      : clean;

  const bigint = parseInt(normalized, 16);

  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };

}

function rgbaFromHex(hex: string, alpha: number) {

  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;

}

function formatTime(time?: string | null) {

  if (!time) 
    return 'Not scheduled';

  return time.slice(0, 5);

}

export default function ClinicAdminDashboard() {

  const { clinicId, clinicName } = useLocalSearchParams<{
    clinicId?: string;
    clinicName?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [canChangeClinic, setCanChangeClinic] = useState(false);
  const { width } = useWindowDimensions();
  const isMobile = width < 720;
  const { theme } = useClinicTheme(clinicId);

  const [upcomingAppointments, setUpcomingAppointments] = useState(0);
  const [upcomingList, setUpcomingList] = useState<AppointmentRow[]>([]);
  const [patientsCount, setPatientsCount] = useState(0);
  const [doctorsCount, setDoctorsCount] = useState(0);
  const [servicesCount, setServicesCount] = useState(0);

  const [todayAppointments, setTodayAppointments] = useState(0);
  const [firstAppointmentTime, setFirstAppointmentTime] = useState<string | null>(null);
  const [lastAppointmentTime, setLastAppointmentTime] = useState<string | null>(null);

  const go = (pathname: string) => {
    router.push({
      pathname: pathname as any,
      params: { clinicId, clinicName },
    });
  };

  useEffect(() => {

    const check = async () => {
      if (!clinicId) {
        router.replace('/clinic-selection');
        return;
      }

      const { user, profile } = await getCurrentUserProfile();

      if (!user) {
        router.replace('/login');
        return;
      }

      if (profile?.role !== 'clinic_admin') {
        router.replace('/main-patient');
        return;
      }

      const today = new Date().toISOString().slice(0, 10);

      const clinicCount = await getUserClinicCount(user.id);
      setCanChangeClinic(clinicCount > 1);

      const { count: upcomingCount } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .in('status', ['scheduled', 'rescheduled'])
        .gte('appointment_date', today);

      const { data: upcomingData } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          start_time,
          patient_first_name,
          patient_last_name,
          doctors (
            first_name,
            last_name
          ),
          clinic_services (
            title
          )
        `)
        .eq('clinic_id', clinicId)
        .in('status', ['scheduled', 'rescheduled'])
        .gte('appointment_date', today)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(3);

      const { data: todayData, count: todayCount } = await supabase
        .from('appointments')
        .select('id, start_time', { count: 'exact' })
        .eq('clinic_id', clinicId)
        .in('status', ['scheduled', 'rescheduled'])
        .eq('appointment_date', today)
        .order('start_time', { ascending: true });

      const { count: doctors } = await supabase
        .from('doctors')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .eq('is_active', true);

      const { count: services } = await supabase
        .from('clinic_services')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .eq('is_active', true);

      const { data: patientRows } = await supabase
        .from('appointments')
        .select('patient_id')
        .eq('clinic_id', clinicId);

      const uniquePatients = Array.from(new Set((patientRows ?? []).map((item: any) => item.patient_id).filter(Boolean)));
      const firstToday = todayData?.[0]?.start_time ?? null;
      const lastToday = todayData?.[(todayData?.length ?? 0) - 1]?.start_time ?? null;

      setUpcomingAppointments(upcomingCount ?? 0);
      setUpcomingList((upcomingData ?? []) as AppointmentRow[]);
      setDoctorsCount(doctors ?? 0);
      setServicesCount(services ?? 0);
      setPatientsCount(uniquePatients.length);
      setTodayAppointments(todayCount ?? 0);
      setFirstAppointmentTime(firstToday);
      setLastAppointmentTime(lastToday);
      setLoading(false);
    };
    check();

  }, [clinicId]);

  const featureAccentA = rgbaFromHex(theme.primary, 0.11);
  const featureAccentB = rgbaFromHex(theme.primary, 0.18);
  const featureBorderA = rgbaFromHex(theme.primary, 0.22);
  const featureBorderB = rgbaFromHex(theme.primary, 0.34);

  const featureItems = [

    { title: 'Manage Appointments', icon: 'calendar-clear-outline' as const, description: 'Modify, cancel or sort appointments, view details and check-in patients.', onPress: () => go('/manage-appointments') },
    { title: 'Manage Users', icon: 'people-outline' as const, description: 'Manage clinic doctors, patients and clinic admins.', onPress: () => go('/manage-users') },
    { title: 'Manage Clinic Content', icon: 'albums-outline' as const, description: 'Edit doctors, services, technologies and health tips.', onPress: () => go('/manage-clinic-content') },
    { title: 'Clinic Settings', icon: 'settings-outline' as const, description: 'Customize branding, contact details and homepage content.', onPress: () => go('/clinic-settings') },

  ];

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
          roleLabel="Clinic Admin"
          canChangeClinic={canChangeClinic}
          onChangeClinic={() => router.replace({ pathname: '/clinic-selection' })}
        />

        <View
          style={[
            styles.hero,
            isMobile && styles.heroMobile,
            { backgroundColor: theme.soft, borderColor: theme.borderSoft },
          ]}
        >
          <Text style={[styles.heroEyebrow, isMobile && styles.heroTextCenter, { color: theme.primary }]}>Clinic Admin Dashboard</Text>

          <Text style={[styles.heroTitle, isMobile && styles.heroTextCenter, { color: theme.secondary }]}>Manage Your Clinic</Text>

          <Text style={[styles.heroSubtitle, isMobile && styles.heroTextCenter]}>View real clinic activity, manage users, update appointments and keep public clinic content up to date.</Text>
        </View>

        <View style={styles.statsGrid}>
          {[
            { label: 'Upcoming Appointments', value: upcomingAppointments, icon: 'calendar-outline' as const },
            { label: 'Patients', value: patientsCount, icon: 'people-outline' as const },
            { label: 'Doctors', value: doctorsCount, icon: 'medkit-outline' as const },
            { label: 'Services', value: servicesCount, icon: 'list-outline' as const },
          ].map((item) => (
            <View key={item.label} style={isMobile ? styles.statMobileItem : styles.statWebItem}>
              <AnimatedStatsCard {...item} color={theme.primary} centered={isMobile}/>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>

          <View style={styles.featuresGrid}>
            {featureItems.map((item, index) => {
              const isAlt = index % 2 === 0;

              return (
                <FeaturesCard
                  key={item.title}
                  compact={isMobile}
                  mobileTwoColumns={isMobile}
                  hideDescription={isMobile}
                  title={item.title}
                  icon={item.icon}
                  description={item.description}
                  color={theme.primary}
                  backgroundColor={isAlt ? featureAccentA : featureAccentB}
                  borderColor={isAlt ? featureBorderA : featureBorderB}
                  onPress={item.onPress}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.bottomGrid}>
          <View style={styles.sectionHalf}>
            <Text style={styles.sectionTitle}>Upcoming Appointments</Text>

            {upcomingList.length === 0 ? (
              <View style={styles.emptyUpcomingBox}>
                <Ionicons name="calendar-clear-outline" size={24} color="#94A3B8"/>
                <Text style={styles.emptyUpcomingTitle}>No upcoming appointments</Text>
                <Text style={styles.emptyUpcomingText}>Upcoming visits will appear here after patients book appointments.</Text>
              </View>
            ) : (
              upcomingList.map((appointment) => {
                const doctor = Array.isArray(appointment.doctors)
                  ? appointment.doctors[0]
                  : appointment.doctors;

                const service = Array.isArray(appointment.clinic_services)
                  ? appointment.clinic_services[0]
                  : appointment.clinic_services;

                const patientName =
                  `${appointment.patient_first_name || ''} ${appointment.patient_last_name || ''}`.trim() ||
                  'Patient';

                return (
                  <View key={appointment.id} style={styles.upcomingCard}>
                    <View style={[styles.upcomingDateBadge, { backgroundColor: `${theme.primary}12` }]}>
                      <Ionicons name="calendar-outline" size={17} color={theme.primary} />
                    </View>

                    <View style={styles.upcomingContent}>
                      <Text style={styles.upcomingService}>
                        {service?.title || 'Medical appointment'}
                      </Text>

                      <Text style={styles.upcomingDoctor}>
                        {patientName} · Dr. {doctor?.first_name || ''} {doctor?.last_name || ''}
                      </Text>

                      <Text style={styles.upcomingMeta}>
                        {appointment.appointment_date} · {formatTime(appointment.start_time)}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          <View style={styles.sectionHalf}>
            <Text style={styles.sectionTitle}>Today at a Glance</Text>

            <View style={styles.glanceList}>
              <GlanceRow
                icon="today-outline"
                label="Today’s appointments"
                value={String(todayAppointments)}
                color={theme.primary}
              />

              <GlanceRow
                icon="time-outline"
                label="First appointment"
                value={formatTime(firstAppointmentTime)}
                color={theme.primary}
              />

              <GlanceRow
                icon="time-outline"
                label="Last appointment"
                value={formatTime(lastAppointmentTime)}
                color={theme.primary}
              />
            </View>

            <Text style={styles.overviewText}>Live overview based on todays schedule.</Text>
          </View>
        </View>
      </ScrollView>

      <FloatingChatButton clinicId={clinicId} clinicName={clinicName}/>

    </>

  );

}

function GlanceRow({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
}) {

  return (

    <View style={styles.glanceRow}>

      <View style={[styles.glanceIcon, { backgroundColor: `${color}12` }]}>
        <Ionicons name={icon} size={18} color={color}/>
      </View>

      <View style={styles.glanceTextWrap}>
        <Text style={styles.glanceLabel}>{label}</Text>
        <Text style={styles.glanceValue}>{value}</Text>
      </View>

    </View>

  );

}

const styles = StyleSheet.create({

  centered: { 
    flex: 1, 
    backgroundColor: '#F8FAFC', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  
  container: { 
    flexGrow: 1, 
    backgroundColor: '#F8FAFC', 
    padding: 24, 
    gap: 20 
  },
  
  hero: { 
    borderWidth: 1, 
    borderRadius: 28, 
    padding: 24 
  },
  
  heroEyebrow: { 
    fontSize: 13, 
    fontWeight: '800',  
    marginBottom: 8 
  },
  
  heroTitle: { 
    fontSize: 30, 
    fontWeight: '900',  
    marginBottom: 8 
  },
  
  heroSubtitle: { 
    fontSize: 15, 
    lineHeight: 24, 
    color: '#475569' 
  },
  
  heroMobile: {
    alignItems: 'center',
  },

  heroTextCenter: {
    textAlign: 'center',
  },
  
  statsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 16 
  },
  
  section: { 
    backgroundColor: '#FFF', 
    borderRadius: 28, 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    padding: 24 
  },
  
  sectionTitle: { 
    fontSize: 22, 
    fontWeight: '900', 
    color: '#0F172A', 
    marginBottom: 18 
  },
  
  featuresGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 16 
  },

  bottomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },

  sectionHalf: {
    flex: 1,
    minWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
  },

  upcomingCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
  },

  upcomingDateBadge: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  upcomingContent: {
    flex: 1,
  },

  upcomingService: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },

  upcomingDoctor: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 3,
  },

  upcomingMeta: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
  },

  emptyUpcomingBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    padding: 18,
    alignItems: 'center',
  },

  emptyUpcomingTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },

  emptyUpcomingText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    color: '#64748B',
    textAlign: 'center',
  },

  glanceList: {
    gap: 12,
  },

  glanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    padding: 14,
  },

  glanceIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  glanceTextWrap: {
    flex: 1,
  },

  glanceLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '800',
  },

  glanceValue: {
    marginTop: 3,
    fontSize: 18,
    color: '#0F172A',
    fontWeight: '900',
  },

  overviewText: {
    marginTop: 16,
    color: '#64748B',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '700',
  },

  statWebItem: {
    flex: 1,
  },

  statMobileItem: {
    width: '47%',
  },

});