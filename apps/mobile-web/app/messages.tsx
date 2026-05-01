import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View, } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import ClinicNavbar from '../src/common/ClinicNavbar';
import { supabase } from '../src/lib/supabase';
import { useClinicTheme } from '../src/lib/clinicTheme';

type Conversation = {

  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id: string;
  last_message: string | null;
  last_message_at: string | null;
  patient_unread_count: number | null;
  doctor_unread_count: number | null;
  
  doctors: {
    first_name: string;
    last_name: string;
    specialty: string | null;
  } | null;
  
  profiles: {
    first_name: string | null;
    last_name: string | null;
  } | null;

};

type Profile = {

  id: string;
  role: 'patient' | 'doctor' | 'clinic_admin' | 'platform_admin';
  email: string | null;

};

type TypingRow = {

  conversation_id: string;
  profile_id: string;
  is_typing: boolean;

};

function getDoctorName(item: Conversation) {

  if (!item.doctors) 
    return 'Doctor';
  return `Dr. ${item.doctors.first_name} ${item.doctors.last_name}`;

}

function getPatientName(item: Conversation) {
  return `${item.profiles?.first_name || ''} ${item.profiles?.last_name || ''}`.trim() || 'Patient';
}

function HoverConversationCard({
  children,
  unread,
  onPress,
}: {
  children: React.ReactNode;
  unread: boolean;
  onPress: () => void;
}) {

  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const animateIn = () => {
    if (Platform.OS !== 'web') return;

    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1.01,
        useNativeDriver: true,
        friction: 8,
      }),
      Animated.spring(translateY, {
        toValue: -3,
        useNativeDriver: true,
        friction: 8,
      }),
    ]).start();
  };

  const animateOut = () => {
    if (Platform.OS !== 'web') return;

    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
      }),
    ]).start();
  };

  return (
    <Pressable onPress={onPress} onHoverIn={animateIn} onHoverOut={animateOut}>
      <Animated.View
        style={[
          styles.conversationCard,
          unread && styles.conversationCardUnread,
          {
            transform: [{ scale }, { translateY }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

export default function MessagesScreen() {
  const { clinicId, clinicName } = useLocalSearchParams<{
    clinicId?: string;
    clinicName?: string;
  }>();

  const { theme } = useClinicTheme(clinicId);

  const channelRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [typingMap, setTypingMap] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');

  const isDoctor = profile?.role === 'doctor';

  const loadConversations = async (showLoader = true) => {

    try {
      if (showLoader) setLoading(true);
      setError('');

      const { data: { user }, } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, email')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError || !profileData) {
        setError(profileError?.message || 'Profile not found.');
        return;
      }

      setProfile(profileData as Profile);

      let query = supabase
        .from('chat_conversations')
        .select(`
          id,
          clinic_id,
          patient_id,
          doctor_id,
          last_message,
          last_message_at,
          patient_unread_count,
          doctor_unread_count,
          doctors (
            first_name,
            last_name,
            specialty
          ),
          profiles!chat_conversations_patient_id_fkey (
            first_name,
            last_name
          )
        `)
        .eq('clinic_id', clinicId)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (profileData.role === 'patient') {
        query = query.eq('patient_id', user.id);
      }

      if (profileData.role === 'doctor') {
        const { data: doctorData } = await supabase
          .from('doctors')
          .select('id')
          .eq('profile_id', user.id)
          .eq('clinic_id', clinicId)
          .maybeSingle();

        if (!doctorData) {
          setConversations([]);
          setError('No doctor profile is connected to this account.');
          return;
        }

        query = query.eq('doctor_id', doctorData.id);
      }

      const { data, error: conversationsError } = await query;

      if (conversationsError) {
        setError(conversationsError.message);
        return;
      }

      const loadedConversations = (data ?? []) as any[];
      setConversations(loadedConversations);

      const conversationIds = loadedConversations.map((item) => item.id);

      if (conversationIds.length > 0) {
        const { data: typingData } = await supabase
          .from('chat_typing')
          .select('conversation_id, profile_id, is_typing')
          .in('conversation_id', conversationIds)
          .neq('profile_id', user.id)
          .eq('is_typing', true);

        const nextTypingMap: Record<string, boolean> = {};

        (typingData ?? []).forEach((item: TypingRow) => {
          nextTypingMap[item.conversation_id] = true;
        });

        setTypingMap(nextTypingMap);
      } else {
        setTypingMap({});
      }
    } finally {
      setLoading(false);
    }

  };

  useEffect(() => {
    loadConversations(true);

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId]);

  useEffect(() => {
    if (!profile?.id || !clinicId) 
      return;

    let active = true;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel(`messages-list-${clinicId}-${profile.id}-${Date.now()}-${Math.random()}`);

    channelRef.current = channel;

    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_conversations',
      },
      () => {
        if (!active) 
          return;
        loadConversations(false);
      }
    );

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chat_typing',
      },
      (payload) => {
        if (!active) 
          return;

        const row = payload.new as TypingRow;

        if (!row || row.profile_id === profile.id) 
          return;

        setTypingMap((prev) => ({
          ...prev,
          [row.conversation_id]: Boolean(row.is_typing),
        }));
      }
    );

    channel.subscribe();

    return () => {
      active = false;

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId, profile?.id]);

  const title = useMemo(() => (isDoctor ? 'Patient messages' : 'Messages'), [isDoctor]);

  return (

    <ScrollView contentContainerStyle={styles.container} stickyHeaderIndices={[0]}>

      <ClinicNavbar
        clinicName={clinicName}
        clinicId={clinicId}
        primaryColor={theme.primary}
        roleLabel={isDoctor ? 'Doctor' : 'Patient'}
        showRolePill={false}
        showBackButton
        onBackPress={() =>
          router.replace({
            pathname: isDoctor ? '/main-doctor' : '/main-patient',
            params: { clinicId, clinicName },
          } as any)
        }
        onChangeClinic={() => router.replace('/clinic-selection')}
      />

      <View style={[styles.hero, { backgroundColor: theme.soft, borderColor: theme.borderSoft }]}>
        <Text style={[styles.heroEyebrow, { color: theme.primary }]}>Chat</Text>

        <Text style={[styles.heroTitle, { color: theme.secondary }]}>{title}</Text>

        <Text style={styles.heroSubtitle}>
          Continue your conversations securely with your clinic care team.
        </Text>
      </View>

      {!!error && (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={20} color="#DC2626"/>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary}/>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="chatbubbles-outline" size={34} color={theme.primary}/>
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptyText}>
            Conversations will appear here once a patient starts a chat with a doctor.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {conversations.map((item) => {
            const unreadCount = isDoctor
              ? item.doctor_unread_count || 0
              : item.patient_unread_count || 0;

            const otherIsTyping = Boolean(typingMap[item.id]);

            return (
              <HoverConversationCard
                key={item.id}
                unread={unreadCount > 0}
                onPress={() =>
                  router.push({
                    pathname: '/chat' as any,
                    params: {
                      clinicId,
                      clinicName,
                      conversationId: item.id,
                    },
                  })
                }
              >
                <View style={[styles.avatar, { backgroundColor: `${theme.primary}14` }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={24} color={theme.primary}/>

                  {unreadCount > 0 && (
                    <View style={styles.unreadBubble}>
                      <Text style={styles.unreadBubbleText}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.conversationBody}>
                  <View style={styles.titleRow}>
                    <Text style={styles.conversationTitle}>
                      {isDoctor ? getPatientName(item) : getDoctorName(item)}
                    </Text>

                    {unreadCount > 0 && (
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>New message</Text>
                      </View>
                    )}
                  </View>

                  {otherIsTyping ? (
                    <View style={styles.typingRow}>
                      <View style={styles.typingDot}/>
                      <View style={styles.typingDot}/>
                      <View style={styles.typingDot}/>
                      <Text style={styles.typingText}>Typing...</Text>
                    </View>
                  ) : (
                    <Text
                      style={[
                        styles.conversationSubtitle,
                        unreadCount > 0 && styles.conversationSubtitleUnread,
                      ]}
                      numberOfLines={1}
                    >
                      {item.last_message || 'No messages yet.'}
                    </Text>
                  )}

                  {unreadCount > 0 && (
                    <Text style={styles.unreadText}>
                      {unreadCount} unread {unreadCount === 1 ? 'message' : 'messages'}
                    </Text>
                  )}
                </View>

                <Ionicons name="chevron-forward-outline" size={20} color="#94A3B8"/>
              </HoverConversationCard>
            );
          })}
        </View>
      )}

    </ScrollView>

  );

}

const styles = StyleSheet.create({

  container: {
    flexGrow: 1,
    backgroundColor: '#F8FAFC',
    padding: 24,
    gap: 18,
  },

  centered: {
    paddingVertical: 50,
    alignItems: 'center',
  },

  hero: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
  },

  heroEyebrow: {
    fontSize: 13,
    fontWeight: '900',
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

  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 14,
    flexDirection: 'row',
    gap: 10,
  },

  errorText: {
    flex: 1,
    color: '#991B1B',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 26,
    alignItems: 'center',
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },

  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    textAlign: 'center',
  },

  list: {
    gap: 12,
  },

  conversationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  conversationCardUnread: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFFBFB',
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  unreadBubble: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  unreadBubbleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },

  conversationBody: {
    flex: 1,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 4,
  },

  conversationTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },

  conversationSubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700',
  },

  conversationSubtitleUnread: {
    color: '#0F172A',
    fontWeight: '900',
  },

  newBadge: {
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 9,
    paddingVertical: 4,
  },

  newBadgeText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '900',
  },

  unreadText: {
    marginTop: 4,
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '900',
  },

  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#94A3B8',
  },

  typingText: {
    marginLeft: 4,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '800',
  },

});