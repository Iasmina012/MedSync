import React, { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View, Platform, Pressable, Animated, Easing, Linking} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PublicPageLayout from '../src/components/layout/PublicPageLayout';
import WebFooter from '../src/components/layout/WebFooter';
import HoverCard from '../src/common/HoverCard';

const STORE_LINKS = {

  appStore: 'https://www.apple.com/app-store/',
  googlePlay: 'https://play.google.com/store',

};

export default function AboutScreen() {

  const patientFloat = useRef(new Animated.Value(0)).current;
  const doctorFloat = useRef(new Animated.Value(0)).current;
  const clinicFloat = useRef(new Animated.Value(0)).current;
  const platformFloat = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {

    const float = (anim: Animated.Value, value: number, duration: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: value,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    float(patientFloat, -6, 1600);
    float(doctorFloat, 6, 1750);
    float(clinicFloat, -6, 1850);
    float(platformFloat, 6, 1950);

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.05,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

  }, [patientFloat, doctorFloat, clinicFloat, platformFloat, pulse]);

  const openAppStore = () => Linking.openURL(STORE_LINKS.appStore);
  const openGooglePlay = () => Linking.openURL(STORE_LINKS.googlePlay);

  return (

    <PublicPageLayout>

      <ScrollView contentContainerStyle={styles.container}>

        <View style={styles.heroSection}>
          <View style={styles.heroTextBlock}>
            <View style={styles.heroBadge}>
              <Ionicons name="sparkles-outline" size={16} color="#1D4ED8"/>
              <Text style={styles.heroBadgeText}>About MedSync</Text>
            </View>

            <Text style={styles.heroTitle}>
              Understand Our Platform
            </Text>

            <Text style={styles.heroSubtitle}>
              MedSync connects patients, doctors and clinics through a modern healthcare platform designed to simplify communication, appointments and medical information management.
            </Text>

            <View style={styles.heroPillsRow}>
              <View style={styles.heroPill}>
                <Ionicons name="calendar-outline" size={16} color="#1D4ED8"/>
                <Text style={styles.heroPillText}>Appointment Manager</Text>
              </View>

              <View style={styles.heroPill}>
                <Ionicons name="chatbubbles-outline" size={16} color="#1D4ED8"/>
                <Text style={styles.heroPillText}>Secure AI</Text>
              </View>

              <View style={styles.heroPill}>
                <Ionicons name="pulse-outline" size={16} color="#1D4ED8"/>
                <Text style={styles.heroPillText}>Healthcare Insights</Text>
              </View>
            </View>
          </View>

          <View style={styles.workflowArea}>
            <View style={[styles.connectorLine, styles.patientLine]}/>
            <View style={[styles.connectorLine, styles.doctorLine]}/>
            <View style={[styles.connectorLine, styles.clinicLine]}/>
            <View style={[styles.connectorLine, styles.platformLine]}/>

            <Animated.View
              style={[
                styles.roleCard,
                styles.patientCard,
                { transform: [{ translateY: patientFloat }] },
              ]}
            >
              <View style={styles.blueIcon}>
                <Ionicons name="person-outline" size={22} color="#1D4ED8"/>
              </View>
              <View style={styles.roleTextWrap}>
                <Text style={styles.roleTitle}>Patient</Text>
                <Text style={styles.roleSubtitle}>Books Appointment</Text>
              </View>
            </Animated.View>

            <Animated.View
              style={[
                styles.roleCard,
                styles.doctorCard,
                { transform: [{ translateY: doctorFloat }] },
              ]}
            >
              <View style={styles.greenIcon}>
                <Ionicons name="medkit-outline" size={22} color="#10B981"/>
              </View>
              <View style={styles.roleTextWrap}>
                <Text style={styles.roleTitle}>Doctor</Text>
                <Text style={styles.roleSubtitle}>Reviews Data</Text>
              </View>
            </Animated.View>

            <Animated.View
              style={[
                styles.roleCard,
                styles.clinicCard,
                { transform: [{ translateY: clinicFloat }] },
              ]}
            >
              <View style={styles.purpleIcon}>
                <Ionicons name="business-outline" size={22} color="#7C3AED"/>
              </View>
              <View style={styles.roleTextWrap}>
                <Text style={styles.roleTitle}>Clinic Admin</Text>
                <Text style={styles.roleSubtitle}>Manages Clinic</Text>
              </View>
            </Animated.View>

            <Animated.View
              style={[
                styles.roleCard,
                styles.platformCard,
                { transform: [{ translateY: platformFloat }] },
              ]}
            >
              <View style={styles.orangeIcon}>
                <Ionicons name="shield-checkmark-outline" size={22} color="#F97316"/>
              </View>
              <View style={styles.roleTextWrap}>
                <Text style={styles.roleTitle}>Platform Admin</Text>
                <Text style={styles.roleSubtitle}>Oversees System</Text>
              </View>
            </Animated.View>

            <Animated.View style={[styles.syncCenter, { transform: [{ scale: pulse }] }]}>
              <Ionicons name="sync-outline" size={22} color="#FFFFFF"/>
              <Text style={styles.syncText}>Synced Healthcare</Text>
            </Animated.View>
          </View>
        </View>

        <View style={styles.downloadSection}>
          <View style={styles.downloadTextBlock}>
            <Text style={styles.downloadEyebrow}>Mobile Experience</Text>
            <Text style={styles.downloadTitle}>Download the MedSync App</Text>
            <Text style={styles.downloadSubtitle}>
              On the Go! Take MedSync with you wherever you are. Access appointments, messages, medical records and clinic services directly from your mobile device.
            </Text>
          </View>

          <View style={styles.downloadButtonsRow}>
            <Pressable style={styles.storeButton} onPress={openAppStore}>
              <Ionicons name="logo-apple" size={19} color="#FFFFFF"/>
              <Text style={styles.storeButtonText}>App Store</Text>
            </Pressable>

            <Pressable style={styles.storeButton} onPress={openGooglePlay}>
              <Ionicons name="logo-google-playstore" size={19} color="#FFFFFF"/>
              <Text style={styles.storeButtonText}>Google Play</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.grid}>

          <HoverCard pressableStyle={styles.cardHoverWrap} style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons name="business-outline" size={22} color="#1D4ED8"/>
            </View>
            <Text style={styles.cardTitle}>Multi-Clinic Management</Text>
            <Text style={styles.cardText}>
              Navigate through multiple clinics, users, services and healthcare operations from a centralized single platform.
            </Text>
          </HoverCard>

          <HoverCard pressableStyle={styles.cardHoverWrap} style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons name="phone-portrait-outline" size={22} color="#1D4ED8"/>
            </View>
            <Text style={styles.cardTitle}>Mobile Access</Text>
            <Text style={styles.cardText}>
              Access healthcare tools and clinic information anytime from iOS and Android devices.
            </Text>
          </HoverCard>

          <HoverCard pressableStyle={styles.cardHoverWrap} style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons name="sparkles-outline" size={22} color="#1D4ED8"/>
            </View>
            <Text style={styles.cardTitle}>AI Assistance</Text>
            <Text style={styles.cardText}>
              Use smart triage, image and document analyzer, onboarding and guidance powered by modern AI technologies.
            </Text>
          </HoverCard>

          <HoverCard pressableStyle={styles.cardHoverWrap} style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#1D4ED8"/>
            </View>
            <Text style={styles.cardTitle}>Data Protection</Text>
            <Text style={styles.cardText}>Patient information is protected using secure authentication, permissions and privacy controls.</Text>
          </HoverCard>

          <HoverCard pressableStyle={styles.cardHoverWrap} style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons name="calendar-outline" size={22} color="#1D4ED8"/>
            </View>
            <Text style={styles.cardTitle}>Appointment Scheduling</Text>
            <Text style={styles.cardText}>
              Book, reschedule, cancel, check-in and track appointment activity through a streamlined workflow.
            </Text>
          </HoverCard>

          <HoverCard pressableStyle={styles.cardHoverWrap} style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons name="chatbubbles-outline" size={22} color="#1D4ED8"/>
            </View>
            <Text style={styles.cardTitle}>Secure Messaging</Text>
            <Text style={styles.cardText}>
              Communicate directly with healthcare professionals using secure conversations.
            </Text>
          </HoverCard>

          <HoverCard pressableStyle={styles.cardHoverWrap} style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons name="chatbubble-ellipses-outline" size={22} color="#1D4ED8"/>
            </View>
            <Text style={styles.cardTitle}>Care Team Collaboration</Text>
            <Text style={styles.cardText}>
              Improve coordination between patients, doctors and clinic staff through connected workflows.
            </Text>
          </HoverCard>

          <HoverCard pressableStyle={styles.cardHoverWrap} style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons name="alarm-outline" size={22} color="#1D4ED8"/>
            </View>
            <Text style={styles.cardTitle}>Smart Notifications</Text>
            <Text style={styles.cardText}>
              Receive appointment reminders, updates and important medical alerts regarding your appointments.
            </Text>
          </HoverCard>
          
        </View>

      { Platform.OS === 'web' && <WebFooter/> }

      </ScrollView>
    
    </PublicPageLayout>
  
  );

}

