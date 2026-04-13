import React from 'react';
import { ScrollView, StyleSheet, Text, View, Platform } from 'react-native';
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
            <Text style={styles.badgeText}>About our Platform</Text>
          </View>

          <Text style={styles.title}>One medical platform for multiple clinics</Text>
          <Text style={styles.subtitle}>
            MedSync is a web and mobile app template built for clinics, doctors and patients, with a focus on scalability, personalized branding and gradual integration of AI functionality.
          </Text>
        
        </View>

        <View style={styles.grid}>
          
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons name="business-outline" size={22} color="#1D4ED8"/>
            </View>

            <Text style={styles.cardTitle}>Multi-Clinic</Text>
            <Text style={styles.cardText}>
              The application can be reused for multiple medical centers, each with its own doctors, patients and settings.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons name="color-palette-outline" size={22} color="#1D4ED8"/>
            </View>
            <Text style={styles.cardTitle}>Personalised Branding</Text>
            <Text style={styles.cardText}>
              Each clinic can have its own name, colors, logo and visual elements displayed consistently across all platforms.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons name="layers-outline" size={22} color="#1D4ED8"/>
            </View>
            <Text style={styles.cardTitle}>Web + iOS + Android</Text>
            <Text style={styles.cardText}>
              A single codebase for tailored experiences across desktop, mobile browser and native app.
            </Text>
          </View>

        </View>

        <View style={styles.section}>
         
          <Text style={styles.sectionTitle}>What does the project aim to achieve?</Text>
          <Text style={styles.sectionText}>
            The project&apos;s goal is to provide a modern core for managing the relationship between patients, doctors, and administrators, starting from essential functionalities such as authentication, appointments, patient history, and role-based interfaces.
          </Text>

          <Text style={styles.sectionText}>
            On this basis, AI components such as chatbot, automatic document summarization, assisted onboarding, and support for information triage can be progressively added.
          </Text>

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

});