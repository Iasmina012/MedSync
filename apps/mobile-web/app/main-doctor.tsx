import React, { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getCurrentUserProfile } from '../src/lib/auth';
import ClinicNavbar from '../src/common/ClinicNavbar';
import AnimatedStatsCard from '../src/common/AnimatedStatsCard';
import FeaturesCard from '../src/common/FeaturesCard';

export default function DoctorDashboard() {

  const { clinicName } = useLocalSearchParams<{ clinicId?: string; clinicName?: string }>();

  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');

  useEffect(() => {

    const check = async () => {
      const { user, profile } = await getCurrentUserProfile();
      if (!user) return router.replace('/login');
      if (profile?.role !== 'doctor') return router.replace('/main-patient');
      setFullName(`${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim());
      setLoading(false);
    };
    check();

  }, []);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large"/></View>;
  }

  return (

    <ScrollView contentContainerStyle={styles.container}>

      <ClinicNavbar
        clinicName={clinicName}
        primaryColor="#1D4ED8"
        roleLabel="Doctor"
        onChangeClinic={() => router.replace({ pathname: '/clinic-selection' })}
      />

      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>Doctor Dashboard</Text>
        <Text style={styles.heroTitle}>Welcome back{fullName ? `, Dr. ${fullName}` : ''}</Text>
        <Text style={styles.heroSubtitle}>
          See only your patients, your appointments, your notes, and your chat activity.
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <AnimatedStatsCard label="Appointments Today" value={8} icon="calendar-outline" />
        <AnimatedStatsCard label="My Patients" value={22} icon="people-outline" />
        <AnimatedStatsCard label="Pending Notes" value={3} icon="create-outline" />
        <AnimatedStatsCard label="Unread Chats" value={4} icon="chatbubble-ellipses-outline" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Feature Access</Text>
        <View style={styles.featuresGrid}>
          <FeaturesCard title="Todays Appointments" icon="calendar-outline" description="Clinic schedule and patient flow." />
          <FeaturesCard title="Patients List" icon="people-outline" description="Only your assigned patients." />
          <FeaturesCard title="Patient History" icon="document-text-outline" description="Review conditions and controls." />
          <FeaturesCard title="Add Notes" icon="create-outline" description="Save medical notes efficiently." />
          <FeaturesCard title="Chat with Patients" icon="chatbubbles-outline" description="Direct communication frontend." />
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
  
  heroEyebrow: { 
    fontSize: 13, 
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