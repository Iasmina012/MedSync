import React, { useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Animated, Image, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, Alert} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ClinicNavbar from '../src/common/ClinicNavbar';
import { getCurrentUserProfile } from '../src/lib/auth';
import { supabase } from '../src/lib/supabase';
import { useClinicTheme } from '../src/lib/clinicTheme';
import PatientHealthCharts from '../src/common/PatientHealthCharts';

type HistoryItem = {

  id: string;
  appointment_date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string | null;
  patient_id: string | null;
  patient_first_name: string | null;
  patient_last_name: string | null;
  patient_avatar_url: string | null;
  insurance_method: string | null;
  insurance_details: string | null;
  notes: string | null;
  ai_triage_summary: string | null;
  ai_triage_level: string | null;
  triage_session_id: string | null;
  clinic_services?: any;
  clinic_locations?: any;

};

type MedicalRecord = {

  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id: string | null;
  appointment_id: string | null;
  title: string | null;
  category: string | null;
  symptoms: string | null;
  diagnosis: string | null;
  treatment_plan: string | null;
  prescription: string | null;
  recommendations: string | null;
  notes: string | null;
  blood_pressure: string | null;
  heart_rate: number | null;
  temperature: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  follow_up_date: string | null;
  created_at: string | null;

};

type PatientFile = {

  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id: string | null;
  appointment_id: string | null;
  medical_record_id: string | null;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string | null;
  category: string | null;
  notes: string | null;
  created_at: string | null;

};

type PatientProfile = {

  id: string;
  avatar_url: string | null;

};


type PatientAiSummary = {

  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id: string | null;
  summary: string;
  risk_flags: string[] | null;
  recommendations: string[] | null;
  chart_insights: string[] | null;
  source_count: number | null;
  created_at: string | null;

};


type PatientHistoryGroup = {

  patientId: string;
  patientName: string;
  avatarUrl: string | null;
  appointments: HistoryItem[];
  records: MedicalRecord[];
  files: PatientFile[];

};

const INSURANCE_LABELS: Record<string, string> = {

  self_pay: 'Self pay',
  public_insurance: 'Public insurance',
  private_insurance: 'Private insurance',
  other: 'Other',

};

function formatValue(value: string | number | null | undefined) {
  return value !== null && value !== undefined && String(value).trim() ? String(value) : 'Not set';
}

function getPatientName(item?: HistoryItem | null) {
  return `${item?.patient_first_name || ''} ${item?.patient_last_name || ''}`.trim() || 'Patient';
}

function formatDateTime(date?: string | null, time?: string | null) {

  if (!date && !time) 
    return 'Not set';
  if (!date) 
    return formatValue(time);
  if (!time) 
    return formatValue(date);

  return `${date} · ${time}`;

}

function formatTime(value: string | null | undefined) {
  return value ? value.slice(0, 5) : 'Not set';
}

function HoverCard({ children, onPress, }: { children: React.ReactNode; onPress: () => void; }) {

  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const animateIn = () => {
    if (Platform.OS !== 'web') 
      return;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1.015, useNativeDriver: false, friction: 8 }),
      Animated.spring(translateY, { toValue: -5, useNativeDriver: false, friction: 8 }),
    ]).start();
  };

  const animateOut = () => {
    if (Platform.OS !== 'web') 
      return;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: false, friction: 8 }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: false, friction: 8 }),
    ]).start();
  };

  return (
    <Pressable
      style={styles.cardWrap}
      onPress={onPress}
      onHoverIn={animateIn}
      onHoverOut={animateOut}
      onPressIn={animateIn}
      onPressOut={animateOut}
    >
      <Animated.View style={[styles.card, { transform: [{ scale }, { translateY }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );

}

function ExpandableSection({ title, children, defaultOpen = false, }: { title: string; children: React.ReactNode; defaultOpen?: boolean; }) {

  const [open, setOpen] = useState(defaultOpen);

  return (
    <View style={styles.expandableWrap}>
      <Pressable style={styles.expandableHeader} onPress={() => setOpen((prev) => !prev)}>
        <Text style={styles.expandableTitle}>{title}</Text>
        <Ionicons name={open ? 'chevron-up-outline' : 'chevron-down-outline'} size={20} color="#64748B"/>
      </Pressable>
      {open && <View style={styles.expandableContent}>{children}</View>}
    </View>
  );

}

function SummaryPill({ icon, label, value, }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; }) {

  return (
    <View style={styles.summaryPill}>
      <Ionicons name={icon} size={15} color="#64748B"/>
      <Text style={styles.summaryPillText}>{label}</Text>
      <Text style={styles.summaryPillValue}>{value}</Text>
    </View>
  );

}

function DetailRow({ icon, label, value, }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; }) {

  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={16} color="#64748B"/>
      <View style={styles.detailTextWrap}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );

}

