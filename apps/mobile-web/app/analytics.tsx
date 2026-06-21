import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ClinicNavbar from '../src/common/ClinicNavbar';
import AnimatedStatsCard from '../src/common/AnimatedStatsCard';
import { useClinicTheme } from '../src/lib/clinicTheme';
import { countRows, getClinicAdminStats } from '../src/lib/adminData';
import { supabase } from '../src/lib/supabase';

export default function PlatformAdminAnalyticsScreen() {

  const { clinicId, clinicName } = useLocalSearchParams<{ clinicId?: string; clinicName?: string; }>();
  const { theme } = useClinicTheme(clinicId);
  const { width } = useWindowDimensions();

  const isMobile = width < 720;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [topClinicRows, setTopClinicRows] = useState<any[]>([]);

  const [aiEval, setAiEval] = useState<{
    doctorValidations: { agree: number; partially_agree: number; disagree: number; total: number };
    patientRatings: { yes: number; no: number; somewhat: number; total: number };
    triageLevels: { routine: number; urgent: number; emergency: number; moderate: number; total: number };
  } | null>(null);
  const [susEval, setSusEval] = useState<{ avgScore: number; count: number } | null>(null);
  const [sessionEval, setSessionEval] = useState<{ avgMessages: number; avgDuration: number; completionRate: number; total: number } | null>(null);
  const [f1Eval, setF1Eval] = useState<{ precision: number; recall: number; f1: number; confusionMatrix: { aiLevel: string; doctorLevel: string; count: number }[]; total: number } | null>(null);
  const [confidenceEval, setConfidenceEval] = useState<{ highAccuracy: number; lowAccuracy: number; highCount: number; lowCount: number } | null>(null);
  const [kappaEval, setKappaEval] = useState<{ kappa: number; po: number; pe: number; n: number; interpretation: string } | null>(null);
  const [chiSquareEval, setChiSquareEval] = useState<{ chiSquare: number; pLabel: string; n: number; observed: number; expected: number } | null>(null);

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

      const [validationResult, ratingResult, triageLevelResult] = await Promise.all([
        supabase.from('appointments').select('ai_triage_validation').not('ai_triage_validation', 'is', null),
        supabase.from('ai_triage_sessions').select('chatbot_rating').not('chatbot_rating', 'is', null),
        supabase.from('appointments').select('ai_triage_level').not('ai_triage_level', 'is', null),
      ]);

      const doctorValidations = { agree: 0, partially_agree: 0, disagree: 0, total: 0 };
      for (const row of validationResult.data ?? []) {
        const v = row.ai_triage_validation as string;
        doctorValidations.total++;
        if (v === 'agree') 
          doctorValidations.agree++;
        else if (v === 'partially_agree') 
          doctorValidations.partially_agree++;
        else if (v === 'disagree') 
          doctorValidations.disagree++;
      }

      const patientRatings = { yes: 0, no: 0, somewhat: 0, total: 0 };
      for (const row of ratingResult.data ?? []) {
        const r = row.chatbot_rating as string;
        patientRatings.total++;
        if (r === 'yes') 
          patientRatings.yes++;
        else if (r === 'no') 
          patientRatings.no++;
        else if (r === 'somewhat') 
          patientRatings.somewhat++;
      }

      const triageLevels = { routine: 0, urgent: 0, emergency: 0, moderate: 0, total: 0 };
      for (const row of triageLevelResult.data ?? []) {
        const t = row.ai_triage_level as string;
        triageLevels.total++;
        if (t === 'routine') 
          triageLevels.routine++;
        else if (t === 'urgent') 
          triageLevels.urgent++;
        else if (t === 'emergency') 
          triageLevels.emergency++;
        else if (t === 'moderate') 
          triageLevels.moderate++;
      }

      setAiEval({ doctorValidations, patientRatings, triageLevels });

      const [susResult, sessionResult, f1Result, confidenceResult] = await Promise.all([
        supabase.from('sus_responses').select('sus_score'),
        supabase.from('ai_triage_sessions').select('message_count, session_duration_seconds, completed').not('message_count', 'is', null),
        supabase.from('appointments').select('ai_triage_level, ai_triage_validation, ai_triage_correction').not('ai_triage_validation', 'is', null),
        supabase.from('appointments').select('ai_triage_validation, ai_triage_sessions!triage_session_id(triage_confidence)').not('ai_triage_validation', 'is', null).not('triage_session_id', 'is', null),
      ]);

      const susRows = susResult.data ?? [];
      if (susRows.length > 0) {
        const validScores = susRows.map((r: any) => Number(r.sus_score)).filter((s: number) => !isNaN(s));
        const avgScore = validScores.reduce((a: number, b: number) => a + b, 0) / validScores.length;
        setSusEval({ avgScore: Math.round(avgScore * 10) / 10, count: validScores.length });
      }

      const sessionRows = sessionResult.data ?? [];
      if (sessionRows.length > 0) {
        const msgs = sessionRows.map((r: any) => Number(r.message_count)).filter((v: number) => !isNaN(v));
        const durs = sessionRows.map((r: any) => Number(r.session_duration_seconds)).filter((v: number) => !isNaN(v) && v > 0);
        const completed = sessionRows.filter((r: any) => r.completed === true).length;
        setSessionEval({
          avgMessages: msgs.length > 0 ? Math.round((msgs.reduce((a: number, b: number) => a + b, 0) / msgs.length) * 10) / 10 : 0,
          avgDuration: durs.length > 0 ? Math.round(durs.reduce((a: number, b: number) => a + b, 0) / durs.length) : 0,
          completionRate: sessionRows.length > 0 ? Math.round((completed / sessionRows.length) * 100) : 0,
          total: sessionRows.length,
        });
      }

      const f1Rows = f1Result.data ?? [];
      if (f1Rows.length > 0) {
        const tp = f1Rows.filter((r: any) => r.ai_triage_validation === 'agree').length;
        const fp = f1Rows.filter((r: any) => r.ai_triage_validation === 'disagree').length;
        const fn = f1Rows.filter((r: any) => r.ai_triage_validation === 'partially_agree').length;
        const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
        const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
        const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
        const matrixMap = new Map<string, number>();
        for (const row of f1Rows) {
          if (row.ai_triage_level && row.ai_triage_correction) {
            const key = `${row.ai_triage_level}__${row.ai_triage_correction}`;
            matrixMap.set(key, (matrixMap.get(key) || 0) + 1);
          }
        }
        const confusionMatrix = Array.from(matrixMap.entries()).map(([key, count]) => {
          const [aiLevel, doctorLevel] = key.split('__');
          return { aiLevel, doctorLevel, count };
        });
        setF1Eval({ precision: Math.round(precision * 1000) / 1000, recall: Math.round(recall * 1000) / 1000, f1: Math.round(f1 * 1000) / 1000, confusionMatrix, total: f1Rows.length });
      }

      const confRows = confidenceResult.data ?? [];
      if (confRows.length > 0) {
        const withConf = confRows.filter((r: any) => {
          const session = Array.isArray(r.ai_triage_sessions) ? r.ai_triage_sessions[0] : r.ai_triage_sessions;
          return session?.triage_confidence != null;
        });
        const getConf = (r: any) => {
          const session = Array.isArray(r.ai_triage_sessions) ? r.ai_triage_sessions[0] : r.ai_triage_sessions;
          return session?.triage_confidence ?? 0;
        };
        const highConf = withConf.filter((r: any) => getConf(r) >= 70);
        const lowConf = withConf.filter((r: any) => getConf(r) < 70);
        const accRate = (rows: any[]) => rows.length > 0 ? Math.round((rows.filter((r: any) => r.ai_triage_validation === 'agree').length / rows.length) * 100) : 0;
        setConfidenceEval({ highAccuracy: accRate(highConf), lowAccuracy: accRate(lowConf), highCount: highConf.length, lowCount: lowConf.length });
      }

      const kappaResult = await supabase
        .from('appointments')
        .select('ai_triage_level, doctor_own_assessment')
        .not('ai_triage_level', 'is', null)
        .not('doctor_own_assessment', 'is', null);

      const kappaRows = kappaResult.data ?? [];
      if (kappaRows.length >= 5) {
        const levels = ['routine', 'urgent', 'emergency'];
        const n = kappaRows.length;
        const agreed = kappaRows.filter((r: any) => r.ai_triage_level === r.doctor_own_assessment).length;
        const Po = agreed / n;
        let Pe = 0;
        for (const level of levels) {
          const aiProp = kappaRows.filter((r: any) => r.ai_triage_level === level).length / n;
          const drProp = kappaRows.filter((r: any) => r.doctor_own_assessment === level).length / n;
          Pe += aiProp * drProp;
        }
        const kappa = Pe < 1 ? (Po - Pe) / (1 - Pe) : 1;
        const roundedK = Math.round(kappa * 1000) / 1000;
        const interpretation =
          roundedK > 0.8 ? 'Almost perfect' :
          roundedK > 0.6 ? 'Substantial' :
          roundedK > 0.4 ? 'Moderate' :
          roundedK > 0.2 ? 'Fair' : 'Slight';
        setKappaEval({ kappa: roundedK, po: Math.round(Po * 1000) / 1000, pe: Math.round(Pe * 1000) / 1000, n, interpretation });
      }

      if (aiEval && aiEval.doctorValidations.total >= 5) {
        const n = aiEval.doctorValidations.total;
        const observed = aiEval.doctorValidations.agree;
        const pa = aiEval.doctorValidations.partially_agree;
        const di = aiEval.doctorValidations.disagree;
        const expected = n / 3;
        const chiSquare =
          Math.pow(observed - expected, 2) / expected +
          Math.pow(pa - expected, 2) / expected +
          Math.pow(di - expected, 2) / expected;
        const rounded = Math.round(chiSquare * 100) / 100;
        const pLabel =
          rounded > 10.828 ? 'p < 0.001' :
          rounded > 6.635 ? 'p < 0.01' :
          rounded > 3.841 ? 'p < 0.05' :
          'p >= 0.05 (not significant)';
        setChiSquareEval({ chiSquare: rounded, pLabel, n, observed, expected: Math.round(expected * 10) / 10 });
      }

      setTopClinicRows(topClinics);
      setLoading(false);
    };

    load();
  
  }, [clinicId, aiEval]);

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
        <Text style={[styles.eyebrow, { color: theme.primary }]}>View Analytics</Text>
        <Text style={[styles.title, { color: theme.secondary }]}>Platform Center</Text>
        <Text style={styles.subtitle}>Monitor MedSync&apos;s health and growth. Track appointment and clinic activity while gaining a comprehensive view of AI usage and engagement across the ecosystem.</Text>
      </View>

      {isPlatform ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Platform Health</Text>

            <View style={styles.healthGrid}>
              <MetricTile mobileTwoColumns={isMobile} icon="pulse-outline" label="Completion Rate" value={`${completionRate}%`} hint={`${stats.completedAppointments30Days} appointments completed in 30 days`} color="#16A34A"/>
              <MetricTile mobileTwoColumns={isMobile} icon="close-circle-outline" label="Cancellation Rate" value={`${cancellationRate}%`} hint={`${stats.cancelledAppointments30Days} appointments cancelled in 30 days`} color="#BE123C"/>
              <MetricTile mobileTwoColumns={isMobile} icon="repeat-outline" label="Rescheduling Rate" value={`${rescheduledRate}%`} hint={`${stats.rescheduledAppointments30Days} appointments rescheduled in 30 days`} color="#EA580C"/>
              <MetricTile mobileTwoColumns={isMobile} icon="sparkles-outline" label="AI Usage" value={stats.triageSessions30Days} hint="triage sessions in last 30 days" color="#7C3AED"/>
              <MetricTile mobileTwoColumns={isMobile} icon="calendar-outline" label="Today" value={stats.appointmentsToday} hint="Appointments scheduled today" color={theme.primary}/>
              <MetricTile mobileTwoColumns={isMobile} icon="calendar-number-outline" label="Appointments 7d" value={stats.appointments7Days} hint="Appointments created in the last 7 days" color={theme.primary}/>
              <MetricTile mobileTwoColumns={isMobile} icon="checkmark-circle-outline" label="Active Clinics" value={stats.activeClinics} hint="Clinics currently active" color="#16A34A"/>
              <MetricTile mobileTwoColumns={isMobile} icon="pause-circle-outline" label="Inactive Clinics" value={stats.inactiveClinics} hint="Clinics currently inactive" color="#BE123C"/>
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
                        {clinic.count} appointments in the last 30 days
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
              <InsightRow icon="analytics-outline" label="AI Per Appointment" value={`${aiUsageRate}%`} hint="Compared to triage" color="#7C3AED"/>
              <InsightRow icon="shield-checkmark-outline" label="Audit Coverage" value={`${auditCoverageRate}%`} hint="AI triage audit activity" color="#7C3AED"/>  
              <InsightRow icon="checkmark-done-outline" label="Logged AI Actions" value={`${stats.aiAuditLogs30Days}`} hint="Auditable AI events" color="#7C3AED"/>
              <InsightRow icon="alert-circle-outline" label="Triage Without Audit" value={`${triageWithoutAudit}`} hint="Potential review items" color="#BE123C"/>
            </View>
          </View>

          {aiEval && (
            <View style={styles.section}>
              <View style={styles.evalHeader}>
                <Ionicons name="flask-outline" size={22} color="#6366F1"/>
                <Text style={styles.sectionTitle}>AI Triage Evaluation</Text>
              </View>

              <Text style={styles.evalSubtitle}>Research data collected from doctor validations and patient feedback on AI triage decisions.</Text>

              <View style={styles.evalGrid}>
                <View style={styles.evalCard}>
                  <View style={styles.evalCardHeader}>
                    <Ionicons name="medkit-outline" size={16} color="#6366F1"/>
                    <Text style={styles.evalCardTitle}>Doctor Validation</Text>
                    <Text style={styles.evalCardTotal}>{aiEval.doctorValidations.total} responses</Text>
                  </View>

                  <EvalBar label="Agree" count={aiEval.doctorValidations.agree} total={aiEval.doctorValidations.total} color="#16A34A"/>
                  <EvalBar label="Partially agree" count={aiEval.doctorValidations.partially_agree} total={aiEval.doctorValidations.total} color="#B45309"/>
                  <EvalBar label="Disagree" count={aiEval.doctorValidations.disagree} total={aiEval.doctorValidations.total} color="#DC2626"/>

                  {aiEval.doctorValidations.total === 0 && ( <Text style={styles.evalEmpty}>No doctor validations yet. Doctors validate AI triage from Manage Appointments.</Text> )}
                </View>

                <View style={styles.evalCard}>
                  <View style={styles.evalCardHeader}>
                    <Ionicons name="person-outline" size={16} color="#6366F1"/>
                    <Text style={styles.evalCardTitle}>Patient Feedback</Text>
                    <Text style={styles.evalCardTotal}>{aiEval.patientRatings.total} responses</Text>
                  </View>

                  <EvalBar label="Yes" count={aiEval.patientRatings.yes} total={aiEval.patientRatings.total} color="#16A34A"/>
                  <EvalBar label="No" count={aiEval.patientRatings.no} total={aiEval.patientRatings.total} color="#DC2626"/>
                  <EvalBar label="Somewhat" count={aiEval.patientRatings.somewhat} total={aiEval.patientRatings.total} color="#94A3B8"/>

                  {aiEval.patientRatings.total === 0 && ( <Text style={styles.evalEmpty}>No patient ratings yet. Patients rate triage after booking via the chatbot.</Text> )}
                </View>

                <View style={styles.evalCard}>
                  <View style={styles.evalCardHeader}>
                    <Ionicons name="analytics-outline" size={16} color="#6366F1"/>
                    <Text style={styles.evalCardTitle}>Triage Level Distribution</Text>
                    <Text style={styles.evalCardTotal}>{aiEval.triageLevels.total} total</Text>
                  </View>

                  <EvalBar label="Routine" count={aiEval.triageLevels.routine} total={aiEval.triageLevels.total} color="#16A34A"/>
                  <EvalBar label="Moderate" count={aiEval.triageLevels.moderate} total={aiEval.triageLevels.total} color="#EA580C"/>
                  <EvalBar label="Urgent" count={aiEval.triageLevels.urgent} total={aiEval.triageLevels.total} color="#B45309"/>
                  <EvalBar label="Emergency" count={aiEval.triageLevels.emergency} total={aiEval.triageLevels.total} color="#DC2626"/>

                  {aiEval.triageLevels.total === 0 && ( <Text style={styles.evalEmpty}>No triage data yet. Levels are assigned by the AI chatbot during patient intake.</Text> )}
                </View>

                {aiEval.doctorValidations.total > 0 && aiEval.patientRatings.total > 0 && (
                  <View style={[styles.evalCard, styles.evalSummaryCard]}>
                    <View style={styles.evalCardHeader}>
                      <Ionicons name="checkmark-done-circle-outline" size={16} color="#6366F1"/>
                      <Text style={styles.evalCardTitle}>Research Summary</Text>
                    </View>

                    <View style={styles.evalSummaryRow}>
                      <Text style={styles.evalSummaryLabel}>Doctor accuracy rate</Text>
                      <Text style={[styles.evalSummaryValue, { color: '#16A34A' }]}>
                        {aiEval.doctorValidations.total > 0 ? Math.round((aiEval.doctorValidations.agree / aiEval.doctorValidations.total) * 100) : 0}%
                      </Text>
                    </View>

                    <View style={styles.evalSummaryRow}>
                      <Text style={styles.evalSummaryLabel}>Patient agreement rate</Text>
                      <Text style={[styles.evalSummaryValue, { color: '#16A34A' }]}>
                        {aiEval.patientRatings.total > 0 ? Math.round((aiEval.patientRatings.yes / aiEval.patientRatings.total) * 100) : 0}%
                      </Text>
                    </View>

                    <View style={styles.evalSummaryRow}>
                      <Text style={styles.evalSummaryLabel}>Doctor disagreement rate</Text>
                      <Text style={[styles.evalSummaryValue, { color: '#DC2626' }]}>
                        {aiEval.doctorValidations.total > 0 ? Math.round(((aiEval.doctorValidations.partially_agree + aiEval.doctorValidations.disagree) / aiEval.doctorValidations.total) * 100) : 0}%
                      </Text>
                    </View>

                    {f1Eval && f1Eval.total > 0 && (
                      <>
                        <View style={styles.evalSummaryRow}>
                          <Text style={styles.evalSummaryLabel}>Precision</Text>
                          <Text style={[styles.evalSummaryValue, { color: '#6366F1' }]}>{f1Eval.precision.toFixed(2)}</Text>
                        </View>
                        <View style={styles.evalSummaryRow}>
                          <Text style={styles.evalSummaryLabel}>Recall</Text>
                          <Text style={[styles.evalSummaryValue, { color: '#6366F1' }]}>{f1Eval.recall.toFixed(2)}</Text>
                        </View>
                        <View style={styles.evalSummaryRow}>
                          <Text style={styles.evalSummaryLabel}>F1 Score</Text>
                          <Text style={[styles.evalSummaryValue, { color: '#7C3AED', fontSize: 16 }]}>{f1Eval.f1.toFixed(2)}</Text>
                        </View>
                      </>
                    )}

                    <View style={styles.evalSummaryRow}>
                      <Text style={styles.evalSummaryLabel}>Total evaluation responses</Text>
                      <Text style={styles.evalSummaryValue}>
                        {aiEval.doctorValidations.total + aiEval.patientRatings.total}
                      </Text>
                    </View>
                  </View>
                )}

                {susEval && susEval.count > 0 && (
                  <View style={styles.evalCard}>
                    <View style={styles.evalCardHeader}>
                      <Ionicons name="clipboard-outline" size={16} color="#6366F1"/>
                      <Text style={styles.evalCardTitle}>System Usability Scale (SUS)</Text>
                      <Text style={styles.evalCardTotal}>{susEval.count} responses</Text>
                    </View>
                    <View style={styles.evalSummaryRow}>
                      <Text style={styles.evalSummaryLabel}>Average SUS score</Text>
                      <Text style={[styles.evalSummaryValue, { color: susEval.avgScore >= 68 ? '#16A34A' : '#B45309', fontSize: 22 }]}>
                        {susEval.avgScore}
                      </Text>
                    </View>
                    <View style={styles.evalSummaryRow}>
                      <Text style={styles.evalSummaryLabel}>Industry benchmark</Text>
                      <Text style={styles.evalSummaryValue}>68.0</Text>
                    </View>
                    <View style={styles.evalSummaryRow}>
                      <Text style={styles.evalSummaryLabel}>Status</Text>
                      <Text style={[styles.evalSummaryValue, { color: susEval.avgScore >= 68 ? '#16A34A' : '#B45309' }]}>
                        {susEval.avgScore >= 80 ? 'Excellent' : susEval.avgScore >= 68 ? 'Above average' : 'Below average'}
                      </Text>
                    </View>
                  </View>
                )}

                {sessionEval && sessionEval.total > 0 && (
                  <View style={styles.evalCard}>
                    <View style={styles.evalCardHeader}>
                      <Ionicons name="timer-outline" size={16} color="#6366F1"/>
                      <Text style={styles.evalCardTitle}>Session Analytics</Text>
                      <Text style={styles.evalCardTotal}>{sessionEval.total} sessions</Text>
                    </View>
                    <View style={styles.evalSummaryRow}>
                      <Text style={styles.evalSummaryLabel}>Avg. messages per session</Text>
                      <Text style={[styles.evalSummaryValue, { color: '#6366F1' }]}>{sessionEval.avgMessages}</Text>
                    </View>
                    <View style={styles.evalSummaryRow}>
                      <Text style={styles.evalSummaryLabel}>Avg. session duration</Text>
                      <Text style={[styles.evalSummaryValue, { color: '#6366F1' }]}>
                        {sessionEval.avgDuration >= 60 ? `${Math.floor(sessionEval.avgDuration / 60)}m ${sessionEval.avgDuration % 60}s` : `${sessionEval.avgDuration}s`}
                      </Text>
                    </View>
                    <View style={styles.evalSummaryRow}>
                      <Text style={styles.evalSummaryLabel}>Completion rate</Text>
                      <Text style={[styles.evalSummaryValue, { color: sessionEval.completionRate >= 70 ? '#16A34A' : '#B45309' }]}>
                        {sessionEval.completionRate}%
                      </Text>
                    </View>
                  </View>
                )}

                {confidenceEval && (confidenceEval.highCount + confidenceEval.lowCount) > 0 && (
                  <View style={styles.evalCard}>
                    <View style={styles.evalCardHeader}>
                      <Ionicons name="speedometer-outline" size={16} color="#6366F1"/>
                      <Text style={styles.evalCardTitle}>Confidence vs. Accuracy</Text>
                    </View>
                    <View style={styles.evalSummaryRow}>
                      <Text style={styles.evalSummaryLabel}>High confidence (&ge;70%) accuracy</Text>
                      <Text style={[styles.evalSummaryValue, { color: '#16A34A' }]}>
                        {confidenceEval.highAccuracy}% <Text style={{ fontSize: 12, color: '#94A3B8' }}>({confidenceEval.highCount} cases)</Text>
                      </Text>
                    </View>
                    <View style={styles.evalSummaryRow}>
                      <Text style={styles.evalSummaryLabel}>Low confidence (&lt;70%) accuracy</Text>
                      <Text style={[styles.evalSummaryValue, { color: '#B45309' }]}>
                        {confidenceEval.lowAccuracy}% <Text style={{ fontSize: 12, color: '#94A3B8' }}>({confidenceEval.lowCount} cases)</Text>
                      </Text>
                    </View>
                  </View>
                )}

                {kappaEval && (
                  <View style={styles.evalCard}>
                    <View style={styles.evalCardHeader}>
                      <Ionicons name="git-compare-outline" size={16} color="#6366F1"/>
                      <Text style={styles.evalCardTitle}>Cohen&apos;s Kappa (Inter-rater Agreement)</Text>
                      <Text style={styles.evalCardTotal}>{kappaEval.n} cases</Text>
                    </View>
                    <View style={styles.evalSummaryRow}>
                      <Text style={styles.evalSummaryLabel}>Kappa (κ)</Text>
                      <Text style={[styles.evalSummaryValue, { fontSize: 22, color: kappaEval.kappa >= 0.6 ? '#16A34A' : kappaEval.kappa >= 0.4 ? '#B45309' : '#DC2626' }]}>
                        {kappaEval.kappa.toFixed(3)}
                      </Text>
                    </View>
                    <View style={styles.evalSummaryRow}>
                      <Text style={styles.evalSummaryLabel}>Interpretation</Text>
                      <Text style={[styles.evalSummaryValue, { color: '#6366F1' }]}>{kappaEval.interpretation}</Text>
                    </View>
                    <View style={styles.evalSummaryRow}>
                      <Text style={styles.evalSummaryLabel}>Observed agreement (Po)</Text>
                      <Text style={styles.evalSummaryValue}>{kappaEval.po.toFixed(3)}</Text>
                    </View>
                    <View style={styles.evalSummaryRow}>
                      <Text style={styles.evalSummaryLabel}>Expected by chance (Pe)</Text>
                      <Text style={styles.evalSummaryValue}>{kappaEval.pe.toFixed(3)}</Text>
                    </View>
                  </View>
                )}

                {chiSquareEval && (
                  <View style={styles.evalCard}>
                    <View style={styles.evalCardHeader}>
                      <Ionicons name="stats-chart-outline" size={16} color="#6366F1"/>
                      <Text style={styles.evalCardTitle}>Chi-Square Test (vs. random chance)</Text>
                      <Text style={styles.evalCardTotal}>{chiSquareEval.n} cases</Text>
                    </View>
                    <View style={styles.evalSummaryRow}>
                      <Text style={styles.evalSummaryLabel}>χ² statistic</Text>
                      <Text style={[styles.evalSummaryValue, { fontSize: 20, color: '#6366F1' }]}>
                        {chiSquareEval.chiSquare.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.evalSummaryRow}>
                      <Text style={styles.evalSummaryLabel}>Significance</Text>
                      <Text style={[styles.evalSummaryValue, { color: chiSquareEval.pLabel.includes('not') ? '#DC2626' : '#16A34A' }]}>
                        {chiSquareEval.pLabel}
                      </Text>
                    </View>
                    <View style={styles.evalSummaryRow}>
                      <Text style={styles.evalSummaryLabel}>Observed agree</Text>
                      <Text style={styles.evalSummaryValue}>{chiSquareEval.observed}</Text>
                    </View>
                    <View style={styles.evalSummaryRow}>
                      <Text style={styles.evalSummaryLabel}>Expected by chance (33.3%)</Text>
                      <Text style={styles.evalSummaryValue}>{chiSquareEval.expected}</Text>
                    </View>
                  </View>
                )}

              </View>
            </View>
          )}

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

function EvalBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {

  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <View style={evalBarStyles.row}>
      <View style={evalBarStyles.labelRow}>
        <Text style={evalBarStyles.label}>{label}</Text>
        <Text style={[evalBarStyles.pct, { color }]}>{pct}% <Text style={evalBarStyles.count}>({count})</Text></Text>
      </View>
      <View style={evalBarStyles.track}>
        <View style={[evalBarStyles.fill, { width: `${pct}%`, backgroundColor: color }]}/>
      </View>
    </View>
  );

}

