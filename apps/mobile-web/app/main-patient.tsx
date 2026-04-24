import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import ClinicNavbar from '../src/common/ClinicNavbar';
import AnimatedStatsCard from '../src/common/AnimatedStatsCard';
import FeaturesCard from '../src/common/FeaturesCard';
import { useClinicTheme } from '../src/lib/clinicTheme';

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

export default function PatientDashboard() {

  const { clinicId, clinicName } = useLocalSearchParams<{
    clinicId?: string;
    clinicName?: string;
  }>();

  const { width } = useWindowDimensions();
  const isMobile = width < 720;
  const { theme } = useClinicTheme(clinicId);

  const go = (pathname: string) => {
    router.push({
      pathname: pathname as any,
      params: { clinicId, clinicName },
    });
  };

  const featureAccentA = rgbaFromHex(theme.primary, 0.11);
  const featureAccentB = rgbaFromHex(theme.primary, 0.18);
  const featureBorderA = rgbaFromHex(theme.primary, 0.22);
  const featureBorderB = rgbaFromHex(theme.primary, 0.34);

  const featureItems = [

    { title: 'Clinic Info', icon: 'business-outline' as const, description: 'Clinic details.', onPress: () => go('/clinic-info') },
    { title: 'Doctors Info', icon: 'people-outline' as const, description: 'Doctors and availability.', onPress: () => go('/clinic-doctors') },
    { title: 'Services Info', icon: 'list-outline' as const, description: 'Consultations and procedures.', onPress: () => go('/clinic-services') },
    { title: 'Technology Info', icon: 'hardware-chip-outline' as const, description: 'Clinic innovations.', onPress: () => go('/clinic-tech') },
    { title: 'Health Tips', icon: 'leaf-outline' as const, description: 'Personalized clinic wellness tips.', onPress: () => go('/health-tips') },
    { title: 'Manage Appointments', icon: 'calendar-clear-outline' as const, description: 'Book, cancel, reschedule.', onPress: () => go('/manage-appointments') },
    { title: 'Self-Diagnosis', icon: 'pulse-outline' as const, description: 'Triage support.', onPress: () => go('/self-diagnosis') },
    { title: 'Documents', icon: 'document-attach-outline' as const, description: 'Onboarding and uploads.', onPress: () => go('/documents') },
    { title: 'AI Summary', icon: 'sparkles-outline' as const, description: 'Report summaries.', onPress: () => go('/ai-summary') },
    { title: 'History', icon: 'document-text-outline' as const, description: 'Medical history.', onPress: () => go('/history') },
    { title: 'Patient Charts', icon: 'bar-chart-outline' as const, description: 'Health trends.', onPress: () => go('/patient-charts') },

  ];

  return (

    <ScrollView contentContainerStyle={styles.container} stickyHeaderIndices={[0]}>

      <ClinicNavbar
        clinicName={clinicName}
        clinicId={clinicId}
        primaryColor={theme.primary}
        roleLabel="Patient"
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
          Patient Dashboard
        </Text>
        <Text style={[styles.heroTitle, isMobile && styles.heroTextCenter, { color: theme.secondary }]}>
          Care that feels connected in {clinicName || 'your clinic'}
        </Text>
        <Text style={[styles.heroSubtitle, isMobile && styles.heroTextCenter]}>
          Manage appointments, explore doctors and services, access AI support, and follow your health journey.
        </Text>

        <View style={[styles.heroButtons, isMobile && styles.heroButtonsMobile]}>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={() => go('/manage-appointments')}
          >
            <Text style={styles.primaryButtonText}>Manage Appointments</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => go('/self-diagnosis')}
          >
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
            <View style={styles.adCard}>
              <Text style={styles.adTitle}>Prevention Package</Text>
              <Text style={styles.adText}>Annual consultation with digital summary.</Text>
            </View>
            <View style={styles.adCard}>
              <Text style={styles.adTitle}>AI Health Assistant</Text>
              <Text style={styles.adText}>Guided onboarding and symptom support.</Text>
            </View>
            <View style={styles.adCard}>
              <Text style={styles.adTitle}>Cardiology Week</Text>
              <Text style={styles.adText}>Fast slots for selected consultations.</Text>
            </View>
          </View>
        </View>
      )}

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
                onPress={item.onPress}
                color={theme.primary}
                backgroundColor={isAlt ? featureAccentA : featureAccentB}
                borderColor={isAlt ? featureBorderA : featureBorderB}
              />

            );
          })}
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

  heroMobile: {
    alignItems: 'center',
  },

  heroTextCenter: {
    textAlign: 'center',
  },

  heroButtonsMobile: {
    justifyContent: 'center',
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