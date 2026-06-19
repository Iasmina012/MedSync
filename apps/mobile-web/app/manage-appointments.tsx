import React, { useEffect, useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/lib/supabase';
import { useClinicTheme } from '../src/lib/clinicTheme';
import { getUserClinicCount } from '../src/lib/adminData';
import ClinicNavbar from '../src/common/ClinicNavbar';
import HoverCard from '../src/common/HoverCard';
import DropdownMenu from '../src/common/DropdownMenu';

type Role = 'patient' | 'doctor' | 'clinic_admin' | 'platform_admin';

type AppointmentStatus =
  | 'scheduled'
  | 'rescheduled'
  | 'cancelled'
  | 'completed'
  | 'missed'
  | 'checked_in';

type Profile = {

  id: string;
  role: Role;
  email: string | null;
  first_name: string | null;
  last_name: string | null;

};

type Appointment = {

  id: string;
  clinic_id: string;
  doctor_id: string | null;
  patient_id: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string | null;
  status: AppointmentStatus;
  patient_first_name: string | null;
  patient_last_name: string | null;
  insurance_method: string | null;
  insurance_details: string | null;
  notes: string | null;
  ai_triage_patient_note: string | null;
  ai_triage_summary: string | null;
  ai_triage_level: string | null;
  triage_session_id: string | null;
  ai_triage_validation: 'agree' | 'partially_agree' | 'disagree' | null;
  ai_triage_correction: 'routine' | 'urgent' | 'emergency' | null;
  doctor_own_assessment: 'routine' | 'urgent' | 'emergency' | null;

  doctors: {
    id: string;
    first_name: string;
    last_name: string;
    specialty: string | null;
  } | null;

  clinic_services: {
    id: string;
    title: string;
    category: string | null;
    price_text: string | null;
    duration_minutes: number | null;
  } | null;

  clinic_locations: {
    id: string;
    name: string;
    address: string | null;
  } | null;

};

type PendingFile = {

  id: string;
  name: string;
  uri: string;
  mimeType: string | null;

};

type OnboardingReview = {

  id: string;
  appointment_id: string;
  summary_for_doctor: string | null;
  missing_information: string[] | null;
  clarifying_questions: string[] | null;
  urgency_flags: string[] | null;
  urgency_level: string | null;
  urgency_flags_structured: {
    flag: string;
    severity: string;
    reason: string;
  }[] | null;
  form_valid: boolean | null;
  completion_score: number | null;
  requires_manual_review: boolean | null;
  triage_recommendation: string | null;
  created_at: string | null;

};

const INSURANCE_LABELS: Record<string, string> = {

  self_pay: 'Self pay',
  public_insurance: 'Public insurance',
  private_insurance: 'Private insurance',
  other: 'Other',

};

type AppointmentSort =
  | 'default'
  | 'date_asc'
  | 'date_desc'
  | 'patient_asc'
  | 'patient_desc'
  | 'doctor_asc'
  | 'doctor_desc'
  | 'service_asc'
  | 'service_desc';

function getDoctorName(doctor: Appointment['doctors']) {

  if (!doctor) 
    return 'Doctor not assigned';
  return `Dr. ${doctor.first_name} ${doctor.last_name}`.trim();

}

function getPatientName(appointment: Appointment) {
  return (`${appointment.patient_first_name || ''} ${appointment.patient_last_name || ''}`.trim() || 'Patient');
}

function buildAppointmentDateTime(appointment: Appointment) {
  return `${appointment.appointment_date}T${appointment.start_time}`;
}

function formatDateTime(value: string) {

  return new Date(value).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

}

function startOfDay(date: Date) {

  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;

}

function getRelativeLabel(appointmentStart: string, status: AppointmentStatus) {

  if (status === 'cancelled') return 'Cancelled';
  if (status === 'missed') return 'Missed';
  if (status === 'completed') return 'Completed';
  if (status === 'checked_in') return 'Checked in';

  const today = startOfDay(new Date());
  const target = startOfDay(new Date(appointmentStart));
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Missed';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';

  return `In ${diffDays} days`;

}

export default function ManageAppointmentsScreen() {

  const { clinicId, clinicName, appointmentId } = useLocalSearchParams<{
    clinicId?: string;
    clinicName?: string;
    appointmentId?: string;
  }>();

  const { theme } = useClinicTheme(clinicId);
  const { width } = useWindowDimensions();
  const isMobile = width < 720;

  const [loading, setLoading] = React.useState(true);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [error, setError] = React.useState('');

  const [cancelTarget, setCancelTarget] = React.useState<Appointment | null>(null);
  const [checkTarget, setCheckTarget] = React.useState<Appointment | null>(null);
  const [detailsTarget, setDetailsTarget] = React.useState<Appointment | null>(null);
  const [recordTarget, setRecordTarget] = React.useState<Appointment | null>(null);

  const [existingRecordAppointmentIds, setExistingRecordAppointmentIds] = React.useState<Set<string>>(new Set());
  const [onboardingReviews, setOnboardingReviews] = React.useState<OnboardingReview[]>([]);

  const [savingAction, setSavingAction] = React.useState(false);
  const [savingValidation, setSavingValidation] = React.useState(false);
  const [pendingCorrection, setPendingCorrection] = React.useState<'partially_agree' | 'disagree' | null>(null);
  const [pendingOwnAssessment, setPendingOwnAssessment] = React.useState<'routine' | 'urgent' | 'emergency' | null>(null);
  const [attendanceAction, setAttendanceAction] = React.useState<'present' | 'missed' | null>(null);
  const [sortBy, setSortBy] = React.useState<AppointmentSort>('default');
  const [canChangeClinic, setCanChangeClinic] = React.useState(false);
  const [resolvedClinicName, setResolvedClinicName] = React.useState('');

  const [recordTitle, setRecordTitle] = React.useState('');
  const [recordCategory, setRecordCategory] = React.useState('Consultation');
  const [recordSymptoms, setRecordSymptoms] = React.useState('');
  const [recordDiagnosis, setRecordDiagnosis] = React.useState('');
  const [recordTreatment, setRecordTreatment] = React.useState('');
  const [recordPrescription, setRecordPrescription] = React.useState('');
  const [recordRecommendations, setRecordRecommendations] = React.useState('');
  const [recordNotes, setRecordNotes] = React.useState('');
  const [recordBloodPressure, setRecordBloodPressure] = React.useState('');
  const [recordHeartRate, setRecordHeartRate] = React.useState('');
  const [recordTemperature, setRecordTemperature] = React.useState('');
  const [recordWeightKg, setRecordWeightKg] = React.useState('');
  const [recordHeightCm, setRecordHeightCm] = React.useState('');
  const [recordFollowUpDate, setRecordFollowUpDate] = React.useState('');

  const [pendingFiles, setPendingFiles] = React.useState<PendingFile[]>([]);
  const [savingRecord, setSavingRecord] = React.useState(false);

  const isDoctor = profile?.role === 'doctor';
  const canCheckIn = profile?.role === 'clinic_admin' || profile?.role === 'platform_admin';

  const canManage = profile?.role === 'doctor' || profile?.role === 'clinic_admin' || profile?.role === 'platform_admin';

  const resetRecordForm = () => {
    setRecordTitle('');
    setRecordCategory('Consultation');
    setRecordSymptoms('');
    setRecordDiagnosis('');
    setRecordTreatment('');
    setRecordPrescription('');
    setRecordRecommendations('');
    setRecordNotes('');
    setRecordBloodPressure('');
    setRecordHeartRate('');
    setRecordTemperature('');
    setRecordWeightKg('');
    setRecordHeightCm('');
    setRecordFollowUpDate('');
    setPendingFiles([]);
  };

  const closeRecordModal = () => {
    setRecordTarget(null);
    resetRecordForm();
  };

  const openCreateRecordModal = (appointment: Appointment) => {
    if (!isDoctor) {
      Alert.alert('Unavailable', 'Only doctors can create medical records.');
      return;
    }

    if (!appointment.patient_id) {
      Alert.alert('Missing patient', 'This appointment is not connected to a patient profile.');
      return;
    }

    if (existingRecordAppointmentIds.has(appointment.id)) {
      Alert.alert(
        'Medical record already exists',
        'You already created a medical record for this appointment.'
      );
      return;
    }

    setRecordTarget(appointment);
  };


  const getOnboardingReview = (appointmentIdToFind: string) => { return onboardingReviews.find((review) => review.appointment_id === appointmentIdToFind) || null; };

  const getUrgencyColor = (level?: string | null) => {
    switch (level) {
      case 'urgent':
        return {
          background: '#FEF2F2',
          border: '#FECACA',
          text: '#DC2626',
        };

      case 'moderate':
        return {
          background: '#FFF7ED',
          border: '#FED7AA',
          text: '#EA580C',
        };

      default:
        return {
          background: '#F0FDF4',
          border: '#BBF7D0',
          text: '#15803D',
        };
    }
  };

  const loadAppointments = async () => {

    try {
      setLoading(true);
      setError('');

      const { data: { user }, } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, email, first_name, last_name')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError || !profileData) {
        setError(profileError?.message || 'Profile not found.');
        return;
      }

      setProfile(profileData as Profile);

      if (profileData.role === 'clinic_admin' || profileData.role === 'doctor') {
        const clinicCount = await getUserClinicCount(user.id);
        setCanChangeClinic(clinicCount > 1);
      } else {
        setCanChangeClinic(false);
      }

      if (profileData.role === 'patient') {
        router.replace({
          pathname: '/my-appointments' as any,
          params: { clinicId, clinicName, appointmentId },
        });
        return;
      }

      let query = supabase
        .from('appointments')
        .select(`
          id,
          clinic_id,
          doctor_id,
          patient_id,
          appointment_date,
          start_time,
          end_time,
          status,
          patient_first_name,
          patient_last_name,
          insurance_method,
          insurance_details,
          notes,
          ai_triage_patient_note,
          ai_triage_summary,
          ai_triage_level,
          triage_session_id,
          ai_triage_validation,
          ai_triage_correction,
          doctor_own_assessment,
          doctors (
            id,
            first_name,
            last_name,
            specialty
          ),
          clinic_services (
            id,
            title,
            category,
            price_text,
            duration_minutes
          ),
          clinic_locations (
            id,
            name,
            address
          )
        `)
        .in('status', ['scheduled', 'rescheduled'])
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (profileData.role !== 'platform_admin') {
        if (!clinicId) {
          router.replace('/clinic-selection');
          return;
        }

        query = query.eq('clinic_id', clinicId);
      }

      if (profileData.role === 'doctor') {
        const { data: doctorData, error: doctorError } = await supabase
          .from('doctors')
          .select('id')
          .eq('clinic_id', clinicId)
          .or(`profile_id.eq.${user.id},email.eq.${profileData.email}`)
          .maybeSingle();

        if (doctorError || !doctorData) {
          setError('No doctor profile is connected to this account.');
          setAppointments([]);
          return;
        }

        query = query.eq('doctor_id', doctorData.id);
      }

      const { data, error: appointmentsError } = await query;

      if (appointmentsError) {
        setError(appointmentsError.message);
        return;
      }

      const mappedAppointments: Appointment[] = (data ?? []).map((item: any) => ({
        ...item,
        doctors: Array.isArray(item.doctors) ? item.doctors[0] ?? null : item.doctors,
        clinic_services: Array.isArray(item.clinic_services)
          ? item.clinic_services[0] ?? null
          : item.clinic_services,
        clinic_locations: Array.isArray(item.clinic_locations)
          ? item.clinic_locations[0] ?? null
          : item.clinic_locations,
      }));

      setAppointments(mappedAppointments);

      const appointmentIds = mappedAppointments.map((item) => item.id);

      if (appointmentIds.length > 0) {
        const [{ data: recordRows, error: recordLookupError }, { data: reviewRows, error: reviewLookupError }] = await Promise.all([
          supabase
            .from('patient_medical_records')
            .select('appointment_id')
            .in('appointment_id', appointmentIds),
          supabase
            .from('patient_onboarding_reviews')
            .select('*')
            .in('appointment_id', appointmentIds)
            .order('created_at', { ascending: false }),
        ]);

        if (recordLookupError)
          console.log('Existing records lookup error:', recordLookupError.message);
        if (reviewLookupError)
          console.log('Onboarding reviews lookup error:', reviewLookupError.message);

        setExistingRecordAppointmentIds(
          new Set(
            (recordRows ?? [])
              .map((item: any) => item.appointment_id)
              .filter(Boolean)
          )
        );

        setOnboardingReviews((reviewRows ?? []) as OnboardingReview[]);
      } else {
        setExistingRecordAppointmentIds(new Set());
        setOnboardingReviews([]);
      }
    } finally {
      setLoading(false);
    }

  };

  useEffect(() => {
    loadAppointments();
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId]);

  useEffect(() => {
    setPendingCorrection(null);
    setPendingOwnAssessment(null);
  }, [detailsTarget?.id]);

  useEffect(() => {
    const loadClinicName = async () => {
      if (!clinicId || clinicName) 
        return;

      const { data } = await supabase
        .from('clinics')
        .select('name')
        .eq('id', clinicId)
        .maybeSingle();

      setResolvedClinicName(data?.name || '');
    };

    loadClinicName();
  }, [clinicId, clinicName]);

  const sortedAppointments = useMemo(() => {

    const items = [...appointments];

    items.sort((a, b) => {
      if (appointmentId) {
        if (a.id === appointmentId) return -1;
        if (b.id === appointmentId) return 1;
      }

      const dateA = new Date(buildAppointmentDateTime(a)).getTime();
      const dateB = new Date(buildAppointmentDateTime(b)).getTime();
      const patientA = getPatientName(a).toLowerCase();
      const patientB = getPatientName(b).toLowerCase();
      const doctorA = getDoctorName(a.doctors).toLowerCase();
      const doctorB = getDoctorName(b.doctors).toLowerCase();
      const serviceA = (a.clinic_services?.title || '').toLowerCase();
      const serviceB = (b.clinic_services?.title || '').toLowerCase();

      switch (sortBy) {

        case 'date_desc':
          return dateB - dateA;
        case 'patient_asc':
          return patientA.localeCompare(patientB);
        case 'patient_desc':
          return patientB.localeCompare(patientA);
        case 'doctor_asc':
          return doctorA.localeCompare(doctorB);
        case 'doctor_desc':
          return doctorB.localeCompare(doctorA);
        case 'service_asc':
          return serviceA.localeCompare(serviceB);
        case 'service_desc':
          return serviceB.localeCompare(serviceA);
        case 'default':
        case 'date_asc':
        default:
          return dateA - dateB;

      }
    });

    return items;
  
  }, [appointments, appointmentId, sortBy]);

  const pickPendingFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false, });
    if (result.canceled || !result.assets?.[0]) 
      return;

    const file = result.assets[0];
    setPendingFiles((prev) => [...prev, { id: `${Date.now()}-${file.name}`, name: file.name, uri: file.uri, mimeType: file.mimeType ?? null }]);
  };

  const removePendingFile = (id: string) => { setPendingFiles((prev) => prev.filter((file) => file.id !== id)); };

  const saveMedicalRecord = async () => {
    if (!recordTarget) 
      return;

    const appointment = recordTarget;
    if (!appointment.patient_id) {
      Alert.alert('Missing patient', 'This appointment is not connected to a patient profile.');
      return;
    }

    if (!isDoctor) {
      Alert.alert('Unavailable', 'Only doctors can create medical records.');
      return;
    }

    if (existingRecordAppointmentIds.has(appointment.id)) {
      Alert.alert('Medical record already exists', 'You already created a medical record for this appointment.');
      return;
    }

    const toNull = (value: string) => {
      const clean = value.trim();
      return clean.length > 0 ? clean : null;
    };

    const toNumberOrNull = (value: string) => {
      const clean = value.trim();
      if (!clean) 
        return null;

      const parsed = Number(clean.replace(',', '.'));
      return Number.isFinite(parsed) ? parsed : null;
    };

    try {
      setSavingRecord(true);

      const { data: existingRecord, error: existingRecordError } = await supabase
        .from('patient_medical_records')
        .select('id')
        .eq('appointment_id', appointment.id)
        .maybeSingle();

      if (existingRecordError) {
        Alert.alert('Error', existingRecordError.message);
        return;
      }

      if (existingRecord?.id) {
        setExistingRecordAppointmentIds((prev) => new Set(prev).add(appointment.id));
        Alert.alert('Medical record already exists', 'You already created a medical record for this appointment.');
        return;
      }

      const bloodPressureValue = toNull(recordBloodPressure);
      if (bloodPressureValue && !/^\d{2,3}\/\d{2,3}$/.test(bloodPressureValue)) {
        Alert.alert('Invalid blood pressure', 'Use a format such as 120/80.');
        setSavingRecord(false);
        return;
      }

      const { data: createdRecord, error: recordError } = await supabase
        .from('patient_medical_records')
        .insert({
          clinic_id: appointment.clinic_id,
          patient_id: appointment.patient_id,
          doctor_id: appointment.doctor_id || null,
          appointment_id: appointment.id,
          title: recordTitle.trim() || `Medical record for ${getPatientName(appointment)}`,
          category: toNull(recordCategory),
          symptoms: toNull(recordSymptoms),
          diagnosis: toNull(recordDiagnosis),
          treatment_plan: toNull(recordTreatment),
          prescription: toNull(recordPrescription),
          recommendations: toNull(recordRecommendations),
          notes: toNull(recordNotes),
          blood_pressure: bloodPressureValue,
          heart_rate: toNumberOrNull(recordHeartRate),
          temperature: toNumberOrNull(recordTemperature),
          weight_kg: toNumberOrNull(recordWeightKg),
          height_cm: toNumberOrNull(recordHeightCm),
          follow_up_date: toNull(recordFollowUpDate),
        })
        .select('id')
        .single();

      if (recordError || !createdRecord?.id) {
        console.log('Medical record insert error:', recordError);
        Alert.alert('Error', recordError?.message || 'Could not create medical record.');
        return;
      }

      for (const file of pendingFiles) {
        try {
          const response = await fetch(file.uri);
          const blob = await response.blob();
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const extension = safeName.includes('.') ? safeName.split('.').pop() : 'file';
          const filePath = `${appointment.clinic_id}/${appointment.patient_id}/${createdRecord.id}/${Date.now()}-${safeName}`;

          const { error: uploadError } = await supabase.storage.from('patient-files').upload(filePath, blob, { contentType: file.mimeType || 'application/octet-stream', upsert: false, });
          if (uploadError) {
            console.log('Storage upload error:', uploadError);
            Alert.alert('Upload error', uploadError.message);
            continue;
          }

          const { data: publicUrlData } = supabase.storage.from('patient-files').getPublicUrl(filePath);

          const { error: fileError } = await supabase.from('patient_files').insert({
            clinic_id: appointment.clinic_id,
            patient_id: appointment.patient_id,
            doctor_id: appointment.doctor_id || null,
            appointment_id: appointment.id,
            medical_record_id: createdRecord.id,
            title: file.name,
            description: 'Uploaded with medical record.',
            file_url: publicUrlData.publicUrl,
            file_type: file.mimeType || extension || 'file',
            category: 'medical_record_file',
            uploaded_by: profile?.id ?? null,
          });

          if (fileError) {
            console.log('Patient file insert error:', fileError);
            Alert.alert('Database error', fileError.message);
          }
        } catch (uploadException: any) {
          console.log('Upload exception:', uploadException);
          Alert.alert('Upload error', uploadException?.message || 'Could not upload file.');
        }
      }

      setExistingRecordAppointmentIds((prev) => new Set(prev).add(appointment.id));
      Alert.alert('Success', 'Medical record saved successfully.');
      closeRecordModal();
    } finally {
      setSavingRecord(false);
    }
  };

  const createAppointmentNotification = async ( appointmentId: string, type: 'cancelled' | 'checked_in' | 'missed' ) => {
    console.log('CREATING NOTIFICATION:', { appointmentId, type, });
    const response = await supabase.functions.invoke('notifications', { body: { appointmentId, type, }, });
    console.log('NOTIFICATION FUNCTION RESPONSE:', JSON.stringify(response, null, 2));

    if (response.error) {
      console.log('Appointment notification invoke error:', response.error);
      return;
    }

    if (response.data?.error) {
      console.log('Appointment notification data error:', response.data.error);
      return;
    }

    console.log('NOTIFICATION CREATED SUCCESSFULLY');
  };

  const updateAppointmentStatus = async (
    appointment: Appointment,
    status: AppointmentStatus,
    successMessage: string
  ) => {
    try {
      setSavingAction(true);

      const updatePayload: Record<string, any> = { status, updated_at: new Date().toISOString(), };

      if (status === 'cancelled') {
        updatePayload.cancelled_at = new Date().toISOString();
      }

      if (status === 'checked_in' || status === 'missed') {
        updatePayload.checked_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('appointments')
        .update(updatePayload)
        .eq('id', appointment.id);

      if (updateError) {
        Alert.alert('Error', updateError.message);
        return;
      }

      if (status === 'cancelled' || status === 'checked_in' || status === 'missed')
        await createAppointmentNotification(appointment.id, status);

      setAppointments((prev) => prev.filter((item) => item.id !== appointment.id));
      setCancelTarget(null);
      setCheckTarget(null);
      setDetailsTarget(null);

      Alert.alert('Success', successMessage);
    } finally {
      setSavingAction(false);
      setAttendanceAction(null);
    }

  };

  const saveOwnAssessment = async (
    appointment: Appointment,
    level: 'routine' | 'urgent' | 'emergency'
  ) => {
    try {
      setSavingValidation(true);
      const { error } = await supabase
        .from('appointments')
        .update({ doctor_own_assessment: level })
        .eq('id', appointment.id);

      if (error) { 
        Alert.alert('Error', error.message); 
        return; 
      }

      setAppointments((prev) => prev.map((item) => item.id === appointment.id ? { ...item, doctor_own_assessment: level } : item));
      setDetailsTarget((prev) => prev?.id === appointment.id ? { ...prev, doctor_own_assessment: level } : prev);
      setPendingOwnAssessment(level);
    } finally {
      setSavingValidation(false);
    }
  };

  const saveTriageValidation = async (
    appointment: Appointment,
    validation: 'agree' | 'partially_agree' | 'disagree',
    correction?: 'routine' | 'urgent' | 'emergency'
  ) => {
    if (validation !== 'agree' && !correction) {
      setPendingCorrection(validation);
      return;
    }

    try {
      setSavingValidation(true);

      const updatePayload: Record<string, unknown> = { ai_triage_validation: validation };
      if (correction) 
        updatePayload.ai_triage_correction = correction;

      const { error } = await supabase
        .from('appointments')
        .update(updatePayload)
        .eq('id', appointment.id);

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      setAppointments((prev) => prev.map((item) => item.id === appointment.id ? { ...item, ai_triage_validation: validation, ai_triage_correction: correction ?? null } : item));
      setDetailsTarget((prev) => prev?.id === appointment.id ? { ...prev, ai_triage_validation: validation, ai_triage_correction: correction ?? null } : prev);
      setPendingCorrection(null);
      Alert.alert('Saved', 'Your triage assessment has been recorded. Thank you.');
    } finally {
      setSavingValidation(false);
    }
  };

  return (

    <>

      <ScrollView contentContainerStyle={styles.container} stickyHeaderIndices={[0]}>
        <ClinicNavbar
          clinicName={profile?.role === 'platform_admin' ? 'MedSync Platform' : clinicName || resolvedClinicName}
          clinicId={profile?.role === 'platform_admin' ? undefined : clinicId}
          primaryColor={theme.primary}
          roleLabel={
            profile?.role === 'doctor'
              ? 'Doctor'
              : profile?.role === 'platform_admin'
                ? 'Platform Admin'
                : 'Clinic Admin'
          }
          showRolePill={false}
          showBackButton
          onBackPress={() =>
            router.replace(
              profile?.role === 'doctor'
                ? {
                    pathname: '/main-doctor',
                    params: { clinicId, clinicName },
                  }
                : profile?.role === 'platform_admin'
                  ? '/main-platform-admin'
                  : {
                      pathname: '/main-clinic-admin',
                      params: { clinicId, clinicName },
                    }
            )
          }
          canChangeClinic={profile?.role === 'platform_admin' ? false : canChangeClinic}
          onChangeClinic={() => router.replace('/clinic-selection')}
        />

        <View style={[styles.hero, isMobile && styles.heroMobile, { backgroundColor: theme.soft, borderColor: theme.borderSoft }, ]}>
          <Text style={[styles.heroEyebrow, { color: theme.primary }]}>Manage Appointments</Text>
          <Text style={[styles.heroTitle, { color: theme.secondary }]}>Manage Clinic Appointments</Text>
          <Text style={styles.heroSubtitle}>Review appointments, oversee details, cancel, reschedule or create one medical record.</Text>

          <View style={[styles.heroControls, isMobile && styles.heroControlsMobile]}>
            <View style={[styles.sortWrap, isMobile && styles.sortWrapMobile]}>
              <DropdownMenu
                value={sortBy}
                onChange={(value) => setSortBy(value as AppointmentSort)}
                items={[
                  { label: 'Default', value: 'default' },
                  { label: 'Date ↑', value: 'date_asc' },
                  { label: 'Date ↓', value: 'date_desc' },
                  { label: 'Patient A-Z', value: 'patient_asc' },
                  { label: 'Patient Z-A', value: 'patient_desc' },
                  ...(!isDoctor
                    ? [
                        { label: 'Doctor A-Z', value: 'doctor_asc' },
                        { label: 'Doctor Z-A', value: 'doctor_desc' },
                      ]
                    : []),
                  { label: 'Service A-Z', value: 'service_asc' },
                  { label: 'Service Z-A', value: 'service_desc' },
                ]}
              />
            </View>
          </View>
        </View>

        {!!error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={20} color="#DC2626"/>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.primary}/>
          </View>
        ) : !canManage ? (
          <View style={styles.emptyCard}>
            <Ionicons name="lock-closed-outline" size={28} color={theme.primary}/>
            <Text style={styles.emptyTitle}>Access unavailable</Text>
            <Text style={styles.emptyText}>This page is available only for doctors and admins.</Text>
          </View>
        ) : sortedAppointments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-clear-outline" size={30} color={theme.primary}/>
            <Text style={styles.emptyTitle}>No active appointments</Text>
            <Text style={styles.emptyText}>There are no scheduled appointments yet.</Text>
          </View>
        ) : (
          <View style={styles.listWrap}>
            {sortedAppointments.map((appointment) => {
              const appointmentDateTime = buildAppointmentDateTime(appointment);
              const relativeLabel = getRelativeLabel(appointmentDateTime, appointment.status);
              const isMissed = relativeLabel === 'Missed';
              const hasNotes = Boolean(appointment.notes?.trim());
              const hasRecord = existingRecordAppointmentIds.has(appointment.id);

              return (

                <HoverCard
                  key={appointment.id}
                  pressableStyle={styles.appointmentItem}
                  cardStyle={[
                    styles.appointmentCard,
                    { borderColor: theme.primary },
                  ]}
                  withShadow
                  onPress={() => setDetailsTarget(appointment)}
                >
                  
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardBadgesRow}>
                      <View style={[styles.statusBadge, { backgroundColor: isMissed ? '#FFF1F2' : `${theme.primary}12` }, ]}>
                        <Ionicons
                          name={isMissed ? 'alert-circle-outline' : 'time-outline'}
                          size={17}
                          color={isMissed ? '#DC2626' : theme.primary}
                        />
                        <Text style={[styles.statusBadgeText, { color: isMissed ? '#DC2626' : theme.primary }, ]}>
                          {relativeLabel}
                        </Text>
                      </View>

                      {hasNotes && (
                        <View style={styles.notesWarning}>
                          <Ionicons name="warning-outline" size={16} color="#B45309"/>
                          <Text style={styles.notesWarningText}>Notes added</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.dateText}>{formatDateTime(appointmentDateTime)}</Text>
                  </View> 

                  <Text style={styles.serviceTitle}>{appointment.clinic_services?.title || 'Medical appointment'}</Text>
                  <Text style={styles.patientText}>Patient: {getPatientName(appointment)}</Text>

                  {!isDoctor && (
                    <Text style={styles.doctorText}>
                      {getDoctorName(appointment.doctors)}
                      {appointment.doctors?.specialty ? ` · ${appointment.doctors.specialty}` : ''}
                    </Text>
                  )}

                  <View style={styles.detailsBlock}>
                    <DetailRow
                      icon="location-outline"
                      label={appointment.clinic_locations?.name || 'Clinic location'}
                      value={appointment.clinic_locations?.address || ''}
                    />

                    <View style={styles.inlineDetailsRow}>
                      <View style={styles.inlineDetailItem}>
                        <DetailRow
                          icon="cash-outline"
                          label="Price"
                          value={appointment.clinic_services?.price_text || 'Not provided'}
                        />
                      </View>

                      <View style={styles.inlineDetailItem}>
                        <DetailRow
                          icon="time-outline"
                          label="Duration"
                          value={appointment.clinic_services?.duration_minutes ? `${appointment.clinic_services.duration_minutes} min` : 'Not provided'}
                        />
                      </View>
                    </View>

                    <DetailRow
                      icon="card-outline"
                      label="Insurance"
                      value={appointment.insurance_method ? INSURANCE_LABELS[appointment.insurance_method] || appointment.insurance_method : 'Not provided'}
                    />
                  </View>

                  <View style={styles.cardActions}>
                    <Pressable
                      style={[styles.primaryAction, { backgroundColor: theme.primary }]}
                      onPress={() =>
                        router.push({
                          pathname: '/book-appointment' as any,
                          params: {
                            clinicId,
                            clinicName,
                            appointmentId: appointment.id,
                            returnTo: 'manage-appointments',
                            returnRole: profile?.role,
                          },
                        })
                      }
                    >
                      <Text style={styles.primaryActionText}>Reschedule</Text>
                    </Pressable>

                    {isDoctor && (
                      <Pressable
                        style={[styles.recordAction, hasRecord && styles.disabledAction]}
                        onPress={() => openCreateRecordModal(appointment)}
                        disabled={hasRecord}
                      >
                        <Text numberOfLines={1} style={[styles.recordActionText, hasRecord && styles.disabledActionText]}>{hasRecord ? 'Created' : 'Record'}</Text>
                      </Pressable>
                    )}

                    <Pressable
                      style={styles.dangerAction}
                      onPress={() => setCancelTarget(appointment)}
                    >
                      <Text style={styles.dangerActionText}>Cancel</Text>
                    </Pressable>

                    {canCheckIn && (
                      <Pressable
                        style={styles.checkAction}
                        onPress={() => setCheckTarget(appointment)}
                      >
                        <Text numberOfLines={1} style={styles.checkActionText}>Check In</Text>
                      </Pressable>
                    )}
                  </View>

                </HoverCard>

              );
            })}
          </View>
        )}

      </ScrollView>

      <Modal visible={!!detailsTarget} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardLarge}>
            <View style={[styles.modalIconPrimary, { backgroundColor: `${theme.primary}14` }]}>
              <Ionicons name="calendar-outline" size={34} color={theme.primary}/>
            </View>

            <Text style={styles.modalTitle}>Appointment Details</Text>

            {detailsTarget && (
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator
              >
                <View style={styles.modalDetailsBlock}>
                  {!!detailsTarget.notes?.trim() && (
                    <View style={styles.modalWarningBox}>
                      <Ionicons name="warning-outline" size={18} color="#B45309"/>
                      <Text style={styles.modalWarningText}>
                        The patient left notes for this appointment.
                      </Text>
                    </View>
                  )}

                  <DetailRow
                    icon="calendar-outline"
                    label="Date and time"
                    value={formatDateTime(buildAppointmentDateTime(detailsTarget))}
                  />

                  <DetailRow
                    icon="list-outline"
                    label="Service"
                    value={detailsTarget.clinic_services?.title || 'Medical appointment'}
                  />

                  <DetailRow
                    icon="person-outline"
                    label="Patient"
                    value={getPatientName(detailsTarget)}
                  />

                  {!isDoctor && (
                    <DetailRow
                      icon="medkit-outline"
                      label="Doctor"
                      value={getDoctorName(detailsTarget.doctors)}
                    />
                  )}

                  <DetailRow
                    icon="location-outline"
                    label={detailsTarget.clinic_locations?.name || 'Clinic location'}
                    value={detailsTarget.clinic_locations?.address || 'Not provided'}
                  />

                  <DetailRow
                    icon="cash-outline"
                    label="Price"
                    value={detailsTarget.clinic_services?.price_text || 'Not provided'}
                  />

                  <DetailRow
                    icon="time-outline"
                    label="Duration"
                    value={
                      detailsTarget.clinic_services?.duration_minutes
                        ? `${detailsTarget.clinic_services.duration_minutes} min`
                        : 'Not provided'
                    }
                  />

                  <DetailRow
                    icon="card-outline"
                    label="Insurance"
                    value={
                      detailsTarget.insurance_method
                        ? INSURANCE_LABELS[detailsTarget.insurance_method] ||
                          detailsTarget.insurance_method
                        : 'Not provided'
                    }
                  />

                  {!!detailsTarget.insurance_details && (
                    <DetailRow
                      icon="document-text-outline"
                      label="Insurance details"
                      value={detailsTarget.insurance_details}
                    />
                  )}

                  <DetailRow
                    icon="chatbox-ellipses-outline"
                    label="Notes"
                    value={detailsTarget.notes?.trim() || 'No notes provided'}
                  />

                  {(() => {
                    const review = getOnboardingReview(detailsTarget.id);

                    if (!review) return null;

                    const urgencyColor = getUrgencyColor(review.urgency_level);

                    return (
                      <View style={styles.onboardingReviewCard}>
                        <View style={styles.onboardingReviewHeader}>
                          <Ionicons name="sparkles-outline" size={18} color={theme.primary}/>
                          <Text style={styles.onboardingReviewTitle}>AI intake review</Text>
                        </View>

                        <Text style={styles.onboardingReviewText}>{review.summary_for_doctor || 'No onboarding summary available.'}</Text>

                        {typeof review.completion_score === 'number' && (
                          <View style={styles.onboardingRecommendationBox}>
                            <Text style={styles.onboardingRecommendationTitle}>Intake completion score</Text>
                            <Text style={styles.onboardingRecommendationText}>
                              {review.completion_score}/100
                            </Text>
                          </View>
                        )}

                        <View style={styles.onboardingStatusGrid}>
                          <View style={[styles.onboardingStatusItem, { borderColor: urgencyColor.border, backgroundColor: urgencyColor.background }]}>
                            <Text style={[styles.onboardingStatusLabel, { color: urgencyColor.text }]}>Urgency</Text>
                            <Text style={[styles.onboardingStatusValue, { color: urgencyColor.text }]}>{(review.urgency_level || 'Routine').replaceAll('_', ' ')}</Text>
                          </View>

                          <View style={styles.onboardingStatusItem}>
                            <Text style={styles.onboardingStatusLabel}>Intake</Text>
                            <Text style={styles.onboardingStatusValue}>{review.form_valid ? 'Complete' : 'Needs Review'}</Text>
                          </View>

                          {review.requires_manual_review && (
                            <View style={[styles.onboardingStatusItem, styles.onboardingStatusWarning]}>
                              <Text style={[styles.onboardingStatusLabel, styles.onboardingStatusWarningText]}>Review</Text>
                              <Text style={[styles.onboardingStatusValue, styles.onboardingStatusWarningText]}>Required Manual</Text>
                            </View>
                          )}
                        </View>

                        {!!review.triage_recommendation && (
                          <View style={styles.onboardingRecommendationBox}>
                            <Text style={styles.onboardingRecommendationTitle}>Triage recommendation</Text>
                            <Text style={styles.onboardingRecommendationText}>{review.triage_recommendation}</Text>
                          </View>
                        )}

                        {!!review.missing_information?.length && (
                          <View style={styles.onboardingReviewList}>
                            <Text style={styles.onboardingReviewListTitle}>Missing information</Text>

                            {review.missing_information.map((item, index) => (
                              <Text key={`missing-${index}`} style={styles.onboardingReviewListItem}> • {item}</Text>
                            ))}
                          </View>
                        )}

                        {!!review.clarifying_questions?.length && (
                          <View style={styles.onboardingReviewList}>
                            <Text style={styles.onboardingReviewListTitle}>Questions to clarify beforehand</Text>

                            {review.clarifying_questions.map((item, index) => (
                              <Text key={`question-${index}`} style={styles.onboardingReviewListItem}> • {item}</Text>
                            ))}
                          </View>
                        )}

                        {!!review.urgency_flags?.length && (
                          <View style={styles.onboardingReviewList}>
                            <Text style={styles.onboardingReviewListTitle}>Urgency flags</Text>

                            {review.urgency_flags.map((item, index) => (
                              <Text key={`flag-${index}`} style={styles.onboardingReviewListItem}> • {item}</Text>
                            ))}
                          </View>
                        )}

                        {!!review.urgency_flags_structured?.length && (
                          <View style={styles.onboardingReviewList}>
                            <Text style={styles.onboardingReviewListTitle}>Structured urgency flags</Text>

                            {review.urgency_flags_structured.map((item, index) => (
                              <Text key={`structured-flag-${index}`} style={styles.onboardingReviewListItem}>
                                • {item.flag} ({item.severity}) - {item.reason}
                              </Text>
                            ))}
                          </View>
                        )}

                      </View>
                    );
                  })()}                            

                  {!!detailsTarget.ai_triage_summary?.trim() && (
                    <DetailRow
                      icon="sparkles-outline"
                      label="AI triage summary"
                      value={detailsTarget.ai_triage_summary}
                    />
                  )}

                  {isDoctor && !!detailsTarget.ai_triage_level && (() => {
                    const ownAssessment = pendingOwnAssessment || detailsTarget.doctor_own_assessment;
                    const isDone = !!detailsTarget.ai_triage_validation;

                    return (
                      <View style={styles.triageValidationCard}>
                        <View style={styles.triageValidationHeader}>
                          <Ionicons name="flask-outline" size={18} color="#6366F1"/>
                          <Text style={styles.triageValidationTitle}>AI Triage Evaluation</Text>
                        </View>

                        {isDone ? (
                          <>
                            <View style={styles.blindComparisonRow}>
                              <View style={styles.blindComparisonCell}>
                                <Text style={styles.blindComparisonLabel}>Your assessment</Text>
                                <Text style={[styles.blindComparisonValue, { color: '#334155' }]}>
                                  {(detailsTarget.doctor_own_assessment || 'not recorded').replaceAll('_', ' ')}
                                </Text>
                              </View>
                              <Ionicons name="swap-horizontal-outline" size={18} color="#94A3B8"/>
                              <View style={styles.blindComparisonCell}>
                                <Text style={styles.blindComparisonLabel}>AI assessment</Text>
                                <Text style={[styles.blindComparisonValue, { color: '#6366F1' }]}>
                                  {detailsTarget.ai_triage_level.replaceAll('_', ' ')}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.triageValidationResult}>
                              <Ionicons
                                name={detailsTarget.ai_triage_validation === 'agree' ? 'checkmark-circle' : 'alert-circle'}
                                size={16}
                                color={detailsTarget.ai_triage_validation === 'agree' ? '#15803D' : '#B45309'}
                              />
                              <Text style={[
                                styles.triageValidationResultText,
                                { color: detailsTarget.ai_triage_validation === 'agree' ? '#15803D' : '#B45309' }
                              ]}>
                                Verdict: {detailsTarget.ai_triage_validation?.replaceAll('_', ' ')}
                                {detailsTarget.ai_triage_correction ? ` - correct level: ${detailsTarget.ai_triage_correction}` : ''}
                              </Text>
                            </View>
                          </>
                        ) : !ownAssessment ? (
                          <>
                            <Text style={styles.triageValidationSubtitle}>
                              Step 1 of 2 - Before seeing the AI result, what level would YOU assign this case?
                            </Text>
                            <View style={styles.triageValidationButtons}>
                              {(
                                [
                                  { value: 'routine' as const, label: 'Routine', color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
                                  { value: 'urgent' as const, label: 'Urgent', color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
                                  { value: 'emergency' as const, label: 'Emergency', color: '#DC2626', bg: '#FFF1F2', border: '#FECDD3' },
                                ]
                              ).map((opt) => (
                                <Pressable
                                  key={opt.value}
                                  style={[styles.triageValidationBtn, { backgroundColor: opt.bg, borderColor: opt.border }]}
                                  onPress={() => saveOwnAssessment(detailsTarget, opt.value)}
                                  disabled={savingValidation}
                                >
                                  <Text style={[styles.triageValidationBtnText, { color: opt.color }]}>{opt.label}</Text>
                                </Pressable>
                              ))}
                            </View>
                          </>
                        ) : (
                          <>
                            <View style={styles.blindComparisonRow}>
                              <View style={styles.blindComparisonCell}>
                                <Text style={styles.blindComparisonLabel}>Your assessment</Text>
                                <Text style={[styles.blindComparisonValue, { color: '#334155' }]}>
                                  {ownAssessment}
                                </Text>
                              </View>
                              <Ionicons name="swap-horizontal-outline" size={18} color="#94A3B8"/>
                              <View style={styles.blindComparisonCell}>
                                <Text style={styles.blindComparisonLabel}>AI assessment</Text>
                                <Text style={[styles.blindComparisonValue, { color: '#6366F1' }]}>
                                  {detailsTarget.ai_triage_level}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.triageValidationSubtitle}>
                              Step 2 of 2 - How would you rate the AI&apos;s assessment?
                            </Text>
                            <View style={styles.triageValidationButtons}>
                              {(
                                [
                                  { value: 'agree' as const, label: 'Agree', icon: 'checkmark-circle-outline' as const, activeColor: '#15803D', activeBg: '#F0FDF4', activeBorder: '#BBF7D0' },
                                  { value: 'partially_agree' as const, label: 'Partially agree', icon: 'remove-circle-outline' as const, activeColor: '#B45309', activeBg: '#FFFBEB', activeBorder: '#FDE68A' },
                                  { value: 'disagree' as const, label: 'Disagree', icon: 'close-circle-outline' as const, activeColor: '#DC2626', activeBg: '#FFF1F2', activeBorder: '#FECDD3' },
                                ]
                              ).map((option) => (
                                <Pressable
                                  key={option.value}
                                  style={styles.triageValidationBtn}
                                  onPress={() => saveTriageValidation(detailsTarget, option.value)}
                                  disabled={savingValidation}
                                >
                                  <Ionicons name={option.icon} size={15} color="#64748B"/>
                                  <Text style={styles.triageValidationBtnText}>{option.label}</Text>
                                </Pressable>
                              ))}
                            </View>
                            {pendingCorrection && (
                              <View style={styles.triageCorrectionCard}>
                                <Text style={styles.triageCorrectionTitle}>What level was correct?</Text>
                                <View style={styles.triageValidationButtons}>
                                  {(
                                    [
                                      { value: 'routine' as const, label: 'Routine', color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
                                      { value: 'urgent' as const, label: 'Urgent', color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
                                      { value: 'emergency' as const, label: 'Emergency', color: '#DC2626', bg: '#FFF1F2', border: '#FECDD3' },
                                    ]
                                  ).map((opt) => (
                                    <Pressable
                                      key={opt.value}
                                      style={[styles.triageValidationBtn, { backgroundColor: opt.bg, borderColor: opt.border }]}
                                      onPress={() => saveTriageValidation(detailsTarget, pendingCorrection, opt.value)}
                                      disabled={savingValidation}
                                    >
                                      <Text style={[styles.triageValidationBtnText, { color: opt.color }]}>{opt.label}</Text>
                                    </Pressable>
                                  ))}
                                </View>
                              </View>
                            )}
                          </>
                        )}

                        <Text style={styles.triageValidationDisclaimer}>
                          Blind validation protocol - your independent assessment is recorded before AI result is revealed.
                        </Text>
                      </View>
                    );
                  })()}

                </View>
              </ScrollView>
            )}

            <View style={styles.detailsModalActions}>

            <Pressable
              style={[
                styles.detailsCloseButton,
                {
                  backgroundColor:
                    profile?.role === 'platform_admin' ? '#2563EB' : theme.primary,
                  borderColor:
                    profile?.role === 'platform_admin' ? '#2563EB' : theme.primary,
                },
              ]}
              onPress={() => setDetailsTarget(null)}
            >
              <Text style={styles.detailsCloseText}>Close</Text>
            </Pressable>

              {detailsTarget && isDoctor && (
                <Pressable
                  style={[
                    styles.detailsCreateButton,
                    {
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                    },
                  ]}
                  disabled={existingRecordAppointmentIds.has(detailsTarget.id)}
                  onPress={() => {
                    const appointment = detailsTarget;
                    setDetailsTarget(null);
                    openCreateRecordModal(appointment);
                  }}
                >
                  <Text style={styles.detailsCreateText}>{existingRecordAppointmentIds.has(detailsTarget.id) ? 'Record Created' : 'Create Record'}</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!recordTarget} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.recordModalCard}>
            <View style={[styles.modalIconPrimary, { backgroundColor: `${theme.primary}14` }]}>
              <Ionicons name="document-text-outline" size={34} color={theme.primary}/>
            </View>

            <Text style={styles.modalTitle}>Create Medical Record</Text>

            {recordTarget && (
              <Text style={styles.modalSmallSubtitle}>
                {getPatientName(recordTarget)} · {recordTarget.appointment_date}
              </Text>
            )}

            <ScrollView
              style={styles.recordModalScroll}
              contentContainerStyle={styles.recordModalScrollContent}
              showsVerticalScrollIndicator
            >
              <TextInput
                value={recordTitle}
                onChangeText={setRecordTitle}
                placeholder="Title"
                placeholderTextColor="#94A3B8"
                style={styles.input}
              />

              <TextInput
                value={recordCategory}
                onChangeText={setRecordCategory}
                placeholder="Category"
                placeholderTextColor="#94A3B8"
                style={styles.input}
              />

              <TextInput
                value={recordSymptoms}
                onChangeText={setRecordSymptoms}
                placeholder="Symptoms"
                placeholderTextColor="#94A3B8"
                style={[styles.input, styles.multilineInput]}
                multiline
              />

              <TextInput
                value={recordDiagnosis}
                onChangeText={setRecordDiagnosis}
                placeholder="Diagnosis"
                placeholderTextColor="#94A3B8"
                style={[styles.input, styles.multilineInput]}
                multiline
              />

              <TextInput
                value={recordTreatment}
                onChangeText={setRecordTreatment}
                placeholder="Treatment plan"
                placeholderTextColor="#94A3B8"
                style={[styles.input, styles.multilineInput]}
                multiline
              />

              <TextInput
                value={recordPrescription}
                onChangeText={setRecordPrescription}
                placeholder="Prescription"
                placeholderTextColor="#94A3B8"
                style={[styles.input, styles.multilineInput]}
                multiline
              />

              <TextInput
                value={recordRecommendations}
                onChangeText={setRecordRecommendations}
                placeholder="Recommendations"
                placeholderTextColor="#94A3B8"
                style={[styles.input, styles.multilineInput]}
                multiline
              />

              <View style={styles.inputGrid}>
                <TextInput
                  value={recordBloodPressure}
                  onChangeText={(text) => { const cleaned = text.replace(/[^0-9/]/g, ''); setRecordBloodPressure(cleaned); }}
                  placeholder="Blood pressure (e.g. 120/80)"
                  placeholderTextColor="#94A3B8"
                  style={[styles.input, styles.inputHalf]}
                />

                <TextInput
                  value={recordHeartRate}
                  onChangeText={setRecordHeartRate}
                  placeholder="Heart rate (e.g. 80)"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  style={[styles.input, styles.inputHalf]}
                />

                <TextInput
                  value={recordTemperature}
                  onChangeText={setRecordTemperature}
                  placeholder="Temperature in °C (e.g. 37)"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  style={[styles.input, styles.inputHalf]}
                />

                <TextInput
                  value={recordWeightKg}
                  onChangeText={setRecordWeightKg}
                  placeholder="Weight in kg (e.g. 65)"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  style={[styles.input, styles.inputHalf]}
                />

                <TextInput
                  value={recordHeightCm}
                  onChangeText={setRecordHeightCm}
                  placeholder="Height in cm (e.g. 150)"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  style={[styles.input, styles.inputHalf]}
                />

                <TextInput
                  value={recordFollowUpDate}
                  onChangeText={setRecordFollowUpDate}
                  placeholder="Follow-up date (YYYY-MM-DD)"
                  placeholderTextColor="#94A3B8"
                  style={[styles.input, styles.inputHalf]}
                />
              </View>

              <TextInput
                value={recordNotes}
                onChangeText={setRecordNotes}
                placeholder="Doctor notes"
                placeholderTextColor="#94A3B8"
                style={[styles.input, styles.multilineInput]}
                multiline
              />

              <View style={styles.uploadSection}>
                <Text style={styles.formSectionTitle}>Medical files</Text>
                <Text style={styles.formHelpText}>
                  Add documents such as lab results or other relevant files before saving the record.
                </Text>

                <Pressable
                  style={[styles.uploadButton, { borderColor: theme.primary }]}
                  onPress={pickPendingFile}
                >
                  <Ionicons name="cloud-upload-outline" size={17} color={theme.primary}/>
                  <Text style={[styles.uploadButtonText, { color: theme.primary }]}>Upload file</Text>
                </Pressable>

                {pendingFiles.length === 0 ? (
                  <Text style={styles.emptyFileText}>No files selected.</Text>
                ) : (
                  pendingFiles.map((file) => (
                    <View key={file.id} style={styles.pendingFileRow}>
                      <View style={styles.pendingFileTextWrap}>
                        <View style={styles.fileTitleRow}>
                          <Ionicons name="document-attach-outline" size={16} color="#64748B"/>
                          <Text style={styles.pendingFileTitle}>{file.name}</Text>
                        </View>
                      </View>

                      <Pressable
                        style={styles.removeFileButton}
                        onPress={() => removePendingFile(file.id)}
                      >
                        <Ionicons name="trash-outline" size={15} color="#BE123C"/>
                        <Text style={styles.removeFileText}>Remove</Text>
                      </Pressable>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>

            <View style={styles.recordModalActions}>
              <Pressable
                style={styles.recordCloseButton}
                onPress={closeRecordModal}
                disabled={savingRecord}
              >
                <Text style={styles.recordCloseText}>Close</Text>
              </Pressable>

              <Pressable
                style={[styles.recordSaveButton, { backgroundColor: theme.primary }]}
                onPress={saveMedicalRecord}
                disabled={savingRecord}
              >
                <Text style={styles.recordSaveText}>
                  {savingRecord ? 'Saving...' : 'Save Medical Record'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!cancelTarget} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconDanger}>
              <Ionicons name="alert-circle-outline" size={34} color="#DC2626"/>
            </View>

            <Text style={styles.modalTitle}>Cancel appointment?</Text>

            <Text style={styles.modalText}>This appointment will be cancelled and removed from the list.</Text>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setCancelTarget(null)}
                disabled={savingAction}
              >
                <Text style={styles.modalCancelText}>Keep appointment</Text>
              </Pressable>

              <Pressable
                style={[styles.modalConfirmDanger, savingAction && styles.disabledButton]}
                onPress={() =>
                  cancelTarget &&
                  updateAppointmentStatus(
                    cancelTarget,
                    'cancelled',
                    'Appointment cancelled successfully.'
                  )
                }
                disabled={savingAction}
              >
                <Text style={styles.modalConfirmText}>
                  {savingAction ? 'Cancelling...' : 'Yes, cancel'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!checkTarget} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconPrimary, { backgroundColor: `${theme.primary}14` }]}>
              <Ionicons name="person-circle-outline" size={34} color={theme.primary}/>
            </View>

            <Text style={styles.modalTitle}>Patient Attendance</Text>
            <Text style={styles.modalText}>Select whether the patient is present or not. After performing this action, the appointment will be archived from the active list.</Text>

            <View style={styles.modalActionsColumn}>
              <Pressable
                style={[styles.modalFullButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  if (!checkTarget) return;
                  setAttendanceAction('present');
                  updateAppointmentStatus(checkTarget, 'checked_in', 'Patient marked as checked in.');
                }}
                disabled={savingAction}
              >
                <Text style={styles.modalFullButtonText}>
                  {attendanceAction === 'present' ? 'Saving...' : 'Patient is present'}
                </Text>
              </Pressable>

              <Pressable
                style={styles.modalMissedButton}
                onPress={() => {
                  if (!checkTarget) return;
                  setAttendanceAction('missed');
                  updateAppointmentStatus(checkTarget, 'missed', 'Patient marked as missing.');
                }}
                disabled={savingAction}
              >
                <Text style={styles.modalMissedButtonText}>
                  {attendanceAction === 'missed' ? 'Saving...' : 'Patient is not present'}
                </Text>
              </Pressable>

              <Pressable
                style={styles.modalPlainButton}
                onPress={() => setCheckTarget(null)}
                disabled={savingAction}
              >
                <Text style={styles.modalPlainButtonText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </>

  );

}

function DetailRow({ icon, label, value, }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; }) {

  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={17} color="#64748B"/>
      <View style={styles.detailTextWrap}>
        <Text style={styles.detailLabel}>{label}</Text>
        {!!value && <Text style={styles.detailValue}>{value}</Text>}
      </View>
    </View>
  );

}

