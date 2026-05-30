import React, { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View, Alert, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUserProfile } from '../src/lib/auth';
import { supabase } from '../src/lib/supabase';
import { useClinicTheme } from '../src/lib/clinicTheme';
import ClinicNavbar from '../src/common/ClinicNavbar';
import PatientHealthCharts from '../src/common/PatientHealthCharts';
import HoverCard from '../src/common/HoverCard';

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
  ai_summary?: string | null;
  processing_status?: string | null;
  processed_at?: string | null;
  ai_image_summary?: string | null;
  ai_image_findings?: string[] | null;
  ai_image_flags?: string[] | null;
  image_processing_status?: string | null;
  image_processed_at?: string | null;
  ai_image_modality?: string | null;
  ai_image_body_region?: string | null;
  ai_image_quality?: string | null;
  ai_image_confidence?: string | null;
  ai_image_limitations?: string[] | null;
  ai_image_audit?: any;
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

type ParsedFileAiSummary = {

  summary: string;
  risk_flags: string[];
  recommendations: string[];

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

function formatDateTimeShort(value?: string | null) {

  if (!value) 
    return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime()))
    return value;

  return `${date.toLocaleDateString()} · ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', })}`;

}

function isVisitStatus(status?: string | null) {
  return status === 'checked_in' || status === 'completed';
}

function getLatestVisit(appointments: HistoryItem[]) {
  return appointments.find((appointment) => isVisitStatus(appointment.status)) || null;
}

function getStatusLabel(status?: string | null) {

  if (status === 'checked_in') return 'Checked In';
  if (status === 'missed') return 'Missed';
  if (status === 'completed') return 'Completed';
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'rescheduled') return 'Rescheduled';
  if (status === 'scheduled') return 'Scheduled';
  return 'Unknown';

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

