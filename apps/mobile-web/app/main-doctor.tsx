import React, { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions, } from 'react-native';
import { getCurrentUserProfile } from '../src/lib/auth';
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

export default function DoctorDashboard() {

  const { clinicId, clinicName } = useLocalSearchParams<{
    clinicId?: string;
    clinicName?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const { width } = useWindowDimensions();
  const isMobile = width < 720;
  const { theme } = useClinicTheme(clinicId);

  const go = (pathname: string) => {
    router.push({
      pathname: pathname as any,
      params: { clinicId, clinicName },
    });
  };

  useEffect(() => {

    const check = async () => {
      const { user, profile } = await getCurrentUserProfile();
      if (!user) return router.replace('/login');
      if (profile?.role !== 'doctor') return router.replace('/main-patient');
      
      const cleanFirstName = (profile.first_name ?? '').replace(/^Dr\.?\s*/i, '').trim();
      const cleanLastName = (profile.last_name ?? '').replace(/^Dr\.?\s*/i, '').trim();

      setFullName(`${cleanFirstName} ${cleanLastName}`.trim());
      setLoading(false);
    };
    check();

  }, []);

  const featureAccentA = rgbaFromHex(theme.primary, 0.11);
  const featureAccentB = rgbaFromHex(theme.primary, 0.18);
  const featureBorderA = rgbaFromHex(theme.primary, 0.22);
  const featureBorderB = rgbaFromHex(theme.primary, 0.34);

  const featureItems = [

    { title: 'Manage Appointments', icon: 'calendar-outline' as const, description: 'Clinic schedule and patient flow.', onPress: () => go('/manage-appointments') },
    { title: 'Patients List', icon: 'people-outline' as const, description: 'Only your assigned patients.' },
    { title: 'Patient History', icon: 'document-text-outline' as const, description: 'Review conditions and controls.' },
    { title: 'Add Notes', icon: 'create-outline' as const, description: 'Save medical notes efficiently.' },
    { title: 'Chat with Patients', icon: 'chatbubbles-outline' as const, description: 'Direct communication frontend.' },

  ];

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
        clinicName={clinicName}
        clinicId={clinicId}
        primaryColor={theme.primary}
        roleLabel="Doctor"
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
          Doctor Dashboard
        </Text>
        <Text style={[styles.heroTitle, isMobile && styles.heroTextCenter, { color: theme.secondary }]}>
          Welcome back{fullName ? `, Dr. ${fullName}` : ''}
        </Text>
        <Text style={[styles.heroSubtitle, isMobile && styles.heroTextCenter]}>
          See only your patients, your appointments, your notes, and your chat activity.
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <AnimatedStatsCard label="Appointments Today" value={8} icon="calendar-outline" color={theme.primary}/>
        <AnimatedStatsCard label="My Patients" value={22} icon="people-outline" color={theme.primary}/>
        <AnimatedStatsCard label="Pending Notes" value={3} icon="create-outline" color={theme.primary}/>
        <AnimatedStatsCard label="Unread Chats" value={4} icon="chatbubble-ellipses-outline" color={theme.primary}/>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Feature Access</Text>
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

});