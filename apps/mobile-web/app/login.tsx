import React, { useState } from 'react';
import { Link, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PublicPageLayout from '../src/components/layout/PublicPageLayout';
import { supabase } from '../src/lib/supabase';
import WebFooter from '../src/components/layout/WebFooter';

export default function LoginScreen() {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {

    try {
      setLoading(true);
      setError('');

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      router.replace('/main');
    } catch {
      setError('There has been an error.');
    } finally {
      setLoading(false);
    }
  
  };

  return (

    <PublicPageLayout >

      <ScrollView contentContainerStyle={styles.container}>
       
        <View style={styles.card}>
          <View style={styles.headerIcon}>
            <Ionicons name="log-in-outline" size={24} color="#1D4ED8"/>
          </View>

          <Text style={styles.title}>Login</Text>
          <Text style={styles.subtitle}>
            Login to continue
          </Text>

          <TextInput
            placeholder="Email"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />

          <TextInput
            placeholder="Password"
            placeholderTextColor="#94A3B8"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={styles.button}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Loading...' : 'Log In'}
            </Text>
          </Pressable>

          <Text style={styles.footerText}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" style={styles.link}>
              Sign Up
            </Link>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 48,
  },

  card: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },

  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    color: '#475569',
    marginBottom: 22,
    lineHeight: 24,
  },

  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
    fontSize: 15,
    color: '#0F172A',
  },

  button: {
    backgroundColor: '#1D4ED8',
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  footerText: {
    marginTop: 18,
    color: '#475569',
    fontSize: 14,
    textAlign: 'center',
  },

  link: {
    color: '#1D4ED8',
    fontWeight: '800',
  },

  error: {
    color: '#DC2626',
    marginBottom: 10,
    fontSize: 14,
    lineHeight: 22,
  },
  
});