export default function MyPatientsHistoryScreen() {

  const { clinicId, clinicName, patientId } = useLocalSearchParams<{
    clinicId?: string;
    clinicName?: string;
    patientId?: string;
  }>();

  const { theme } = useClinicTheme(clinicId);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [files, setFiles] = useState<PatientFile[]>([]);
  const [aiSummaries, setAiSummaries] = useState<PatientAiSummary[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientHistoryGroup | null>(null);
  const [generatingPatientId, setGeneratingPatientId] = useState<string | null>(null);
  const [generatingChartInsightsPatientId, setGeneratingChartInsightsPatientId] = useState<string | null>(null);

  useEffect(() => {

    const loadHistory = async () => {

      if (!clinicId) 
        return router.replace('/clinic-selection');
      setLoading(true);

      const { user, profile } = await getCurrentUserProfile();
      if (!user) 
        return router.replace('/login');
      if (profile?.role !== 'doctor') 
        return router.replace('/main-patient');

      const doctorFilter = profile.email ? `profile_id.eq.${user.id},email.eq.${profile.email}` : `profile_id.eq.${user.id}`;
      const { data: doctorData, error: doctorError } = await supabase
        .from('doctors')
        .select('id')
        .eq('clinic_id', clinicId)
        .or(doctorFilter)
        .maybeSingle();

      if (doctorError || !doctorData?.id) {
        console.log('Doctor lookup error:', doctorError?.message);
        setHistory([]);
        setRecords([]);
        setFiles([]);
        setAiSummaries([]);
        setLoading(false);
        return;
      }

      let appointmentsQuery = supabase
        .from('appointments')
        .select(`id, appointment_date, start_time, end_time, status, patient_id, patient_first_name, patient_last_name, insurance_method, insurance_details, notes, ai_triage_summary, ai_triage_level, triage_session_id, clinic_services(title, category, price_text, duration_minutes), clinic_locations(name, address)`)
        .eq('clinic_id', clinicId)
        .eq('doctor_id', doctorData.id)
        .order('appointment_date', { ascending: false })
        .order('start_time', { ascending: false });

      if (patientId)
        appointmentsQuery = appointmentsQuery.eq('patient_id', patientId);

      const { data: appointmentData, error: appointmentError } = await appointmentsQuery;

      if (appointmentError) {
        console.log('Patient history appointments error:', appointmentError.message);
        setHistory([]);
        setRecords([]);
        setFiles([]);
        setAiSummaries([]);
        setLoading(false);
        return;
      }

      const mappedAppointments = (appointmentData ?? []).map((item: any) => ({
        ...item,
        patient_avatar_url: null,
        clinic_services: Array.isArray(item.clinic_services) ? item.clinic_services[0] ?? null : item.clinic_services,
        clinic_locations: Array.isArray(item.clinic_locations) ? item.clinic_locations[0] ?? null : item.clinic_locations,
      })) as HistoryItem[];

      const patientIds = Array.from(new Set(mappedAppointments.map((item) => item.patient_id).filter(Boolean))) as string[];
      if (patientIds.length > 0) {
        const [ { data: profilesData }, { data: recordsData }, { data: filesData }, { data: summariesData }, ] = await Promise.all([
          supabase.from('profiles').select('id, avatar_url').in('id', patientIds),
          supabase.from('patient_medical_records').select('*').eq('clinic_id', clinicId).in('patient_id', patientIds).order('created_at', { ascending: false }),
          supabase.from('patient_files').select('*').eq('clinic_id', clinicId).in('patient_id', patientIds).order('created_at', { ascending: false }),
          supabase.from('patient_ai_summaries').select('*').eq('clinic_id', clinicId).in('patient_id', patientIds).order('created_at', { ascending: false }),
        ]);

        const profileMap = new Map<string, PatientProfile>();
        ((profilesData ?? []) as PatientProfile[]).forEach((profileItem) => { profileMap.set(profileItem.id, profileItem); });
        const mergedAppointments = mappedAppointments.map((appointment) => { const patientProfile = appointment.patient_id ? profileMap.get(appointment.patient_id) : null;

          return { ...appointment, patient_avatar_url: patientProfile?.avatar_url ?? null, };
        });

        setHistory(mergedAppointments);
        setRecords((recordsData ?? []) as MedicalRecord[]);
        setFiles((filesData ?? []) as PatientFile[]);
        setAiSummaries((summariesData ?? []) as PatientAiSummary[]);
      } else {
        setHistory(mappedAppointments);
        setRecords([]);
        setFiles([]);
        setAiSummaries([]);
      }

      setLoading(false);
    
    };

    loadHistory();
  
  }, [clinicId, patientId]);

  const patientGroups: PatientHistoryGroup[] = useMemo(() => {

    const groupMap = new Map<string, PatientHistoryGroup>();

    history.forEach((appointment) => {
      const patientKey = appointment.patient_id || appointment.id;
      if (!groupMap.has(patientKey)) {
        const patientRecords = records.filter((record) => record.patient_id === appointment.patient_id);
        const patientFiles = files.filter((file) => file.patient_id === appointment.patient_id);
        groupMap.set(patientKey, {
          patientId: patientKey,
          patientName: getPatientName(appointment),
          avatarUrl: appointment.patient_avatar_url,
          appointments: [],
          records: patientRecords,
          files: patientFiles,
        });
      }
      groupMap.get(patientKey)?.appointments.push(appointment);
    });

    return Array.from(groupMap.values()).map((group) => ({...group, appointments: [...group.appointments].sort((a, b) => {
        const dateA = `${a.appointment_date || ''}T${a.start_time || ''}`;
        const dateB = `${b.appointment_date || ''}T${b.start_time || ''}`;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      }),
    }));

  }, [history, records, files]);

  const getStatusColor = (status?: string | null) => {
    if (status === 'completed' || status === 'checked_in')
      return { bg: '#DCFCE7', text: '#166534' };
    if (status === 'cancelled' || status === 'missed')
      return { bg: '#FEE2E2', text: '#991B1B' };
    if (status === 'scheduled' || status === 'rescheduled')
      return { bg: '#DBEAFE', text: '#1D4ED8' };
    return { bg: '#F1F5F9', text: '#64748B' };
  };

  const openFile = async (url: string) => {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) 
      Linking.openURL(url);
  };


  const getLatestAiSummary = (patientId: string) => { return aiSummaries.find((summary) => summary.patient_id === patientId) || null; };

  const generateAiSummary = async (patient: PatientHistoryGroup) => {
    if (!clinicId) return;

    try {
      setGeneratingPatientId(patient.patientId);

      const { data, error } = await supabase.functions.invoke('ai-summary', {
        body: {
          clinicId,
          patientId: patient.patientId,
        },
      });

      console.log('AI SUMMARY RESPONSE:', { data, error });

      if (error) {
        const context = (error as any).context;
        let details = error.message;

        if (context) {
          const text = await context.text().catch(() => '');
          if (text) details = text;
        }

        console.log('AI SUMMARY ERROR DETAILS:', details);
        Alert.alert('AI summary error', details);
        return;
      }

      if (!data?.summary) {
        Alert.alert('AI summary error', 'No summary was returned.');
        return;
      }

      const newSummary = data.summary as PatientAiSummary;

      setAiSummaries((prev) => [
        newSummary,
        ...prev.filter((item) => item.patient_id !== patient.patientId),
      ]);

      Alert.alert('Success', 'AI clinical summary generated.');
    } catch (summaryError: any) {
      Alert.alert('AI summary error', summaryError?.message || 'Something went wrong.');
    } finally {
      setGeneratingPatientId(null);
    }
  };

  const generateChartInsights = async (patient: PatientHistoryGroup) => {
    if (!clinicId) return;

    try {
      setGeneratingChartInsightsPatientId(patient.patientId);

      const { data, error } = await supabase.functions.invoke('ai-summary', {
        body: {
          clinicId,
          patientId: patient.patientId,
          mode: 'chart_insights',
        },
      });

      if (error) {
        const context = (error as any).context;
        let details = error.message;

        if (context) {
          const text = await context.text().catch(() => '');
          if (text) details = text;
        }

        Alert.alert('AI chart insights error', details);
        return;
      }

      if (!data?.summary) {
        Alert.alert('AI chart insights error', 'No insights were returned.');
        return;
      }

      const newSummary = data.summary as PatientAiSummary;

      setAiSummaries((prev) => [
        newSummary,
        ...prev.filter((item) => item.patient_id !== patient.patientId),
      ]);

      Alert.alert('Success', 'AI chart insights generated.');
    } catch (chartError: any) {
      Alert.alert('AI chart insights error', chartError?.message || 'Something went wrong.');
    } finally {
      setGeneratingChartInsightsPatientId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primary}/>
      </View>
    );
  }

  return (

    <>

      <ScrollView contentContainerStyle={styles.container} stickyHeaderIndices={[0]}>

        <ClinicNavbar
          clinicName={clinicName}
          clinicId={clinicId}
          primaryColor={theme.primary}
          roleLabel="Doctor"
          showBackButton
          showRolePill={false}
          canChangeClinic={false}
          onBackPress={() =>
            router.replace({
              pathname: '/main-doctor',
              params: { clinicId, clinicName },
            })
          }
        />

        <View style={[styles.hero, { backgroundColor: theme.soft, borderColor: theme.borderSoft }]}>
          <Text style={[styles.eyebrow, { color: theme.primary }]}>Doctor</Text>
          <Text style={[styles.title, { color: theme.secondary }]}>Patient History</Text>
          <Text style={styles.subtitle}>Review patients, appointments, medical records and uploaded files.</Text>
        </View>

        {patientGroups.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={34} color={theme.primary}/>
            <Text style={styles.emptyTitle}>No history yet</Text>
            <Text style={styles.emptyText}>Appointment history will appear here after patients book with you.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {patientGroups.map((patient) => {
              const latestAppointment = patient.appointments[0];
              const aiTriageCount = patient.appointments.filter((appointment) => appointment.triage_session_id).length;

              return (
                <HoverCard key={patient.patientId} onPress={() => setSelectedPatient(patient)}>
                  <View style={styles.cardTop}>
                    <View style={[styles.avatarBox, { backgroundColor: `${theme.primary}12` }]}>
                      {patient.avatarUrl ? (
                        <Image source={{ uri: patient.avatarUrl }} style={styles.avatarImage}/>
                      ) : (
                        <Ionicons name="person-outline" size={22} color={theme.primary}/>
                      )}
                    </View>

                    <View style={styles.cardText}>
                      <Text style={styles.cardTitle}>{patient.patientName}</Text>
                      <Text style={styles.cardMeta}>Last visit: {formatValue(latestAppointment?.appointment_date)} · {formatTime(latestAppointment?.start_time)}</Text>
                    </View>
                    <Ionicons name="chevron-forward-outline" size={24} color="#94A3B8"/>
                  </View>

                  <View style={styles.patientSummaryGrid}>
                    <SummaryPill icon="calendar-outline" label="Appointments" value={`${patient.appointments.length}`}/>
                    <SummaryPill icon="document-text-outline" label="Medical Records" value={`${patient.records.length}`}/>
                    <SummaryPill icon="folder-open-outline" label="Medical Files" value={`${patient.files.length}`}/>
                    <SummaryPill icon="sparkles-outline" label="AI Triage Sessions" value={`${aiTriageCount}`}/>
                  </View>
                </HoverCard>
              );
            })}
          </View>
        )}

      </ScrollView>

      <Modal visible={!!selectedPatient} transparent animationType="fade">

        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selectedPatient && (
              <>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalIcon, { backgroundColor: `${theme.primary}12` }]}>
                    {selectedPatient.avatarUrl ? (
                      <Image source={{ uri: selectedPatient.avatarUrl }} style={styles.avatarImage}/>
                    ) : (
                      <Ionicons name="person-outline" size={36} color={theme.primary}/>
                    )}
                  </View>
                  <Text style={styles.modalTitle}>{selectedPatient.patientName}</Text>
                  <Text style={styles.modalSubtitle}>Complete patient timeline and records.</Text>
                </View>

                <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>

                  <ExpandableSection title="Patient Overview" defaultOpen>
                    <View style={styles.infoCard}>
                      <DetailRow icon="calendar-outline" label="Appointments" value={`${selectedPatient.appointments.length}`}/>
                      <DetailRow icon="document-text-outline" label="Medical records" value={`${selectedPatient.records.length}`}/>
                      <DetailRow icon="folder-outline" label="Medical files" value={`${selectedPatient.files.length}`}/>
                      <DetailRow icon="sparkles-outline" label="AI triage sessions" value={`${selectedPatient.appointments.filter((appointment) => appointment.triage_session_id).length}`}/>
                    </View>
                  </ExpandableSection>

                  <ExpandableSection title="AI Clinical Summary">
                    <View style={styles.aiSummaryCard}>
                      {getLatestAiSummary(selectedPatient.patientId) ? (
                        <>
                          <View style={styles.aiSummaryHeader}>
                            <Ionicons name="sparkles-outline" size={18} color={theme.primary}/>
                            <Text style={styles.aiSummaryTitle}>Generated summary</Text>
                          </View>

                          <Text style={styles.aiSummaryText}>{getLatestAiSummary(selectedPatient.patientId)?.summary}</Text>

                          {!!getLatestAiSummary(selectedPatient.patientId)?.risk_flags?.length && (
                            <View style={styles.aiListBlock}>
                              <Text style={styles.aiListTitle}>Risk flags</Text>
                              {getLatestAiSummary(selectedPatient.patientId)?.risk_flags?.map((flag, index) => (
                                <Text key={`risk-${index}`} style={styles.aiListItem}>• {flag}</Text>
                              ))}
                            </View>
                          )}

                          {!!getLatestAiSummary(selectedPatient.patientId)?.recommendations?.length && (
                            <View style={styles.aiListBlock}>
                              <Text style={styles.aiListTitle}>Recommendations</Text>
                              {getLatestAiSummary(selectedPatient.patientId)?.recommendations?.map((recommendation, index) => (
                                <Text key={`rec-${index}`} style={styles.aiListItem}>• {recommendation}</Text>
                              ))}
                            </View>
                          )}
                        </>
                      ) : (
                        <Text style={styles.aiSummaryText}>No AI clinical summary generated yet.</Text>
                      )}

                      <Pressable style={[styles.aiButton, { backgroundColor: theme.primary }]} onPress={() => generateAiSummary(selectedPatient)} disabled={generatingPatientId === selectedPatient.patientId}>
                        <Ionicons name="sparkles-outline" size={16} color="#FFFFFF"/>
                        <Text style={styles.aiButtonText}>{generatingPatientId === selectedPatient.patientId ? 'Generating...' : getLatestAiSummary(selectedPatient.patientId) ? 'Regenerate AI Summary' : 'Generate AI Summary'}</Text>
                      </Pressable>

                      <Text style={styles.aiDisclaimer}>AI output is informational and must be reviewed by a clinician.</Text>
                    </View>
                  </ExpandableSection>

                  <ExpandableSection title="Appointment Timeline">
                    {selectedPatient.appointments.map((appointment) => { const statusColor = getStatusColor(appointment.status);

                      return (
                        <View key={appointment.id} style={styles.timelineCard}>
                          <View style={styles.timelineTop}>
                            <View style={styles.timelineTextWrap}>
                              <Text style={styles.timelineTitle}>{appointment.clinic_services?.title || 'Medical appointment'}</Text>
                              <Text style={styles.timelineMeta}>{formatDateTime(appointment.appointment_date, appointment.start_time)}</Text>
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                              <Text style={[styles.statusText, { color: statusColor.text }]}>{appointment.status || 'Unknown'}</Text>
                            </View>
                          </View>

                          <DetailRow icon="location-outline" label="Location" value={ appointment.clinic_locations?.name || appointment.clinic_locations?.address || 'Not set' }/>
                          <DetailRow icon="card-outline" label="Insurance" value={appointment.insurance_method ? INSURANCE_LABELS[appointment.insurance_method] || appointment.insurance_method : 'Not set'}/>
                          
                          {!!appointment.insurance_details && 
                            <DetailRow icon="document-text-outline" label="Insurance details" value={appointment.insurance_details}/>
                          }

                          {!!appointment.ai_triage_summary && (
                            <View style={styles.timelineSection}>
                              <Text style={styles.timelineSectionTitle}>AI Summary</Text>
                              <Text style={styles.timelineText}>{appointment.ai_triage_summary}</Text>
                            </View>
                          )}

                          {!!appointment.notes && (
                            <View style={styles.timelineSection}>
                              <Text style={styles.timelineSectionTitle}>Notes</Text>
                              <Text style={styles.timelineText}>{appointment.notes}</Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </ExpandableSection>

                  <ExpandableSection title="Medical Records">
                    {selectedPatient.records.length === 0 ? (
                      <Text style={styles.emptyInlineText}>No medical records.</Text>
                    ) : (
                      selectedPatient.records.map((record) => {
                        const attachedFiles = selectedPatient.files.filter((file) => file.medical_record_id === record.id || (!!record.appointment_id && file.appointment_id === record.appointment_id));

                        return (
                          <View key={record.id} style={styles.infoCard}>
                            <Text style={styles.recordTitle}>{record.title || 'Medical Records'}</Text>
                            <DetailRow icon="folder-outline" label="Category" value={formatValue(record.category)}/>
                            <DetailRow icon="body-outline" label="Symptoms" value={formatValue(record.symptoms)}/>
                            <DetailRow icon="medkit-outline" label="Diagnosis" value={formatValue(record.diagnosis)}/>
                            <DetailRow icon="clipboard-outline" label="Treatment" value={formatValue(record.treatment_plan)}/>
                            <DetailRow icon="receipt-outline" label="Prescription" value={formatValue(record.prescription)}/>
                            <DetailRow icon="bulb-outline" label="Recommendations" value={formatValue(record.recommendations)}/>
                            <DetailRow icon="heart-outline" label="Blood pressure" value={formatValue(record.blood_pressure)}/>
                            <DetailRow icon="pulse-outline" label="Heart rate" value={formatValue(record.heart_rate)}/>
                            <DetailRow icon="thermometer-outline" label="Temperature" value={formatValue(record.temperature)}/>
                            <DetailRow icon="scale-outline" label="Weight" value={record.weight_kg ? `${record.weight_kg} kg` : 'Not set'}/>
                            <DetailRow icon="resize-outline" label="Height" value={record.height_cm ? `${record.height_cm} cm` : 'Not set'}/>
                            <DetailRow icon="calendar-outline" label="Follow-up date" value={formatValue(record.follow_up_date)}/>
                            <DetailRow icon="reader-outline" label="Notes" value={formatValue(record.notes)}/>

                            <View style={styles.attachedFilesBlock}>
                              <Text style={styles.attachedFilesTitle}>Attached files</Text>

                              {attachedFiles.length === 0 ? (
                                <Text style={styles.emptyInlineText}>No files attached.</Text>
                              ) : (
                                attachedFiles.map((file) => (
                                  <View key={file.id} style={styles.fileRow}>
                                    <View style={styles.fileRowText}>
                                      <View style={styles.fileTitleRow}>
                                        <Ionicons name="document-attach-outline" size={16} color="#64748B"/>
                                        <Text style={styles.fileTitle}>{file.title}</Text>
                                      </View>
                                      <Text style={styles.fileMeta}>
                                        {file.category || 'file'} · {file.file_type || 'unknown type'}
                                      </Text>
                                    </View>

                                    <Pressable style={[styles.fileButton, { backgroundColor: theme.primary }]} onPress={() => openFile(file.file_url)}>
                                      <Ionicons name="open-outline" size={15} color="#FFFFFF"/>
                                      <Text style={styles.fileButtonText}>Open</Text>
                                    </Pressable>
                                  </View>
                                ))
                              )}
                            </View>
                          </View>
                        );
                      })
                    )}
                  </ExpandableSection>

                  <ExpandableSection title="Health Charts">
                    <PatientHealthCharts
                      records={selectedPatient.records}
                      primaryColor={theme.primary}
                      chartInsights={getLatestAiSummary(selectedPatient.patientId)?.chart_insights || []}
                      generatingInsights={generatingChartInsightsPatientId === selectedPatient.patientId}
                      onGenerateInsights={() => generateChartInsights(selectedPatient)}
                    />
                  </ExpandableSection>

                </ScrollView>

                <Pressable style={[styles.closeButton, { backgroundColor: theme.primary }]} onPress={() => setSelectedPatient(null)}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </Pressable>
              </>
            )}
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
    gap: 18,
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

  list: {
    gap: 16,
  },

  cardWrap: {
    width: '100%',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  cardTop: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },

  avatarBox: {
    width: 54,
    height: 54,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  avatarImage: {
    width: '100%',
    height: '100%',
  },

  cardText: {
    flex: 1,
    minWidth: 0,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },

  cardMeta: {
    color: '#64748B',
    marginTop: 5,
    fontSize: 13,
    fontWeight: '700',
  },

  patientSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },

  summaryPill: {
    flexGrow: 1,
    flexBasis: 145,
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  summaryPillText: {
    flex: 1,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
  },

  summaryPillValue: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '900',
  },

  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },

  statusText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'capitalize',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 26,
    alignItems: 'center',
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },

  emptyText: {
    marginTop: 8,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '700',
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
    maxWidth: 760,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
  },

  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },

  modalIcon: {
    width: 82,
    height: 82,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 14,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },

  modalSubtitle: {
    marginTop: 6,
    color: '#64748B',
    fontWeight: '700',
    textAlign: 'center',
  },

  modalScroll: {
    maxHeight: 520,
  },

  modalScrollContent: {
    gap: 14,
    paddingBottom: 12,
  },

  expandableWrap: {
    gap: 12,
  },

  expandableHeader: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  expandableTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },

  expandableContent: {
    gap: 12,
  },

  infoCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },

  detailRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },

  detailTextWrap: {
    flex: 1,
  },

  detailLabel: {
    color: '#334155',
    fontWeight: '800',
    fontSize: 13,
  },

  detailValue: {
    color: '#64748B',
    marginTop: 2,
    fontWeight: '700',
    lineHeight: 20,
  },

  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    padding: 16,
    gap: 12,
  },

  timelineTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },

  timelineTextWrap: {
    flex: 1,
  },

  timelineTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },

  timelineMeta: {
    marginTop: 4,
    color: '#64748B',
    fontWeight: '700',
    fontSize: 13,
  },

  timelineSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },

  timelineSectionTitle: {
    fontWeight: '900',
    color: '#334155',
    marginBottom: 6,
  },

  timelineText: {
    color: '#64748B',
    lineHeight: 22,
    fontWeight: '700',
  },

  recordTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },

  emptyInlineText: {
    color: '#94A3B8',
    fontWeight: '800',
  },

  attachedFilesBlock: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 10,
  },

  attachedFilesTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
  },

  fileRow: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  fileRowText: {
    flex: 1,
  },

  fileTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  fileTitle: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 13,
  },

  fileMeta: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 12,
    marginTop: 3,
  },

  fileButton: {
    minHeight: 38,
    borderRadius: 999,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },

  fileButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },


  aiSummaryCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },

  aiSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  aiSummaryTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },

  aiSummaryText: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '700',
  },

  aiListBlock: {
    gap: 5,
  },

  aiListTitle: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '900',
  },

  aiListItem: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },

  aiButton: {
    minHeight: 46,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  aiButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },

  aiDisclaimer: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },

  closeButton: {
    marginTop: 18,
    minHeight: 50,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

});