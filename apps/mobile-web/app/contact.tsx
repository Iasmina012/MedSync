import React, { useState, useEffect, useRef, } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Platform, Alert, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PublicPageLayout from '../src/components/layout/PublicPageLayout';
import WebFooter from '../src/components/layout/WebFooter';
import { supabase } from '../src/lib/supabase';

const CONTACT = {

  email: 'contact@medsync.com',
  phoneDisplay: '+40 777 777 777',
  phoneLink: '+40777777777',
  addressLine1: 'MedSync Headquarters',
  addressLine2: 'Bulevardul Unirii 10, București, România',
  googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Bulevardul+Unirii+10+Bucuresti+Romania',
  appleMapsUrl: 'http://maps.apple.com/?q=Bulevardul+Unirii+10+Bucuresti+Romania',

};

function showAlert(title: string, message: string) {

  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);

}

async function openExternalUrl(url: string, errorMessage: string) {

  try {
    if (Platform.OS === 'web') {
      const link = document.createElement('a');
      link.href = url;
      link.target = '_self';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const supported = await Linking.canOpenURL(url);

    if (!supported) {
      showAlert('Unavailable', errorMessage);
      return;
    }

    await Linking.openURL(url);
  } catch {
    showAlert('Unavailable', errorMessage);
  }

}

export default function ContactScreen() {

  const floatY = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const slideX = useRef(new Animated.Value(0)).current;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {

    const loadLoggedUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const metadata = user.user_metadata ?? {};

      const metadataFirstName =
        metadata.first_name ||
        metadata.firstName ||
        metadata.given_name ||
        metadata.givenName ||
        '';

      const metadataLastName =
        metadata.last_name ||
        metadata.lastName ||
        metadata.family_name ||
        metadata.familyName ||
        '';

      const fullName =
        metadata.full_name ||
        metadata.fullName ||
        metadata.name ||
        '';

      let resolvedFirstName = String(metadataFirstName).trim();
      let resolvedLastName = String(metadataLastName).trim();

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
        setFirstName(resolvedFirstName);
      }

      if (resolvedLastName) {
        setLastName(resolvedLastName);
      }

      if (user.email) {
        setEmailInput(user.email);
      }
    };

    loadLoggedUser();

  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, {
          toValue: -12,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatY, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(slideX, {
          toValue: 10,
          duration: 1700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(slideX, {
          toValue: 0,
          duration: 1700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

  }, [floatY, pulse, slideX]);

  const openEmail = () => {
    openExternalUrl(
      `mailto:${CONTACT.email}`,
      'Email app is not available on this device.'
    );
  };

  const openPhone = () => {
    openExternalUrl(
      `tel:${CONTACT.phoneLink}`,
      'Phone calls are not available on this device.'
    );
  };

  const openMap = () => {
    const url = Platform.OS === 'ios' ? CONTACT.appleMapsUrl : CONTACT.googleMapsUrl;

    openExternalUrl(url, 'Maps are not available on this device.');
  };

const handleSendMessage = async () => {

  const trimmedFirstName = firstName.trim();
  const trimmedLastName = lastName.trim();
  const trimmedEmail = emailInput.trim();
  const trimmedMessage = message.trim();

  if (!trimmedFirstName || !trimmedLastName || !trimmedEmail || !trimmedMessage) {
    showAlert('Incomplete form', 'Please complete all fields before sending.');
    return;
  }

  const emailIsValid = /\S+@\S+\.\S+/.test(trimmedEmail);
  if (!emailIsValid) {
    showAlert('Invalid email', 'Please enter a valid email address.');
    return;
  }

  const subject = encodeURIComponent(`MedSync contact message from ${trimmedFirstName} ${trimmedLastName}`);

  const body = encodeURIComponent(
    [
      `First name: ${trimmedFirstName}`,
      `Last name: ${trimmedLastName}`,
      `Email: ${trimmedEmail}`,
      '',
      'Message:',
      trimmedMessage,
    ].join('\n')
  );

  const mailtoUrl = `mailto:${CONTACT.email}?subject=${subject}&body=${body}`;

  await openExternalUrl(mailtoUrl, 'Email app is not available on this device.');

};

  return (

    <PublicPageLayout>

      <ScrollView contentContainerStyle={styles.container}>

        <View style={styles.hero}>

          <View style={styles.heroLeft}>
            <View style={styles.badge}>
              <Ionicons name="mail-outline" size={16} color="#1D4ED8"/>
              <Text style={styles.badgeText}>
                Let&apos;s talk! Contact the MedSync Team
              </Text>
            </View>

            <Text style={styles.title}>Get in touch with the MedSync team</Text>

            <Text style={styles.subtitle}>
              Reach out for platform support, collaboration, clinic onboarding, or general MedSync questions.
            </Text>

            <View style={styles.heroPillsRow}>
              <View style={styles.heroPill}>
                <Ionicons name="mail-open-outline" size={16} color="#1D4ED8"/>
                <Text style={styles.heroPillText}>Email support</Text>
              </View>

              <View style={styles.heroPill}>
                <Ionicons name="call-outline" size={16} color="#1D4ED8"/>
                <Text style={styles.heroPillText}>Direct contact</Text>
              </View>

              <View style={styles.heroPill}>
                <Ionicons name="time-outline" size={16} color="#1D4ED8"/>
                <Text style={styles.heroPillText}>Weekday support</Text>
              </View>
            </View>
          </View>

          <Animated.View
            style={[
              styles.contactAnimationCard,
              {
                transform: [{ translateY: floatY }],
              },
            ]}
          >
            <View style={styles.animationTopRow}>
              <View style={styles.animationIconWrap}>
                <Ionicons name="chatbubbles-outline" size={24} color="#1D4ED8"/>
              </View>

              <View>
                <Text style={styles.animationTitle}>Message received</Text>
                <Text style={styles.animationSubtitle}>MedSync support team</Text>
              </View>
            </View>

            <View style={styles.messagePreview}>
              <Text style={styles.messagePreviewText}>
                Hi MedSync, I&apos;d like to learn more about the platform.
              </Text>
            </View>

            <Animated.View
              style={[
                styles.replyBubble,
                {
                  transform: [{ translateX: slideX }],
                },
              ]}
            >
              <Ionicons name="checkmark-circle" size={18} color="#10B981"/>
              <Text style={styles.replyBubbleText}>We&apos;ll get back soon</Text>
            </Animated.View>

            <Animated.View
              style={[
                styles.heroPulseButton,
                {
                  transform: [{ scale: pulse }],
                },
              ]}
            >
              <Ionicons name="paper-plane" size={18} color="#FFFFFF"/>
              <Text style={styles.heroPulseButtonText}>Send message</Text>
            </Animated.View>
          </Animated.View>
        </View>

        <View style={styles.grid}>

          <View style={styles.card}>
            <Pressable style={styles.row} onPress={openEmail}>
              <View style={styles.iconWrap}>
                <Ionicons name="mail-open-outline" size={20} color="#1D4ED8"/>
              </View>

              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>Email</Text>
                <Text style={styles.rowText}>{CONTACT.email}</Text>
              </View>

              <Ionicons name="open-outline" size={18} color="#64748B"/>
            </Pressable>

            <Pressable style={styles.row} onPress={openPhone}>
              <View style={styles.iconWrap}>
                <Ionicons name="call-outline" size={20} color="#1D4ED8"/>
              </View>

              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>Phone</Text>
                <Text style={styles.rowText}>{CONTACT.phoneDisplay}</Text>
              </View>

              <Ionicons name="open-outline" size={18} color="#64748B"/>
            </Pressable>

            <View style={styles.row}>
              <View style={styles.iconWrap}>
                <Ionicons name="time-outline" size={20} color="#1D4ED8"/>
              </View>

              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>Schedule</Text>
                <Text style={styles.rowText}>Mon - Fri · 08:00 - 18:00</Text>
              </View>
            </View>

            <View style={styles.messageCard}>
              <Text style={styles.messageTitle}>Leave us a message</Text>
              <Text style={styles.messageSubtitle}>
                Fill in your details and we&apos;ll open your mail app with the message ready to send.
              </Text>

              <View style={styles.formRow}>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  placeholderTextColor="#94A3B8"
                  style={[styles.input, styles.inputHalf]}
                />

                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  placeholderTextColor="#94A3B8"
                  style={[styles.input, styles.inputHalf]}
                />
              </View>

              <TextInput
                value={emailInput}
                onChangeText={setEmailInput}
                placeholder="Your email"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />

              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Write your message"
                placeholderTextColor="#94A3B8"
                multiline
                style={[styles.input, styles.textarea]}
              />

              <Pressable style={styles.messageButton} onPress={handleSendMessage}>
                <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF"/>
                <Text style={styles.messageButtonText}>Send message</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.sideCard}>

            <Text style={styles.sideTitle}>Headquarters</Text>

            <Pressable style={styles.mapCard} onPress={openMap}>
              <View style={styles.mapTopRow}>
                <View style={styles.mapIconWrap}>
                  <Ionicons name="map-outline" size={24} color="#1D4ED8"/>
                </View>

                <View style={styles.mapTopText}>
                  <Text style={styles.mapTitle}>{CONTACT.addressLine1}</Text>
                  <Text style={styles.mapAddress}>{CONTACT.addressLine2}</Text>
                </View>
              </View>

              <View style={styles.mapVisual}>
                <View style={styles.mapGrid} />
                <View style={styles.mapMarker}>
                  <Ionicons name="location" size={26} color="#1D4ED8"/>
                </View>
              </View>

              <View style={styles.mapBottomRow}>
                <Text style={styles.mapHint}>Tap to open in Maps</Text>
                <Ionicons name="open-outline" size={18} color="#1D4ED8"/>
              </View>
            </Pressable>

            <Pressable style={styles.directionsButton} onPress={openMap}>
              <Ionicons name="navigate-outline" size={18} color="#FFFFFF"/>
              <Text style={styles.directionsButtonText}>Get directions</Text>
            </Pressable>

            <View style={styles.bullet}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981"/>
              <Text style={styles.bulletText}>Platform-level contact for MedSync</Text>
            </View>

            <View style={styles.bullet}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981"/>
              <Text style={styles.bulletText}>
                Clinic-specific maps can be added later
              </Text>
            </View>

            <View style={styles.bullet}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981"/>
              <Text style={styles.bulletText}>
                Support, collaboration, and platform inquiries
              </Text>
            </View>               
          </View>

        </View>

      { Platform.OS === 'web' && <WebFooter/> }

      </ScrollView>

    </PublicPageLayout>

  );

}

const styles = StyleSheet.create({

  container: {
    flexGrow: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
    maxWidth: 1380,
    width: '100%',
    alignSelf: 'center',
  },

  hero: {
    backgroundColor: '#FFFFFF',
    borderRadius: 34,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 30,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 28,
    flexWrap: 'wrap',
    overflow: 'hidden',
  },

  heroLeft: {
    flex: 1.1,
    minWidth: 280,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },

  badgeText: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 13,
  },

  title: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 14,
    maxWidth: 760,
  },

  subtitle: {
    fontSize: 17,
    lineHeight: 28,
    color: '#475569',
    maxWidth: 760,
  },

  heroPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 22,
  },

  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  heroPillText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
  },

  contactAnimationCard: {
    width: 400,
    minHeight: 310,
    backgroundColor: '#0F172A',
    borderRadius: 34,
    padding: 20,
    borderWidth: 8,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 6,
  },

  animationTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },

  animationIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  animationTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  animationSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
  },

  messagePreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
  },

  messagePreviewText: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
  },

  replyBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },

  replyBubbleText: {
    color: '#166534',
    fontWeight: '800',
    fontSize: 13,
  },

  heroPulseButton: {
    alignSelf: 'center',
    backgroundColor: '#1D4ED8',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  heroPulseButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },

  card: {
    flex: 1.1,
    minWidth: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
  },

  sideCard: {
    flex: 0.9,
    minWidth: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
  },

  row: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 18,
    alignItems: 'center',
  },

  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  rowContent: {
    flex: 1,
  },

  rowTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },

  rowText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 24,
  },

  messageCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    marginTop: 10,
  },

  messageTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
  },

  messageSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    marginBottom: 14,
  },

  formRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 12,
  },

  inputHalf: {
    flex: 1,
    minWidth: 180,
  },

  textarea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },

  messageButton: {
    backgroundColor: '#1D4ED8',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  messageButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },

  sideTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 16,
  },

  mapCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
  },

  mapTopRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 14,
  },

  mapIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  mapTopText: {
    flex: 1,
  },

  mapTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },

  mapAddress: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
  },

  mapVisual: {
    height: 170,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#EAF2FF',
    borderWidth: 1,
    borderColor: '#D8E6FF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 12,
  },

  mapGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.35,
    borderRadius: 18,
    backgroundColor: '#DCEAFE',
  },

  mapMarker: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },

  mapBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  mapHint: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1D4ED8',
  },

  directionsButton: {
    marginBottom: 20,
    backgroundColor: '#1D4ED8',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },

  directionsButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },

  bullet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },

  bulletText: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 24,
    flex: 1,
  },

});