import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

export default function WebFooter() {

  return (

    <View style={styles.footer}>

      <View style={styles.inner}>
        <View style={styles.brandBlock}>
          <Text style={styles.brandTitle}>MedSync</Text>
          <Text style={styles.brandText}>
            Medical Platform
          </Text>
        </View>

        <View style={styles.linksBlock}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <Text style={styles.linkText}>contact@medsync.com</Text>
          <Text style={styles.linkText}>+40 777 777 777</Text>
          <Text style={styles.linkText}>Mon - Fri · 08:00 - 18:00</Text>
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
            onPress={() => Linking.openURL('mailto:iasmina.putina012@yahoo.com')}
          >
            <Text style={styles.linkText}>Support</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.bottomBar}>
        <Text style={styles.bottomText}>
          © 2026 MedSync. Demo.
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
    flex: 1.1,
    minWidth: 260,
  },

  linksBlock: {
    flex: 0.8,
    minWidth: 220,
  },

  brandTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 12,
  },

  brandText: {
    color: '#CBD5E1',
    fontSize: 15,
    lineHeight: 24,
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