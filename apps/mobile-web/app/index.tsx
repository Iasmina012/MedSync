import React, { useMemo } from 'react';
import { Redirect, router } from 'expo-router';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PublicPageLayout from '../src/components/layout/PublicPageLayout';
import WebFooter from '../src/components/layout/WebFooter';

const BRAND = {
  primary: '#1D4ED8',
  secondary: '#0F172A',
  accent: '#06B6D4',
  soft: '#EFF6FF',
  card: '#FFFFFF',
  text: '#0F172A',
  muted: '#475569',
  border: '#E2E8F0',
  success: '#10B981',
  warm: '#F8FAFC',
};

type FeatureCard = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
};

const primaryFeatures: FeatureCard[] = [

  {
    icon: 'calendar-outline',
    title: 'Quick appointments',
    description:
      'Patients can easily create, modify, or cancel appointments from any device.',
  },

  {
    icon: 'chatbubbles-outline',
    title: 'Integrated AI assistant',
    description:
      'The chatbot quickly answers general questions and guides users to the right features.',
  },

  {
    icon: 'medkit-outline',
    title: 'Medical management',
    description:
      'Clinic data, doctors, patient history, and administrative workflows in one place.',
  },

  {
    icon: 'phone-portrait-outline',
    title: 'Multi-platform',
    description:
      'The same app base for web, iOS, and Android, with experiences adapted for each platform.',
  },

];

const secondaryFeatures: FeatureCard[] = [

  {
    icon: 'color-palette-outline',
    title: 'Per-clinic branding',
    description:
      'Each clinic can choose its own name, colors, and visual identity across all platforms.',
  },

  {
    icon: 'shield-checkmark-outline',
    title: 'Separate roles',
    description:
      'Admin, doctor, and patient have different interfaces and permissions.',
  },

  {
    icon: 'stats-chart-outline',
    title: 'AI summaries and analytics',
    description:
      'Later add automatic summaries for analyses, onboarding, and documents.',
  },

];

const reviews = [

  {
    name: 'Dr. Elena Popescu',
    role: 'Specialist doctor',
    text: 'The interface is clear and professional. It fits very well with modern clinic workflows.',
  },

  {
    name: 'Andrei Ionescu',
    role: 'Patient',
    text: 'I would love to handle appointments and common medical questions in one place.',
  },

  {
    name: 'Ana M.',
    role: 'Clinic administrator',
    text: 'The fact that each clinic can have its own branding is a big plus for a template-based product.',
  },

];

