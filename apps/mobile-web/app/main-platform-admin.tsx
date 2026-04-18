import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import ClinicNavbar from '../src/common/ClinicNavbar';
import AnimatedStatsCard from '../src/common/AnimatedStatsCard';
import FeaturesCard from '../src/common/FeaturesCard';

export default function PlatformAdminDashboard() {

  const { clinicName } = useLocalSearchParams<{ clinicId?: string; clinicName?: string }>();

  return (

    <ScrollView contentContainerStyle={styles.container}>

      <ClinicNavbar
        clinicName={clinicName}
        primaryColor="#1D4ED8"
        roleLabel="Platform Admin"
        onChangeClinic={() => router.replace({ pathname: '/clinic-selection' })}
      />

      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>MedSync Admin Dashboard</Text>
        <Text style={styles.heroTitle}>Global control over the full platform</Text>
        <Text style={styles.heroSubtitle}>
          View all clinics, users, analytics, and global appointment activity.
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <AnimatedStatsCard label="Clinics" value={12} icon="business-outline" />
        <AnimatedStatsCard label="Doctors" value={74} icon="medkit-outline" />
        <AnimatedStatsCard label="Patients" value={1430} icon="people-outline" />
        <AnimatedStatsCard label="Appointments" value={526} icon="calendar-outline" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Global Actions</Text>
        <View style={styles.featuresGrid}>
          <FeaturesCard title="Manage Clinics" icon="business-outline" description="Configure clinics platform-wide." />
          <FeaturesCard title="Manage Users" icon="people-outline" description="See users across all clinics." />
          <FeaturesCard title="Analytics" icon="bar-chart-outline" description="Global usage and reporting." />
          <FeaturesCard title="All Appointments" icon="calendar-clear-outline" description="Platform appointment overview." />
        </View>
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