const styles = StyleSheet.create({

  container: {
    flexGrow: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
    maxWidth: 1380,
    width: '100%',
    alignSelf: 'center',
  },

  heroSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 34,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 26,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 28,
    flexWrap: 'wrap',
    overflow: 'hidden',
  },

  heroTextBlock: {
    flex: 1,
    minWidth: 280,
  },

  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },

  heroBadgeText: {
    color: '#1D4ED8',
    fontSize: 13,
    fontWeight: '800',
  },

  heroTitle: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: '900',
    color: '#0F172A',
    maxWidth: 720,
    marginBottom: 14,
  },

  heroSubtitle: {
    fontSize: 17,
    lineHeight: 28,
    color: '#475569',
    maxWidth: 720,
  },

  heroPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 22,
  },

  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  heroPillText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
  },

  workflowArea: {
    width: 520,
    height: 300,
    position: 'relative',
  },

  roleCard: {
    position: 'absolute',
    width: 205,
    minHeight: 72,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 9 },
    elevation: 4,
    zIndex: 5,
  },

  patientCard: {
    top: 26,
    left: 0,
  },

  doctorCard: {
    bottom: 26,
    left: 0,
  },

  clinicCard: {
    top: 26,
    right: 0,
  },

  platformCard: {
    bottom: 26,
    right: 0,
  },

  roleTextWrap: {
    flex: 1,
  },

  roleTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },

  roleSubtitle: {
    fontSize: 12,
    color: '#475569',
    marginTop: 3,
    fontWeight: '600',
  },

  blueIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  greenIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  purpleIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  orangeIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },

  syncCenter: {
    position: 'absolute',
    top: 122,
    left: 140,
    zIndex: 8,
    backgroundColor: '#1D4ED8',
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#1D4ED8',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 9 },
    elevation: 7,
  },

  syncText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },

  connectorLine: {
    position: 'absolute',
    width: 112,
    height: 3,
    backgroundColor: '#67E8F9',
    borderRadius: 999,
    opacity: 0.78,
    zIndex: 1,
  },

  patientLine: {
    top: 94,
    left: 184,
    transform: [{ rotate: '27deg' }],
  },

  doctorLine: {
    top: 202,
    left: 184,
    transform: [{ rotate: '-27deg' }],
  },

  clinicLine: {
    top: 94,
    right: 184,
    transform: [{ rotate: '-27deg' }],
  },

  platformLine: {
    top: 202,
    right: 184,
    transform: [{ rotate: '27deg' }],
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    marginTop: 15,
  },

  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 22,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },

  cardHoverWrap: {
    flex: 1,
    minWidth: 260,
  },

  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },

  cardText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
  },

  downloadSection: {
    backgroundColor: '#1E293B',
    borderRadius: 30,
    padding: 28,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
    flexWrap: 'wrap',
  },

  downloadTextBlock: {
    flex: 1,
    minWidth: 280,
  },

  downloadEyebrow: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 8,
  },

  downloadTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 10,
  },

  downloadSubtitle: {
    fontSize: 15,
    lineHeight: 24,
    color: '#CBD5E1',
    maxWidth: 620,
  },

  downloadButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  storeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1D4ED8',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 14,
    minWidth: 160,
  },

  storeButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },

});