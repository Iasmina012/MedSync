import React from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../src/lib/supabase';

export default function MainScreen() {

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (

    <View style={styles.container}>

      <View style={styles.card}>
        <Text style={styles.title}>Main Page</Text>
        <Text style={styles.subtitle}>
          Login successful. This is the main dashboard.
        </Text>

        <Pressable style={styles.button} onPress={handleLogout}>
          <Text style={styles.buttonText}>Logout</Text>
        </Pressable>
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
  
});