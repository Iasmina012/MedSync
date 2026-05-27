import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/lib/supabase';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

export default function ResetPasswordScreen() {

  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session)
        setHasRecoverySession(true);
      setCheckingSession(false);
    };
    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session)
        setHasRecoverySession(true);
    });

    return () => { listener.subscription.unsubscribe(); };
  }, []);

  const emailError = useMemo(() => {
    if (!emailTouched) 
      return '';
    if (!normalizedEmail) 
      return 'Email is required.';
    if (!emailRegex.test(normalizedEmail)) 
      return 'Please enter a valid email address.';
    return '';
  }, [normalizedEmail, emailTouched]);

  const passwordError = useMemo(() => {
    if (!passwordTouched) 
      return '';
    if (!password) 
      return 'Password is required.';
    if (!passwordRegex.test(password))
      return 'Password must be at least 8 characters long, include one uppercase letter and one special character.';
    return '';
  }, [password, passwordTouched]);

  const confirmPasswordError = useMemo(() => {
    if (!confirmPasswordTouched) 
      return '';
    if (!confirmPassword) 
      return 'Please confirm your password.';
    if (confirmPassword !== password) 
      return 'Passwords do not match.';
    return '';
  }, [confirmPassword, password, confirmPasswordTouched]);

  const getRedirectUrl = () => {
    if (Platform.OS === 'web')
      return `${window.location.origin}/reset-password`;
    return 'medsync://reset-password';
  };

  const handleSendResetEmail = async () => {
    setEmailTouched(true);
    setFormError('');
    setSuccessMessage('');

    if (!normalizedEmail || !emailRegex.test(normalizedEmail)) 
      return;

    setSendingEmail(true);

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo: getRedirectUrl(), });

    setSendingEmail(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    setSuccessMessage('Password reset email sent. Open the link from your email to create a new password.');
  };

  const handleUpdatePassword = async () => {
    setPasswordTouched(true);
    setConfirmPasswordTouched(true);
    setFormError('');
    setSuccessMessage('');

    if (!password || !confirmPassword || !passwordRegex.test(password) || password !== confirmPassword) {
      return;
    }

    setSavingPassword(true);

    const { error } = await supabase.auth.updateUser({password,});

    setSavingPassword(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    setSuccessModalOpen(true);
  };

  const handleGoToLogin = async () => {
    setSuccessModalOpen(false);
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (checkingSession) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1D4ED8"/>
      </View>
    );
  }

  return (

    <>

      <ScrollView contentContainerStyle={styles.container}>

        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name={hasRecoverySession ? 'lock-open-outline' : 'mail-outline'} size={32} color="#1D4ED8"/>
          </View>

          <Text style={styles.title}>{hasRecoverySession ? 'Create a new password' : 'Reset your password'}</Text>
          <Text style={styles.subtitle}>{hasRecoverySession ? 'Enter and confirm your new password below.' : 'Enter your email and we will send you a password reset link.'}</Text>

          {!!formError && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color="#DC2626"/>
              <Text style={styles.errorBoxText}>{formError}</Text>
            </View>
          )}

          {!!successMessage && (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#059669"/>
              <Text style={styles.successBoxText}>{successMessage}</Text>
            </View>
          )}

          {hasRecoverySession ? (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>New password</Text>

                <View style={[styles.passwordWrap, !!passwordError && styles.inputError]}>
                  <TextInput
                    value={password}
                    onChangeText={(value) => {
                      setPassword(value);
                      setFormError('');
                    }}
                    onBlur={() => setPasswordTouched(true)}
                    placeholder="New password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword}
                    style={styles.passwordInput}
                  />

                  <Pressable onPress={() => setShowPassword((prev) => !prev)} style={styles.eyeButton}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748B"/>
                  </Pressable>
                </View>

                {!!passwordError && <Text style={styles.inlineError}>{passwordError}</Text>}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Confirm new password</Text>

                <View style={[styles.passwordWrap, !!confirmPasswordError && styles.inputError]}>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={(value) => {
                      setConfirmPassword(value);
                      setFormError('');
                    }}
                    onBlur={() => setConfirmPasswordTouched(true)}
                    placeholder="Confirm new password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showConfirmPassword}
                    style={styles.passwordInput}
                  />

                  <Pressable onPress={() => setShowConfirmPassword((prev) => !prev)} style={styles.eyeButton}>
                    <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748B"/>
                  </Pressable>
                </View>

                {!!confirmPasswordError && (<Text style={styles.inlineError}>{confirmPasswordError}</Text>)}
              </View>

              <Pressable style={[styles.primaryButton, savingPassword && styles.disabledButton]} onPress={handleUpdatePassword} disabled={savingPassword}>
                <Text style={styles.primaryButtonText}>{savingPassword ? 'Saving...' : 'Save new password'}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Email address</Text>

                <TextInput
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    setFormError('');
                    setSuccessMessage('');
                  }}
                  onBlur={() => setEmailTouched(true)}
                  placeholder="you@example.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[styles.input, !!emailError && styles.inputError]}
                />

                {!!emailError && <Text style={styles.inlineError}>{emailError}</Text>}
              </View>

              <Pressable style={[styles.primaryButton, sendingEmail && styles.disabledButton]} onPress={handleSendResetEmail} disabled={sendingEmail}>
                <Text style={styles.primaryButtonText}>{sendingEmail ? 'Sending...' : 'Send reset email'}</Text>
              </Pressable>
            </>
          )}

          <Pressable style={styles.secondaryButton} onPress={() => router.replace('/login')}>
            <Text style={styles.secondaryButtonText}>Back to login</Text>
          </Pressable>
        </View>
      
      </ScrollView>

      <Modal visible={successModalOpen} transparent animationType="fade">

        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Ionicons name="checkmark-circle-outline" size={34} color="#059669"/>
            </View>

            <Text style={styles.modalTitle}>Password updated</Text>
            <Text style={styles.modalText}>Your password was changed successfully. You can now log in with your new password.</Text>

            <Pressable style={styles.modalButton} onPress={handleGoToLogin}>
              <Text style={styles.modalButtonText}>Go to login</Text>
            </Pressable>
          </View>
        </View>
      
      </Modal>

    </>

  );

}

