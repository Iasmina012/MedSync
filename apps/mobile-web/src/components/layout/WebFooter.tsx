import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const STORE_LINKS = {

  appStore: 'https://www.apple.com/app-store/',
  googlePlay: 'https://play.google.com/store',

};

export default function WebFooter() {

  return (

    <View style={styles.footer}>

      <View style={styles.inner}>

        <View style={styles.brandBlock}>
          <Text style={styles.brandTitle}>MedSync</Text>
          <Text style={styles.brandText}>Placeholder motto</Text>
          <Text style={styles.brandSubtext}>
            Placeholder description.
          </Text>
        </View>

        <View style={styles.linksBlock}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <Text style={styles.linkText}>office@medsync.com</Text>
          <Text style={styles.linkText}>+40 777 777 777</Text>
          <Text style={styles.linkText}>Mon - Fri · 08:00 - 18:00</Text>
        </View>

        <View style={styles.linksBlock}>
          <Text style={styles.sectionTitle}>Legal</Text>

          <Pressable>
            <Text style={styles.linkText}>Privacy Policy</Text>
          </Pressable>

          <Pressable>
            <Text style={styles.linkText}>Terms & Conditions</Text>
          </Pressable>

          <Pressable onPress={() => Linking.openURL('mailto:contact@medsync.com')}>
            <Text style={styles.linkText}>Support</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.storeRow}>
        <Pressable
          style={styles.storeButton}
          onPress={() => Linking.openURL(STORE_LINKS.appStore)}
        >
          <Ionicons name="logo-apple" size={18} color="#FFFFFF"/>
          <Text style={styles.storeButtonText}>App Store</Text>
        </Pressable>

        <Pressable
          style={styles.storeButton}
          onPress={() => Linking.openURL(STORE_LINKS.googlePlay)}
        >
          <Ionicons name="logo-google-playstore" size={18} color="#FFFFFF"/>
          <Text style={styles.storeButtonText}>Google Play</Text>
        </Pressable>
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
    paddingBottom: 22,
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
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 28,
    flexWrap: 'wrap',
  },

  storeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1D4ED8',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 14,
    minWidth: 160,
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

  linkText: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 24,
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