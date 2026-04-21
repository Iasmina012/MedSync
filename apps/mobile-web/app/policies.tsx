import React, { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, } from 'react-native';
import { getCurrentUserProfile } from '../src/lib/auth';
import { getBackPathWithClinicFallback } from '../src/lib/navigation';
import { useClinicTheme } from '../src/lib/clinicTheme';
import ClinicNavbar from '../src/common/ClinicNavbar';

export default function PoliciesScreen() {

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
        <ActivityIndicator size="large" color={theme.primary}/>
      </View>
    );
  }

  return (

    <ScrollView contentContainerStyle={styles.container} stickyHeaderIndices={[0]}>

      <ClinicNavbar
        clinicId={clinicId}
        clinicName={clinicName}
        primaryColor={theme.primary}
        roleLabel="Policies"
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
          Policies
        </Text>
        <Text style={[styles.heroTitle, { color: theme.secondary }]}>
          Platform usage and clinic rules
        </Text>
        <Text style={styles.heroSubtitle}>
          Review the core rules for account use, communication, and medical platform behavior.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account use</Text>
        <Text style={styles.text}>
          Keep your login secure and do not share access with other people. You are responsible for activity performed using your account.
        </Text>

        <Text style={styles.sectionTitle}>Clinic communication</Text>
        <Text style={styles.text}>
          Messages, appointment requests, and medical notes must be used respectfully and only for legitimate health-related communication.
        </Text>

        <Text style={styles.sectionTitle}>Medical information</Text>
        <Text style={styles.text}>
          This platform supports communication and organization, but urgent medical issues must follow the clinic emergency instructions and local emergency services.
        </Text>

        <Text style={styles.sectionTitle}>Platform conduct</Text>
        <Text style={styles.text}>
          Abusive behavior, spam, misuse of patient data, or unauthorized access attempts may lead to account restriction.
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