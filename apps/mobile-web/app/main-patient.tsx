import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../src/lib/supabase';

export default function PatientDashboard() {

  const { clinicId, clinicName } = useLocalSearchParams<{
    clinicId?: string;
    clinicName?: string;
  }>();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const handleChangeClinic = () => {
    router.replace('/clinic-selection');
  };

  return (

    <View style={styles.container}>

      <View style={styles.card}>
        <Text style={styles.title}>Patient Main Page</Text>
        <Text style={styles.subtitle}>
          Login successful. This is the patient dashboard.
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.label}>Selected clinic</Text>
          <Text style={styles.value}>{clinicName || 'No clinic selected'}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.secondaryButton} onPress={handleChangeClinic}>
            <Text style={styles.secondaryButtonText}>Change Clinic</Text>
          </Pressable>

          <Pressable style={styles.button} onPress={handleLogout}>
            <Text style={styles.buttonText}>Logout</Text>
          </Pressable>
        </View>
      </View>

    </View>
  
  );

}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 28,
  },

  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 16,
    lineHeight: 26,
    color: '#475569',
    marginBottom: 22,
  },

  infoBox: {
    marginBottom: 18,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  label: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },

  value: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },

  actions: {
    gap: 12,
  },

  button: {
    backgroundColor: '#1D4ED8',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  secondaryButton: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  secondaryButtonText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },

});