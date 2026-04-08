import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../src/lib/supabase';
import { getCurrentUserProfile } from '../src/lib/auth';

export default function AdminDashboardScreen() {

  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    const checkAccess = async () => {
      const { user, profile } = await getCurrentUserProfile();

      if (!user) {
        router.replace('/login');
        return;
      }

      if (profile?.role !== 'admin') {
        router.replace('/main');
        return;
      }

      setFullName(`${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim());
      setLoading(false);
    };

    checkAccess();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (

    <ScrollView contentContainerStyle={styles.container}>

      <View style={styles.card}>
        
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>You are logged in as an admin.</Text>

        <View style={styles.infoBox}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{fullName || 'Admin User'}</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.label}>Role</Text>
          <Text style={styles.value}>admin</Text>
        </View>

        <Text style={styles.note}>
          This is a temporary dashboard just to verify that role-based login works correctly.
        </Text>

        <Pressable style={styles.button} onPress={handleLogout}>
          <Text style={styles.buttonText}>Log Out</Text>
        </Pressable>

      </View>

    </ScrollView>
  
);
}

const styles = StyleSheet.create({

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 24,
  },

  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    color: '#475569',
    marginBottom: 22,
  },

  infoBox: {
    marginBottom: 14,
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

  note: {
    marginTop: 8,
    marginBottom: 20,
    color: '#475569',
    fontSize: 14,
    lineHeight: 22,
  },

  button: {
    backgroundColor: '#1D4ED8',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },

  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },

});