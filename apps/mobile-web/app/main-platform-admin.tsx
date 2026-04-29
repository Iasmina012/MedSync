import React, { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ClinicNavbar from '../src/common/ClinicNavbar';
import AnimatedStatsCard from '../src/common/AnimatedStatsCard';
import FeaturesCard from '../src/common/FeaturesCard';
import { useClinicTheme } from '../src/lib/clinicTheme';
import { supabase } from '../src/lib/supabase';

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

export default function PlatformAdminDashboard() {

  const { clinicId, clinicName } = useLocalSearchParams<{
    clinicId?: string;
    clinicName?: string;
  }>();

  const { width } = useWindowDimensions();
  const isMobile = width < 720;
  const { theme } = useClinicTheme(clinicId);

  const [upcomingAppointments, setUpcomingAppointments] = useState(0);
  const [upcomingList, setUpcomingList] = useState<any[]>([]);

  const go = (pathname: string) => {
    router.push({
      pathname: pathname as any,
      params: { clinicId, clinicName },
    });
  };

  useEffect(() => {

    const loadStats = async () => {
      const today = new Date().toISOString().slice(0, 10);

      const { count } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .in('status', ['scheduled', 'rescheduled'])
        .gte('appointment_date', today);

      const { data } = await supabase
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
        .in('status', ['scheduled', 'rescheduled'])
        .gte('appointment_date', today)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(3);

      setUpcomingAppointments(count ?? 0);
      setUpcomingList(data ?? []);
    };

    loadStats();

  }, []);

  const featureAccentA = rgbaFromHex(theme.primary, 0.11);
  const featureAccentB = rgbaFromHex(theme.primary, 0.18);
  const featureBorderA = rgbaFromHex(theme.primary, 0.22);
  const featureBorderB = rgbaFromHex(theme.primary, 0.34);

  const featureItems = [

    { title: 'Manage Appointments', icon: 'calendar-clear-outline' as const, description: 'Platform appointment overview.', onPress: () => go('/manage-appointments'), },
    { title: 'Manage Clinics', icon: 'business-outline' as const, description: 'Configure clinics platform-wide.' },
    { title: 'Manage Users', icon: 'people-outline' as const, description: 'See users across all clinics.' },
    { title: 'Analytics', icon: 'bar-chart-outline' as const, description: 'Global usage and reporting.' },

  ];

  return (

    <ScrollView contentContainerStyle={styles.container} stickyHeaderIndices={[0]}>

      <ClinicNavbar
        clinicName={clinicName}
        clinicId={clinicId}
        primaryColor={theme.primary}
        roleLabel="Platform Admin"
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
          MedSync Admin Dashboard
        </Text>
        <Text style={[styles.heroTitle, isMobile && styles.heroTextCenter, { color: theme.secondary }]}>
          Placeholder Title
        </Text>
        <Text style={[styles.heroSubtitle, isMobile && styles.heroTextCenter]}>
          Placeholder Subtitle
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <AnimatedStatsCard label="Clinics" value={12} icon="business-outline" color={theme.primary}/>
        <AnimatedStatsCard label="Doctors" value={74} icon="medkit-outline" color={theme.primary}/>
        <AnimatedStatsCard label="Patients" value={1430} icon="people-outline" color={theme.primary}/>
        <AnimatedStatsCard label="Upcoming Appointments" value={upcomingAppointments} icon="calendar-outline" color={theme.primary}/>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Global Actions</Text>
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
          <Text style={styles.emptyUpcomingText}>No upcoming appointments.</Text>
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
                    {appointment.appointment_date} · {appointment.start_time}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>

    </ScrollView>

  );

}

const styles = StyleSheet.create({

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

  emptyUpcomingText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#64748B',
    fontWeight: '700',
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

});