function CTAButton({title, variant = 'primary', onPress,}: {title: string; variant?: 'primary' | 'secondary'; onPress?: () => void;}) {
  
  return (

    <Pressable

      onPress={onPress}
      style={({ pressed }) => [
        styles.ctaButton,
        variant === 'primary' ? styles.ctaPrimary : styles.ctaSecondary,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={
          variant === 'primary' ? styles.ctaPrimaryText : styles.ctaSecondaryText
        }
      >
        {title}
      </Text>

    </Pressable>

  );

}

function SectionTitle({title, subtitle,}: {title: string; subtitle: string;}) {
  
  return (

    <View style={styles.sectionTitleWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>

  );

}

export default function IndexScreen() {

  const { width } = useWindowDimensions();
  const isMobile = width < 900;
  const isSmall = width < 640;
  const isWeb = Platform.OS === 'web';

  const featureColumns = useMemo(() => {
    if (width < 700) return 1;
    if (width < 1100) return 2;
    return 4;
  }, [width]);

  const secondaryColumns = useMemo(() => {
    if (width < 700) return 1;
    if (width < 1100) return 2;
    return 3;
  }, [width]);

  if (!isWeb) {
    return <Redirect href="/login"/>;
  }

  return (

    <PublicPageLayout>

      <ScrollView

        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroBackgroundShapeOne}/>
        <View style={styles.heroBackgroundShapeTwo}/>

        <View style={[styles.heroSection, isMobile && styles.heroSectionMobile]}>
          <View style={[styles.heroLeft, isMobile && styles.heroLeftMobile]}>
            <View style={styles.badge}>
              <Ionicons name="sparkles-outline" size={16} color={BRAND.primary}/>
                <Text style={styles.badgeText}>
                  MedSync · Distributed Medical System
                </Text>
            </View>

            <Text style={[styles.heroTitle, isSmall && styles.heroTitleSmall]}>
              A modern application for clinics, doctors, and patients.
            </Text>

            <Text style={styles.heroDescription}>
              A scalable template for web, iOS, and Android, with per-clinic branding, appointments, medical management, and AI features that can be gradually extended.
            </Text>

            <View
              style={[styles.heroButtonsRow, isSmall && styles.heroButtonsColumn]}
            >
              <CTAButton
                title="Start with login"
                onPress={() => router.push('/login')}
              />

              <CTAButton
                title="Create account"
                variant="secondary"
                onPress={() => router.push('/signup')}
              />
            </View>

            <View style={[styles.metricsRow, isSmall && styles.metricsColumn]}>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>3</Text>
                <Text style={styles.metricLabel}>main roles</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>4</Text>
                <Text style={styles.metricLabel}>target platforms</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>AI</Text>
                <Text style={styles.metricLabel}>for automation</Text>
              </View>
            </View>
          </View>

          <View style={[styles.heroRight, isMobile && styles.heroRightMobile]}>
            <View style={styles.previewCardLarge}>
              <View style={styles.previewHeader}>
                <View style={styles.previewDotRow}>
                  <View style={[styles.dot, { backgroundColor: '#EF4444' }]}/>
                  <View style={[styles.dot, { backgroundColor: '#F59E0B' }]}/>
                  <View style={[styles.dot, { backgroundColor: '#10B981' }]}/>
                </View>
                <Text style={styles.previewHeaderText}>Clinic Dashboard</Text>
              </View>

              <View style={styles.previewBanner}>
                <View>
                  <Text style={styles.previewBannerTitle}>MedNova Clinic</Text>
                  <Text style={styles.previewBannerSubtitle}>
                    Personalised branding for each center
                  </Text>
                </View>
                <View style={styles.previewStatusPill}>
                  <Text style={styles.previewStatusPillText}>Live</Text>
                </View>
              </View>

              <View style={styles.previewStatsGrid}>
                <View style={styles.previewSmallCard}>
                  <Ionicons
                    name="people-outline"
                    size={18}
                    color={BRAND.primary}
                  />
                  <Text style={styles.previewSmallValue}>128</Text>
                  <Text style={styles.previewSmallLabel}>Active patients</Text>
                </View>
                <View style={styles.previewSmallCard}>
                  <Ionicons
                    name="calendar-clear-outline"
                    size={18}
                    color={BRAND.primary}
                  />
                  <Text style={styles.previewSmallValue}>24</Text>
                  <Text style={styles.previewSmallLabel}>Appointments today</Text>
                </View>
              </View>

              <View style={styles.previewListCard}>
                <Text style={styles.previewListTitle}>Fast functions</Text>
                {[
                  'Appointment check-in',
                  'Chat doctor-patient',
                  'AI Summary',
                ].map((item) => (
                  <View key={item} style={styles.previewListItem}>
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={BRAND.success}
                    />
                    <Text style={styles.previewListItemText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        <SectionTitle
          title="Whats does the app offer?"
          subtitle="You have a clear foundation for your dissertation project, and AI features can be added incrementally."
        />

        <View style={[styles.cardGrid, { gap: 18 }]}>
          {primaryFeatures.map((feature, index) => (
            <View
              key={feature.title}
              style={[styles.featureCard, { width: `${100 / featureColumns}%` }]}
            >
              <View style={styles.featureIconWrap}>
                <Ionicons name={feature.icon} size={24} color={BRAND.primary}/>
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
              <Text style={styles.featureIndex}>0{index + 1}</Text>
            </View>
          ))}
        </View>

        <View style={styles.customSection}>
          <View style={styles.customSectionLeft}>
            <SectionTitle
              title="Designed for multiple clinics"
              subtitle="The same application can be reused for multiple medical centers, each with its own brand settings and users."
            />
            <View style={styles.checkListWrap}>
              {[
                'Clinic name displayed on homepage and in app',
                'Different colors per clinic',
                'Doctors and patients separated per clinic',
                'Reusable common configurations',
              ].map((item) => (
                <View key={item} style={styles.checkListItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={BRAND.success}
                  />
                  <Text style={styles.checkListText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.customSectionRight}>
            <View style={styles.themePreviewCard}>
              <Text style={styles.themePreviewTitle}>
                Branding Example
              </Text>

              <View style={styles.themeRow}>
                <View
                  style={[styles.themeSwatch, { backgroundColor: '#1D4ED8'}]}
                />
                <View>
                  <Text style={styles.themeName}>Blue clinic</Text>
                  <Text style={styles.themeDescription}>
                    Text
                  </Text>
                </View>
              </View>

              <View style={styles.themeRow}>
                <View
                  style={[styles.themeSwatch, { backgroundColor: '#059669'}]}
                />
                <View>
                  <Text style={styles.themeName}>Green clinic</Text>
                  <Text style={styles.themeDescription}>
                    Text
                  </Text>
                </View>
              </View>

              <View style={styles.themeRow}>
                <View
                  style={[styles.themeSwatch, { backgroundColor: '#7C3AED'}]}
                />
                <View>
                  <Text style={styles.themeName}>Purple clinic</Text>
                  <Text style={styles.themeDescription}>
                    Text
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <SectionTitle
          title="Great Extensions for Later"
          subtitle="These look good in your dissertation, but you can implement them after you have a stable foundation."
          />

        <View style={[styles.cardGrid, { gap: 18 }]}>
          {secondaryFeatures.map((feature) => (
            <View
              key={feature.title}
              style={[
                styles.secondaryCard,
                { width: `${100 / secondaryColumns}%` },
              ]}
            >
              <Ionicons name={feature.icon} size={22} color={BRAND.accent}/>
              <Text style={styles.secondaryCardTitle}>{feature.title}</Text>
              <Text style={styles.secondaryCardText}>{feature.description}</Text>
            </View>
          ))}
        </View>

        <View style={styles.installSection}>
          <View style={styles.installBox}>
            <Text style={styles.installTitle}>How to use the application</Text>
            <Text style={styles.installText}>
              On web: access the landing page, learn about the app, and navigate to Login / Sign Up.
            </Text>
            <Text style={styles.installText}>
              On mobile: the user enters directly into the authentication flow and then reaches their role-specific dashboard.
            </Text>
            <Text style={styles.installText}>
              Later I will add push notifications, and smartwatch integration for vitals and AI summaries.
            </Text>
          </View>

          <View style={styles.contactBox}>
            <Text style={styles.contactTitle}>Contact</Text>
            <Text style={styles.contactText}>Email: contact@medsync.com</Text>
            <Text style={styles.contactText}>Phone: +40 777 777 777</Text>
            <Text style={styles.contactText}>
              Schedule: Mon - Fri · 08:00 - 18:00
            </Text>
            <Pressable
              onPress={() => Linking.openURL('mailto:contact@medsync-demo.com')}
              style={({ pressed }) => [
                styles.contactButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.contactButtonText}>Send a message</Text>
            </Pressable>
          </View>
        </View>

        <SectionTitle
          title="Reviews"
          subtitle="Text"
        />

        <View style={styles.reviewsRow}>
          {reviews.map((review) => (
            <View key={review.name} style={styles.reviewCard}>
              <View style={styles.reviewStars}>
                {Array.from({ length: 5 }).map((_, index) => (
                  <Ionicons key={index} name="star" size={16} color="#F59E0B"/>
                ))}
              </View>
              <Text style={styles.reviewText}>“{review.text}”</Text>
              <Text style={styles.reviewName}>{review.name}</Text>
              <Text style={styles.reviewRole}>{review.role}</Text>
            </View>
          ))}
        </View>

      { Platform.OS === 'web' && <WebFooter/> }
      
      </ScrollView>
    
    </PublicPageLayout>
  
);

}

const styles = StyleSheet.create({

  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 64,
    maxWidth: 1380,
    width: '100%',
    alignSelf: 'center',
  },

  heroBackgroundShapeOne: {
    position: 'absolute',
    top: 40,
    right: -50,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: '#DBEAFE',
  },

  heroBackgroundShapeTwo: {
    position: 'absolute',
    top: 380,
    left: -90,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: '#CFFAFE',
  },

  heroSection: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 24,
    marginBottom: 54,
    marginTop: 18,
  },

  heroSectionMobile: {
    flexDirection: 'column',
  },

  heroLeft: {
    flex: 1.05,
    backgroundColor: 'transparent',
    paddingTop: 28,
  },

  heroLeftMobile: {
    paddingTop: 8,
  },

  heroRight: {
    flex: 0.95,
    justifyContent: 'center',
  },

  heroRightMobile: {
    width: '100%',
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    backgroundColor: BRAND.soft,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 18,
  },

  badgeText: {
    color: BRAND.primary,
    fontSize: 13,
    fontWeight: '700',
  },

  heroTitle: {
    fontSize: 54,
    lineHeight: 62,
    fontWeight: '900',
    color: BRAND.secondary,
    maxWidth: 700,
  },

  heroTitleSmall: {
    fontSize: 38,
    lineHeight: 46,
  },

  heroDescription: {
    fontSize: 18,
    lineHeight: 30,
    color: BRAND.muted,
    maxWidth: 720,
    marginTop: 18,
    marginBottom: 26,
  },

  heroButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 26,
  },

  heroButtonsColumn: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },

  ctaButton: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  ctaPrimary: {
    backgroundColor: BRAND.primary,
  },

  ctaSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BRAND.border,
  },

  ctaPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },

  ctaSecondaryText: {
    color: BRAND.secondary,
    fontWeight: '700',
    fontSize: 15,
  },

  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },

  metricsColumn: {
    flexDirection: 'column',
  },

  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BRAND.border,
    paddingVertical: 18,
    paddingHorizontal: 20,
    minWidth: 150,
  },

  metricValue: {
    fontSize: 28,
    fontWeight: '900',
    color: BRAND.primary,
  },

  metricLabel: {
    fontSize: 14,
    color: BRAND.muted,
    marginTop: 6,
  },

  previewCardLarge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: 18,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },

  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  previewDotRow: {
    flexDirection: 'row',
    gap: 6,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },

  previewHeaderText: {
    fontSize: 13,
    color: BRAND.muted,
    fontWeight: '600',
  },

  previewBanner: {
    borderRadius: 24,
    backgroundColor: BRAND.secondary,
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },

  previewBannerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },

  previewBannerSubtitle: {
    color: '#CBD5E1',
    fontSize: 13,
    marginTop: 4,
  },

  previewStatusPill: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },

  previewStatusPillText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },

  previewStatsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
    flexWrap: 'wrap',
  },

  previewSmallCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: BRAND.warm,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 20,
    padding: 16,
  },

  previewSmallValue: {
    fontSize: 24,
    fontWeight: '800',
    color: BRAND.secondary,
    marginTop: 8,
  },

  previewSmallLabel: {
    fontSize: 13,
    color: BRAND.muted,
    marginTop: 4,
  },

  previewListCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 20,
    padding: 16,
  },

  previewListTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BRAND.secondary,
    marginBottom: 12,
  },

  previewListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },

  previewListItemText: {
    fontSize: 14,
    color: BRAND.text,
    fontWeight: '500',
  },

  sectionTitleWrap: {
    marginBottom: 18,
    marginTop: 8,
  },

  sectionTitle: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '900',
    color: BRAND.secondary,
    marginBottom: 8,
  },

  sectionSubtitle: {
    fontSize: 16,
    lineHeight: 26,
    color: BRAND.muted,
    maxWidth: 900,
  },

  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 38,
    marginHorizontal: -9,
  },

  featureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: 22,
    minWidth: 260,
    position: 'relative',
    marginHorizontal: 9,
    marginBottom: 18,
    flexGrow: 1,
  },

  featureIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: BRAND.soft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  featureTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: BRAND.secondary,
    marginBottom: 10,
  },

  featureDescription: {
    fontSize: 15,
    lineHeight: 24,
    color: BRAND.muted,
    paddingRight: 34,
  },

  featureIndex: {
    position: 'absolute',
    top: 18,
    right: 18,
    fontSize: 24,
    fontWeight: '900',
    color: '#DBEAFE',
  },

  customSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: 24,
    marginBottom: 38,
    flexDirection: 'row',
    gap: 24,
    flexWrap: 'wrap',
  },

  customSectionLeft: {
    flex: 1.2,
    minWidth: 280,
  },

  customSectionRight: {
    flex: 0.8,
    minWidth: 260,
    justifyContent: 'center',
  },

  checkListWrap: {
    gap: 14,
  },

  checkListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
  },

  checkListText: {
    flex: 1,
    color: BRAND.text,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },

  themePreviewCard: {
    backgroundColor: BRAND.warm,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: 18,
    gap: 14,
  },

  themePreviewTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: BRAND.secondary,
    marginBottom: 4,
  },

  themeRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: 12,
  },

  themeSwatch: {
    width: 22,
    height: 22,
    borderRadius: 999,
  },

  themeName: {
    fontSize: 15,
    fontWeight: '700',
    color: BRAND.text,
  },

  themeDescription: {
    fontSize: 13,
    color: BRAND.muted,
    marginTop: 2,
  },

  secondaryCard: {
    backgroundColor: '#0F172A',
    borderRadius: 26,
    padding: 22,
    minWidth: 260,
    marginHorizontal: 9,
    marginBottom: 18,
    flexGrow: 1,
  },

  secondaryCardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 10,
  },

  secondaryCardText: {
    color: '#CBD5E1',
    fontSize: 15,
    lineHeight: 24,
  },

  installSection: {
    flexDirection: 'row',
    gap: 20,
    flexWrap: 'wrap',
    marginBottom: 38,
  },

  installBox: {
    flex: 1.2,
    minWidth: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: 22,
  },

  installTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: BRAND.secondary,
    marginBottom: 14,
  },

  installText: {
    fontSize: 15,
    lineHeight: 25,
    color: BRAND.muted,
    marginBottom: 10,
  },

  contactBox: {
    flex: 0.8,
    minWidth: 280,
    backgroundColor: BRAND.soft,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 22,
  },

  contactTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: BRAND.secondary,
    marginBottom: 14,
  },

  contactText: {
    fontSize: 15,
    lineHeight: 24,
    color: BRAND.muted,
    marginBottom: 8,
  },

  contactButton: {
    marginTop: 12,
    backgroundColor: BRAND.primary,
    borderRadius: 999,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },

  contactButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },

  reviewsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    marginBottom: 20,
  },

  reviewCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: 20,
  },

  reviewStars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 14,
  },

  reviewText: {
    fontSize: 15,
    lineHeight: 24,
    color: BRAND.text,
    marginBottom: 18,
  },

  reviewName: {
    fontSize: 15,
    fontWeight: '800',
    color: BRAND.secondary,
  },

  reviewRole: {
    fontSize: 13,
    color: BRAND.muted,
    marginTop: 4,
  },

  pressed: {
    opacity: 0.88,
  },

});