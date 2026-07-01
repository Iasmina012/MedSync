import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  triageId?: string;
  aiTriageLevel?: string;

} | null;

const SUS_QUESTIONS = [
  'I think that I would like to use this system frequently.',
  'I found the system unnecessarily complex.',
  'I thought the system was easy to use.',
  'I think that I would need the support of a technical person to be able to use this system.',
  'I found the various functions in this system were well integrated.',
  'I thought there was too much inconsistency in this system.',
  'I would imagine that most people would learn to use this system very quickly.',
  'I found the system very cumbersome to use.',
  'I felt very confident using the system.',
  'I needed to learn a lot of things before I could get going with this system.',
];

function cleanBotText(text: string) {

  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^\s*\*\s+/gm, '• ')
    .replace(/^\s*-\s+/gm, '• ')
    .trim();

}

function SusQuestionnaire({
  answers,
  onAnswer,
  onSubmit,
  submitting,
}: {
  answers: number[];
  onAnswer: (index: number, value: number) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {

  const allAnswered = answers.every((a) => a > 0);

  return (
    <View>
      <Text style={styles.susTitle}>Usability questionnaire (10 questions, 1 = Strongly Disagree, 5 = Strongly Agree)</Text>

      {SUS_QUESTIONS.map((question, qi) => (
        <View key={qi}>
          <Text style={styles.susQuestion}>{qi + 1}. {question}</Text>
          <View style={styles.susScale}>
            {[1, 2, 3, 4, 5].map((val) => {
              const selected = answers[qi] === val;
              return (
                <Pressable
                  key={val}
                  style={[styles.susScaleBtn, selected && styles.susScaleBtnActive]}
                  onPress={() => onAnswer(qi, val)}
                >
                  <Text style={[styles.susScaleBtnText, selected && styles.susScaleBtnTextActive]}>
                    {val}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <View style={styles.susScaleLabels}>
        <Text style={styles.susScaleLabelText}>1 = Strongly disagree</Text>
        <Text style={styles.susScaleLabelText}>5 = Strongly agree</Text>
      </View>

      <Pressable
        style={[styles.susSubmitBtn, (!allAnswered || submitting) && styles.susSubmitBtnDisabled]}
        onPress={onSubmit}
        disabled={!allAnswered || submitting}
      >
        <Text style={styles.susSubmitBtnText}>{submitting ? 'Submitting...' : 'Submit responses'}</Text>
      </Pressable>
    </View>
  );

}

export default function FloatingChatButton({
  clinicId,
  clinicName,
  userRole,
  forceOpen = false,
  initialMode,
  onForceOpenHandled,
}: {
  clinicId?: string;
  clinicName?: string;
  userRole?: string;
  forceOpen?: boolean;
  initialMode?: 'triage' | 'default';
  onForceOpenHandled?: () => void;
}) {

  const scrollRef = useRef<ScrollView | null>(null);
  const chatAnimation = useRef(new Animated.Value(0)).current;
  const forceOpenHandledRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [typing, setTyping] = useState(false);
  const [actions, setActions] = useState<ChatAction[]>([]);
  const [bookingDraft, setBookingDraft] = useState<BookingDraft>(null);
  const [triageDraft, setTriageDraft] = useState<any>(null);
  const [resolvedRole, setResolvedRole] = useState(userRole || 'guest');

  const [showRatingPrompt, setShowRatingPrompt] = useState(false);
  const [ratingTriageId, setRatingTriageId] = useState<string | null>(null);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [showSusPrompt, setShowSusPrompt] = useState(false);
  const [susAnswers, setSusAnswers] = useState<number[]>(Array(10).fill(0));
  const [susSubmitted, setSusSubmitted] = useState(false);
  const [submittingSus, setSubmittingSus] = useState(false);
  const prevBookingDraftRef = useRef<BookingDraft>(null);

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

  const openChat = useCallback(() => {
    setOpen(true);
    chatAnimation.setValue(0);

    Animated.spring(chatAnimation, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 70,
    }).start();
  }, [chatAnimation]);

  const closeChat = () => {
    Animated.timing(chatAnimation, {
      toValue: 0,
      duration: 160,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => setOpen(false));
  };

  const sendMessage = useCallback(async (overrideMessage?: string) => {
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

      const prevDraft = prevBookingDraftRef.current;
      const newDraft = data?.bookingDraft ?? null;

      if (prevDraft?.active && prevDraft?.triageId && newDraft === null) {
        setRatingTriageId(prevDraft.triageId);
        setShowRatingPrompt(true);
        setRatingSubmitted(false);
      }

      prevBookingDraftRef.current = newDraft;
      setBookingDraft(newDraft);
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
  }, [ message, typing, clinicId, clinicName, resolvedRole, messages, bookingDraft, triageDraft, ]);

  useEffect(() => {
    if (!forceOpen) {
      forceOpenHandledRef.current = false;
      return;
    }

    if (forceOpenHandledRef.current) return;

    forceOpenHandledRef.current = true;

    openChat();

    if (initialMode === 'triage') {
      setTimeout(() => {
        sendMessage('I have symptoms and need triage help.');
      }, 250);
    }

    onForceOpenHandled?.();
  }, [forceOpen, initialMode, onForceOpenHandled, openChat, sendMessage]);

  const submitRating = async (rating: 'yes' | 'no' | 'somewhat') => {
    if (!ratingTriageId || submittingRating) return;

    try {
      setSubmittingRating(true);
      await supabase
        .from('ai_triage_sessions')
        .update({ chatbot_rating: rating })
        .eq('id', ratingTriageId);
      setRatingSubmitted(true);
      setShowSusPrompt(true);
    } finally {
      setSubmittingRating(false);
    }
  };

  const submitSus = async () => {
    if (susAnswers.some((a) => a === 0) || !ratingTriageId || submittingSus) return;

    const susScore =
      ((susAnswers[0] - 1) + (5 - susAnswers[1]) +
       (susAnswers[2] - 1) + (5 - susAnswers[3]) +
       (susAnswers[4] - 1) + (5 - susAnswers[5]) +
       (susAnswers[6] - 1) + (5 - susAnswers[7]) +
       (susAnswers[8] - 1) + (5 - susAnswers[9])) * 2.5;

    try {
      setSubmittingSus(true);
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('sus_responses').insert({
        triage_session_id: ratingTriageId,
        user_id: user?.id ?? null,
        q1: susAnswers[0], q2: susAnswers[1], q3: susAnswers[2],
        q4: susAnswers[3], q5: susAnswers[4], q6: susAnswers[5],
        q7: susAnswers[6], q8: susAnswers[7], q9: susAnswers[8],
        q10: susAnswers[9],
        sus_score: susScore,
      });
      setSusSubmitted(true);
    } finally {
      setSubmittingSus(false);
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

              {showRatingPrompt && !typing && (
                <View style={styles.ratingCard}>
                  <View style={styles.ratingHeader}>
                    <Ionicons name="sparkles-outline" size={16} color="#6366F1"/>
                    <Text style={styles.ratingTitle}>Quick feedback</Text>
                  </View>

                  {susSubmitted ? (
                    <View style={styles.ratingThanks}>
                      <Ionicons name="checkmark-circle" size={18} color="#15803D"/>
                      <Text style={styles.ratingThanksText}>Thank you - your responses help improve AI triage accuracy.</Text>
                    </View>
                  ) : showSusPrompt ? (
                    <SusQuestionnaire
                      answers={susAnswers}
                      onAnswer={(index, value) => {
                        const updated = [...susAnswers];
                        updated[index] = value;
                        setSusAnswers(updated);
                      }}
                      onSubmit={submitSus}
                      submitting={submittingSus}
                    />
                  ) : ratingSubmitted ? (
                    <View style={styles.ratingThanks}>
                      <Ionicons name="checkmark-circle" size={18} color="#15803D"/>
                      <Text style={styles.ratingThanksText}>Thank you!</Text>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.ratingQuestion}>
                        Did the AI correctly assess how urgent your situation was?
                      </Text>
                      <View style={styles.ratingButtons}>
                        <Pressable
                          style={[styles.ratingBtn, styles.ratingBtnYes]}
                          onPress={() => submitRating('yes')}
                          disabled={submittingRating}
                        >
                          <Text style={styles.ratingBtnYesText}>Yes</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.ratingBtn, styles.ratingBtnNo]}
                          onPress={() => submitRating('no')}
                          disabled={submittingRating}
                        >
                          <Text style={styles.ratingBtnNoText}>No</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.ratingBtn, styles.ratingBtnNeutral]}
                          onPress={() => submitRating('somewhat')}
                          disabled={submittingRating}
                        >
                          <Text style={styles.ratingBtnNeutralText}>Somewhat</Text>
                        </Pressable>
                      </View>
                    </>
                  )}
                </View>
              )}
            </ScrollView>

            <View style={styles.quickActions}>
              <Pressable
                style={styles.quickChip}
                onPress={() => sendMessage('What can I do in MedSync?')}
              >
                <Text style={styles.quickChipText}>MedSync</Text>
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
                <Text style={styles.quickChipText}>Booking</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },

  quickChip: {
    minWidth: 82,
    alignItems: 'center',
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

  ratingCard: {
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 14,
    gap: 10,
    marginTop: 4,
  },

  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  ratingTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
  },

  ratingQuestion: {
    fontSize: 13,
    lineHeight: 20,
    color: '#475569',
    fontWeight: '700',
  },

  ratingButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },

  ratingBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },

  ratingBtnYes: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },

  ratingBtnYesText: {
    color: '#15803D',
    fontWeight: '900',
    fontSize: 13,
  },

  ratingBtnNo: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },

  ratingBtnNoText: {
    color: '#BE123C',
    fontWeight: '900',
    fontSize: 13,
  },

  ratingBtnNeutral: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },

  ratingBtnNeutralText: {
    color: '#64748B',
    fontWeight: '900',
    fontSize: 13,
  },

  ratingThanks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  ratingThanksText: {
    flex: 1,
    color: '#15803D',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },

  susTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 10,
  },

  susQuestion: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '700',
    marginBottom: 5,
    lineHeight: 16,
  },

  susScale: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 10,
  },

  susScaleBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },

  susScaleBtnActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#818CF8',
  },

  susScaleBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#64748B',
  },

  susScaleBtnTextActive: {
    color: '#4338CA',
  },

  susScaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  susScaleLabelText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },

  susSubmitBtn: {
    backgroundColor: '#4338CA',
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },

  susSubmitBtnDisabled: {
    opacity: 0.45,
  },

  susSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

});