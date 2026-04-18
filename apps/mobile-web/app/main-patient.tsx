import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import ClinicNavbar from '../src/common/ClinicNavbar';
import AnimatedStatsCard from '../src/common/AnimatedStatsCard';
import FeaturesCard from '../src/common/FeaturesCard';

function getClinicTheme(clinicName?: string) {

  const normalized = (clinicName || '').toLowerCase();

  if (normalized.includes('health') || normalized.includes('verde')) {
    return { 
      primary: '#059669', 
      secondary: '#064E3B', 
      soft: '#ECFDF5', 
      strongSoft: '#D1FAE5' 
    };
  }

  if (normalized.includes('nova') || normalized.includes('care') || normalized.includes('mov')) {
    return { 
      primary: '#7C3AED', 
      secondary: '#4C1D95', 
      soft: '#F5F3FF', 
      strongSoft: '#E9D5FF' 
    };
  }

  return { 
    primary: '#1D4ED8', 
    secondary: '#0F172A', 
    soft: '#EFF6FF', 
    strongSoft: '#DBEAFE' 
  };

}

export default function MainScreen() {
  
  const { clinicName } = useLocalSearchParams<{ clinicId?: string; clinicName?: string }>();
  const { width } = useWindowDimensions();
  const isMobile = width < 720;
  const theme = getClinicTheme(clinicName);

  const go = (label: string) => console.log(`Navigate to ${label}`);

  return (

    <ScrollView contentContainerStyle={styles.container}>

      <ClinicNavbar
        clinicName={clinicName}
        primaryColor={theme.primary}
        roleLabel="Patient"
        onChangeClinic={() => router.replace({ pathname: '/clinic-selection' })}
      />

      <View style={[styles.hero, { backgroundColor: theme.soft, borderColor: `${theme.primary}30` }]}>
        <Text style={[styles.heroEyebrow, { color: theme.primary }]}>Patient Dashboard</Text>
        <Text style={[styles.heroTitle, { color: theme.secondary }]}>
          Care that feels connected in {clinicName || 'your clinic'}
        </Text>
        <Text style={styles.heroSubtitle}>
          Manage appointments, explore doctors and services, access AI support, and follow your health journey.
        </Text>

        <View style={styles.heroButtons}>
          <Pressable style={[styles.primaryButton, { backgroundColor: theme.primary }]} onPress={() => go('Manage Appointments')}>
            <Text style={styles.primaryButtonText}>Manage Appointments</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => go('Self Diagnosis / Triage')}>
            <Text style={styles.secondaryButtonText}>Start Triage</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <AnimatedStatsCard label="Upcoming Appointments" value={2} icon="calendar-outline" color={theme.primary} />
        <AnimatedStatsCard label="Doctors Available" value={7} icon="medkit-outline" color={theme.primary} />
        <AnimatedStatsCard label="AI Reports Ready" value={1} icon="sparkles-outline" color={theme.primary} />
        <AnimatedStatsCard label="History Entries" value={12} icon="document-text-outline" color={theme.primary} />
      </View>

      {!isMobile && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medical Ads & Highlights</Text>
          <View style={styles.adsGrid}>
            <View style={styles.adCard}><Text style={styles.adTitle}>Prevention Package</Text><Text style={styles.adText}>Annual consultation with digital summary.</Text></View>
            <View style={styles.adCard}><Text style={styles.adTitle}>AI Health Assistant</Text><Text style={styles.adText}>Guided onboarding and symptom support.</Text></View>
            <View style={styles.adCard}><Text style={styles.adTitle}>Cardiology Week</Text><Text style={styles.adText}>Fast slots for selected consultations.</Text></View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Features</Text>
        <View style={styles.featuresGrid}>
          <FeaturesCard compact={isMobile} title="Clinic Info" icon="business-outline" description="Clinic details." onPress={() => go('Clinic Info')} color={theme.primary} />
          <FeaturesCard compact={isMobile} title="Doctors Info" icon="people-outline" description="Doctors and availability." onPress={() => go('Doctors Info')} color={theme.primary} />
          <FeaturesCard compact={isMobile} title="Services Info" icon="list-outline" description="Consultations and procedures." onPress={() => go('Services Info')} color={theme.primary} />
          <FeaturesCard compact={isMobile} title="Technology Info" icon="hardware-chip-outline" description="Clinic innovations." onPress={() => go('Technology Info')} color={theme.primary} />
          <FeaturesCard compact={isMobile} title="Manage Appointments" icon="calendar-clear-outline" description="Book, cancel, reschedule." onPress={() => go('Manage Appointments')} color={theme.primary} />
          <FeaturesCard compact={isMobile} title="Self-Diagnosis" icon="pulse-outline" description="Triage support." onPress={() => go('Self Diagnosis')} color={theme.primary} />
          <FeaturesCard compact={isMobile} title="Documents" icon="document-attach-outline" description="Onboarding and uploads." onPress={() => go('Documents')} color={theme.primary} />
          <FeaturesCard compact={isMobile} title="AI Summary" icon="sparkles-outline" description="Report summaries." onPress={() => go('AI Summary')} color={theme.primary} />
          <FeaturesCard compact={isMobile} title="History" icon="document-text-outline" description="Medical history." onPress={() => go('History')} color={theme.primary} />
          <FeaturesCard compact={isMobile} title="Patient Charts" icon="bar-chart-outline" description="Health trends." onPress={() => go('Patient Charts')} color={theme.primary} />
        </View>
      </View>

      <View style={styles.bottomGrid}>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Upcoming Appointments</Text>
          <View style={styles.appointmentCard}>
            <Text style={styles.appointmentDoctor}>Dr. Andrei Popa</Text>
            <Text style={styles.appointmentMeta}>Tuesday · 14:30 · Cardiology</Text>
          </View>
          <View style={styles.appointmentCard}>
            <Text style={styles.appointmentDoctor}>Dr. Elena Dobre</Text>
            <Text style={styles.appointmentMeta}>Friday · 11:00 · General Check-up</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Chat with Doctor</Text>
          <Text style={styles.adText}>Frontend demo page can be added next.</Text>
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
    borderRadius: 30, 
    borderWidth: 1, 
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
    marginBottom: 10 
  },
  
  heroSubtitle: { 
    fontSize: 15, 
    lineHeight: 24, 
    color: '#475569', 
    marginBottom: 18 
  },
  
  heroButtons: { 
    flexDirection: 'row', 
    gap: 12, 
    flexWrap: 'wrap' 
  },
  
  primaryButton: { 
    borderRadius: 999, 
    paddingHorizontal: 18, 
    paddingVertical: 14 
  },
  
  primaryButtonText: { 
    color: '#FFF', 
    fontWeight: '800' 
  },
  
  secondaryButton: { 
    borderWidth: 1, 
    borderColor: '#CBD5E1', 
    borderRadius: 999, 
    paddingHorizontal: 18, 
    paddingVertical: 14, 
    backgroundColor: '#FFF' 
  },
  
  secondaryButtonText: { 
    color: '#0F172A', 
    fontWeight: '700' 
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
  
  adsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 16 
  },
  
  adCard: { 
    flex: 1, 
    minWidth: 220, 
    backgroundColor: '#F8FAFC', 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    borderRadius: 22, 
    padding: 18 
  },
  
  adTitle: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: '#0F172A', 
    marginBottom: 8 
  },
  
  adText: { 
    fontSize: 14, 
    lineHeight: 22, 
    color: '#475569' 
  },
  
  featuresGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 16 
  },
  
  bottomGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 16 
  },
  
  panel: { 
    flex: 1, 
    minWidth: 260, 
    backgroundColor: '#FFF', 
    borderRadius: 28, 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    padding: 24 
  },
  
  panelTitle: { 
    fontSize: 20, 
    fontWeight: '900', 
    color: '#0F172A', 
    marginBottom: 12 
  },
  
  appointmentCard: { 
    backgroundColor: '#F8FAFC', 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    borderRadius: 18, 
    padding: 14, 
    marginBottom: 12 
  },
  
  appointmentDoctor: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: '#0F172A', 
    marginBottom: 6 
  },
  
  appointmentMeta: { 
    fontSize: 14, 
    color: '#475569' 
  },

});