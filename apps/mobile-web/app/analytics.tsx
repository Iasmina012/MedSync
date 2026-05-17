import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ClinicNavbar from '../src/common/ClinicNavbar';
import AnimatedStatsCard from '../src/common/AnimatedStatsCard';
import { useClinicTheme } from '../src/lib/clinicTheme';
import { countRows, getClinicAdminStats } from '../src/lib/adminData';
import { supabase } from '../src/lib/supabase';

export default function PlatformAdminAnalyticsScreen() {

  const { clinicId, clinicName } = useLocalSearchParams<{
    clinicId?: string;
    clinicName?: string;
  }>();

  const { theme } = useClinicTheme(clinicId);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [topClinicRows, setTopClinicRows] = useState<any[]>([]);

  useEffect(() => {

    const load = async () => {
      setLoading(true);

      if (clinicId) {
        const data = await getClinicAdminStats(clinicId);
        setStats(data);
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().slice(0, 10);

      const last7 = new Date();
      last7.setDate(last7.getDate() - 7);

      const last30 = new Date();
      last30.setDate(last30.getDate() - 30);

      const last7ISO = last7.toISOString();
      const last30ISO = last30.toISOString();

      const [
        totalClinics,
        activeClinics,
        inactiveClinics,
        doctors,
        patients,
        clinicAdmins,
        platformAdmins,
        appointmentsToday,
        appointments7Days,
        appointments30Days,
        completedAppointments30Days,
        cancelledAppointments30Days,
        rescheduledAppointments30Days,
        triageSessions30Days,
        aiAuditLogs30Days,
        newPatients30Days,
        newDoctors30Days,
        newServices30Days,
        newHealthTips30Days,
        newTechnologies30Days,
        appointmentsByClinicResult,
      ] = await Promise.all([
        countRows('clinics'),
        countRows('clinics', (q) => q.eq('is_active', true)),
        countRows('clinics', (q) => q.eq('is_active', false)),
        countRows('doctors', (q) => q.eq('is_active', true)),
        countRows('profiles', (q) => q.eq('role', 'patient')),
        countRows('profiles', (q) => q.eq('role', 'clinic_admin')),
        countRows('profiles', (q) => q.eq('role', 'platform_admin')),
        countRows('appointments', (q) => q.eq('appointment_date', today)),
        countRows('appointments', (q) => q.gte('created_at', last7ISO)),
        countRows('appointments', (q) => q.gte('created_at', last30ISO)),
        countRows('appointments', (q) => q.gte('created_at', last30ISO).eq('status', 'completed')),
        countRows('appointments', (q) => q.gte('created_at', last30ISO).eq('status', 'cancelled')),
        countRows('appointments', (q) => q.gte('created_at', last30ISO).eq('status', 'rescheduled')),
        countRows('ai_triage_sessions', (q) => q.gte('created_at', last30ISO)),
        countRows('ai_audit_logs', (q) => q.gte('created_at', last30ISO)),
        countRows('profiles', (q) => q.eq('role', 'patient').gte('created_at', last30ISO)),
        countRows('doctors', (q) => q.gte('created_at', last30ISO)),
        countRows('clinic_services', (q) => q.gte('created_at', last30ISO)),
        countRows('clinic_health_tips', (q) => q.gte('created_at', last30ISO)),
        countRows('clinic_technologies', (q) => q.gte('created_at', last30ISO)),
        supabase.from('appointments').select(`clinic_id, clinics (name)`).gte('created_at', last30ISO),
      ]);

      const clinicMap = new Map<string, { id: string; name: string; count: number }>();

      (appointmentsByClinicResult.data ?? []).forEach((row: any) => {
        const clinicNameValue = Array.isArray(row.clinics)
          ? row.clinics[0]?.name
          : row.clinics?.name;

        const existing = clinicMap.get(row.clinic_id);

        clinicMap.set(row.clinic_id, {
          id: row.clinic_id,
          name: clinicNameValue || 'Unknown clinic',
          count: existing ? existing.count + 1 : 1,
        });
      });

      const topClinics = Array.from(clinicMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats({
        totalClinics,
        activeClinics,
        inactiveClinics,
        doctors,
        patients,
        clinicAdmins,
        platformAdmins,
        appointmentsToday,
        appointments7Days,
        appointments30Days,
        completedAppointments30Days,
        cancelledAppointments30Days,
        rescheduledAppointments30Days,
        triageSessions30Days,
        aiAuditLogs30Days,
        newPatients30Days,
        newDoctors30Days,
        newServices30Days,
        newHealthTips30Days,
        newTechnologies30Days,
      });

      setTopClinicRows(topClinics);
      setLoading(false);
    };

    load();
  
  }, [clinicId]);

  if (loading || !stats) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primary}/>
      </View>
    );
  }

  const isPlatform = !clinicId;
  const completionRate = stats.appointments30Days > 0 ? Math.round((stats.completedAppointments30Days / stats.appointments30Days) * 100) : 0;
  const cancellationRate = stats.appointments30Days > 0 ? Math.round((stats.cancelledAppointments30Days / stats.appointments30Days) * 100) : 0;
  const rescheduledRate = stats.appointments30Days > 0 ? Math.round((stats.rescheduledAppointments30Days / stats.appointments30Days) * 100) : 0;
  const aiUsageRate = stats.appointments30Days > 0 ? Math.round((stats.triageSessions30Days / stats.appointments30Days) * 100) : 0;
  const auditCoverageRate = stats.triageSessions30Days > 0 ? Math.min(Math.round((stats.aiAuditLogs30Days / stats.triageSessions30Days) * 100), 100) : 0;
  const triageWithoutAudit = Math.max(stats.triageSessions30Days - stats.aiAuditLogs30Days, 0);

  return (

    <ScrollView contentContainerStyle={styles.container} stickyHeaderIndices={[0]}>

      <ClinicNavbar
        clinicName={isPlatform ? 'MedSync Platform' : clinicName}
        clinicId={clinicId}
        roleLabel={'Platform Admin'}
        showRolePill={false}
        primaryColor={theme.primary}
        showBackButton
        canChangeClinic={false}
        onBackPress={() =>
          router.replace(
            isPlatform
              ? '/main-platform-admin'
              : {
                  pathname: '/main-clinic-admin',
                  params: { clinicId, clinicName },
                }
          )
        }
      />

      <View style={[styles.hero, { backgroundColor: theme.soft, borderColor: theme.borderSoft }]}>
        <Text style={[styles.eyebrow, { color: theme.primary }]}>
          {isPlatform ? 'Platform Admin' : 'Clinic Admin'}
        </Text>

        <Text style={[styles.title, { color: theme.secondary }]}>
          {isPlatform ? 'Platform Analytics Center' : 'Clinic Analytics'}
        </Text>

        <Text style={styles.subtitle}>
          {isPlatform ? 'Monitor platform health, clinic growth, appointment activity and AI usage across MedSync.' : 'Track clinic activity, appointments, doctors and patients.'}
        </Text>
      </View>

      {isPlatform ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Platform Health</Text>

            <View style={styles.healthGrid}>
              <MetricTile icon="pulse-outline" label="Completion Rate" value={`${completionRate}%`} hint={`${stats.completedAppointments30Days} completed in 30 days`} color="#16A34A"/>
              <MetricTile icon="close-circle-outline" label="Cancellation Rate" value={`${cancellationRate}%`} hint={`${stats.cancelledAppointments30Days} cancelled in 30 days`} color="#BE123C"/>
              <MetricTile icon="repeat-outline" label="Rescheduled Rate" value={`${rescheduledRate}%`} hint={`${stats.rescheduledAppointments30Days} rescheduled in 30 days`} color="#EA580C"/>
              <MetricTile icon="sparkles-outline" label="AI Usage" value={`${aiUsageRate}%`} hint={`${stats.triageSessions30Days} AI triage sessions`} color="#7C3AED"/>
              <MetricTile icon="calendar-outline" label="Today" value={stats.appointmentsToday} hint="Appointments scheduled today" color={theme.primary}/>
              <MetricTile icon="calendar-number-outline" label="Appointments 7d" value={stats.appointments7Days} hint="Created in last 7 days" color={theme.primary}/>
              <MetricTile icon="checkmark-circle-outline" label="Active Clinics" value={stats.activeClinics} hint="Clinics currently active" color="#16A34A"/>
              <MetricTile icon="pause-circle-outline" label="Inactive Clinics" value={stats.inactiveClinics} hint="Clinics currently inactive" color="#BE123C"/>
            </View>
          </View>

          <View style={styles.dashboardGrid}>
            <View style={styles.sectionLarge}>
              <Text style={styles.sectionTitle}>Most Active Clinics</Text>

              {topClinicRows.length === 0 ? (
                <Text style={styles.emptyText}>No appointment activity in the last 30 days.</Text>
              ) : (
                topClinicRows.map((clinic, index) => (
                  <View key={clinic.id} style={styles.rankRow}>
                    <View style={[styles.rankBadge, { backgroundColor: `${theme.primary}12` }]}>
                      <Text style={[styles.rankText, { color: theme.primary }]}>{index + 1}</Text>
                    </View>

                    <View style={styles.rankContent}>
                      <Text style={styles.rankTitle}>{clinic.name}</Text>
                      <Text style={styles.rankSubtitle}>
                        {clinic.count} appointments in last 30 days
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={styles.sectionSmall}>
              <Text style={styles.sectionTitle}>App Growth</Text>

              <InsightRow icon="person-add-outline" label="New Patients" value={`${stats.newPatients30Days}`} hint="Last 30 days" color={theme.primary}/>
              <InsightRow icon="medkit-outline" label="New Doctors" value={`${stats.newDoctors30Days}`} hint="Last 30 days" color={theme.primary}/>
              <InsightRow icon="list-outline" label="New Services" value={`${stats.newServices30Days}`} hint="Last 30 days" color={theme.primary}/>
              <InsightRow icon="hardware-chip-outline" label="New Technologies" value={`${stats.newTechnologies30Days}`} hint="Last 30 days" color={theme.primary}/>
              <InsightRow icon="heart-outline" label="New Health Tips" value={`${stats.newHealthTips30Days}`} hint="Last 30 days" color={theme.primary}/>
              <InsightRow icon="shield-checkmark-outline" label="Admins" value={`${stats.clinicAdmins + stats.platformAdmins}`} hint={`${stats.clinicAdmins} clinic · ${stats.platformAdmins} platform`} color={theme.primary}/>
            </View>

            <View style={styles.sectionSmall}>
              <Text style={styles.sectionTitle}>AI Use</Text>

              <InsightRow icon="sparkles-outline" label="AI Triage Sessions" value={`${stats.triageSessions30Days}`} hint="Last 30 days" color="#7C3AED"/>
              <InsightRow icon="document-lock-outline" label="AI Audit Logs" value={`${stats.aiAuditLogs30Days}`} hint="Last 30 days" color="#7C3AED"/>
              <InsightRow icon="analytics-outline" label="AI Per Appointment" value={`${aiUsageRate}%`} hint="Triage compared" color="#7C3AED"/>
              <InsightRow icon="shield-checkmark-outline" label="Audit Coverage" value={`${auditCoverageRate}%`} hint="AI triage audit activity" color="#7C3AED"/>  
              <InsightRow icon="checkmark-done-outline" label="Logged AI Actions" value={`${stats.aiAuditLogs30Days}`} hint="Auditable AI events" color="#7C3AED"/>
              <InsightRow icon="alert-circle-outline" label="Triage Without Audit" value={`${triageWithoutAudit}`} hint="Potential review items" color="#BE123C"/>
            </View>
          </View>
        </>
      ) : (
        <View style={styles.grid}>
          <AnimatedStatsCard label="Doctors" value={stats.doctors} icon="medkit-outline" color={theme.primary}/>
          <AnimatedStatsCard label="Patients" value={stats.patients} icon="people-outline" color={theme.primary}/>
          <AnimatedStatsCard label="Appointments" value={stats.appointments} icon="calendar-outline" color={theme.primary}/>
          <AnimatedStatsCard label="Clinic Admins" value={stats.clinicAdmins || 0} icon="shield-outline" color={theme.primary}/>
        </View>
      )}

    </ScrollView>

  );

}

function MetricTile({
  icon,
  label,
  value,
  hint,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  hint: string;
  color: string;
}) {

  return (
    <View style={styles.metricTile}>
      <View style={[styles.metricIcon, { backgroundColor: `${color}12` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>

      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricHint}>{hint}</Text>
    </View>
  );

}

function InsightRow({
  icon,
  label,
  value,
  hint,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  hint: string;
  color: string;
}) {

  return (
    <View style={styles.insightRow}>
      <View style={[styles.insightIcon, { backgroundColor: `${color}12` }]}>
        <Ionicons name={icon} size={18} color={color}/>
      </View>

      <View style={styles.insightText}>
        <Text style={styles.insightLabel}>{label}</Text>
        <Text style={styles.insightHint}>{hint}</Text>
      </View>

      <Text style={styles.insightValue}>{value}</Text>
    </View>
  );

}

const styles = StyleSheet.create({

  container: {
    padding: 24,
    gap: 20,
    backgroundColor: '#F8FAFC',
    flexGrow: 1,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },

  hero: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 24,
  },

  eyebrow: {
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 8,
  },

  title: {
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 8,
  },

  subtitle: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 24,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },

  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },

  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 22,
  },

  sectionLarge: {
    flex: 2,
    minWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 22,
  },

  sectionSmall: {
    flex: 1,
    minWidth: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 22,
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 16,
  },

  healthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  metricTile: {
    flexGrow: 1,
    flexBasis: '23%',
    minWidth: 170,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },

  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  metricValue: {
    fontSize: 24,
    fontWeight: '900',
  },

  metricLabel: {
    marginTop: 2,
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '900',
  },

  metricHint: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
  },

  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 10,
  },

  insightIcon: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  insightText: {
    flex: 1,
  },

  insightLabel: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
  },

  insightHint: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },

  insightValue: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '900',
  },

  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 10,
  },

  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rankText: {
    fontSize: 15,
    fontWeight: '900',
  },

  rankContent: {
    flex: 1,
  },

  rankTitle: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 15,
  },

  rankSubtitle: {
    color: '#64748B',
    fontWeight: '700',
    marginTop: 4,
    fontSize: 13,
  },

  emptyText: {
    color: '#64748B',
    fontWeight: '700',
    lineHeight: 22,
  },

});