const styles = StyleSheet.create({

  centered: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  container: {
    flexGrow: 1,
    backgroundColor: '#F8FAFC',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 26,
    alignItems: 'center',
  },

  iconWrap: {
    width: 78,
    height: 78,
    borderRadius: 26,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 23,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },

  field: {
    width: '100%',
    marginBottom: 14,
  },

  label: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },

  input: {
    width: '100%',
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    fontSize: 15,
    color: '#0F172A',
    outlineStyle: 'none' as any,
  },

  inputError: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF7F7',
  },

  inlineError: {
    color: '#DC2626',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    marginTop: 7,
  },

  errorBox: {
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginBottom: 16,
  },

  errorBoxText: {
    flex: 1,
    color: '#991B1B',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },

  successBox: {
    width: '100%',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginBottom: 16,
  },

  successBoxText: {
    flex: 1,
    color: '#047857',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },

  passwordWrap: {
    width: '100%',
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 15,
  },

  passwordInput: {
    flex: 1,
    minHeight: 52,
    fontSize: 15,
    color: '#0F172A',
    outlineStyle: 'none' as any,
  },

  eyeButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButton: {
    width: '100%',
    minHeight: 54,
    borderRadius: 999,
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  disabledButton: {
    opacity: 0.65,
  },

  secondaryButton: {
    marginTop: 14,
    minHeight: 46,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonText: {
    color: '#1D4ED8',
    fontSize: 14,
    fontWeight: '900',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
  },

  modalIcon: {
    width: 74,
    height: 74,
    borderRadius: 24,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  modalTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },

  modalText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },

  modalButton: {
    width: '100%',
    minHeight: 52,
    borderRadius: 999,
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

});