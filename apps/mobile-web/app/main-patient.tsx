import React, { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, ActivityIndicator, Image, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/lib/supabase';
import ClinicNavbar from '../src/common/ClinicNavbar';
import AnimatedStatsCard from '../src/common/AnimatedStatsCard';
import FeaturesCard from '../src/common/FeaturesCard';
import { useClinicTheme } from '../src/lib/clinicTheme';
import FloatingChatButton from '../src/common/FloatingChatButton';

type PatientProfile = {

  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;

};

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

export default function PatientDashboard() {

  const { clinicId, clinicName } = useLocalSearchParams<{
    clinicId?: string;
    clinicName?: string;
  }>();

  const { width } = useWindowDimensions();
  const isMobile = width < 720;
  const { theme } = useClinicTheme(clinicId);

  const [appointmentsModalOpen, setAppointmentsModalOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profile, setProfile] = useState<PatientProfile | null>(null);

  const [upcomingAppointments, setUpcomingAppointments] = useState(0);
  const [upcomingList, setUpcomingList] = useState<any[]>([]);

  const [openTriageChat, setOpenTriageChat] = useState(false);
  const [recentChats, setRecentChats] = useState<any[]>([]);

  useEffect(() => {

    const loadProfile = async () => {
      try {
        setProfileLoading(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const today = new Date().toISOString().slice(0, 10);
        const { count } = await supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('clinic_id', clinicId)
          .eq('patient_id', user.id)
          .in('status', ['scheduled', 'rescheduled'])
          .gte('appointment_date', today);

        setUpcomingAppointments(count ?? 0);

        const { data: upcomingData } = await supabase
          .from('appointments')
          .select(`
            id,
            appointment_date,
            start_time,
            doctors (
              first_name,
              last_name,
              specialty
            ),
            clinic_services (
              title
            )
          `)
          .eq('clinic_id', clinicId)
          .eq('patient_id', user.id)
          .in('status', ['scheduled', 'rescheduled'])
          .gte('appointment_date', today)
          .order('appointment_date', { ascending: true })
          .order('start_time', { ascending: true })
          .limit(3);

        setUpcomingList(upcomingData ?? []);

        const { data: chatsData } = await supabase
          .from('chat_conversations')
          .select(`
            id,
            last_message,
            last_message_at,
            patient_unread_count,
            doctors (
              first_name,
              last_name,
              specialty
            )
          `)
          .eq('clinic_id', clinicId)
          .eq('patient_id', user.id)
          .order('last_message_at', { ascending: false, nullsFirst: false })
          .limit(3);

        setRecentChats(chatsData ?? []);

        const { data } = await supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url')
          .eq('id', user.id)
          .maybeSingle();

        setProfile(data ?? null);
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfile();

  }, [clinicId]);

  const go = (pathname: string) => {
    setAppointmentsModalOpen(false);

    router.push({
      pathname: pathname as any,
      params: { clinicId, clinicName },
    });
  };

  const openAppointmentsModal = () => {
    setAppointmentsModalOpen(true);
  };

  const patientName =
    `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || 'Patient';

  const featureAccentA = rgbaFromHex(theme.primary, 0.11);
  const featureAccentB = rgbaFromHex(theme.primary, 0.18);
  const featureBorderA = rgbaFromHex(theme.primary, 0.22);
  const featureBorderB = rgbaFromHex(theme.primary, 0.34);

  const featureItems = [

    { title: 'About Us', icon: 'business-outline' as const, description: 'Placeholder description.', onPress: () => go('/clinic-info') },
    { title: 'Our Doctors', icon: 'people-outline' as const, description: 'Placeholder description.', onPress: () => go('/clinic-doctors') },
    { title: 'Our Services', icon: 'list-outline' as const, description: 'Placeholder description.', onPress: () => go('/clinic-services') },
    { title: 'Manage Appointments', icon: 'calendar-clear-outline' as const, description: 'Placeholder description.', onPress: openAppointmentsModal },
    { title: 'Our Technology', icon: 'hardware-chip-outline' as const, description: 'Placeholder description.', onPress: () => go('/clinic-tech') },
    { title: 'Health Tips', icon: 'leaf-outline' as const, description: 'Placeholder description.', onPress: () => go('/health-tips') },
    { title: 'My Documents', icon: 'document-attach-outline' as const, description: 'Placeholder description.', onPress: () => go('/my-documents'), },
    { title: 'Messages', icon: 'chatbubble-ellipses-outline' as const, description: 'Chat with your doctors.', onPress: () => go('/messages'), },
  
  ];

  return (

    <>

      <ScrollView contentContainerStyle={styles.container} stickyHeaderIndices={[0]}>

        <ClinicNavbar
          clinicName={clinicName}
          clinicId={clinicId}
          primaryColor={theme.primary}
          roleLabel="Patient"
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
            Patient Dashboard
          </Text>

          <Text style={[styles.heroTitle, isMobile && styles.heroTextCenter, { color: theme.secondary }]}>
            Placeholder Title in {clinicName || 'your clinic'}
          </Text>

          <Text style={[styles.heroSubtitle, isMobile && styles.heroTextCenter]}>
            Placeholder Subtitle.
          </Text>

          <View style={[styles.heroButtons, isMobile && styles.heroButtonsMobile]}>
            <Pressable style={[styles.primaryButton, { backgroundColor: theme.primary }]} onPress={openAppointmentsModal}>
              <Text style={styles.primaryButtonText}>Manage Appointments</Text>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={() => setOpenTriageChat(true)}>
              <Text style={styles.secondaryButtonText}>Start Triage</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.statsGrid}>
          {[
            { label: 'Upcoming Appointments', value: upcomingAppointments, icon: 'calendar-outline' as const },
            { label: 'Doctors Available', value: 7, icon: 'medkit-outline' as const },
            { label: 'AI Reports Ready', value: 1, icon: 'sparkles-outline' as const },
            { label: 'History Entries', value: 12, icon: 'document-text-outline' as const },
          ].map((item) => (
            <View key={item.label} style={isMobile ? styles.statMobileItem : styles.statWebItem}>
              <AnimatedStatsCard {...item} color={theme.primary} centered={isMobile}/>
            </View>
          ))}
        </View>

        {!isMobile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Highlights</Text>

            <View style={styles.adsGrid}>
              <View style={styles.adCard}>
                <Text style={styles.adTitle}>Placeholder Title</Text>
                <Text style={styles.adText}>Placeholder description.</Text>
              </View>

              <View style={styles.adCard}>
                <Text style={styles.adTitle}>Placeholder Title</Text>
                <Text style={styles.adText}>Placeholder description.</Text>
              </View>

              <View style={styles.adCard}>
                <Text style={styles.adTitle}>Placeholder Title</Text>
                <Text style={styles.adText}>Placeholder description.</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>

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
                  onPress={item.onPress}
                  color={theme.primary}
                  backgroundColor={isAlt ? featureAccentA : featureAccentB}
                  borderColor={isAlt ? featureBorderA : featureBorderB}
                />

              );
            })}
          </View>
        </View>

        <View style={styles.bottomGrid}>

          <View style={styles.panel}>
            <View style={styles.panelHeaderRow}>
              <View>
                <Text style={styles.panelEyebrow}>Next visits</Text>
                <Text style={styles.panelTitle}>Upcoming Appointments</Text>
              </View>

              <View style={[styles.panelIconBadge, { backgroundColor: `${theme.primary}14` }]}>
                <Ionicons name="calendar-outline" size={20} color={theme.primary}/>
              </View>
            </View>

            {upcomingList.length === 0 ? (
              <View style={styles.emptyUpcomingBox}>
                <Ionicons name="calendar-clear-outline" size={24} color="#94A3B8"/>
                <Text style={styles.emptyUpcomingTitle}>No upcoming appointments</Text>
                <Text style={styles.emptyUpcomingText}>
                  Your next visits will appear here after booking.
                </Text>
              </View>
            ) : (
              upcomingList.map((appointment) => {
                const doctor = Array.isArray(appointment.doctors)
                  ? appointment.doctors[0]
                  : appointment.doctors;

                const service = Array.isArray(appointment.clinic_services)
                  ? appointment.clinic_services[0]
                  : appointment.clinic_services;

                return (
                  <View key={appointment.id} style={styles.upcomingCard}>
                    <View style={[styles.upcomingDateBadge, { backgroundColor: `${theme.primary}12` }]}>
                      <Ionicons name="time-outline" size={16} color={theme.primary}/>
                    </View>

                    <View style={styles.upcomingContent}>
                      <Text style={styles.upcomingService}>
                        {service?.title || 'Medical appointment'}
                      </Text>

                      <Text style={styles.upcomingDoctor}>
                        Dr. {doctor?.first_name || ''} {doctor?.last_name || ''}
                      </Text>

                      <Text style={styles.upcomingMeta}>
                        {appointment.appointment_date} · {appointment.start_time}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeaderRow}>
              <View>
                <Text style={styles.panelEyebrow}>Care team</Text>
                <Text style={styles.panelTitle}>Chat with Doctor</Text>
              </View>

              <View style={[styles.panelIconBadge, { backgroundColor: `${theme.primary}14` }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.primary}/>
              </View>
            </View>

            {recentChats.length === 0 ? (
              <View style={styles.emptyUpcomingBox}>
                <Ionicons name="chatbubbles-outline" size={24} color="#94A3B8"/>
                <Text style={styles.emptyUpcomingTitle}>No conversations yet</Text>
                <Text style={styles.emptyUpcomingText}>
                  Your doctor conversations will appear here after you start chatting.
                </Text>
              </View>
            ) : (
              recentChats.map((chat) => {
                const doctor = Array.isArray(chat.doctors) ? chat.doctors[0] : chat.doctors;

                return (
                  <Pressable
                    key={chat.id}
                    style={styles.chatPreviewCard}
                    onPress={() =>
                      router.push({
                        pathname: '/chat' as any,
                        params: { clinicId, clinicName, conversationId: chat.id },
                      })
                    }
                  >
                    <View style={[styles.chatPreviewIcon, { backgroundColor: `${theme.primary}12` }]}>
                      <Ionicons name="person-outline" size={18} color={theme.primary}/>
                    </View>

                    <View style={styles.chatPreviewContent}>
                      <Text style={styles.chatPreviewTitle}>
                        Dr. {doctor?.first_name || ''} {doctor?.last_name || ''}
                      </Text>

                      <Text style={styles.chatPreviewText} numberOfLines={1}>
                        {chat.last_message || 'No messages yet.'}
                      </Text>
                    </View>

                    <View style={styles.chatPreviewRight}>
                      {(chat.patient_unread_count || 0) > 0 && (
                        <View style={styles.chatUnreadBadge}>
                          <Text style={styles.chatUnreadText}>
                            {chat.patient_unread_count > 9 ? '9+' : chat.patient_unread_count}
                          </Text>
                        </View>
                      )}

                      <Ionicons name="chevron-forward-outline" size={20} color="#94A3B8"/>
                    </View>
                  </Pressable>
                );
              })
            )}

            <Pressable
              style={[styles.viewMessagesButton, { borderColor: theme.primary }]}
              onPress={() => go('/messages')}
            >
              <Text style={[styles.viewMessagesText, { color: theme.primary }]}>
                View all messages
              </Text>
              <Ionicons name="arrow-forward-outline" size={16} color={theme.primary}/>
            </Pressable>
          </View>
        </View>

      </ScrollView>

      <Modal visible={appointmentsModalOpen} transparent animationType="fade">

        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setAppointmentsModalOpen(false)}
            >
              <Ionicons name="close" size={20} color="#64748B"/>
            </Pressable>

            <View style={[styles.modalIconWrap, { backgroundColor: `${theme.primary}14` }]}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.modalAvatar}/>
              ) : profileLoading ? (
                <ActivityIndicator size="small" color={theme.primary}/>
              ) : (
                <Ionicons name="person-outline" size={34} color={theme.primary}/>
              )}
            </View>

            <Text style={styles.modalEyebrow}>Welcome Back</Text>

            <Text style={styles.modalTitle}>{patientName}</Text>

            <Text style={styles.modalText}>
              What would you like to do today? You can book a new appointment or review your existing ones.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalPrimaryButton, { backgroundColor: theme.primary }]}
                onPress={() => go('/book-appointment')}
              >
                <Ionicons name="calendar-outline" size={18} color="#FFFFFF"/>
                <Text style={styles.modalPrimaryButtonText}>Book An Appointment</Text>
              </Pressable>

              <Pressable
                style={styles.modalSecondaryButton}
                onPress={() => go('/my-appointments')}
              >
                <Ionicons name="list-outline" size={18} color="#0F172A"/>
                <Text style={styles.modalSecondaryButtonText}>View My Appointments</Text>
              </Pressable>
            </View>
          </View>
        </View>

      </Modal>

      <FloatingChatButton clinicId={clinicId} clinicName={clinicName} forceOpen={openTriageChat} initialMode="triage" onForceOpenHandled={() => setOpenTriageChat(false)}/>

    </>

  );

}

const styles = StyleSheet.create({

  container: { 
    flexGrow: 1, 
    backgroundColor: '#F8FAFC', 
    padding: 24, 
    gap: 20 
  },
  
  hero: { 
    borderRadius: 30, 
    borderWidth: 1, 
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
    marginBottom: 10 
  },
  
  heroSubtitle: { 
    fontSize: 15, 
    lineHeight: 24, 
    color: '#475569', 
    marginBottom: 18 
  },
  
  heroButtons: { 
    flexDirection: 'row', 
    gap: 12, 
    flexWrap: 'wrap' 
  },

  heroMobile: {
    alignItems: 'center',
  },

  heroTextCenter: {
    textAlign: 'center',
  },

  heroButtonsMobile: {
    justifyContent: 'center',
  },

  primaryButton: { 
    borderRadius: 999, 
    paddingHorizontal: 18, 
    paddingVertical: 14 
  },
  
  primaryButtonText: { 
    color: '#FFF', 
    fontWeight: '800' 
  },
  
  secondaryButton: { 
    borderWidth: 1, 
    borderColor: '#CBD5E1', 
    borderRadius: 999, 
    paddingHorizontal: 18, 
    paddingVertical: 14, 
    backgroundColor: '#FFF' 
  },
  
  secondaryButtonText: { 
    color: '#0F172A', 
    fontWeight: '700' 
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
  
  adsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 16 
  },

  adCard: { 
    flex: 1, 
    minWidth: 220, 
    backgroundColor: '#F8FAFC', 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    borderRadius: 22, 
    padding: 18 
  },
  
  adTitle: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: '#0F172A', 
    marginBottom: 8 
  },
  
  adText: { 
    fontSize: 14, 
    lineHeight: 22, 
    color: '#475569' 
  },
  
  featuresGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 16 
  },
  
  bottomGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 16 
  },
  
  panel: { 
    flex: 1, 
    minWidth: 260, 
    backgroundColor: '#FFF', 
    borderRadius: 28, 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    padding: 24 
  },

  panelTitle: { 
    fontSize: 20, 
    fontWeight: '900', 
    color: '#0F172A', 
    marginBottom: 12 
  },
  
  appointmentCard: { 
    backgroundColor: '#F8FAFC', 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    borderRadius: 18, 
    padding: 14, 
    marginBottom: 12 
  },
  
  appointmentDoctor: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: '#0F172A', 
    marginBottom: 6 
  },
  
  appointmentMeta: { 
    fontSize: 14, 
    color: '#475569' 
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  modalCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
  },

  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  modalIconWrap: {
    width: 92,
    height: 92,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },

  modalAvatar: {
    width: '100%',
    height: '100%',
  },

  modalEyebrow: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 6,
  },

  modalTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 10,
  },

  modalText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 22,
  },

  modalActions: {
    width: '100%',
    gap: 12,
  },

  modalPrimaryButton: {
    minHeight: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  modalPrimaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },

  modalSecondaryButton: {
    minHeight: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },

  modalSecondaryButtonText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 15,
  },

  panelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },

  panelEyebrow: {
    fontSize: 12,
    fontWeight: '900',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  panelIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyUpcomingBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    padding: 18,
    alignItems: 'center',
  },

  emptyUpcomingTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },

  emptyUpcomingText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    color: '#64748B',
    textAlign: 'center',
  },

  upcomingCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
  },

  upcomingDateBadge: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  upcomingContent: {
    flex: 1,
  },

  upcomingService: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },

  upcomingDoctor: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 3,
  },

  upcomingMeta: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
  },

  chatPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
  },

  chatPreviewIcon: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chatPreviewContent: {
    flex: 1,
  },

  chatPreviewTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },

  chatPreviewText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
  },

  chatUnreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },

  chatUnreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },

  viewMessagesButton: {
    marginTop: 4,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  viewMessagesText: {
    fontSize: 13,
    fontWeight: '900',
  },

  chatPreviewRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  statWebItem: {
    flex: 1,
  },

  statMobileItem: {
    width: '47%',
  },

});