const evalBarStyles = StyleSheet.create({

  row: {
    gap: 5,
    marginBottom: 10,
  },

  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  label: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },

  pct: {
    fontSize: 13,
    fontWeight: '900',
  },

  count: {
    color: '#94A3B8',
    fontWeight: '700',
  },

  track: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },

  fill: {
    height: 8,
    borderRadius: 999,
  },

});

function MetricTile({
  icon,
  label,
  value,
  hint,
  color,
  mobileTwoColumns = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  hint: string;
  color: string;
  mobileTwoColumns?: boolean;
}) {

  return (
    <View style={[styles.metricTile, mobileTwoColumns && styles.metricTileMobile]}>
      <View style={[styles.metricIcon, { backgroundColor: `${color}12` }]}>
        <Ionicons name={icon} size={18} color={color}/>
      </View>

      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={[styles.metricLabel, mobileTwoColumns && styles.metricTextMobile]}>{label}</Text>
      <Text style={[styles.metricHint, mobileTwoColumns && styles.metricTextMobile]}>{hint}</Text>
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

  metricTileCentered: {
    alignItems: 'center',
  },

  metricTileMobile: {
    flexBasis: '47%',
    flexGrow: 0,
    minWidth: 0,
    alignItems: 'center',
  },

  metricTextMobile: {
    textAlign: 'center',
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

  evalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },

  evalSubtitle: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 18,
  },

  evalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },

  evalCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    padding: 16,
    gap: 4,
  },

  evalSummaryCard: {
    borderColor: '#C7D2FE',
    backgroundColor: '#EEF2FF',
  },

  evalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },

  evalCardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },

  evalCardTotal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
  },

  evalEmpty: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 4,
  },

  evalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 8,
  },

  evalSummaryLabel: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
  },

  evalSummaryValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },

});