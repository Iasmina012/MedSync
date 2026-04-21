import React, { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { supabase } from '../src/lib/supabase';
import { getCurrentUserProfile } from '../src/lib/auth';
import { getBackPathWithClinicFallback } from '../src/lib/navigation';
import { useClinicTheme } from '../src/lib/clinicTheme';
import ClinicNavbar from '../src/common/ClinicNavbar';

type UserSettings = {

  email_notifications: boolean;
  sms_notifications: boolean;
  marketing_emails: boolean;
  appointment_reminders: boolean;
  dark_mode: boolean;

};

const DEFAULT_SETTINGS: UserSettings = {

  email_notifications: true,
  sms_notifications: false,
  marketing_emails: false,
  appointment_reminders: true,
  dark_mode: false,

};

export default function SettingsScreen() {

  const { clinicId, clinicName } = useLocalSearchParams<{
    clinicId?: string;
    clinicName?: string;
  }>();

  const { theme } = useClinicTheme(clinicId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState('patient');
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  useEffect(() => {

    const load = async () => {
      try {
        const { user, profile } = await getCurrentUserProfile();

        if (!user || !profile) {
          router.replace('/login');
          return;
        }

        setRole(profile.role ?? 'patient');

        const { data, error } = await supabase
          .from('user_settings')
          .select(`
            email_notifications,
            sms_notifications,
            marketing_emails,
            appointment_reminders,
            dark_mode
          `)
          .eq('profile_id', user.id)
          .maybeSingle();

        if (error) {
          Alert.alert('Error', error.message);
          setSettings(DEFAULT_SETTINGS);
          return;
        }

        if (data) {
          setSettings({
            email_notifications: data.email_notifications ?? true,
            sms_notifications: data.sms_notifications ?? false,
            marketing_emails: data.marketing_emails ?? false,
            appointment_reminders: data.appointment_reminders ?? true,
            dark_mode: data.dark_mode ?? false,
          });
        } else {
          setSettings(DEFAULT_SETTINGS);
        }
      } finally {
        setLoading(false);
      }
    };
    load();

  }, []);

  const updateField = (key: keyof UserSettings, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {

    try {
      setSaving(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      const payload = {
        profile_id: user.id,
        email_notifications: settings.email_notifications,
        sms_notifications: settings.sms_notifications,
        marketing_emails: settings.marketing_emails,
        appointment_reminders: settings.appointment_reminders,
        dark_mode: settings.dark_mode,
      };

      const { error } = await supabase
        .from('user_settings')
        .upsert(payload, { onConflict: 'profile_id' });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert('Success', 'Settings saved successfully.');
    } finally {
      setSaving(false);
    }

  };

  const backRoute = getBackPathWithClinicFallback(role, clinicId, clinicName);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (

    <ScrollView contentContainerStyle={styles.container} stickyHeaderIndices={[0]}>

      <ClinicNavbar
        clinicId={clinicId}
        clinicName={clinicName}
        primaryColor={theme.primary}
        roleLabel="Settings"
        showRolePill={false}
        onChangeClinic={() => router.replace('/clinic-selection')}
        showBackButton
        onBackPress={() => router.replace(backRoute as any)}
      />

      <View
        style={[
          styles.hero,
          { backgroundColor: theme.soft, borderColor: theme.borderSoft },
        ]}
      >
        <Text style={[styles.heroEyebrow, { color: theme.primary }]}>
          Settings
        </Text>
        <Text style={[styles.heroTitle, { color: theme.secondary }]}>
          Control your account preferences
        </Text>
        <Text style={styles.heroSubtitle}>
          Customize reminders, communication, and account behavior.
        </Text>
      </View>

      <View style={styles.card}>
        <SettingRow
          label="Email notifications"
          description="Receive account and activity updates by email."
          value={settings.email_notifications}
          onChange={(value) => updateField('email_notifications', value)}
        />

        <SettingRow
          label="SMS notifications"
          description="Receive important updates by SMS."
          value={settings.sms_notifications}
          onChange={(value) => updateField('sms_notifications', value)}
        />

        <SettingRow
          label="Marketing emails"
          description="Receive clinic offers and product updates."
          value={settings.marketing_emails}
          onChange={(value) => updateField('marketing_emails', value)}
        />

        <SettingRow
          label="Appointment reminders"
          description="Get reminders before scheduled appointments."
          value={settings.appointment_reminders}
          onChange={(value) => updateField('appointment_reminders', value)}
        />

        <SettingRow
          label="Dark mode preference"
          description="Saved preference for future UI appearance support."
          value={settings.dark_mode}
          onChange={(value) => updateField('dark_mode', value)}
          isLast
        />

        <Pressable
          style={[
            styles.button,
            { backgroundColor: theme.primary },
            saving && styles.buttonDisabled,
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.buttonText}>
            {saving ? 'Saving...' : 'Save settings'}
          </Text>
        </Pressable>
      </View>

    </ScrollView>

  );

}

function SettingRow({
  label,
  description,
  value,
  onChange,
  isLast = false,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  isLast?: boolean;
}) {

  return (
    <View style={[styles.settingRow, isLast && styles.settingRowLast]}>
      <View style={styles.settingTextWrap}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>

      <Switch value={value} onValueChange={onChange} />
    </View>
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
    gap: 18,
  },

  hero: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
  },

  heroEyebrow: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },

  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 10,
  },

  heroSubtitle: {
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 22,
    gap: 12,
  },

  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

  settingRowLast: {
    borderBottomWidth: 0,
  },

  settingTextWrap: {
    flex: 1,
    paddingRight: 8,
  },

  settingLabel: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '700',
    marginBottom: 4,
  },

  settingDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: '#64748B',
  },

  button: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 8,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },

});