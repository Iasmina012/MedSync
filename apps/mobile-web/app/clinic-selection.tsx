import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/lib/supabase';
import { getCurrentUserProfile } from '../src/lib/auth';
import PublicPageLayout from '../src/components/layout/PublicPageLayout';
import WebFooter from '../src/components/layout/WebFooter';
import MobileTopRightLogout from '../src/common/MobileClinicsLogout';
import FloatingChatButton from '../src/common/FloatingChatButton';

type Clinic = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  primary_color: string | null;
  is_active: boolean | null;
};

export default function SelectClinicScreen() {

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

        const { user, profile } = await getCurrentUserProfile();

        if (!user || !profile) {
          router.replace('/login');
          return;
        }

        const { data, error } = await supabase
          .from('clinics')
          .select('id, name, slug, description, primary_color, is_active')
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (error) {
          setError(error.message);
          return;
        }

        setClinics(data ?? []);
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
      const { user, profile } = await getCurrentUserProfile();

      if (!user || !profile) {
        router.replace('/login');
        return;
      }

      const { data: existingMembership, error: membershipCheckError } =
        await supabase
          .from('profile_clinics')
          .select('id')
          .eq('profile_id', user.id)
          .eq('clinic_id', selectedClinic.id)
          .maybeSingle();

      if (membershipCheckError) {
        setError(membershipCheckError.message);
        setConfirmOpen(false);
        return;
      }

      if (!existingMembership) {
        const { error: insertError } = await supabase
          .from('profile_clinics')
          .insert({
            profile_id: user.id,
            clinic_id: selectedClinic.id,
          });

        if (insertError) {
          setError(insertError.message);
          setConfirmOpen(false);
          return;
        }
      }

      setConfirmOpen(false);

      if (profile.role === 'admin') {
        router.replace({
          pathname: '/main-admin',
          params: {
            clinicId: selectedClinic.id,
            clinicName: selectedClinic.name,
          },
        });
        return;
      }

      if (profile.role === 'doctor') {
        router.replace({
          pathname: '/main-doctor',
          params: {
            clinicId: selectedClinic.id,
            clinicName: selectedClinic.name,
          },
        });
        return;
      }

      router.replace({
        pathname: '/main-patient',
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
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (

    <PublicPageLayout>

      <ScrollView contentContainerStyle={styles.container}>

        <MobileTopRightLogout/>

        <View style={styles.headerCard}>

          <View style={styles.headerIcon}>
            <Ionicons name="business-outline" size={24} color="#1D4ED8" />
          </View>

          <Text style={styles.title}>Choose Your Clinic</Text>
          <Text style={styles.subtitle}>
            Select the clinic you want to continue with. After confirmation, you will be redirected to the correct dashboard for your role.
          </Text>

          {!!error && <Text style={styles.error}>{error}</Text>}
        
        </View>

        <View style={styles.grid}>

          {clinics.map((clinic) => (
            <Pressable
              key={clinic.id}
              onPress={() => openConfirm(clinic)}
              style={({ pressed }) => [
                styles.clinicCard,
                { borderColor: clinic.primary_color || '#E2E8F0' },
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.colorDot,
                  { backgroundColor: clinic.primary_color || '#1D4ED8' },
                ]}
              />

              <Text style={styles.clinicName}>{clinic.name}</Text>

              <Text style={styles.clinicDescription}>
                {clinic.description || 'Clinic available in the platform.'}
              </Text>

              <View style={styles.cardBottom}>
                <Text style={styles.cardBottomText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#1D4ED8" />
              </View>
            </Pressable>
          ))}
        
        </View>

        {Platform.OS === 'web' && <WebFooter />}
      
      </ScrollView>

      <FloatingChatButton/>

      <Modal visible={confirmOpen} transparent animationType="fade">

        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm clinic access</Text>

            <Text style={styles.modalText}>
              Are you sure you want to continue with{' '}
              <Text style={styles.boldText}>{selectedClinic?.name}</Text>?
            </Text>

            <Text style={styles.modalSubtext}>
              By continuing, the application will load data related to this clinic.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setConfirmOpen(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={styles.confirmButton}
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
    paddingTop: 32,
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

  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
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
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    marginBottom: 24,
  },

  clinicCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
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
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 15,
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
    backgroundColor: '#1D4ED8',
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