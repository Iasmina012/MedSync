import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { Redirect, router } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View, ActivityIndicator, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/lib/supabase';
import PublicPageLayout from '../src/components/layout/PublicPageLayout';
import WebFooter from '../src/components/layout/WebFooter';
import HoverCard from '../src/common/HoverCard';

const BRAND = {

  primary: '#1D4ED8',
  secondary: '#0F172A',
  accent: '#06B6D4',
  soft: '#EFF6FF',
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

type Review = {

  id: string;
  name: string;
  email?: string | null;
  text: string;
  rating: number;

};

type ClinicPreview = {

  id: string;
  name: string;
  subtitle: string;
  patients: number;
  appointments: number;
  doctors: number;
  services: number;
  technologies: number;
  primary: string;

};

const primaryFeatures: FeatureCard[] = [

  {
    icon: 'calendar-outline',
    title: 'Appointment Management',
    description:
      'Book, reschedule if needed, cancel appointments through an intuitive scheduling experience.',
  },

  {
    icon: 'business-outline',
    title: 'Multi-Clinic Platform',
    description:
      'Support multiple healthcare organizations with clinic specific branding, users and services.',
  },

  {
    icon: 'sparkles-outline',
    title: 'AI Healthcare Assistance',
    description:
      'Use AI-powered triage and guidance tools to improve healthcare accessibility and efficiency.',
  },

];

const secondaryFeatures: FeatureCard[] = [

  {
    icon: 'chatbubbles-outline',
    title: 'Secure Messaging',
    description:
      'Communicate directly with healthcare professionals in a secure environment.',
  },

  {
    icon: 'document-text-outline',
    title: 'Electronic Medical Records',
    description:
      'Store and access medical information, documents and healthcare history.',
  },

  {
    icon: 'bar-chart-outline',
    title: 'Analytics & Insights',
    description:
      'Track clinic performance, appointments and operational metrics through interactive dashboards.',
  },

  {
    icon: 'watch-outline',
    title: 'Automated Notifications',
    description:
      'Keep patients informed with appointment reminders and important notifications.',
  },

];

function AnimatedNumber({
  value,
  suffix = '',
  style,
}: {
  value: number | string;
  suffix?: string;
  style?: any;
}) {

  const isNumeric = typeof value === 'number';
  const animated = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {

    if (!isNumeric) return;

    animated.setValue(0);

    const listener = animated.addListener(({ value }) => {
      setDisplayValue(Math.floor(value));
    });

    Animated.timing(animated, {
      toValue: value,
      duration: 900,
      useNativeDriver: false,
    }).start();

    return () => {
      animated.removeListener(listener);
    };
  
  }, [animated, value, isNumeric]);

  if (!isNumeric) {
    return <Text style={style}>{String(value)}</Text>;
  }

  return (
    <Text style={style}>
      {displayValue}
      {suffix}
    </Text>
  );

}

function LiveDot() {

  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {

    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.9,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.08,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.85,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();

  }, [opacity, scale]);

  return (

    <View style={styles.liveDotWrap}>
      <Animated.View
        style={[
          styles.liveDotPulse,
          {
            transform: [{ scale }],
            opacity,
          },
        ]}
      />
      <View style={styles.liveDotCoreOuter}>
        <View style={styles.liveDotCoreInner}/>
      </View>
    </View>

  );

}

