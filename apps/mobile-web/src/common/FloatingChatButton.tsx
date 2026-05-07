import React, { useState, useRef, useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View, ScrollView, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useClinicTheme } from '../lib/clinicTheme';
import { supabase } from '../lib/supabase';
import TypingDots from './ChatTypingDots';

type ChatbotMessage = {

  id: string;
  role: 'bot' | 'user';
  text: string;

};

type ChatAction = {

  label: string;
  route?: string;
  message?: string;
  params?: Record<string, string>;

};

type BookingDraft = {

  active?: boolean;
  step?: string;
  serviceId?: string;
  serviceTitle?: string;
  serviceDuration?: number;
  doctorId?: string;
  doctorName?: string;
  locationId?: string;
  locationName?: string;
  appointmentDate?: string;
  startTime?: string;
  endTime?: string;
  reason?: string;

} | null;

function cleanBotText(text: string) {

  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^\s*\*\s+/gm, '• ')
    .replace(/^\s*-\s+/gm, '• ')
    .trim();

}

export default function FloatingChatButton({
  clinicId,
  clinicName,
  userRole,
}: {
  clinicId?: string;
  clinicName?: string;
  userRole?: string;
}) {

  const scrollRef = useRef<ScrollView | null>(null);
  const chatAnimation = useRef(new Animated.Value(0)).current;

  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [typing, setTyping] = useState(false);
  const [actions, setActions] = useState<ChatAction[]>([]);
  const [bookingDraft, setBookingDraft] = useState<BookingDraft>(null);
  const [triageDraft, setTriageDraft] = useState<any>(null);
  const [resolvedRole, setResolvedRole] = useState(userRole || 'guest');

  const [messages, setMessages] = useState<ChatbotMessage[]>([
    {
      id: 'welcome',
      role: 'bot',
      text: clinicName
        ? `Hi! I am MedSync's assistant. I can help you with ${clinicName}, doctors, services, appointments, messages and app navigation.`
        : "Hi! I am MedSync's assistant. I can help you with the app, clinics, appointments, doctors, services and onboarding.",
    },
  ]);

  const { theme } = useClinicTheme(clinicId);
  const primaryColor = clinicId ? theme.primary : '#1D4ED8';

  useEffect(() => {

    const loadRole = async () => {
      if (userRole) {
        setResolvedRole(userRole);
        return;
      }

      const {  data: { user }, } = await supabase.auth.getUser();

      if (!user) {
        setResolvedRole('guest');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      setResolvedRole(profile?.role || 'guest');
    };

    loadRole();

  }, [userRole]);

  const openChat = () => {
    setOpen(true);
    chatAnimation.setValue(0);

    Animated.spring(chatAnimation, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 70,
    }).start();
  };

  const closeChat = () => {
    Animated.timing(chatAnimation, {
      toValue: 0,
      duration: 160,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => setOpen(false));
  };

  const sendMessage = async (overrideMessage?: string) => {
    const value = (overrideMessage ?? message).trim();
    if (!value || typing) return;

    const userMessage: ChatbotMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      text: value,
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessage('');
    setTyping(true);
    setActions([]);

    try {
      const { data, error } = await supabase.functions.invoke('medsync-chatbot', {
        body: {
          message: value,
          clinicId,
          clinicName,
          userRole: resolvedRole,
          history: messages.slice(-8),
          bookingDraft,
          triageDraft,
        },
      });

      if (error) {
        console.log('SUPABASE FUNCTION ERROR:', error);

        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-err`,
            role: 'bot',
            text: 'I could not connect to the assistant right now. Please try again later.',
          },
        ]);

        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-bot`,
          role: 'bot',
          text: data?.reply || 'I could not generate a response right now.',
        },
      ]);

      setActions(Array.isArray(data?.actions) ? data.actions : []);
      setBookingDraft(data?.bookingDraft ?? null);
      setTriageDraft(data?.triageDraft ?? null);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-catch`,
          role: 'bot',
          text: 'Could not connect to the assistant right now.',
        },
      ]);
    } finally {
      setTyping(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleActionPress = (action: ChatAction) => {
    if (action.message) {
      sendMessage(action.message);
      return;
    }

    if (action.route) {
      closeChat();

      setTimeout(() => {
        router.push({
          pathname: action.route as any,
          params: {
            clinicId,
            clinicName,
            ...(action.params || {}),
          },
        });
      }, 180);
    }
  };

  return (

    <>

      <Pressable
        onPress={openChat}
        style={({ pressed }) => [
          styles.floatingButton,
          { backgroundColor: primaryColor },
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="chatbubble-ellipses" size={24} color="#FFFFFF"/>
      </Pressable>

      <Modal visible={open} transparent animationType="fade">
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.chatCard,
              {
                opacity: chatAnimation,
                transform: [
                  {
                    translateY: chatAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [46, 0],
                    }),
                  },
                  {
                    scale: chatAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.92, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.chatHeader}>
              <View style={styles.headerTextWrap}>
                <Text style={styles.chatTitle}>MedSync Assistant</Text>
                <Text style={styles.chatSubtitle}>
                  {clinicName ? `${clinicName} support` : 'App and clinic support'}
                </Text>
              </View>

              <Pressable onPress={closeChat} style={styles.closeButton}>
                <Ionicons name="close" size={22} color="#0F172A"/>
              </Pressable>
            </View>

            <ScrollView
              ref={scrollRef}
              contentContainerStyle={styles.chatBody}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.map((item) => {
                const mine = item.role === 'user';

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.messageBubble,
                      mine
                        ? [styles.userBubble, { backgroundColor: primaryColor }]
                        : styles.botBubble,
                    ]}
                  >
                    <Text style={[styles.messageText, mine && styles.userBubbleText]}>
                      {mine ? item.text : cleanBotText(item.text)}
                    </Text>
                  </View>
                );
              })}

              {typing && (
                <View style={styles.typingBubble}>
                  <TypingDots />
                </View>
              )}

              {actions.length > 0 && !typing && (
                <View style={styles.actionsWrap}>
                  {actions.map((action) => (
                    <Pressable
                      key={`${action.label}-${action.route || action.message}`}
                      style={[
                        styles.actionButton,
                        {
                          borderColor: primaryColor,
                          backgroundColor: `${primaryColor}12`,
                        },
                      ]}
                      onPress={() => handleActionPress(action)}
                    >
                      <Text style={[styles.actionButtonText, { color: primaryColor }]}>
                        {action.label}
                      </Text>
                      <Ionicons name="arrow-forward" size={15} color={primaryColor}/>
                    </Pressable>
                  ))}
                </View>
              )}
            </ScrollView>

            <View style={styles.quickActions}>
              <Pressable
                style={styles.quickChip}
                onPress={() => sendMessage('What can I do in MedSync?')}
              >
                <Text style={styles.quickChipText}>About MedSync</Text>
              </Pressable>

              <Pressable
                style={styles.quickChip}
                onPress={() => sendMessage('Tell me about this clinic.')}
              >
                <Text style={styles.quickChipText}>Clinic</Text>
              </Pressable>

              <Pressable
                style={styles.quickChip}
                onPress={() => sendMessage('I have symptoms and need triage help.')}
              >
                <Text style={styles.quickChipText}>Triage</Text>
              </Pressable>

              <Pressable
                style={styles.quickChip}
                onPress={() => sendMessage('I want to book an appointment.')}
              >
                <Text style={styles.quickChipText}>Book App</Text>
              </Pressable>
            </View>

            <View style={styles.chatInputRow}>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Write a message..."
                placeholderTextColor="#94A3B8"
                style={styles.input}
                onSubmitEditing={() => sendMessage()}
              />

              <Pressable
                style={[
                  styles.sendButton,
                  { backgroundColor: primaryColor },
                  typing && styles.disabledButton,
                ]}
                onPress={() => sendMessage()}
                disabled={typing}
              >
                <Ionicons name="send" size={18} color="#FFFFFF"/>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    
    </>
  
  );

}

const styles = StyleSheet.create({

  floatingButton: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    zIndex: 9999,
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.35)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 24,
  },

  chatCard: {
    width: 390,
    maxWidth: '100%',
    height: 560,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  chatHeader: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  headerTextWrap: {
    flex: 1,
    paddingRight: 12,
  },

  chatTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },

  chatSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },

  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },

  chatBody: {
    flexGrow: 1,
    padding: 16,
    gap: 10,
    backgroundColor: '#F8FAFC',
  },

  messageBubble: {
    maxWidth: '85%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
  },

  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#1D4ED8',
  },

  messageText: {
    color: '#0F172A',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
  },

  userBubbleText: {
    color: '#FFFFFF',
  },

  typingBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  actionsWrap: {
    gap: 8,
    marginTop: 4,
    alignSelf: 'stretch',
  },

  actionButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  actionButtonText: {
    fontSize: 13,
    fontWeight: '900',
  },

  quickActions: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  quickChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },

  quickChipText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
  },

  chatInputRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },

  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
  },

  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 999,
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  disabledButton: {
    opacity: 0.65,
  },

  pressed: {
    opacity: 0.88,
  },

});