import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View, Platform} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PublicPageLayout from '../src/components/layout/PublicPageLayout';
import WebFooter from '../src/components/layout/WebFooter';

export default function ContactScreen() {

  return (

    <PublicPageLayout>

      <ScrollView contentContainerStyle={styles.container}>

        <View style={styles.hero}>

          <View style={styles.badge}>
            <Ionicons name="mail-outline" size={16} color="#1D4ED8"/>
            <Text style={styles.badgeText}>Let&apos;s talk! Contact the MedSync Team</Text>
          </View>

          <Text style={styles.title}>Get in touch with the MedSync team</Text>
          <Text style={styles.subtitle}>
            This contact page is for the MedSync platform team.
          </Text>
        
        </View>

        <View style={styles.grid}>

          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.iconWrap}>
                <Ionicons name="mail-open-outline" size={20} color="#1D4ED8"/>
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>Email</Text>
                <Text style={styles.rowText}>contact@medsync.com</Text>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.iconWrap}>
                <Ionicons name="call-outline" size={20} color="#1D4ED8"/>
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>Phone</Text>
                <Text style={styles.rowText}>+40 777 777 777</Text>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.iconWrap}>
                <Ionicons name="time-outline" size={20} color="#1D4ED8"/>
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>Schedule</Text>
                <Text style={styles.rowText}>Mon - Fri · 08:00 - 18:00</Text>
              </View>
            </View>

            <Pressable
              style={styles.primaryButton}
              onPress={() => Linking.openURL('mailto:contact@medsync.com')}
            >
              <Text style={styles.primaryButtonText}>Send email</Text>
            </Pressable>
          </View>

          <View style={styles.sideCard}>

            <Text style={styles.sideTitle}>Headquarters</Text>

            <View style={styles.mapPlaceholder}>
              <Ionicons name="map-outline" size={28} color="#1D4ED8"/>
              <Text style={styles.mapPlaceholderTitle}>Map placeholder</Text>
              <Text style={styles.mapPlaceholderText}>
                Later, this area can display a Google Map with the MedSync team headquarters.
              </Text>
            </View>

            <View style={styles.bullet}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981"/>
              <Text style={styles.bulletText}>
                Platform-level contact for MedSync
              </Text>
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

  primaryButton: {
    marginTop: 10,
    backgroundColor: '#1D4ED8',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignSelf: 'flex-start',
  },

  primaryButtonText: {
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

  mapPlaceholder: {
    backgroundColor: '#F8FAFC',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    minHeight: 180,
  },

  mapPlaceholderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 10,
    marginBottom: 8,
  },

  mapPlaceholderText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    textAlign: 'center',
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