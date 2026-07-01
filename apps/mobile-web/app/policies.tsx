import React, { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, } from 'react-native';
import { getCurrentUserProfile } from '../src/lib/auth';
import { getBackPathWithClinicFallback } from '../src/lib/navigation';
import { useClinicTheme } from '../src/lib/clinicTheme';
import ClinicNavbar from '../src/common/ClinicNavbar';
import { Ionicons } from '@expo/vector-icons';

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
          Review the core rules for account use, communication and medical platform behavior.
        </Text>
      </View>

      <View style={styles.card}>
        <PolicyItem icon="key-outline" title="Account responsibility" color={theme.primary}>
          Keep your login details private and use your account only for authorized activity. Do not share access or impersonate another user.
        </PolicyItem>

        <PolicyItem icon="chatbubbles-outline" title="Communication rules" color={theme.primary}>
          Appointment notes, messages and clinic communication should stay respectful, accurate and related to healthcare or clinic services.
        </PolicyItem>

        <PolicyItem icon="medkit-outline" title="Medical limitations" color={theme.primary}>
          MedSync helps organize care, but it does not replace emergency services. For urgent symptoms, contact your clinic or local emergency services.
        </PolicyItem>

        <PolicyItem icon="document-attach-outline" title="Document policy" color={theme.primary}>
          Uploaded files and medical notes must be relevant, lawful and appropriate for care. Do not upload false, harmful or unauthorized material.
        </PolicyItem>

        <PolicyItem icon="lock-closed-outline" title="Platform safety" color={theme.primary}>
          Misusing patient data, bypassing permissions, disrupting the platform or accessing restricted areas may lead to account restrictions.
        </PolicyItem>
      </View>

    </ScrollView>

  );

}

function PolicyItem({
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
    <View style={styles.policyItem}>
      <View style={[styles.policyIcon, { backgroundColor: `${color}12` }]}>
        <Ionicons name={icon} size={20} color={color}/>
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

  policyItem: {
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