import React, { useEffect, useState, useRef } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/lib/supabase';
import { getCurrentUserProfile, getRoleHomeRoute } from '../src/lib/auth';
import PublicPageLayout from '../src/components/layout/PublicPageLayout';
import WebFooter from '../src/components/layout/WebFooter';
import MobileClinicsLogout from '../src/common/MobileClinicsLogout';
import FloatingChatButton from '../src/common/FloatingChatButton';

const DEFAULT_THEME = {
  primary: '#1D4ED8',
  secondary: '#0F172A',
  soft: '#EFF6FF',
};

type Clinic = {

  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  primary_color: string | null;
  is_active: boolean | null;

};

type MembershipClinicRow = {

  clinic_id: string;
  clinics: Clinic | Clinic[] | null;

};

function ClinicAnimatedCard({
  clinic,
  onPress,
}: {
  clinic: Clinic;
  onPress: () => void;
}) {

  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  const clinicPrimary = clinic.primary_color || DEFAULT_THEME.primary;

  const animateIn = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1.018,
        useNativeDriver: false,
        friction: 8,
      }),
      Animated.spring(translateY, {
        toValue: -6,
        useNativeDriver: false,
        friction: 8,
      }),
      Animated.timing(glow, {
        toValue: 1,
        duration: 180,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const animateOut = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: false,
        friction: 8,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: false,
        friction: 8,
      }),
      Animated.timing(glow, {
        toValue: 0,
        duration: 180,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const animatedShadowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.05, 0.12],
  });

  const animatedShadowRadius = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 18],
  });

  const animatedCardTint = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.06],
  });

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={animateIn}
      onHoverOut={animateOut}
      onPressIn={animateIn}
      onPressOut={animateOut}
      style={styles.clinicCardPressable}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.clinicCard,
            {
              borderColor: clinicPrimary,
              shadowOpacity: animatedShadowOpacity as any,
              shadowRadius: animatedShadowRadius as any,
              transform: [{ scale }, { translateY }],
            },
            pressed && styles.pressed,
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              styles.clinicCardTintOverlay,
              {
                backgroundColor: clinicPrimary,
                opacity: animatedCardTint as any,
              },
            ]}
          />

          <View
            style={[
              styles.colorDot,
              { backgroundColor: clinicPrimary },
            ]}
          />

          <Text style={styles.clinicName}>{clinic.name}</Text>

          <Text style={styles.clinicDescription}>
            {clinic.description || 'Clinic available in the platform.'}
          </Text>

          <View style={styles.cardBottom}>
            <Text style={[styles.cardBottomText, { color: clinicPrimary }]}>
              Continue
            </Text>
            <Ionicons name="arrow-forward" size={18} color={clinicPrimary} />
          </View>
        </Animated.View>
      )}
    </Pressable>
  );
}

