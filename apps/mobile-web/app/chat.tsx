import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import ClinicNavbar from '../src/common/ClinicNavbar';
import TypingDots from '../src/common/ChatTypingDots';
import { supabase } from '../src/lib/supabase';
import { useClinicTheme } from '../src/lib/clinicTheme';

type Message = {

  id: string;
  conversation_id: string;
  sender_profile_id: string;
  body: string;
  created_at: string;

};

type Conversation = {

  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id: string;
  
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

function getDoctorName(conversation?: Conversation | null) {

  if (!conversation?.doctors) 
    return 'Doctor';
  return `Dr. ${conversation.doctors.first_name} ${conversation.doctors.last_name}`;

}

function getPatientName(conversation?: Conversation | null) {
  return (`${conversation?.profiles?.first_name || ''} ${conversation?.profiles?.last_name || ''}`.trim() || 'Patient');
}

export default function ChatScreen() {

  const { clinicId, clinicName, conversationId, doctorId } = useLocalSearchParams<{
    clinicId?: string;
    clinicName?: string;
    conversationId?: string;
    doctorId?: string;
  }>();

  const { theme } = useClinicTheme(clinicId);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isMobile = width < 720;

  const scrollRef = useRef<ScrollView | null>(null);
  const typingTimer = useRef<any>(null);
  const channelRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [profileRole, setProfileRole] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [error, setError] = useState('');

  const isDoctor = profileRole === 'doctor';

  const resetUnreadCount = async (conversationIdToReset: string, role: string) => {
    if (!conversationIdToReset) 
      return;

    await supabase
      .from('chat_conversations')
      .update(role === 'doctor' ? { doctor_unread_count: 0 } : { patient_unread_count: 0 })
      .eq('id', conversationIdToReset);
  };

  const loadOrCreateConversation = async () => {

    try {
      setLoading(true);
      setError('');

      const { data: { user }, } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      setCurrentUserId(user.id);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const role = profileData?.role || '';
      setProfileRole(role);

      let activeConversationId = conversationId;

      if (!activeConversationId && doctorId) {
        const { data: existing } = await supabase
          .from('chat_conversations')
          .select('id')
          .eq('clinic_id', clinicId)
          .eq('patient_id', user.id)
          .eq('doctor_id', doctorId)
          .maybeSingle();

        if (existing?.id) {
          activeConversationId = existing.id;
        } else {
          const { data: created, error: createError } = await supabase
            .from('chat_conversations')
            .insert({
              clinic_id: clinicId,
              patient_id: user.id,
              doctor_id: doctorId,
              patient_unread_count: 0,
              doctor_unread_count: 0,
            })
            .select('id')
            .single();

          if (createError) {
            setError(createError.message);
            return;
          }

          activeConversationId = created.id;
        }
      }

      if (!activeConversationId) {
        setError('Conversation not found.');
        return;
      }

      const { data: conversationData, error: conversationError } = await supabase
        .from('chat_conversations')
        .select(`
          id,
          clinic_id,
          patient_id,
          doctor_id,
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
        .eq('id', activeConversationId)
        .maybeSingle();

      if (conversationError || !conversationData) {
        setError(conversationError?.message || 'Conversation not found.');
        return;
      }

      setConversation(conversationData as any);
      await resetUnreadCount(activeConversationId, role);

      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('id, conversation_id, sender_profile_id, body, created_at')
        .eq('conversation_id', activeConversationId)
        .order('created_at', { ascending: true });

      if (messagesError) {
        setError(messagesError.message);
        return;
      }

      setMessages(messagesData ?? []);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }

  };

  useEffect(() => {
    loadOrCreateConversation();

    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, doctorId, clinicId]);

  useEffect(() => {

    if (!conversation?.id || !currentUserId) 
      return;

    let isMounted = true;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel(`chat-${conversation.id}-${currentUserId}-${Date.now()}-${Math.random()}`);

    channelRef.current = channel;

    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversation.id}`,
      },
      async (payload) => {
        if (!isMounted) 
          return;

        const newMessage = payload.new as Message;

        setMessages((prev) => {
          if (prev.some((item) => item.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });

        if (newMessage.sender_profile_id !== currentUserId) {
          await resetUnreadCount(conversation.id, profileRole);
        }

        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
    );

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chat_typing',
        filter: `conversation_id=eq.${conversation.id}`,
      },
      (payload) => {
        if (!isMounted) 
          return;

        const row = payload.new as any;

        if (row?.profile_id !== currentUserId) {
          setOtherTyping(Boolean(row?.is_typing));
        }
      }
    );

    channel.subscribe();

    return () => {
      isMounted = false;

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };

  }, [conversation?.id, currentUserId, profileRole]);

  const updateTyping = async (isTyping: boolean) => {
    if (!conversation?.id || !currentUserId) 
      return;

    await supabase.from('chat_typing').upsert({
      conversation_id: conversation.id,
      profile_id: currentUserId,
      is_typing: isTyping,
      updated_at: new Date().toISOString(),
    });
  };

  const handleChangeText = (value: string) => {
    setMessageText(value);
    updateTyping(Boolean(value.trim()));

    if (typingTimer.current) 
      clearTimeout(typingTimer.current);

    typingTimer.current = setTimeout(() => {
      updateTyping(false);
    }, 1200);
  };

  const sendMessage = async () => {

    const body = messageText.trim();
    if (!body || !conversation?.id || !currentUserId) 
      return;

    try {
      setSending(true);
      setMessageText('');
      await updateTyping(false);

      const { error: insertError } = await supabase.from('chat_messages').insert({
        conversation_id: conversation.id,
        sender_profile_id: currentUserId,
        body,
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }
    } finally {
      setSending(false);
    }

  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primary}/>
      </View>
    );
  }

  return (

    <KeyboardAvoidingView
      style={[
        styles.screen,
        isMobile && styles.screenMobile,
        {
          paddingBottom: isMobile
            ? Math.max(insets.bottom + 22, 34)
            : Math.max(insets.bottom, 14),
        },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <ClinicNavbar
        clinicName={clinicName}
        clinicId={clinicId}
        primaryColor={theme.primary}
        roleLabel={isDoctor ? 'Doctor' : 'Patient'}
        showRolePill={false}
        showBackButton
        onBackPress={() =>
          router.replace({
            pathname: '/messages' as any,
            params: { clinicId, clinicName },
          })
        }
        onChangeClinic={() => router.replace('/clinic-selection')}
      />

      <View style={[styles.chatHeader, { borderColor: theme.borderSoft, backgroundColor: theme.soft }]}>
        <View style={[styles.chatAvatar, { backgroundColor: `${theme.primary}16` }]}>
          <Ionicons name="chatbubbles-outline" size={24} color={theme.primary}/>
        </View>

        <View style={styles.chatHeaderText}>
          <Text style={[styles.chatTitle, { color: theme.secondary }]}>
            {isDoctor ? getPatientName(conversation) : getDoctorName(conversation)}
          </Text>

          <Text style={styles.chatSubtitle}>
            {isDoctor ? 'Patient conversation' : conversation?.doctors?.specialty || 'Doctor chat'}
          </Text>
        </View>
      </View>

      {!!error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={styles.messagesScroll}
        contentContainerStyle={[styles.messagesWrap, isMobile && styles.messagesWrapMobile]}
        showsVerticalScrollIndicator={!isMobile}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((item) => {
          const mine = item.sender_profile_id === currentUserId;

          return (
            <View
              key={item.id}
              style={[
                styles.messageBubble,
                mine
                  ? [styles.messageBubbleMine, { backgroundColor: theme.primary }]
                  : styles.messageBubbleOther,
              ]}
            >
              <Text style={[styles.messageText, mine && styles.messageTextMine]}>
                {item.body}
              </Text>
            </View>
          );
        })}

        {otherTyping && (
          <View style={styles.typingBubble}>
            <TypingDots/>
          </View>
        )}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          value={messageText}
          onChangeText={handleChangeText}
          placeholder="Write a message..."
          placeholderTextColor="#94A3B8"
          style={styles.input}
          multiline
        />

        <Pressable
          style={[
            styles.sendButton,
            { backgroundColor: theme.primary },
            sending && styles.disabledButton,
          ]}
          onPress={sendMessage}
          disabled={sending}
        >
          <Ionicons name="send-outline" size={20} color="#FFFFFF"/>
        </Pressable>
      </View>
    </KeyboardAvoidingView>

  );

}

const styles = StyleSheet.create({

  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 24,
    gap: 14,
  },

  screenMobile: {
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 34,
  },

  centered: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  chatHeader: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  chatAvatar: {
    width: 52,
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chatHeaderText: {
    flex: 1,
  },

  chatTitle: {
    fontSize: 20,
    fontWeight: '900',
  },

  chatSubtitle: {
    marginTop: 3,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700',
  },

  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
  },

  errorText: {
    color: '#991B1B',
    fontWeight: '700',
  },

  messagesScroll: {
    flex: 1,
  },

  messagesWrap: {
    flexGrow: 1,
    paddingVertical: 12,
    paddingRight: 12,
    gap: 10,
  },

  messagesWrapMobile: {
    paddingRight: 0,
    paddingBottom: 8,
  },

  messageBubble: {
    maxWidth: '78%',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  messageBubbleMine: {
    alignSelf: 'flex-end',
    marginRight: 4,
  },

  messageBubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  messageText: {
    color: '#0F172A',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },

  messageTextMine: {
    color: '#FFFFFF',
  },

  typingBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  composer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginBottom: Platform.OS === 'ios' ? 18 : 0,
  },

  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0F172A',
    fontSize: 15,
  },

  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  disabledButton: {
    opacity: 0.7,
  },

});