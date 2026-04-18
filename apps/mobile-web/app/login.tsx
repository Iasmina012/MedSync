import React, { useState } from 'react';
import { Link, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/lib/supabase';
import { getCurrentUserProfile } from '../src/lib/auth';
import WebFooter from '../src/components/layout/WebFooter';
import PublicPageLayout from '../src/components/layout/PublicPageLayout';

export default function LoginScreen() {

  const [identifier, setIdentifier] = useState('');
  const [identifierError, setIdentifierError] = useState('');

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async () => {

    try {
      setLoading(true);
      setError('');
      setIdentifierError('');
      setPasswordError('');

      const input = identifier.trim().toLowerCase();

      let hasError = false;

      if (!input) {
        setIdentifierError('Please enter your username or email');
        hasError = true;
      }

      if (!password) {
        setPasswordError('Please enter your password');
        hasError = true;
      }

      if (hasError) return;

      let loginEmail = input;
      const isEmail = input.includes('@');

      if (!isEmail) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', input)
          .maybeSingle();

        if (profileError) {
          setError(profileError.message);
          return;
        }

        if (!profile?.email) {
          setError('No account was found with this username or email');
          return;
        }

        loginEmail = profile.email;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (signInError) {
        setError('Invalid login credentials');
        return;
      }

      const { profile, error: profileError } = await getCurrentUserProfile();

      if (profileError || !profile) {
        setError('Unable to load your profile');
        return;
      }

      router.replace('/clinic-selection');

    } catch {
      setError('An error occurred while logging in');
    } finally {
      setLoading(false);
    }
  
  };

  const handleForgotPassword = async () => {

    try {
      setResetLoading(true);
      setResetError('');
      setResetMessage('');

      const emailToUse = resetEmail.trim().toLowerCase();

      if (!emailToUse) {
        setResetError('Please enter your email address');
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(emailToUse, {
        redirectTo: 'medsync://reset-password',
      });

      if (error) {
        setResetError(error.message);
        return;
      }

      setResetMessage('Password reset email sent.');
    } finally {
      setResetLoading(false);
    }
  
  };

  const openForgotModal = () => {
    setForgotOpen(true);
    setResetEmail(identifier.includes('@') ? identifier.trim() : '');
    setResetError('');
    setResetMessage('');
  };

  const closeForgotModal = () => {
    setForgotOpen(false);
    setResetError('');
    setResetMessage('');
  };

  return (

    <PublicPageLayout>

      <ScrollView contentContainerStyle={styles.container}>
       
        <View style={styles.card}>
          <View style={styles.headerIcon}>
            <Ionicons name="log-in-outline" size={24} color="#1D4ED8"/>
          </View>

          <Text style={styles.title}>Login</Text>
          <Text style={styles.subtitle}>
            Log in with your username or email to continue
          </Text>

          <TextInput
            placeholder="Username or Email"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            value={identifier}
            onChangeText={(value) => {
              setIdentifier(value);
              if (value.trim()) setIdentifierError('');
            }}
            style={styles.input}
          />

          {!!identifierError && <Text style={styles.inlineError}>{identifierError}</Text>}

          <View style={styles.passwordWrapper}>
            <TextInput
              placeholder="Password"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                if (value) setPasswordError('');
              }}
              style={styles.passwordInput}
            />
            <Pressable
              onPress={() => setShowPassword((prev) => !prev)}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#64748B"
              />
            </Pressable>
          </View>

          {!!passwordError && <Text style={styles.inlineError}>{passwordError}</Text>}

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Loading...' : 'Log In'}
            </Text>
          </Pressable>

          <Pressable onPress={openForgotModal}>
            <Text style={styles.forgotLink}>Forgot password?</Text>
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

      <Modal
        visible={forgotOpen}
        transparent
        animationType="fade"
        onRequestClose={closeForgotModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeForgotModal}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconWrap}>
                  <Ionicons name="mail-open-outline" size={20} color="#1D4ED8" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Reset your password</Text>
                  <Text style={styles.modalSubtitle}>
                    Enter your email and we will send reset instructions.
                  </Text>
                </View>
              </View>

              <Pressable onPress={closeForgotModal} style={styles.closeButton}>
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <TextInput
              placeholder="Email"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              keyboardType="email-address"
              value={resetEmail}
              onChangeText={setResetEmail}
              style={styles.modalInput}
            />

            {!!resetError && <Text style={styles.inlineError}>{resetError}</Text>}
            {!!resetMessage && (
              <Text style={styles.successMessage}>{resetMessage}</Text>
            )}

            <View style={styles.modalActions}>
              <Pressable style={styles.modalSecondaryButton} onPress={closeForgotModal}>
                <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.modalPrimaryButton,
                  resetLoading && styles.buttonDisabled,
                ]}
                onPress={handleForgotPassword}
                disabled={resetLoading}
              >
                <Text style={styles.modalPrimaryButtonText}>
                  {resetLoading ? 'Sending...' : 'Send reset email'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>

      </Modal>

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
    marginBottom: 6,
    backgroundColor: '#FFFFFF',
    fontSize: 15,
    color: '#0F172A',
  },

  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 18,
    marginBottom: 6,
    backgroundColor: '#FFFFFF',
  },

  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 15,
    color: '#0F172A',
  },

  eyeButton: {
    paddingHorizontal: 14,
  },

  inlineError: {
    color: '#DC2626',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },

  button: {
    backgroundColor: '#1D4ED8',
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  forgotLink: {
    marginTop: 14,
    marginBottom: 4,
    color: '#8EA6EB',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
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

  successMessage: {
    color: '#059669',
    marginBottom: 10,
    fontSize: 14,
    lineHeight: 22,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  modalCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 22,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },

  modalHeaderLeft: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },

  modalIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },

  modalSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },

  modalInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    fontSize: 15,
    color: '#0F172A',
  },

  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },

  modalSecondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  modalSecondaryButtonText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },

  modalPrimaryButton: {
    flex: 1,
    backgroundColor: '#1D4ED8',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },

  modalPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

});