export default function ClinicSelectionScreen() {

  const [loading, setLoading] = useState(true);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {

    const loadData = async () => {
      try {
        setLoading(true);
        setError('');

        const { user, profile, error: profileError } = await getCurrentUserProfile();

        if (profileError || !user || !profile) {
          router.replace('/login');
          return;
        }

        if (profile.role === 'platform_admin') {
          router.replace('/main-platform-admin');
          return;
        }

        if (profile.role === 'patient') {
          const { data, error: clinicsError } = await supabase
            .from('clinics')
            .select('id, name, slug, description, primary_color, is_active')
            .eq('is_active', true)
            .order('name', { ascending: true });

          if (clinicsError) {
            setError(clinicsError.message);
            return;
          }

          setClinics(data ?? []);
          return;
        }

        if (profile.role === 'doctor' || profile.role === 'clinic_admin') {
          const membershipRole = profile.role;

          const { data, error: membershipsError } = await supabase
            .from('clinic_memberships')
            .select(`
              clinic_id,
              clinics (
                id,
                name,
                slug,
                description,
                primary_color,
                is_active
              )
            `)
            .eq('profile_id', user.id)
            .eq('role', membershipRole)
            .eq('is_active', true);

          if (membershipsError) {
            setError(membershipsError.message);
            return;
          }

          const assignedClinics: Clinic[] = (((data as MembershipClinicRow[] | null) ?? [])
              .map((item) => {
                if (Array.isArray(item.clinics)) {
                  return item.clinics[0] ?? null;
                }
                return item.clinics ?? null;
              })
              .filter((clinic): clinic is Clinic => Boolean(clinic))
          );

          if (assignedClinics.length === 0) {
            setError(
              membershipRole === 'doctor'
                ? 'No clinics are assigned to this doctor yet.'
                : 'No clinics are assigned to this clinic admin yet.'
            );
            return;
          }

          if (assignedClinics.length === 1) {
            const onlyClinic = assignedClinics[0];

            const { error: updateProfileError } = await supabase
              .from('profiles')
              .update({ active_clinic_id: onlyClinic.id })
              .eq('id', user.id);

            if (updateProfileError) {
              setError(updateProfileError.message);
              return;
            }

            router.replace({
              pathname: getRoleHomeRoute(profile.role) as any,
              params: {
                clinicId: onlyClinic.id,
                clinicName: onlyClinic.name,
              },
            });
            return;
          }

          setClinics(assignedClinics);
          return;
        }

        setError('Unsupported role for clinic selection.');
      } catch {
        setError('Unable to load clinics.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  
  }, []);

  const openConfirm = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setConfirmOpen(true);
  };

  const handleConfirmClinic = async () => {

    if (!selectedClinic) return;

    try {

      setError('');

      const { user, profile, error: profileError } = await getCurrentUserProfile();

      if (profileError || !user || !profile) {
        router.replace('/login');
        return;
      }

      if (profile.role === 'patient') {
        const { error: upsertError } = await supabase
          .from('clinic_memberships')
          .upsert(
            {
              profile_id: user.id,
              clinic_id: selectedClinic.id,
              role: 'patient',
            },
            {
              onConflict: 'clinic_id,profile_id',
            }
          );

        if (upsertError) {
          setError(upsertError.message);
          setConfirmOpen(false);
          return;
        }
      }

      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({ active_clinic_id: selectedClinic.id })
        .eq('id', user.id);

      if (updateProfileError) {
        setError(updateProfileError.message);
        setConfirmOpen(false);
        return;
      }

      setConfirmOpen(false);

      router.replace({
        pathname: getRoleHomeRoute(profile.role) as any,
        params: {
          clinicId: selectedClinic.id,
          clinicName: selectedClinic.name,
        },
      });
    
    } catch {
      setError('Unable to continue with this clinic.');
      setConfirmOpen(false);
    }

  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={DEFAULT_THEME.primary}/>
      </View>
    );
  }

  return (

    <PublicPageLayout>

      <ScrollView contentContainerStyle={styles.container}>
        
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <View
              style={[
                styles.headerIcon,
                { backgroundColor: DEFAULT_THEME.soft },
              ]}
            >
              <Ionicons
                name="business-outline"
                size={24}
                color={DEFAULT_THEME.primary}
              />
            </View>

          { Platform.OS !== 'web' && <MobileClinicsLogout inline/> }
          </View>

          <Text style={styles.title}>Choose Your Clinic</Text>
          <Text style={styles.subtitle}>
            Select the clinic you want to continue with. After confirmation, you will be redirected to your main dashboard.
          </Text>

          {!!error && <Text style={styles.error}>{error}</Text>}
        
        </View>

        {clinics.length > 0 ? (
          <View style={styles.grid}>
            {clinics.map((clinic) => (
              <ClinicAnimatedCard
                key={clinic.id}
                clinic={clinic}
                onPress={() => openConfirm(clinic)}
              />
            ))}
          </View>
        ) : !error ? (
          <View style={styles.emptyCard}>
            <Ionicons name="alert-circle-outline" size={24} color="#F59E0B" />
            <Text style={styles.emptyTitle}>No clinics available yet!</Text>
            <Text style={styles.emptyText}>
              There are no clinics available for your account right now.
            </Text>
          </View>
        ) : null}

        {Platform.OS === 'web' && <WebFooter/>}
      
      </ScrollView>

      <FloatingChatButton/>

      <Modal visible={confirmOpen} transparent animationType="fade">

        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Clinic Access Confirmation</Text>

            <Text style={styles.modalText}>
              Are you sure you want to continue with{' '}
              <Text style={styles.boldText}>{selectedClinic?.name}</Text>?
            </Text>

            <Text style={styles.modalSubtext}>
              By choosing to continue, the app will load the data related to this clinic.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setConfirmOpen(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.confirmButton,
                  { backgroundColor: DEFAULT_THEME.primary },
                ]}
                onPress={handleConfirmClinic}
              >
                <Text style={styles.confirmButtonText}>Yes, continue</Text>
              </Pressable>
            </View>
          </View>
        </View>
      
      </Modal>
    
    </PublicPageLayout>

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
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 56 : 32,
    paddingBottom: 48,
    maxWidth: 1380,
    width: '100%',
    alignSelf: 'center',
  },

  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 28,
    marginBottom: 24,
  },

  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },

  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 16,
    lineHeight: 26,
    color: '#475569',
  },

  error: {
    color: '#DC2626',
    marginTop: 12,
    fontSize: 14,
    lineHeight: 22,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    marginBottom: 24,
  },

  clinicCardPressable: {
    flex: 1,
    minWidth: 260,
  },

  clinicCard: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  clinicCardTintOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
  },

  colorDot: {
    width: 18,
    height: 18,
    borderRadius: 999,
    marginBottom: 14,
  },

  clinicName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },

  clinicDescription: {
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
    marginBottom: 18,
  },

  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  cardBottomText: {
    fontWeight: '700',
    fontSize: 15,
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },

  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    textAlign: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  modalCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 12,
  },

  modalText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#334155',
    marginBottom: 10,
  },

  modalSubtext: {
    fontSize: 14,
    lineHeight: 22,
    color: '#64748B',
    marginBottom: 20,
  },

  boldText: {
    fontWeight: '800',
    color: '#0F172A',
  },

  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },

  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  cancelButtonText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 15,
  },

  confirmButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },

  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },

  pressed: {
    opacity: 0.9,
  },

});