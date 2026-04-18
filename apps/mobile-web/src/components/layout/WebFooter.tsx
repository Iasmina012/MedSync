import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function WebFooter() {

  return (

    <View style={styles.footer}>

      <View style={styles.inner}>

        <View style={styles.brandBlock}>
          <Text style={styles.brandTitle}>MedSync</Text>
          <Text style={styles.brandText}>
            Connected care, smarter clinics.
          </Text>
          <Text style={styles.brandSubtext}>
            A modern multi-clinic medical platform for patients, doctors, and administrators.
          </Text>

          <View style={styles.storeRow}>
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

        <View style={styles.linksBlock}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <Text style={styles.linkText}>contact@medsync.com</Text>
          <Text style={styles.linkText}>+40 777 777 777</Text>
          <Text style={styles.linkText}>Mon - Fri · 08:00 - 18:00</Text>

          <Pressable
            style={styles.contactButton}
            onPress={() => Linking.openURL('mailto:contact@medsync.com')}
          >
            <Text style={styles.contactButtonText}>Send email</Text>
          </Pressable>
        </View>

        <View style={styles.linksBlock}>
          <Text style={styles.sectionTitle}>Legal</Text>

          <Pressable style={styles.linkButton}>
            <Text style={styles.linkText}>Privacy Policy</Text>
          </Pressable>

          <Pressable style={styles.linkButton}>
            <Text style={styles.linkText}>Terms & Conditions</Text>
          </Pressable>

          <Pressable
            style={styles.linkButton}
            onPress={() => Linking.openURL('mailto:contact@medsync.com')}
          >
            <Text style={styles.linkText}>Support</Text>
          </Pressable>
        </View>
      
      </View>

      <View style={styles.bottomBar}>

        <Text style={styles.bottomText}>
          © 2026 MedSync. All rights reserved.
        </Text>
      
      </View>
    
    </View>
  
  );

}

const styles = StyleSheet.create({
  
  footer: {
    backgroundColor: '#1E293B',
    marginTop: 40,
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },

  inner: {
    maxWidth: 1380,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 28,
    flexWrap: 'wrap',
  },

  brandBlock: {
    flex: 1.2,
    minWidth: 280,
  },

  linksBlock: {
    flex: 0.8,
    minWidth: 220,
  },

  brandTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 10,
  },

  brandText: {
    color: '#E2E8F0',
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '700',
    marginBottom: 8,
  },

  brandSubtext: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 24,
    maxWidth: 420,
  },

  storeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 18,
  },

  storeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1D4ED8',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  storeButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },

  linkButton: {
    alignSelf: 'flex-start',
    marginBottom: 6,
  },

  linkText: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 24,
  },

  contactButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  contactButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },

  bottomText: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
  },

});