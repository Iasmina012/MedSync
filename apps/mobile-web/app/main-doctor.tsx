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
import { countRows, getUserClinicCount } from '../src/lib/adminData';

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

export default function DoctorDashboard() {

  const { clinicId, clinicName } = useLocalSearchParams<{
    clinicId?: string;
    clinicName?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const { width } = useWindowDimensions();
  const isMobile = width < 720;
  const { theme } = useClinicTheme(clinicId);

  const [appointmentsToday, setAppointmentsToday] = useState(0);
  const [upcomingList, setUpcomingList] = useState<any[]>([]);
  const [canChangeClinic, setCanChangeClinic] = useState(false);

  const go = (pathname: string) => {
    router.push({
      pathname: pathname as any,
      params: { clinicId, clinicName },
    });
  };

  useEffect(() => {

    const check = async () => {
      const { user, profile } = await getCurrentUserProfile();
      if (!user) 
        return router.replace('/login');
      if (profile?.role !== 'doctor') 
        return router.replace('/main-patient');

      const clinicCount = await getUserClinicCount(user.id);
      setCanChangeClinic(clinicCount > 1);

      const { data: doctorData } = await supabase
        .from('doctors')
        .select('id')
        .eq('clinic_id', clinicId)
        .or(`profile_id.eq.${user.id},email.eq.${profile.email}`)
        .maybeSingle();

      if (doctorData?.id) {

        const today = new Date().toISOString().slice(0, 10);
        const [appointmentsToday, patients, unreadChats, triageAttached] = await Promise.all([
          countRows('appointments', (q) => q.eq('clinic_id', clinicId).eq('doctor_id', doctorData.id).in('status', ['scheduled', 'rescheduled']).eq('appointment_date', today)),
          supabase.from('appointments').select('patient_id').eq('clinic_id', clinicId).eq('doctor_id', doctorData.id),
          countRows('chat_conversations', (q) => q.eq('clinic_id', clinicId).eq('doctor_id', doctorData.id).gt('doctor_unread_count', 0)),
          countRows('appointments', (q) => q.eq('clinic_id', clinicId).eq('doctor_id', doctorData.id).not('triage_session_id', 'is', null)),
        ]);
        const uniquePatients = new Set((patients.data ?? []).map((item: any) => item.patient_id));
        setStats({ appointmentsToday, myPatients: uniquePatients.size, unreadChats, triageAttached, });

        const { count } = await supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('clinic_id', clinicId)
          .eq('doctor_id', doctorData.id)
          .in('status', ['scheduled', 'rescheduled'])
          .gte('appointment_date', today);

        const { data } = await supabase
          .from('appointments')
          .select(`id, appointment_date, start_time, patient_first_name, patient_last_name, clinic_services (title)`)
          .eq('clinic_id', clinicId)
          .eq('doctor_id', doctorData.id)
          .in('status', ['scheduled', 'rescheduled'])
          .gte('appointment_date', today)
          .order('appointment_date', { ascending: true })
          .order('start_time', { ascending: true })
          .limit(3);

        setAppointmentsToday(count ?? 0);
        setUpcomingList(data ?? []);

      }
      
      const cleanFirstName = (profile.first_name ?? '').replace(/^Dr\.?\s*/i, '').trim();
      const cleanLastName = (profile.last_name ?? '').replace(/^Dr\.?\s*/i, '').trim();

      setFullName(`${cleanFirstName} ${cleanLastName}`.trim());
      setLoading(false);
    };
    check();

  }, [clinicId]);

  const [stats, setStats] = useState({ appointmentsToday: 0, myPatients: 0, unreadChats: 0, triageAttached: 0, });
  const featureAccentA = rgbaFromHex(theme.primary, 0.11);
  const featureAccentB = rgbaFromHex(theme.primary, 0.18);
  const featureBorderA = rgbaFromHex(theme.primary, 0.22);
  const featureBorderB = rgbaFromHex(theme.primary, 0.34);

  const featureItems = [

    { title: 'Manage Appointments', icon: 'calendar-outline' as const, description: 'Modify, cancel or sort appointments and view appointment details.', onPress: () => go('/manage-appointments') },
    { title: 'My Patients', icon: 'people-outline' as const, description: 'View patients connected to your appointments.', onPress: () => go('/my-patients') },
    { title: 'Messages', icon: 'chatbubble-ellipses-outline' as const, description: 'Chat with your patients about medical related problems.', onPress: () => go('/messages'), },
    { title: 'Patient History', icon: 'document-text-outline' as const, description: 'Review appointment history and triage notes.', onPress: () => go('/my-patients-history'), },

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
          roleLabel="Doctor"
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
          <Text style={[styles.heroEyebrow, isMobile && styles.heroTextCenter, { color: theme.primary }]}>
            Doctor Dashboard
          </Text>
          <Text style={[styles.heroTitle, isMobile && styles.heroTextCenter, { color: theme.secondary }]}>
            Welcome back{fullName ? `, Dr. ${fullName}` : ''}
          </Text>
          <Text style={[styles.heroSubtitle, isMobile && styles.heroTextCenter]}>
            Placeholder Subtitle
          </Text>
        </View>

        <View style={styles.statsGrid}>
          {[
            { label: 'Appointments Today', value: stats.appointmentsToday, icon: 'calendar-outline' as const },
            { label: 'My Patients', value: stats.myPatients, icon: 'people-outline' as const },
            { label: 'AI Triage Cases', value: stats.triageAttached, icon: 'sparkles-outline' as const },
            { label: 'Unread Chats', value: stats.unreadChats, icon: 'chatbubble-ellipses-outline' as const },
          ].map((item) => (
            <View key={item.label} style={isMobile ? styles.statMobileItem : styles.statWebItem}>
              <AnimatedStatsCard
                label={item.label}
                value={item.value}
                icon={item.icon}
                color={theme.primary}
                centered={isMobile}
              />
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Appointments</Text>

          {upcomingList.length === 0 ? (
            <View style={styles.emptyUpcomingBox}>
              <Ionicons name="calendar-clear-outline" size={24} color="#94A3B8"/>
              <Text style={styles.emptyUpcomingTitle}>No upcoming appointments</Text>
              <Text style={styles.emptyUpcomingText}>Your upcoming patient visits will appear here once appointments are scheduled.</Text>
            </View>
          ) : (
            upcomingList.map((appointment) => {
              const service = Array.isArray(appointment.clinic_services)
                ? appointment.clinic_services[0]
                : appointment.clinic_services;

              const patientName =
                `${appointment.patient_first_name || ''} ${appointment.patient_last_name || ''}`.trim() ||
                'Patient';

              return (
                <View key={appointment.id} style={styles.upcomingCard}>
                  <View style={[styles.upcomingDateBadge, { backgroundColor: `${theme.primary}12` }]}>
                    <Ionicons name="calendar-outline" size={17} color={theme.primary}/>
                  </View>

                  <View style={styles.upcomingContent}>
                    <Text style={styles.upcomingService}>
                      {service?.title || 'Medical appointment'}
                    </Text>

                    <Text style={styles.upcomingDoctor}>
                      Patient: {patientName}
                    </Text>

                    <Text style={styles.upcomingMeta}>
                      {appointment.appointment_date} · {appointment.start_time}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

      </ScrollView>

      <FloatingChatButton clinicId={clinicId} clinicName={clinicName}/>

    </>

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
    gap: 16,
  },

  statWebItem: {
    flex: 1,
  },

  statMobileItem: {
    width: '47%',
  },

  contentCentered: {
    alignItems: 'center',
  },

  textCentered: {
    textAlign: 'center',
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

});