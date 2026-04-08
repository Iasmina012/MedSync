import React, { useState, useMemo } from 'react';
import { Link, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/lib/supabase';
import PublicPageLayout from '../src/components/layout/PublicPageLayout';
import WebFooter from '../src/components/layout/WebFooter';

const usernameRegex = /^[a-z0-9._]{3,20}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

export default function SignupScreen() {

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [firstNameTouched, setFirstNameTouched] = useState(false);
  const [lastNameTouched, setLastNameTouched] = useState(false);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const normalizedUsername = username.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();

  const firstNameError = useMemo(() => {
    if (!firstNameTouched) return '';
    if (!firstName.trim()) return 'First name is required';
    return '';
  }, [firstName, firstNameTouched]);

  const lastNameError = useMemo(() => {
    if (!lastNameTouched) return '';
    if (!lastName.trim()) return 'Last name is required';
    return '';
  }, [lastName, lastNameTouched]);

  const usernameError = useMemo(() => {
    if (!usernameTouched) return '';
    if (!normalizedUsername) return 'Username is required';
    if (!usernameRegex.test(normalizedUsername)) {
      return 'Username must be 3-20 characters and can contain lowercase letters, numbers, dots and underscores.';
    }
    return '';
  }, [normalizedUsername, usernameTouched]);

  const emailError = useMemo(() => {
    if (!emailTouched) return '';
    if (!normalizedEmail) return 'Email is required';
    if (!emailRegex.test(normalizedEmail)) return 'Please enter a valid email address.';
    return '';
  }, [normalizedEmail, emailTouched]);

  const passwordError = useMemo(() => {
    if (!passwordTouched) return '';
    if (!password) return 'Password is required';
    if (!passwordRegex.test(password)) {
      return 'Password must be at least 8 characters long, include one uppercase letter and one special character.';
    }
    return '';
  }, [password, passwordTouched]);

  const confirmPasswordError = useMemo(() => {
    if (!confirmPasswordTouched) return '';
    if (!confirmPassword) return 'Please confirm your password';
    if (confirmPassword !== password) return 'Passwords do not match.';
    return '';
  }, [confirmPassword, password, confirmPasswordTouched]);

  const handleSignup = async () => {

    try {
      setFirstNameTouched(true);
      setLastNameTouched(true);
      setUsernameTouched(true);
      setEmailTouched(true);
      setPasswordTouched(true);
      setConfirmPasswordTouched(true);
      setError('');
      setMessage('');

      const { data: existingUsername, error: usernameCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', normalizedUsername)
        .maybeSingle();

      if (usernameCheckError) {
        setError(usernameCheckError.message);
        return;
      }

      if (existingUsername) {
        setError('This username is already taken');
        return;
      }

      const { data: existingEmail, error: emailCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (emailCheckError) {
        setError(emailCheckError.message);
        return;
      }

      if (existingEmail) {
        setError('An account with this email already exists');
        return;
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            username: normalizedUsername,
            full_name: `${firstName.trim()} ${lastName.trim()}`,
            role: 'patient',
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      const userId = signUpData.user?.id;

      if (!userId) {
        setError('Unable to create the account');
        return;
      }

      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        username: normalizedUsername,
        email: normalizedEmail,
        role: 'patient',
      });

      if (profileError) {
        setError(profileError.message);
        return;
      }

      setMessage('Account created. Check your email for confirmation, if necessary.');

      setTimeout(() => {
        router.replace('/login');
      }, 1200);
    } catch {
      setError('An error occurred while creating your account');
    } finally {
      setLoading(false);
    }
  
  };

  return (

    <PublicPageLayout>

      <ScrollView contentContainerStyle={styles.container}>

        <View style={styles.card}>
          <View style={styles.headerIcon}>
            <Ionicons name="person-add-outline" size={24} color="#1D4ED8"/>
          </View>

          <Text style={styles.title}>Sign Up</Text>
          <Text style={styles.subtitle}>
            Create an account to get started
          </Text>

          <TextInput
            placeholder="First Name"
            placeholderTextColor="#94A3B8"
            value={firstName}
            onChangeText={setFirstName}
            onBlur={() => setFirstNameTouched(true)}
            style={styles.input}
          />
          {!!firstNameError && <Text style={styles.inlineError}>{firstNameError}</Text>}

          <TextInput
            placeholder="Last Name"
            placeholderTextColor="#94A3B8"
            value={lastName}
            onChangeText={setLastName}
            onBlur={() => setLastNameTouched(true)}
            style={styles.input}
          />
          {!!lastNameError && <Text style={styles.inlineError}>{lastNameError}</Text>}

          <TextInput
            placeholder="Username"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
            onBlur={() => setUsernameTouched(true)}
            style={styles.input}
          />
          {!!usernameError && <Text style={styles.inlineError}>{usernameError}</Text>}

          <TextInput
            placeholder="Email"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            onBlur={() => setEmailTouched(true)}
            style={styles.input}
          />
          {!!emailError && <Text style={styles.inlineError}>{emailError}</Text>}

          <View style={styles.passwordWrapper}>
            <TextInput
              placeholder="Password"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              onBlur={() => setPasswordTouched(true)}
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

          <View style={styles.passwordWrapper}>
            <TextInput
              placeholder="Confirm Password"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onBlur={() => setConfirmPasswordTouched(true)}
              style={styles.passwordInput}
            />
            <Pressable
              onPress={() => setShowConfirmPassword((prev) => !prev)}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#64748B"
              />
            </Pressable>
          </View>
          {!!confirmPasswordError && (
            <Text style={styles.inlineError}>{confirmPasswordError}</Text>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}
          {!!message && <Text style={styles.message}>{message}</Text>}

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating account...' : 'Create account'}
            </Text>
          </Pressable>

          <Text style={styles.footerText}>
            Already have an account?{' '}
            <Link href="/login" style={styles.link}>
              Log In
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

  error: {
    color: '#DC2626',
    marginBottom: 10,
    fontSize: 14,
    lineHeight: 22,
  },

  message: {
    color: '#059669',
    marginBottom: 10,
    fontSize: 14,
    lineHeight: 22,
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

});