function SummaryPill({ icon, label, value, mobile = false, }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; mobile?: boolean; }) {

  return (
    <View style={[styles.summaryPill, mobile && styles.summaryPillMobile]}>
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

function parseStringArray(value: unknown): string[] {

  if (!Array.isArray(value)) 
    return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);

}

function parseFileAiSummary(value?: string | null): ParsedFileAiSummary | null {

  if (!value) 
    return null;
  try {
    const parsed = JSON.parse(value);
    return { summary: String(parsed.summary || '').trim(), risk_flags: parseStringArray(parsed.risk_flags), recommendations: parseStringArray(parsed.recommendations), };
  } catch {
    return { summary: value, risk_flags: [], recommendations: [], };
  }

}


function isImageFile(file: PatientFile) {
  const type = `${file.file_type || ''} ${file.title || ''}`.toLowerCase();
  return (
    type.includes('image/') ||
    type.includes('.png') ||
    type.includes('.jpg') ||
    type.includes('.jpeg') ||
    type.includes('.webp')
  );
}

export default function MyPatientsHistoryScreen() {

  const { clinicId, clinicName, patientId } = useLocalSearchParams<{
    clinicId?: string;
    clinicName?: string;
    patientId?: string;
  }>();

  const { theme } = useClinicTheme(clinicId);
  const { width } = useWindowDimensions();
  const isMobile = width < 720;
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [files, setFiles] = useState<PatientFile[]>([]);
  const [aiSummaries, setAiSummaries] = useState<PatientAiSummary[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientHistoryGroup | null>(null);
  const [generatingPatientId, setGeneratingPatientId] = useState<string | null>(null);
  const [generatingChartInsightsPatientId, setGeneratingChartInsightsPatientId] = useState<string | null>(null);
  const [generatingFileId, setGeneratingFileId] = useState<string | null>(null);
  const [generatingImageFileId, setGeneratingImageFileId] = useState<string | null>(null);

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

  const getLatestClinicalSummary = (patientId: string) => {
    return (
      aiSummaries.find(
        (summary) =>
          summary.patient_id === patientId &&
          !summary.chart_insights?.length
      ) || null
    );
  };

  const getLatestChartInsightsSummary = (patientId: string) => {
    return (
      aiSummaries.find(
        (summary) =>
          summary.patient_id === patientId &&
          !!summary.chart_insights?.length
      ) || null
    );
  };

  const generateAiSummary = async (patient: PatientHistoryGroup) => {
    if (!clinicId) 
      return;

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
        ...prev.filter(
          (item) =>
            !(
              item.patient_id === patient.patientId &&
              !item.chart_insights?.length
            )
        ),
      ]);

      Alert.alert('Success', 'AI clinical summary generated.');
    } catch (summaryError: any) {
      Alert.alert('AI summary error', summaryError?.message || 'Something went wrong.');
    } finally {
      setGeneratingPatientId(null);
    }
  };

  const generateChartInsights = async (patient: PatientHistoryGroup) => {
    if (!clinicId) 
      return;

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
        ...prev.filter(
          (item) =>
            !(
              item.patient_id === patient.patientId &&
              !!item.chart_insights?.length
            )
        ),
      ]);

      Alert.alert('Success', 'AI chart insights generated.');
    } catch (chartError: any) {
      Alert.alert('AI chart insights error', chartError?.message || 'Something went wrong.');
    } finally {
      setGeneratingChartInsightsPatientId(null);
    }
  };

  const generateFileSummary = async (file: PatientFile) => {
    if (!clinicId || !selectedPatient) 
      return;

    try {
      setGeneratingFileId(file.id);

      const { data, error } = await supabase.functions.invoke('ai-summary', {
        body: {
          clinicId,
          patientId: selectedPatient.patientId,
          mode: 'file_summary',
          fileId: file.id,
        },
      });

      if (error) {
        const context = (error as any).context;
        let details = error.message;

        if (context) {
          const text = await context.text().catch(() => '');
          if (text) 
            details = text;
        }

        Alert.alert('File summary error', details);
        return;
      }

      if (!data?.file) {
        Alert.alert('File summary error', 'No file summary was returned.');
        return;
      }

      const updatedFile = data.file as PatientFile;

      setFiles((prev) => prev.map((item) => (item.id === updatedFile.id ? updatedFile : item)));

      setSelectedPatient((prev) => prev ? { ...prev, files: prev.files.map((item) => item.id === updatedFile.id ? updatedFile : item) } : prev);

      Alert.alert('Success', 'AI file summary generated.');
    } catch (fileError: any) {
      Alert.alert('File summary error', fileError?.message || 'Something went wrong.');
    } finally {
      setGeneratingFileId(null);
    }
  };


  const generateImageAnalysis = async (file: PatientFile) => {
    if (!clinicId || !selectedPatient)
      return;

    if (!isImageFile(file)) {
      Alert.alert('Image analysis unavailable', 'AI image analysis is available only for PNG, JPG, JPEG or WEBP files.');
      return;
    }

    try {
      setGeneratingImageFileId(file.id);

      const { data, error } = await supabase.functions.invoke('ai-summary', {
        body: {
          clinicId,
          patientId: selectedPatient.patientId,
          mode: 'image_analysis',
          fileId: file.id,
        },
      });

      if (error) {
        const context = (error as any).context;
        let details = error.message;

        if (context) {
          const text = await context.text().catch(() => '');
          if (text)
            details = text;
        }

        Alert.alert('Image analysis error', details);
        return;
      }

      if (!data?.file) {
        Alert.alert('Image analysis error', 'No image analysis was returned.');
        return;
      }

      const updatedFile = data.file as PatientFile;

      setFiles((prev) => prev.map((item) => (item.id === updatedFile.id ? updatedFile : item)));

      setSelectedPatient((prev) => prev ? { ...prev, files: prev.files.map((item) => item.id === updatedFile.id ? updatedFile : item) } : prev);

      Alert.alert('Success', 'AI image analysis generated.');
    } catch (imageError: any) {
      Alert.alert('Image analysis error', imageError?.message || 'Something went wrong.');
    } finally {
      setGeneratingImageFileId(null);
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
              const latestVisit = getLatestVisit(patient.appointments);
              const aiTriageCount = patient.appointments.filter((appointment) => appointment.triage_session_id).length;

              return (
                <HoverCard
                  key={patient.patientId}
                  pressableStyle={styles.cardWrap}
                  cardStyle={styles.card}
                  onPress={() => setSelectedPatient(patient)}
                >
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
                      <Text style={styles.cardMeta}>Last visit: {latestVisit ? `${formatValue(latestVisit.appointment_date)} · ${formatTime(latestVisit.start_time)}` : 'Not set'}</Text>
                    </View>
                    <Ionicons name="chevron-forward-outline" size={24} color="#94A3B8"/>
                  </View>

                  <View style={[styles.patientSummaryGrid, isMobile && styles.patientSummaryGridMobile]}>
                    <SummaryPill icon="calendar-outline" label="Appointments" value={`${patient.appointments.length}`} mobile={isMobile}/>
                    <SummaryPill icon="document-text-outline" label="Medical Records" value={`${patient.records.length}`} mobile={isMobile}/>
                    <SummaryPill icon="folder-open-outline" label="Medical Files" value={`${patient.files.length}`} mobile={isMobile}/>
                    <SummaryPill icon="sparkles-outline" label="AI Triage Sessions" value={`${aiTriageCount}`} mobile={isMobile}/>
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
                      {getLatestClinicalSummary(selectedPatient.patientId) ? (
                        <>
                          <View style={styles.aiSummaryHeader}>
                            <Ionicons name="sparkles-outline" size={18} color={theme.primary}/>
                            <Text style={styles.aiSummaryTitle}>Generated summary</Text>
                          </View>

                          <Text style={styles.aiSummaryText}>{getLatestClinicalSummary(selectedPatient.patientId)?.summary}</Text>

                          {!!getLatestClinicalSummary(selectedPatient.patientId)?.risk_flags?.length && (
                            <View style={styles.aiListBlock}>
                              <Text style={styles.aiListTitle}>Risk flags</Text>
                              {getLatestClinicalSummary(selectedPatient.patientId)?.risk_flags?.map((flag, index) => (
                                <Text key={`risk-${index}`} style={styles.aiListItem}>• {flag}</Text>
                              ))}
                            </View>
                          )}

                          {!!getLatestClinicalSummary(selectedPatient.patientId)?.recommendations?.length && (
                            <View style={styles.aiListBlock}>
                              <Text style={styles.aiListTitle}>Recommendations</Text>
                              {getLatestClinicalSummary(selectedPatient.patientId)?.recommendations?.map((recommendation, index) => (<Text key={`rec-${index}`} style={styles.aiListItem}>• {recommendation}</Text>))}
                            </View>
                          )}
                        </>
                      ) : (
                        <Text style={styles.aiSummaryText}>No AI clinical summary generated yet.</Text>
                      )}

                      <Pressable style={[styles.aiButton, { backgroundColor: theme.primary }]} onPress={() => generateAiSummary(selectedPatient)} disabled={generatingPatientId === selectedPatient.patientId}>
                        <Ionicons name="sparkles-outline" size={16} color="#FFFFFF"/>
                        <Text style={styles.aiButtonText}>{generatingPatientId === selectedPatient.patientId ? 'Generating...' : getLatestClinicalSummary(selectedPatient.patientId) ? 'Regenerate AI Summary' : 'Generate AI Summary'}</Text>
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
                              <Text style={[styles.statusText, { color: statusColor.text }]}>{getStatusLabel(appointment.status)}</Text>
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
                      <View style={styles.emptyDataCard}>
                        <Ionicons name="document-text-outline" size={24} color="#94A3B8"/>
                        <Text style={styles.emptyDataTitle}>No medical records yet</Text>
                        <Text style={styles.emptyDataText}>Medical Records will appear after they are created.</Text>
                      </View>
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

                                  <Pressable style={styles.fileOpenIconButton} onPress={() => openFile(file.file_url)}>
                                    <Ionicons name="open-outline" size={17} color="#64748B"/>
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

                  <ExpandableSection title="All Patient Files">
                    {selectedPatient.files.length === 0 ? (
                      <View style={styles.emptyDataCard}>
                        <Ionicons name="document-text-outline" size={24} color="#94A3B8"/>
                        <Text style={styles.emptyDataTitle}>No patient files yet</Text>
                        <Text style={styles.emptyDataText}>Patient Files will appear after they are uploaded.</Text>
                      </View>
                    ) : (
                      selectedPatient.files.map((file) => (
                        <View key={file.id} style={styles.infoCard}>
                          <View style={styles.fileRowWide}>
                            <View style={styles.fileRowText}>
                            <View style={styles.fileHeaderRow}>
                              <Ionicons name="document-attach-outline" size={17} color="#64748B"/>

                              <Text style={styles.fileTitle}>{file.title}</Text>

                              <Pressable style={styles.fileOpenIconButton} onPress={() => openFile(file.file_url)}>
                                <Ionicons name="open-outline" size={17} color="#64748B"/>
                              </Pressable>
                            </View>

                            <Text style={styles.fileTypeText}>
                              {file.category || 'file'} · {file.file_type || 'unknown type'}
                            </Text>

                            <Text style={styles.fileUploadedText}>
                              {file.description || 'Uploaded file.'} · {formatDateTimeShort(file.created_at)}
                            </Text>

                            <View style={styles.fileStatusRow}>
                              <View style={[styles.processingBadge, styles.processingBadgeProcessing]}>
                                <Text style={styles.processingBadgeText}>
                                summary {file.processing_status || ' pending'}
                                </Text>
                              </View>

                              <View
                                style={[
                                  styles.processingBadge,
                                  file.image_processing_status === 'completed'
                                    ? styles.processingBadgeCompleted
                                    : file.image_processing_status === 'failed'
                                      ? styles.processingBadgeFailed
                                      : styles.processingBadgeProcessing,
                                ]}
                              >
                                <Text style={styles.processingBadgeText}>
                                  analyzer {file.image_processing_status || 'pending'}
                                </Text>
                              </View>
                            </View>

                              {!!file.notes && <Text style={styles.fileDescription}>{file.notes}</Text>}
                              
                              {!!file.ai_summary && (() => {
                                const parsedSummary = parseFileAiSummary(file.ai_summary);

                                if (!parsedSummary) return null;

                                return (
                                  <View style={styles.fileAiSummaryBox}>
                                    <View style={styles.fileTitleRow}>
                                      <Ionicons
                                        name="sparkles-outline"
                                        size={15}
                                        color={theme.primary}
                                      />
                                      <Text style={styles.fileAiSummaryTitle}>
                                        AI document summary
                                      </Text>
                                    </View>

                                    {!!parsedSummary.summary && (
                                      <Text style={styles.fileAiSummaryText}>
                                        {parsedSummary.summary}
                                      </Text>
                                    )}

                                    {parsedSummary.risk_flags.length > 0 && (
                                      <View style={styles.aiListBlock}>
                                        <Text style={styles.aiListTitle}>Risk flags</Text>

                                        {parsedSummary.risk_flags.map((flag, index) => (
                                          <Text
                                            key={`file-risk-${index}`}
                                            style={styles.aiListItem}
                                          >
                                            • {flag}
                                          </Text>
                                        ))}
                                      </View>
                                    )}

                                    {parsedSummary.recommendations.length > 0 && (
                                      <View style={styles.aiListBlock}>
                                        <Text style={styles.aiListTitle}>
                                          Recommendations
                                        </Text>

                                        {parsedSummary.recommendations.map(
                                          (recommendation, index) => (
                                            <Text
                                              key={`file-rec-${index}`}
                                              style={styles.aiListItem}
                                            >
                                              • {recommendation}
                                            </Text>
                                          )
                                        )}
                                      </View>
                                    )}
                                  </View>
                                );
                              })()}

                              {!!file.ai_image_summary && (
                                <View style={styles.fileAiSummaryBox}>
                                  <View style={styles.fileTitleRow}>
                                    <Ionicons name="scan-outline" size={15} color={theme.primary} />
                                    <Text style={styles.fileAiSummaryTitle}>AI image analysis</Text>
                                  </View>

                                  <View style={styles.aiImageDisclaimerBox}>
                                    <Text style={styles.aiImageDisclaimerText}>
                                      AI-assisted image review only. Not a diagnosis. Must be reviewed by a qualified clinician or radiologist before clinical decisions.
                                    </Text>
                                  </View>

                                  <DetailRow icon="layers-outline" label="Modality" value={formatValue(file.ai_image_modality)} />
                                  <DetailRow icon="body-outline" label="Body region" value={formatValue(file.ai_image_body_region)} />
                                  <DetailRow icon="image-outline" label="Image quality" value={formatValue(file.ai_image_quality)} />
                                  <DetailRow icon="analytics-outline" label="AI confidence" value={formatValue(file.ai_image_confidence)} />

                                  <Text style={styles.fileAiSummaryText}>{file.ai_image_summary}</Text>

                                  {!!file.ai_image_flags?.length && (
                                    <View style={styles.aiListBlock}>
                                      <Text style={styles.aiListTitle}>Red flags</Text>
                                      {file.ai_image_flags.map((flag, index) => (
                                        <Text key={`image-flag-${index}`} style={styles.aiListItem}>• {flag}</Text>
                                      ))}
                                    </View>
                                  )}

                                  {!!file.ai_image_findings?.length && (
                                    <View style={styles.aiListBlock}>
                                      <Text style={styles.aiListTitle}>Visible findings</Text>
                                      {file.ai_image_findings.map((finding, index) => (
                                        <Text key={`image-finding-${index}`} style={styles.aiListItem}>• {finding}</Text>
                                      ))}
                                    </View>
                                  )}

                                  {!!file.ai_image_limitations?.length && (
                                    <View style={styles.aiListBlock}>
                                      <Text style={styles.aiListTitle}>Limitations</Text>
                                      {file.ai_image_limitations.map((item, index) => (
                                        <Text key={`image-limitation-${index}`} style={styles.aiListItem}>• {item}</Text>
                                      ))}
                                    </View>
                                  )}

                                  <Text style={styles.fileMeta}>
                                    Analyzed: {formatDateTimeShort(file.image_processed_at)}
                                  </Text>
                                </View>
                              )}
                            </View>

                            <View style={[styles.fileActionsRow, isMobile && styles.fileActionsRowMobile]}>
                              <Pressable
                                style={[
                                  styles.fileActionButton,
                                  isMobile && styles.fileActionButtonMobile,
                                  { backgroundColor: theme.primary, opacity: generatingFileId === file.id ? 0.7 : 1 },
                                ]}
                                onPress={() => generateFileSummary(file)}
                                disabled={generatingFileId === file.id}
                              >
                                <Ionicons name="sparkles-outline" size={16} color="#FFFFFF"/>
                                <Text numberOfLines={isMobile ? 2 : 1} style={styles.fileButtonText}>{generatingFileId === file.id ? "Generating..." : file.ai_summary ? "Regenerate Summary" : "Generate Summary"}</Text>
                              </Pressable>

                              {isImageFile(file) && (
                                  <Pressable
                                    style={[
                                      styles.fileActionButton,
                                      isMobile && styles.fileActionButtonMobile,
                                      { backgroundColor: '#475569', opacity: generatingImageFileId === file.id ? 0.7 : 1 },
                                    ]}
                                    onPress={() => generateImageAnalysis(file)}
                                    disabled={generatingImageFileId === file.id}
                                  >
                                  <Ionicons name="scan-outline" size={16} color="#FFFFFF"/>
                                    <Text numberOfLines={isMobile ? 2 : 1} style={styles.fileButtonText}>{generatingImageFileId === file.id ? "Analyzing..." : file.ai_image_summary ? "Reanalyze Image" : "Analyze Image"}</Text>
                                  </Pressable>
                              )}

                            </View>
                          </View>
                        </View>
                      ))
                    )}
                  </ExpandableSection>

                  <ExpandableSection title="Health Charts">
                    <PatientHealthCharts
                      records={selectedPatient.records}
                      primaryColor={theme.primary}
                      chartInsights={getLatestChartInsightsSummary(selectedPatient.patientId)?.chart_insights || []}
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

  emptyDataCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
  },

  emptyDataTitle: {
    marginTop: 8,
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '900',
  },

  emptyDataText: {
    marginTop: 5,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
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

  fileTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexWrap: 'wrap',
  },

  fileTitle: {
    flex: 1,
    minWidth: 0,
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

  fileDescription: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },

  fileAiSummaryBox: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    gap: 6,
  },

  fileAiSummaryTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '900',
  },

  fileAiSummaryText: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },

  fileRowText: {
    flex: 1,
    minWidth: 0,
  },

  fileRowWide: {
    width: '100%',
    gap: 12,
  },

  fileActionsRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },

  fileActionsRowMobile: {
    flexWrap: 'wrap',
  },

  fileActionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  fileActionButtonMobile: {
    minHeight: 54,
    minWidth: 135,
  },

  fileButton: {
    minHeight: 38,
    borderRadius: 999,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    flexShrink: 0,
  },

  fileButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 15,
    flexShrink: 1,
  },

  fileOpenIconButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  fileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  fileTypeText: {
    color: '#64748B',
    fontWeight: '800',
    fontSize: 12,
    marginTop: 4,
  },

  fileUploadedText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  fileStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },

  patientSummaryGridMobile: {
    flexDirection: 'column',
  },

  summaryPillMobile: {
    width: '100%',
    flexBasis: 'auto',
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

  processingBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 6,
    flexShrink: 0,
  },

  processingBadgeCompleted: {
    backgroundColor: '#DCFCE7',
  },

  processingBadgeFailed: {
    backgroundColor: '#FEE2E2',
  },

  processingBadgeProcessing: {
    backgroundColor: '#DBEAFE',
  },

  processingBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0F172A',
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

  aiImageDisclaimerBox: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 10,
  },

  aiImageDisclaimerText: {
    color: '#92400E',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
  },

});