const styles = StyleSheet.create({

  container: {
    flexGrow: 1,
    backgroundColor: '#F8FAFC',
    padding: 24,
    gap: 18,
  },

  centered: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  hero: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
  },

  heroMobile: {
    alignItems: 'stretch',
  },

  heroEyebrow: {
    fontSize: 13,
    fontWeight: '900',
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

  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },

  errorText: {
    flex: 1,
    color: '#991B1B',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
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
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    textAlign: 'center',
    maxWidth: 460,
  },

  listWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },

  appointmentItem: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 360,
    minWidth: 280,
  },

  appointmentCard: {
    width: '100%',
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

  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 12,
  },

  cardBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  statusBadgeText: {
    fontSize: 13,
    fontWeight: '900',
  },

  dateText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '800',
  },

  notesWarning: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 11,
    paddingVertical: 7,
  },

  notesWarningText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '900',
  },

  serviceTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
  },

  patientText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#0F172A',
    fontWeight: '800',
    marginBottom: 4,
  },

  doctorText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    fontWeight: '700',
    marginBottom: 14,
  },

  detailsBlock: {
    gap: 10,
    marginBottom: 16,
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
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },

  detailValue: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 20,
    color: '#64748B',
  },

  inlineDetailsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },

  inlineDetailItem: {
    flex: 1,
    minWidth: 140,
  },

  cardActions: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    flexWrap: 'wrap',
  },

  primaryAction: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },

  dangerAction: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#FECDD3',
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  dangerActionText: {
    color: '#BE123C',
    fontWeight: '900',
    fontSize: 13,
  },

  recordAction: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  recordActionText: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 13,
  },

  disabledAction: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },

  disabledActionText: {
    color: '#94A3B8',
  },

  checkAction: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkActionText: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 13,
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
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
  },

  modalCardLarge: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
  },

  recordModalCard: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
  },

  modalDetailsBlock: {
    width: '100%',
    gap: 12,
  },

  modalWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 12,
  },

  modalWarningText: {
    flex: 1,
    color: '#B45309',
    fontSize: 13,
    fontWeight: '900',
  },

  modalIconDanger: {
    width: 72,
    height: 72,
    borderRadius: 999,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  modalIconPrimary: {
    width: 72,
    height: 72,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  modalTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },

  modalSmallSubtitle: {
    color: '#64748B',
    fontWeight: '800',
    marginBottom: 14,
    textAlign: 'center',
  },

  modalText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 20,
  },

  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },

  modalActionsColumn: {
    width: '100%',
    gap: 10,
  },

  modalCancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  modalCancelText: {
    color: '#0F172A',
    fontWeight: '800',
  },

  modalConfirmDanger: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
  },

  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  modalFullButton: {
    minHeight: 50,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },

  modalFullButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },

  modalMissedButton: {
    minHeight: 50,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },

  modalMissedButtonText: {
    color: '#BE123C',
    fontWeight: '900',
    fontSize: 14,
  },

  modalPlainButton: {
    minHeight: 46,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  modalPlainButtonText: {
    color: '#64748B',
    fontWeight: '800',
  },

  modalScroll: {
    width: '100%',
    maxHeight: 520,
    marginBottom: 18,
  },

  modalScrollContent: {
    paddingBottom: 6,
  },

  recordModalScroll: {
    width: '100%',
    maxHeight: 530,
  },

  recordModalScrollContent: {
    gap: 12,
    paddingBottom: 12,
  },

  disabledButton: {
    opacity: 0.7,
  },

  heroControls: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
    flexWrap: 'wrap',
    marginTop: 18,
  },

  heroControlsMobile: {
    flexDirection: 'column',
  },

  sortWrap: {
    width: 320,
    height: 64,
  },

  sortWrapMobile: {
    width: '100%',
    height: 64,
  },

  input: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },

  multilineInput: {
    minHeight: 78,
    textAlignVertical: 'top',
  },

  inputGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  inputHalf: {
    flex: 1,
    minWidth: 215,
  },

  formButton: {
    minHeight: 50,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  formButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },

  formSectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },

  formHelpText: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },

  uploadSection: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    padding: 16,
    gap: 12,
  },

  uploadButton: {
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  uploadButtonText: {
    fontWeight: '900',
    fontSize: 14,
  },

  emptyFileText: {
    color: '#94A3B8',
    fontWeight: '800',
    fontSize: 13,
  },

  pendingFileRow: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  pendingFileTextWrap: {
    flex: 1,
  },

  fileTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  pendingFileTitle: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 13,
  },

  removeFileButton: {
    minHeight: 36,
    borderRadius: 999,
    paddingHorizontal: 12,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  removeFileText: {
    color: '#BE123C',
    fontWeight: '900',
    fontSize: 12,
  },

  recordModalActions: {
    marginTop: 16,
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },

  recordCloseButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  recordCloseText: {
    color: '#0F172A',
    fontWeight: '900',
  },

  recordSaveButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  recordSaveText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  detailsModalActions: {
    marginTop: 16,
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },

  detailsCloseButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  detailsCloseText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  detailsCreateButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  detailsCreateText: {
    color: '#000000',
    fontWeight: '900',
  },

  onboardingReviewCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },

  onboardingReviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  onboardingReviewTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },

  onboardingReviewText: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '700',
  },

  onboardingReviewBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'capitalize',
  },

  onboardingStatusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
  },

  onboardingStatusItem: {
    flex: 1,
    minWidth: 145,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },

  onboardingStatusLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  onboardingStatusValue: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'capitalize',
  },

  onboardingStatusWarning: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },

  onboardingStatusWarningText: {
    color: '#C2410C',
  },

  onboardingRecommendationBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    gap: 6,
  },

  onboardingRecommendationTitle: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '900',
  },

  onboardingRecommendationText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },

  onboardingReviewList: {
    gap: 5,
  },

  onboardingReviewListTitle: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '900',
  },

  onboardingReviewListItem: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },

  triageValidationCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },

  triageValidationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  triageValidationTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },

  triageValidationSubtitle: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },

  triageValidationLevel: {
    color: '#0F172A',
    fontWeight: '900',
    textTransform: 'capitalize',
  },

  triageValidationResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  triageValidationResultText: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'capitalize',
  },

  triageValidationButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  triageValidationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },

  triageValidationBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#64748B',
  },

  triageValidationDisclaimer: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },

  triageCorrectionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },

  triageCorrectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },

  blindComparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },

  blindComparisonCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },

  blindComparisonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  blindComparisonValue: {
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'capitalize',
  },

});