import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function FloatingChatButton() {

  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');

  return (

    <>

      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.floatingButton,
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
                <Text style={styles.chatTitle}>Chatbot MedSync</Text>
                <Text style={styles.chatSubtitle}>Demo Assistant for Help</Text>
              </View>

              <Pressable onPress={() => setOpen(false)}>
                <Ionicons name="close" size={22} color="#0F172A"/>
              </Pressable>
            </View>

            <View style={styles.chatBody}>
              <View style={styles.botBubble}>
                <Text style={styles.botBubbleText}>
                  Hi! I am a demo chatbot.
                </Text>
              </View>
            </View>

            <View style={styles.chatInputRow}>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Write a message..."
                style={styles.input}
              />
              <Pressable style={styles.sendButton}>
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
    position: 'fixed' as any,
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
    flex: 1,
    padding: 16,
    backgroundColor: '#F8FAFC',
  },

  botBubble: {
    alignSelf: 'flex-start',
    maxWidth: '85%',
    backgroundColor: '#EFF6FF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  botBubbleText: {
    color: '#0F172A',
    fontSize: 14,
    lineHeight: 22,
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