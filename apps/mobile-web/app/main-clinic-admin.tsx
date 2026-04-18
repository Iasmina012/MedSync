import React, { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getCurrentUserProfile } from '../src/lib/auth';
import ClinicNavbar from '../src/common/ClinicNavbar';
import AnimatedStatsCard from '../src/common/AnimatedStatsCard';
import FeaturesCard from '../src/common/FeaturesCard';

export default function ClinicAdminDashboard() {

  const { clinicName } = useLocalSearchParams<{ clinicId?: string; clinicName?: string }>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const check = async () => {
      const { user, profile } = await getCurrentUserProfile();
      if (!user) return router.replace('/login');
      if (profile?.role !== 'clinic_admin') return router.replace('/main-patient');
      setLoading(false);
    };
    check();

  }, []);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" /></View>;
  }

  return (

    <ScrollView contentContainerStyle={styles.container}>

      <ClinicNavbar
        clinicName={clinicName}
        primaryColor="#1D4ED8"
        roleLabel="Clinic Admin"
        onChangeClinic={() => router.replace({ pathname: '/clinic-selection' })}
      />

      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>Clinic Admin Dashboard</Text>
        <Text style={styles.heroTitle}>Manage your clinic only</Text>
        <Text style={styles.heroSubtitle}>
          Doctors, patients, appointments, and clinic settings stay scoped to the selected clinic.
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <AnimatedStatsCard label="Doctors" value={12} icon="medkit-outline" />
        <AnimatedStatsCard label="Patients" value={248} icon="people-outline" />
        <AnimatedStatsCard label="Appointments" value={36} icon="calendar-outline" />
        <AnimatedStatsCard label="Pending Requests" value={5} icon="notifications-outline" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Feature Access</Text>
        <View style={styles.featuresGrid}>
          <FeaturesCard title="Manage Doctors" icon="medkit-outline" description="Assign and organize clinic doctors." />
          <FeaturesCard title="Manage Patients" icon="people-outline" description="See clinic patients and access." />
          <FeaturesCard title="Manage Appointments" icon="calendar-clear-outline" description="Scheduling and availability." />
          <FeaturesCard title="Clinic Settings" icon="settings-outline" description="Branding and clinic preferences." />
        </View>
      </View>

    </ScrollView>
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
    backgroundColor: '#EFF6FF', 
    borderWidth: 1, 
    borderColor: '#BFDBFE', 
    borderRadius: 28, 
    padding: 24 
  },
  
  heroEyebrow: { fontSize: 13, 
    fontWeight: '800', 
    color: '#1D4ED8', 
    marginBottom: 8 
  },
  
  heroTitle: { 
    fontSize: 30, 
    fontWeight: '900', 
    color: '#0F172A', 
    marginBottom: 8 
  },
  
  heroSubtitle: { 
    fontSize: 15, 
    lineHeight: 24, 
    color: '#475569' 
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

});