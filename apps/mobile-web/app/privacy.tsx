import React, { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
        <PrivacyItem icon="server-outline" title="Data we collect" color={theme.primary}>
          MedSync stores the information needed to provide your account, clinic access, appointments, uploaded files, medical records and communication history.
        </PrivacyItem>

        <PrivacyItem icon="eye-outline" title="How your data is used" color={theme.primary}>
          Your data is used to schedule care, organize records, support clinic communication, prepare onboarding summaries and personalize your experience by role.
        </PrivacyItem>

        <PrivacyItem icon="people-outline" title="Role-based access" color={theme.primary}>
          Patients can view their own data, doctors can access relevant care information, clinic admins manage clinic operations and platform admins support the system securely.
        </PrivacyItem>

        <PrivacyItem icon="create-outline" title="Your control" color={theme.primary}>
          You can update your profile details and contact support for privacy questions, account changes or information requests.
        </PrivacyItem>

        <PrivacyItem icon="shield-checkmark-outline" title="Protection and security" color={theme.primary}>
          MedSync uses authentication, role-based permissions and secure storage practices to help protect personal and health-related information.
        </PrivacyItem>
      </View>

    </ScrollView>

  );

}

function PrivacyItem({
  icon,
  title,
  children,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  children: React.ReactNode;
  color: string;
}) {

  return (
    <View style={styles.PrivacyItem}>
      <View style={[styles.policyIcon, { backgroundColor: `${color}12` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>

      <View style={styles.policyContent}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.text}>{children}</Text>
      </View>
    </View>
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
    padding: 18,
    gap: 14,
  },

  PrivacyItem: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    padding: 16,
  },

  policyIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  policyContent: {
    flex: 1,
    minWidth: 0,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
  },

  text: {
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
  },
  
});