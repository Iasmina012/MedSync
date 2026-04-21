import React, { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, } from 'react-native';
import { getCurrentUserProfile } from '../src/lib/auth';
import { getBackPathWithClinicFallback } from '../src/lib/navigation';
import { useClinicTheme } from '../src/lib/clinicTheme';
import ClinicNavbar from '../src/common/ClinicNavbar';

export default function PrivacyScreen() {

  const { clinicId, clinicName } = useLocalSearchParams<{
    clinicId?: string;
    clinicName?: string;
  }>();

  const { theme } = useClinicTheme(clinicId);

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('patient');

  useEffect(() => {

    const load = async () => {
      const { user, profile } = await getCurrentUserProfile();
      if (!user || !profile) {
        router.replace('/login');
        return;
      }
      setRole(profile.role ?? 'patient');
      setLoading(false);
    };
    load();

  }, []);

  const backRoute = getBackPathWithClinicFallback(role, clinicId, clinicName);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (

    <ScrollView contentContainerStyle={styles.container} stickyHeaderIndices={[0]}>

      <ClinicNavbar
        clinicId={clinicId}
        clinicName={clinicName}
        primaryColor={theme.primary}
        roleLabel="Privacy"
        showRolePill={false}
        onChangeClinic={() => router.replace('/clinic-selection')}
        showBackButton
        onBackPress={() => router.replace(backRoute as any)}
      />

      <View
        style={[
          styles.hero,
          { backgroundColor: theme.soft, borderColor: theme.borderSoft },
        ]}
      >
        <Text style={[styles.heroEyebrow, { color: theme.primary }]}>
          Privacy
        </Text>
        <Text style={[styles.heroTitle, { color: theme.secondary }]}>
          How your data is protected
        </Text>
        <Text style={styles.heroSubtitle}>
          Understand what information is stored and how it is used inside the platform.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Data we store</Text>
        <Text style={styles.text}>
          We store account details, clinic membership, profile information, appointments, and health-related platform records that are necessary for the services you use.
        </Text>

        <Text style={styles.sectionTitle}>How we use your data</Text>
        <Text style={styles.text}>
          Your data is used to provide appointments, communication, onboarding, health information, and clinic-specific features. Access is limited by role.
        </Text>

        <Text style={styles.sectionTitle}>Your control</Text>
        <Text style={styles.text}>
          You can update your profile details, manage certain preferences, and request support for account-related privacy questions.
        </Text>

        <Text style={styles.sectionTitle}>Security</Text>
        <Text style={styles.text}>
          We use authentication, role-based access, and secure storage practices to reduce unauthorized access to your information.
        </Text>
      </View>

    </ScrollView>

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
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
  },

  heroEyebrow: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },

  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 10,
  },

  heroSubtitle: {
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 22,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 10,
    marginBottom: 8,
  },

  text: {
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
  },
  
});