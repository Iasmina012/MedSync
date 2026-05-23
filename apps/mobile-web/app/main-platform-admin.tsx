import React, { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ClinicNavbar from '../src/common/ClinicNavbar';
import AnimatedStatsCard from '../src/common/AnimatedStatsCard';
import FeaturesCard from '../src/common/FeaturesCard';
import { useClinicTheme } from '../src/lib/clinicTheme';
import { supabase } from '../src/lib/supabase';
import FloatingChatButton from '../src/common/FloatingChatButton';
import { requireRole, countRows } from '../src/lib/adminData';

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
  const { theme } = useClinicTheme(undefined);

  const [recentClinics, setRecentClinics] = useState<any[]>([]);
  const [platformActivity, setPlatformActivity] = useState({
    activeClinics: 0,
    inactiveClinics: 0,
    appointmentsToday: 0,
    triageSessions: 0,
  });

  const go = (pathname: string) => {
    router.push(pathname as any);
  };

useEffect(() => {
  const load = async () => {
    const roleCheck = await requireRole(['platform_admin']);
    if (!roleCheck.user) return router.replace('/login');
    if (roleCheck.error === 'role') return router.replace('/main-patient');

    const today = new Date().toISOString().slice(0, 10);

    const [
      clinics,
      doctors,
      patients,
      clinicAdmins,
      activeClinics,
      inactiveClinics,
      appointmentsToday,
      triageSessions,
      recentClinicsResult,
    ] = await Promise.all([
      countRows('clinics'),
      countRows('doctors', (q) => q.eq('is_active', true)),
      countRows('profiles', (q) => q.eq('role', 'patient')),
      countRows('profiles', (q) => q.eq('role', 'clinic_admin')),
      countRows('clinics', (q) => q.eq('is_active', true)),
      countRows('clinics', (q) => q.eq('is_active', false)),
      countRows('appointments', (q) => q.eq('appointment_date', today)),
      countRows('ai_triage_sessions'),
      supabase
        .from('clinics')
        .select('id, name, slug, description, is_active, created_at')
        .order('created_at', { ascending: false })
        .limit(4),
    ]);

    setStats({ clinics, doctors, patients, clinicAdmins });
    setPlatformActivity({
      activeClinics,
      inactiveClinics,
      appointmentsToday,
      triageSessions,
    });
    setRecentClinics(recentClinicsResult.data ?? []);
  };

  load();
}, []);

  const [stats, setStats] = useState({
    clinics: 0,
    doctors: 0,
    patients: 0,
    clinicAdmins: 0,
  });

  useEffect(() => {
    const load = async () => {
      const roleCheck = await requireRole(['platform_admin']);
      if (!roleCheck.user) return router.replace('/login');
      if (roleCheck.error === 'role') return router.replace('/main-patient');

      const [clinics, doctors, patients, clinicAdmins] = await Promise.all([
        countRows('clinics'),
        countRows('doctors', (q) => q.eq('is_active', true)),
        countRows('profiles', (q) => q.eq('role', 'patient')),
        countRows('profiles', (q) => q.eq('role', 'clinic_admin')),
      ]);

      setStats({ clinics, doctors, patients, clinicAdmins });
    };

    load();
  }, []);

  

  const featureAccentA = rgbaFromHex(theme.primary, 0.11);
  const featureAccentB = rgbaFromHex(theme.primary, 0.18);
  const featureBorderA = rgbaFromHex(theme.primary, 0.22);
  const featureBorderB = rgbaFromHex(theme.primary, 0.34);

  const featureItems = [

  { title: 'Manage Users', icon: 'people-outline' as const, description: 'Manage platform users and roles.', onPress: () => go('/manage-users') },
  { title: 'Manage Clinics', icon: 'business-outline' as const, description: 'Configure clinics platform-wide.', onPress: () => go('/manage-clinics') },
  { title: 'Manage Appointments', icon: 'calendar-outline' as const, description: 'View all appointments.', onPress: () => go('/manage-appointments'), },
  { title: 'View Analytics', icon: 'bar-chart-outline' as const, description: 'Global usage and reporting.', onPress: () => go('/analytics') },

  ];

  return (

    <>

    <ScrollView contentContainerStyle={styles.container} stickyHeaderIndices={[0]}>

      <ClinicNavbar
        primaryColor={theme.primary}
        roleLabel="Platform Admin"
        clinicName="MedSync Platform"
        canChangeClinic={false}
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
        <AnimatedStatsCard label="Clinics" value={stats.clinics} icon="business-outline" color={theme.primary}/>
        <AnimatedStatsCard label="Doctors" value={stats.doctors} icon="medkit-outline" color={theme.primary}/>
        <AnimatedStatsCard label="Patients" value={stats.patients} icon="people-outline" color={theme.primary}/>
        <AnimatedStatsCard label="Clinic Admins" value={stats.clinicAdmins} icon="shield-checkmark-outline" color={theme.primary}/>
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
        <Text style={styles.sectionTitle}>Platform Overview</Text>

        <View style={styles.miniStatsGrid}>
          <View style={styles.miniStatCard}>
            <Text style={styles.miniStatValue}>{platformActivity.activeClinics}</Text>
            <Text style={styles.miniStatLabel}>Active clinics</Text>
          </View>

          <View style={styles.miniStatCard}>
            <Text style={styles.miniStatValue}>{platformActivity.inactiveClinics}</Text>
            <Text style={styles.miniStatLabel}>Inactive clinics</Text>
          </View>

          <View style={styles.miniStatCard}>
            <Text style={styles.miniStatValue}>{platformActivity.appointmentsToday}</Text>
            <Text style={styles.miniStatLabel}>Appointments today</Text>
          </View>

          <View style={styles.miniStatCard}>
            <Text style={styles.miniStatValue}>{platformActivity.triageSessions}</Text>
            <Text style={styles.miniStatLabel}>AI triage sessions</Text>
          </View>
        </View>

        <Text style={styles.subSectionTitle}>Recently Added Clinics</Text>

        {recentClinics.length === 0 ? (
          <Text style={styles.emptyUpcomingText}>No clinics added yet.</Text>
        ) : (
          recentClinics.map((clinic) => (
            <View key={clinic.id} style={styles.upcomingCard}>
              <View style={[styles.upcomingDateBadge, { backgroundColor: `${theme.primary}12` }]}>
                <Ionicons name="business-outline" size={17} color={theme.primary} />
              </View>

              <View style={styles.upcomingContent}>
                <Text style={styles.upcomingService}>{clinic.name}</Text>
                <Text style={styles.upcomingDoctor}>{clinic.slug || 'No slug'}</Text>
              </View>

              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: clinic.is_active ? '#DCFCE7' : '#FEE2E2' },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: clinic.is_active ? '#166534' : '#991B1B' },
                  ]}
                >
                  {clinic.is_active ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

    </ScrollView>
    
    <FloatingChatButton clinicId={clinicId} clinicName={clinicName}/>

    </>

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

  miniStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },

  miniStatCard: {
    flexGrow: 1,
    flexBasis: 190,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    padding: 16,
  },

  miniStatValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },

  miniStatLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
  },

  subSectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 12,
  },

  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'center',
  },

  statusText: {
    fontSize: 12,
    fontWeight: '900',
  },

});