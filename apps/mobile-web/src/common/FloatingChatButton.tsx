import React, { useState, useRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme } from '../lib/clinicTheme';
import { supabase } from '../lib/supabase';
import TypingDots from './ChatTypingDots';

type ChatbotMessage = {

  id: string;
  role: 'bot' | 'user';
  text: string;

};

export default function FloatingChatButton({
  clinicId,
  clinicName,
}: {
  clinicId?: string;
  clinicName?: string;
}) {

  const scrollRef = useRef<ScrollView | null>(null);

  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<ChatbotMessage[]>([
    {
      id: 'welcome',
      role: 'bot',
      text: clinicName
        ? `Hi! I am MedSync's chatbot. I can help you with ${clinicName}, appointments, doctors, messages and app navigation.`
        : "Hi! I am MedSync's chatbot. I can help you with the app, clinics, appointments and account navigation.",
    },
  ]);

  const { theme } = useClinicTheme(clinicId);
  const primaryColor = clinicId ? theme.primary : '#1D4ED8';

  const sendMessage = async () => {

    const value = message.trim();
    if (!value || typing) return;

    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-user`, role: 'user', text: value },
    ]);

    setMessage('');
    setTyping(true);

    try {
      const { data, error } = await supabase.functions.invoke('medsync-chatbot', {
        body: {
          message: value,
          clinicName,
        },
      });

      if (error) {
        console.log('SUPABASE FUNCTION ERROR:', error);

        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-err`,
            role: 'bot',
            text: JSON.stringify(error, null, 2),
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
    }

  };

  return (

    <>

      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.floatingButton, { backgroundColor: primaryColor },
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="chatbubble-ellipses" size={24} color="#FFFFFF"/>
      </Pressable>

      <Modal visible={open} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.chatCard}>
            <View style={styles.chatHeader}>
              <View>
                <Text style={styles.chatTitle}>MedSync Chatbot</Text>
                <Text style={styles.chatSubtitle}>{clinicName ? `${clinicName} Assistant` : 'Help Assistant for You'}</Text>
              </View>

              <Pressable onPress={() => setOpen(false)}>
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
                     mine ? [styles.userBubble, { backgroundColor: primaryColor }] : styles.botBubble
                    ]}
                  >
                    <Text style={[styles.messageText, mine && styles.userBubbleText]}>
                      {item.text}
                    </Text>
                  </View>
                );
              })}

              {typing && (
                <View style={styles.typingBubble}>
                  <TypingDots/>
                </View>
              )}
            </ScrollView>

            <View style={styles.chatInputRow}>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Write a message..."
                placeholderTextColor="#94A3B8"
                style={styles.input}
                onSubmitEditing={sendMessage}
              />

            <Pressable
              style={[styles.sendButton, { backgroundColor: primaryColor }]}
              onPress={sendMessage}
            >
              <Ionicons name="send" size={18} color="#FFFFFF"/>
            </Pressable>

            </View>
          </View>
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
    width: 380,
    maxWidth: '100%',
    height: 520,
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

  pressed: {
    opacity: 0.88,
  },

});