function CTAButton({
  title,
  variant = 'primary',
  onPress,
}: {
  title: string;
  variant?: 'primary' | 'secondary';
  onPress?: () => void;
}) {

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

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {

  return (
    <View style={styles.sectionTitleWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );

}

export default function HomeScreen() {

  const { width } = useWindowDimensions();
  const isMobile = width < 900;
  const isSmall = width < 640;
  const isWeb = Platform.OS === 'web';

  const [clinicPreviews, setClinicPreviews] = useState<ClinicPreview[]>([]);
  const [clinicsLoading, setClinicsLoading] = useState(true);

  const randomClinic = useMemo(() => {

    if (clinicPreviews.length === 0) {
      return {
        id: 'fallback',
        name: 'MedSync Clinic',
        subtitle: 'Digital clinic dashboard',
        patients: 0,
        appointments: 0,
        doctors: 0,
        services: 0,
        technologies: 0,
        primary: BRAND.primary,
      };
    }

    return clinicPreviews[Math.floor(Math.random() * clinicPreviews.length)];

  }, [clinicPreviews]);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  const [reviewTrackIndex, setReviewTrackIndex] = useState(0);
  const [isSliding, setIsSliding] = useState(false);

  const [reviewFirstName, setReviewFirstName] = useState('');
  const [reviewLastName, setReviewLastName] = useState('');
  const [reviewEmail, setReviewEmail] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const reviewTranslateX = useRef(new Animated.Value(-1)).current;
  const autoplayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reviewsPerPage = width < 850 ? 1 : 3;
  const reviewsLoopDisabled = reviews.length <= reviewsPerPage;

  const reviewGap = 20;
  const reviewCardWidth = width < 850 ? Math.max(280, width - 170) : 340;
  const translateDistance = reviewCardWidth + reviewGap;
  const reviewVisibleCount = Math.min(reviewsPerPage, Math.max(reviews.length, 1));
  const reviewVisibleWidth = reviewVisibleCount * reviewCardWidth + Math.max(0, reviewVisibleCount - 1) * reviewGap;
  const reviewCardInlineStyle = useMemo(() => { return { width: reviewCardWidth }; }, [reviewCardWidth]);

  const loadReviews = async () => {

    try {
      setReviewsLoading(true);
      setReviewError('');

      const { data, error } = await supabase
        .from('platform_reviews')
        .select('id, name, email, review_text, rating, created_at')
        .eq('is_visible', true)
        .order('created_at', { ascending: false });

      if (error) {
        setReviews([]);
        setReviewError('Could not load reviews.');
        return;
      }

      const mapped: Review[] = (data ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        email: item.email,
        text: item.review_text,
        rating: item.rating ?? 5,
      }));

      setReviews(mapped);
    } finally {
      setReviewsLoading(false);
    }

  };

  useEffect(() => {
    loadReviews();
  }, []);

  const loadClinicPreviews = async () => {

    try {
      setClinicsLoading(true);

      const { data: clinics, error } = await supabase
        .from('clinics')
        .select('id, name, description, primary_color, is_active')
        .eq('is_active', true)
        .limit(3);

      if (error) {
        setClinicPreviews([]);
        return;
      }

      const mapped = await Promise.all(
        (clinics ?? []).map(async (clinic) => {
          const today = new Date().toISOString().slice(0, 10);

          const { count: patientsCount } = await supabase
            .from('clinic_memberships')
            .select('id', { count: 'exact', head: true })
            .eq('clinic_id', clinic.id)
            .eq('role', 'patient')
            .eq('is_active', true);

          const { count: appointmentsCount } = await supabase
            .from('appointments')
            .select('id', { count: 'exact', head: true })
            .eq('clinic_id', clinic.id)
            .eq('appointment_date', today)
            .in('status', ['scheduled', 'rescheduled', 'checked_in']);

          const { count: doctorsCount } = await supabase
            .from('doctors')
            .select('id', { count: 'exact', head: true })
            .eq('clinic_id', clinic.id)
            .eq('is_active', true);

          const { count: servicesCount } = await supabase
            .from('clinic_services')
            .select('id', { count: 'exact', head: true })
            .eq('clinic_id', clinic.id)
            .eq('is_active', true);

          const { count: technologiesCount } = await supabase
            .from('clinic_technologies')
            .select('id', { count: 'exact', head: true })
            .eq('clinic_id', clinic.id);

          return {
            id: clinic.id,
            name: clinic.name || 'Clinic',
            subtitle: clinic.description || 'Digital clinic dashboard',
            patients: patientsCount ?? 0,
            appointments: appointmentsCount ?? 0,
            doctors: doctorsCount ?? 0,
            services: servicesCount ?? 0,
            technologies: technologiesCount ?? 0,
            primary: clinic.primary_color || BRAND.primary,
          };
        })
      );

      setClinicPreviews(mapped);
    } finally {
      setClinicsLoading(false);
    }
  
  };

  useEffect(() => {
    loadClinicPreviews();
  }, []);

  useEffect(() => {

    const loadLoggedUserForReview = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const metadata = user.user_metadata ?? {};

      const first =
        metadata.first_name ||
        metadata.firstName ||
        metadata.given_name ||
        '';

      const last =
        metadata.last_name ||
        metadata.lastName ||
        metadata.family_name ||
        '';

      const fullName =
        metadata.full_name ||
        metadata.fullName ||
        metadata.name ||
        '';

      let resolvedFirstName = String(first).trim();
      let resolvedLastName = String(last).trim();

      if ((!resolvedFirstName || !resolvedLastName) && fullName) {
        const parts = String(fullName).trim().split(/\s+/).filter(Boolean);

        if (!resolvedFirstName) {
          resolvedFirstName = parts[0] || '';
        }

        if (!resolvedLastName) {
          resolvedLastName = parts.slice(1).join(' ') || '';
        }
      }

      if (resolvedFirstName) {
        setReviewFirstName(resolvedFirstName);
      }

      if (resolvedLastName) {
        setReviewLastName(resolvedLastName);
      }

      if (user.email) {
        setReviewEmail(user.email);
      }
    };

    loadLoggedUserForReview();
  
  }, []);

  const getReviewWindow = useCallback(
    (startIndex: number) => {
      if (reviews.length === 0) return [];

      return Array.from(
        { length: Math.min(reviewsPerPage, reviews.length) },
        (_, index) => reviews[(startIndex + index) % reviews.length]
      );
    },
    [reviews, reviewsPerPage]
  );

  useEffect(() => {
    if (reviews.length === 0) {
      setReviewTrackIndex(0);
      reviewTranslateX.setValue(0);
      return;
    }
    const safeStartIndex = reviewsLoopDisabled ? 0 : reviews.length;
    setReviewTrackIndex(safeStartIndex);
    reviewTranslateX.setValue(reviewsLoopDisabled ? 0 : -safeStartIndex * translateDistance);
  }, [reviews.length, reviewsLoopDisabled, reviewTranslateX, translateDistance]);

  const normalizedReviewIndex = reviews.length === 0 ? 0 : ((reviewTrackIndex % reviews.length) + reviews.length) % reviews.length;

  const currentReviews = useMemo(() => { return getReviewWindow(normalizedReviewIndex); }, [getReviewWindow, normalizedReviewIndex]);
  const animatedReviews = useMemo(() => {
    if (reviews.length === 0) 
      return [];
    if (reviewsLoopDisabled) 
      return currentReviews;
    return [...reviews, ...reviews, ...reviews];
  }, [currentReviews, reviews, reviewsLoopDisabled]);

  const clearAutoplay = useCallback(() => {
    if (autoplayRef.current) {
      clearTimeout(autoplayRef.current);
      autoplayRef.current = null;
    }
  }, []);

  const runSlide = useCallback(
    (direction: 'left' | 'right') => {
      if (reviewsLoopDisabled || isSliding || reviews.length === 0) 
        return;

      setIsSliding(true);

      const currentIndex = reviewTrackIndex || reviews.length;
      const nextIndex = direction === 'right' ? currentIndex + 1 : currentIndex - 1;

      reviewTranslateX.stopAnimation();

      Animated.timing(reviewTranslateX, {
        toValue: -nextIndex * translateDistance,
        duration: 720,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) {
          setIsSliding(false);
          return;
        }

        let safeIndex = nextIndex;

        if (direction === 'right' && nextIndex >= reviews.length * 2)
          safeIndex = reviews.length;

        if (direction === 'left' && nextIndex <= reviews.length - 1)
          safeIndex = reviews.length * 2 - 1;

        setReviewTrackIndex(safeIndex);

        requestAnimationFrame(() => {
          reviewTranslateX.setValue(-safeIndex * translateDistance);
          setIsSliding(false);
        });
      });
    },
    [
      reviewsLoopDisabled,
      isSliding,
      reviews.length,
      reviewTrackIndex,
      reviewTranslateX,
      translateDistance,
    ]
  );

  const handlePrevReviews = useCallback(() => {
    clearAutoplay();
    runSlide('left');
  }, [clearAutoplay, runSlide]);

  const handleNextReviews = useCallback(() => {
    clearAutoplay();
    runSlide('right');
  }, [clearAutoplay, runSlide]);

  useEffect(() => {

    clearAutoplay();

    if (reviewsLoopDisabled || isSliding) return;

    autoplayRef.current = setTimeout(() => {
      runSlide('right');
    }, 4200);

    return () => {
      clearAutoplay();
    };
  }, [
    reviewTrackIndex,
    reviews.length,
    reviewsPerPage,
    reviewsLoopDisabled,
    isSliding,
    clearAutoplay,
    runSlide,

  ]);

  const handleAddReview = async () => {
  
    const trimmedFirstName = reviewFirstName.trim();
    const trimmedLastName = reviewLastName.trim();
    const trimmedName = `${trimmedFirstName} ${trimmedLastName}`.trim();
    const trimmedEmail = reviewEmail.trim().toLowerCase();
    const trimmedText = reviewText.trim();

    if (!trimmedFirstName || !trimmedLastName || !trimmedEmail || !trimmedText) {
      setReviewError('Please complete all review fields.');
      setReviewSuccess('');
      return;
    }

    const emailIsValid = /\S+@\S+\.\S+/.test(trimmedEmail);

    if (!emailIsValid) {
      setReviewError('Please enter a valid email address.');
      setReviewSuccess('');
      return;
    }

    try {
      setReviewSubmitting(true);
      setReviewError('');
      setReviewSuccess('');

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from('platform_reviews').insert({
        user_id: user?.id ?? null,
        name: trimmedName,
        email: trimmedEmail,
        review_text: trimmedText,
        rating: reviewRating,
        is_visible: true,
      });

      if (error) {
        setReviewError(error.message);
        return;
      }

      setReviewFirstName('');
      setReviewLastName('');
      setReviewEmail('');
      setReviewText('');
      setReviewRating(5);
      setReviewSuccess('Your review was added successfully.');

      await loadReviews();
      setReviewTrackIndex(reviews.length);
    } catch {
      setReviewError('Could not submit your review.');
    } finally {
      setReviewSubmitting(false);
    }

  };

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
              <Ionicons name="pulse-outline" size={16} color={BRAND.primary}/>
              <Text style={styles.badgeText}>MedSync · Connected Healthcare</Text>
            </View>

            <Text style={[styles.heroTitle, isSmall && styles.heroTitleSmall]}>
              Built for Every Healthcare Role
            </Text>

            <Text style={styles.heroDescription}>
              MedSync provides dedicated experiences for patients, doctors, clinic administrators and platform administrators, ensuring that every user has access to the tools they need.
            </Text>

            <View
              style={[styles.heroButtonsRow, isSmall && styles.heroButtonsColumn]}
            >
              <CTAButton title="Start by Logging In" onPress={() => router.push('/login')}/>
              <CTAButton title="Create an Account" variant="secondary" onPress={() => router.push('/signup')}/>
            </View>

            <View style={[styles.metricsRow, isSmall && styles.metricsColumn]}>
              <View style={styles.metricCard}>
                <AnimatedNumber value={4} style={styles.metricValue}/>
                <Text style={styles.metricLabel}>core roles</Text>
              </View>
              <View style={styles.metricCard}>
                <AnimatedNumber value="Web" style={styles.metricValue}/>
                <Text style={styles.metricLabel}>plus iOS & Android</Text>
              </View>
              <View style={styles.metricCard}>
                <AnimatedNumber value="AI" style={styles.metricValue}/>
                <Text style={styles.metricLabel}>ready features</Text>
              </View>
            </View>
          </View>

          <View style={[styles.heroRight, isMobile && styles.heroRightMobile]}>
            <HoverCard style={styles.previewCardLarge}>
              <View style={styles.previewHeader}>
                <View style={styles.previewDotRow}>
                  <View style={[styles.dot, { backgroundColor: '#EF4444' }]}/>
                  <View style={[styles.dot, { backgroundColor: '#F59E0B' }]}/>
                  <View style={[styles.dot, { backgroundColor: '#10B981' }]}/>
                </View>
                <Text style={styles.previewHeaderText}>Clinic Dashboard</Text>
              </View>

              <View
                style={[
                  styles.previewBanner,
                  { backgroundColor: randomClinic.primary },
                ]}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.previewBannerTitle} numberOfLines={1}>{randomClinic.name}</Text>
                  <Text style={styles.previewBannerSubtitle} numberOfLines={2}>{randomClinic.subtitle}</Text>
                </View>

                <View style={styles.previewStatusPillLive}>
                  <LiveDot />
                  <Text style={styles.previewStatusPillText}>Live</Text>
                </View>
              </View>

              <View style={styles.previewStatsGrid}>
                <View style={styles.previewSmallCard}>
                  <Ionicons
                    name="people-outline"
                    size={18}
                    color={randomClinic.primary}
                  />
                  <AnimatedNumber
                    value={clinicsLoading ? 0 : randomClinic.patients}
                    style={styles.previewSmallValue}
                  />
                  <Text style={styles.previewSmallLabel}>Active Patients</Text>
                </View>

                <View style={styles.previewSmallCard}>
                  <Ionicons
                    name="calendar-clear-outline"
                    size={18}
                    color={randomClinic.primary}
                  />
                  <AnimatedNumber
                    value={clinicsLoading ? 0 : randomClinic.appointments}
                    style={styles.previewSmallValue}
                  />
                  <Text style={styles.previewSmallLabel}>Appointments Today</Text>
                </View>
              </View>

              <View style={styles.previewListCard}>
                <Text style={styles.previewListTitle}>Clinic Operations</Text>

                {[
                  {
                    icon: 'medkit-outline' as const,
                    label: `${randomClinic.doctors} available doctors`,
                  },
                  {
                    icon: 'list-outline' as const,
                    label: `${randomClinic.services} available services`,
                  },
                  {
                    icon: 'hardware-chip-outline' as const,
                    label: `${randomClinic.technologies} available technologies`,
                  },
                  ].map((item) => (
                    <View key={item.label} style={styles.previewListItem}>
                      <Ionicons name={item.icon} size={18} color={randomClinic.primary}/>
                      <Text style={styles.previewListItemText}>{item.label}</Text>
                    </View>
                  ))}
              </View>
            </HoverCard>
          </View>
        </View>

        <SectionTitle
          title="What does the app offer?"
          subtitle="MedSync delivers role-specific experiences for patients, healthcare professionals, clinic administrators, and platform administrators, empowering each user with the resources they need."
        />

        <View style={styles.primaryFeaturesRow}>
          {primaryFeatures.map((feature, index) => (
            <View key={feature.title} style={styles.primaryFeatureItem}>
              <HoverCard style={styles.featureCard}>
                <View style={styles.featureIconWrap}>
                  <Ionicons name={feature.icon} size={24} color={BRAND.primary}/>
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
                <Text style={styles.featureIndex}>0{index + 1}</Text>
              </HoverCard>
            </View>
          ))}
        </View>

        <View style={styles.customSection}>
          <View style={styles.customSectionLeft}>
            <SectionTitle
              title="Multi-Tenant Healthcare Architecture"
              subtitle="A scalable architecture that enables multiple healthcare organizations to operate independently while sharing a common technology platform."
            />
            <View style={styles.checkListWrap}>
              {[
                'Clinic specific name and identity',
                'Different colors and branding examples',
                'Doctors and patients separated by clinic',
                'Reusable system for future expansion',
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
              <Text style={styles.themePreviewTitle}>Branding Examples</Text>

              <View style={styles.themeRow}>
                <View style={[styles.themeSwatch, { backgroundColor: '#1D4ED8' }]}/>
                <View>
                  <Text style={styles.themeName}>Blue Healthcare Theme</Text>
                  <Text style={styles.themeDescription}>
                    Modern and professional design focused on trust and accessibility.
                  </Text>
                </View>
              </View>

              <View style={styles.themeRow}>
                <View style={[styles.themeSwatch, { backgroundColor: '#059669' }]}/>
                <View>
                  <Text style={styles.themeName}>Green Wellness Theme</Text>
                  <Text style={styles.themeDescription}>
                    A calm and wellness oriented experience suitable for prevention.
                  </Text>
                </View>
              </View>

              <View style={styles.themeRow}>
                <View style={[styles.themeSwatch, { backgroundColor: '#7C3AED' }]}/>
                <View>
                  <Text style={styles.themeName}>Purple Specialist Theme</Text>
                  <Text style={styles.themeDescription}>
                    Designed for clinics requiring a premium identity.
                  </Text>
                </View>
              </View>

              <View style={styles.themeRow}>
                <View style={[styles.themeSwatch, { backgroundColor: '#F59E0B' }]}/>
                <View>
                  <Text style={styles.themeName}>Orange Innovation Theme</Text>
                  <Text style={styles.themeDescription}>
                    A vibrant experience for technology and patient engagement.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <SectionTitle
          title="Integrated Digital Healthcare Ecosystem"
          subtitle="Combining communication, medical documentation, analytics and automation into a single healthcare platform."
        />

        <View style={styles.secondaryGrid}>
          <View style={styles.secondaryRow}>
            {secondaryFeatures.slice(0, 2).map((feature) => (
              <View key={feature.title} style={styles.secondaryItem}>
                <HoverCard style={styles.secondaryCard}>
                  <Ionicons name={feature.icon} size={22} color={BRAND.accent}/>
                  <Text style={styles.secondaryCardTitle}>{feature.title}</Text>
                  <Text style={styles.secondaryCardText}>{feature.description}</Text>
                </HoverCard>
              </View>
            ))}
          </View>

          <View style={styles.secondaryRow}>
            {secondaryFeatures.slice(2, 4).map((feature) => (
              <View key={feature.title} style={styles.secondaryItem}>
                <HoverCard style={styles.secondaryCard}>
                  <Ionicons name={feature.icon} size={22} color={BRAND.accent}/>
                  <Text style={styles.secondaryCardTitle}>{feature.title}</Text>
                  <Text style={styles.secondaryCardText}>{feature.description}</Text>
                </HoverCard>
              </View>
            ))}
          </View>
        </View>

        <SectionTitle
          title="Reviews"
          subtitle="Insights and feedback from patients, healthcare professionals and clinic administrators."
        />

        <View style={styles.reviewSubmitCard}>
          <View style={styles.reviewSubmitHeader}>
            <View style={styles.reviewSubmitIconWrap}>
              <Ionicons name="chatbox-ellipses-outline" size={20} color="#1D4ED8"/>
            </View>

            <View style={styles.reviewSubmitHeaderTextWrap}>
              <Text style={styles.reviewSubmitTitle}>Share Your Experience</Text>
              <Text style={styles.reviewSubmitSubtitle}>
                Help us improve MedSync by sharing your experience using the platform.
              </Text>
            </View>
          </View>

          <View style={styles.ratingRow}>
            <Text style={styles.ratingLabel}>Your rating</Text>

            <View style={styles.ratingStars}>
              {Array.from({ length: 5 }).map((_, index) => {
                const starValue = index + 1;
                const active = starValue <= reviewRating;

                return (
                  <Pressable
                    key={starValue}
                    onPress={() => setReviewRating(starValue)}
                    style={({ pressed }) => [
                      styles.ratingStarButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons
                      name={active ? 'star' : 'star-outline'}
                      size={22}
                      color="#F59E0B"
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.reviewFormRow}>
            <TextInput
              placeholder="First name"
              placeholderTextColor="#94A3B8"
              value={reviewFirstName}
              onChangeText={setReviewFirstName}
              style={styles.reviewInput}
            />

            <TextInput
              placeholder="Last name"
              placeholderTextColor="#94A3B8"
              value={reviewLastName}
              onChangeText={setReviewLastName}
              style={styles.reviewInput}
            />
          </View>

          <TextInput
            placeholder="Your email"
            placeholderTextColor="#94A3B8"
            value={reviewEmail}
            onChangeText={setReviewEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={[styles.reviewInput, styles.reviewEmailInput]}
          />

          <TextInput
            placeholder="Write your review"
            placeholderTextColor="#94A3B8"
            value={reviewText}
            onChangeText={setReviewText}
            style={[styles.reviewInput, styles.reviewTextarea]}
            multiline
          />

          {!!reviewError && <Text style={styles.reviewError}>{reviewError}</Text>}
          {!!reviewSuccess && <Text style={styles.reviewSuccess}>{reviewSuccess}</Text>}

          <Pressable
            style={[
              styles.reviewButton,
              reviewSubmitting && styles.reviewButtonDisabled,
            ]}
            onPress={handleAddReview}
            disabled={reviewSubmitting}
          >
            <Text style={styles.reviewButtonText}>
              {reviewSubmitting ? 'Submitting...' : 'Submit review'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.reviewsCarouselRow}>
          <Pressable
            style={({ pressed }) => [
              styles.reviewArrowButton,
              pressed && styles.pressed,
              (reviewsLoopDisabled || isSliding) && styles.disabledArrow,
            ]}
            onPress={handlePrevReviews}
            disabled={reviewsLoopDisabled || isSliding}
          >
            <Ionicons name="chevron-back" size={22} color="#0F172A"/>
          </Pressable>

          <View style={styles.reviewsViewport}>
            {reviewsLoading ? (
              <View style={styles.reviewsLoadingWrap}>
                <ActivityIndicator size="small" color="#1D4ED8"/>
              </View>
            ) : reviews.length === 0 ? (
              <View style={styles.noReviewsCard}>
                <Ionicons name="chatbox-outline" size={22} color="#64748B"/>
                <Text style={styles.noReviewsTitle}>No reviews yet</Text>
                <Text style={styles.noReviewsText}>
                  Be the first person to leave a review for our platform.
                </Text>
              </View>
            ) : (
              <View
                style={[ styles.reviewsSliderOuter, { width: reviewVisibleWidth, maxWidth: '100%' },]}>
                <Animated.View style={[
                  styles.reviewsAnimatedTrack,
                  { gap: reviewGap },
                  { transform: [{ translateX: reviewsLoopDisabled ? 0 : reviewTranslateX }] },
                ]}>
                  {animatedReviews.map((review, index) => (
                    <HoverCard key={`${review.id}-${index}`} style={[styles.reviewCard, reviewCardInlineStyle]} disabled={isSliding} translateYTo={-5}>
                      <View>
                        <View style={styles.reviewStars}>
                          {Array.from({ length: 5 }).map((_, starIndex) => {
                            const starValue = starIndex + 1;
                            const active = starValue <= review.rating;

                            return (<Ionicons key={starIndex} name={active ? 'star' : 'star-outline'} size={16} color="#F59E0B"/>);
                          })}
                        </View>

                        <Text style={styles.reviewText}>“{review.text}”</Text>
                      </View>

                      <View>
                        <Text style={styles.reviewName}>{review.name}</Text>

                      </View>
                    </HoverCard>
                  ))}
                </Animated.View>
              </View>
            )}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.reviewArrowButton,
              pressed && styles.pressed,
              (reviewsLoopDisabled || isSliding) && styles.disabledArrow,
            ]}
            onPress={handleNextReviews}
            disabled={reviewsLoopDisabled || isSliding}
          >
            <Ionicons name="chevron-forward" size={22} color="#0F172A"/>
          </Pressable>
        </View>

        {Platform.OS === 'web' && <WebFooter/>}
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
    gap: 18,
    marginBottom: 26,
    maxWidth: 620,
  },

  heroButtonsColumn: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },

  ctaButton: {
    minHeight: 45,
    minWidth: 235,
    paddingHorizontal: 28,
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
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
  },

  previewBannerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    flexShrink: 1,
  },

  previewBannerSubtitle: {
    color: '#E2E8F0',
    fontSize: 13,
    marginTop: 4,
    flexShrink: 1,
  },

  previewStatusPillLive: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },

  liveDotWrap: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  liveDotPulse: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: '#EF4444',
  },

  liveDotCoreOuter: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  liveDotCoreInner: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#EF4444',
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

  primaryFeaturesRow: {
    flexDirection: 'row',
    gap: 18,
    marginBottom: 38,
  },

  primaryFeatureItem: {
    flex: 1,
  },

  featureCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: 22,
    position: 'relative',
    minHeight: 220,
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

  secondaryGrid: {
    marginBottom: 38,
    gap: 18,
  },

  secondaryRow: {
    flexDirection: 'row',
    gap: 18,
  },

  secondaryItem: {
    flex: 1,
  },

  secondaryCard: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 26,
    padding: 22,
    minHeight: 210,
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

  reviewSubmitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: 20,
    marginBottom: 18,
  },

  reviewSubmitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },

  reviewSubmitIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  reviewSubmitHeaderTextWrap: {
    flex: 1,
  },

  reviewSubmitTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: BRAND.secondary,
  },

  reviewSubmitSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: BRAND.muted,
    marginTop: 4,
  },

  ratingRow: {
    marginBottom: 14,
  },

  ratingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: BRAND.secondary,
    marginBottom: 8,
  },

  ratingStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  ratingStarButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7ED',
  },

  reviewFormRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },

  reviewInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    fontSize: 14,
    color: '#0F172A',
  },

  reviewTextarea: {
    minHeight: 96,
    textAlignVertical: 'top' as any,
    marginBottom: 12,
  },

  reviewError: {
    color: '#DC2626',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 10,
  },

  reviewSuccess: {
    color: '#059669',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 10,
  },

  reviewButton: {
    alignSelf: 'flex-start',
    backgroundColor: BRAND.primary,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },

  reviewButtonDisabled: {
    opacity: 0.7,
  },

  reviewButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },

  reviewsCarouselRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginBottom: 20,
  },

  reviewArrowButton: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BRAND.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  disabledArrow: {
    opacity: 0.45,
  },

  reviewsViewport: {
    flex: 1,
    overflow: 'hidden',
    minHeight: 260,
    justifyContent: 'center',
    alignItems: 'center',
  },

  reviewsSliderOuter: {
    overflow: 'hidden',
  },

  reviewsAnimatedTrack: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },

  reviewsLoadingWrap: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },

  noReviewsCard: {
    minHeight: 220,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  noReviewsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: BRAND.secondary,
    marginTop: 10,
    marginBottom: 6,
  },

  noReviewsText: {
    fontSize: 14,
    lineHeight: 22,
    color: BRAND.muted,
    textAlign: 'center',
    maxWidth: 360,
  },

  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: 18,
    minHeight: 250,
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },

  reviewStars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },

  reviewText: {
    fontSize: 14,
    lineHeight: 22,
    color: BRAND.text,
    marginBottom: 18,
  },

  reviewName: {
    fontSize: 14,
    fontWeight: '800',
    color: BRAND.secondary,
  },

  reviewEmail: {
    fontSize: 12,
    color: BRAND.muted,
    marginTop: 4,
  },

  reviewEmailInput: {
    marginBottom: 12,
  },

  pressed: {
    opacity: 0.88,
  },

});