import React from 'react';
import { ScrollView, StyleSheet, Text, View, Platform, Pressable} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PublicPageLayout from '../src/components/layout/PublicPageLayout';
import WebFooter from '../src/components/layout/WebFooter';

export default function AboutScreen() {
  
  return (
    
    <PublicPageLayout>

      <ScrollView contentContainerStyle={styles.container}>

        <View style={styles.hero}>

          <View style={styles.badge}>
            <Ionicons name="information-circle-outline" size={16} color="#1D4ED8"/>
            <Text style={styles.badgeText}>About MedSync</Text>
          </View>

          <Text style={styles.title}>A digital medical platform built for modern clinics</Text>
          <Text style={styles.subtitle}>
            MedSync is a multi-platform medical system designed for clinics, doctors, patients, and administrators, with a strong base for future AI-powered workflows.
          </Text>
        
        </View>

        <View style={styles.grid}>

          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons name="business-outline" size={22} color="#1D4ED8"/>
            </View>
            <Text style={styles.cardTitle}>Multi-Clinic Ready</Text>
            <Text style={styles.cardText}>
              One system can support multiple clinics, each with its own users, data, branding, and workflows.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons name="phone-portrait-outline" size={22} color="#1D4ED8"/>
            </View>
            <Text style={styles.cardTitle}>Web + Mobile</Text>
            <Text style={styles.cardText}>
              Built as a shared experience for web, iOS, and Android, while keeping each platform adapted to its context.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons name="sparkles-outline" size={22} color="#1D4ED8"/>
            </View>
            <Text style={styles.cardTitle}>AI Expansion Path</Text>
            <Text style={styles.cardText}>
              The platform can later include AI summaries, assisted onboarding, triage, chatbot support, and document workflows.
            </Text>
          </View>

        </View>

        <View style={styles.downloadSection}>

          <Text style={styles.downloadTitle}>Download the app</Text>
          <Text style={styles.downloadSubtitle}>
            Later, this section will link directly to the published mobile applications.
          </Text>

          <View style={styles.downloadButtonsRow}>
            <Pressable style={styles.storeButton}>
              <Ionicons name="logo-apple" size={18} color="#FFFFFF"/>
              <Text style={styles.storeButtonText}>App Store</Text>
            </Pressable>

            <Pressable style={styles.storeButton}>
              <Ionicons name="logo-google-playstore" size={18} color="#FFFFFF"/>
              <Text style={styles.storeButtonText}>Google Play</Text>
            </Pressable>
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
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 28,
    marginBottom: 24,
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
    maxWidth: 900,
    marginBottom: 14,
  },

  subtitle: {
    fontSize: 17,
    lineHeight: 28,
    color: '#475569',
    maxWidth: 900,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    marginBottom: 24,
  },

  card: {
    flex: 1,
    minWidth: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 22,
  },

  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },

  cardText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
  },

  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 28,
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 14,
  },

  sectionText: {
    fontSize: 16,
    lineHeight: 28,
    color: '#475569',
    marginBottom: 12,
  },

  downloadSection: {
    backgroundColor: '#0F172A',
    borderRadius: 30,
    padding: 28,
  },

  downloadTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 10,
  },

  downloadSubtitle: {
    fontSize: 15,
    lineHeight: 24,
    color: '#CBD5E1',
    marginBottom: 18,
  },

  downloadButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  storeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1D4ED8',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },

  storeButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },

});