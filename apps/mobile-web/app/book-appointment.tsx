import React, { useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../src/lib/supabase';
import ClinicNavbar from '../src/common/ClinicNavbar';
import { useClinicTheme } from '../src/lib/clinicTheme';

type Location = {

  id: string;
  name: string;
  address: string | null;

};

type Doctor = {

  id: string;
  first_name: string;
  last_name: string;
  specialty: string | null;
  avatar_url: string | null;

};

type Service = {

  id: string;
  title: string;
  category: string | null;
  price_text: string | null;
  duration_minutes: number | null;

};

type Availability = {

  id: string;
  weekday: string;
  start_time: string;
  end_time: string;

};

type PatientProfile = {

  id: string;
  first_name: string | null;
  last_name: string | null;
  insurance_provider: string | null;

};

type UserRole = 'patient' | 'doctor' | 'clinic_admin' | 'platform_admin';

type InsuranceOption = {

  label: string;
  value: string;

};

type PendingFile = {

  id: string;
  name: string;
  uri: string;
  mimeType: string | null;

};

const WEEKDAYS = [

  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',

];

const WEEKDAY_TO_NUMBER: Record<string, number> = {

  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,

};

const INSURANCE_OPTIONS: InsuranceOption[] = [

  { label: 'Self pay', value: 'self_pay' },
  { label: 'Public insurance', value: 'public_insurance' },
  { label: 'Private insurance', value: 'private_insurance' },
  { label: 'Other', value: 'other' },

];

function getInsuranceLabel(value: string, customValue?: string) {

  if (value === 'other') 
    return customValue || 'Other';
  return INSURANCE_OPTIONS.find((item) => item.value === value)?.label || value || '-';

}

function getDoctorName(doctor?: Doctor | null) {

  if (!doctor) 
    return '';
  return `Dr. ${doctor.first_name || ''} ${doctor.last_name || ''}`.trim();

}

function getNextDatesForWeekday(weekday: number) {

  const today = new Date();
  const dates: Date[] = [];

  for (let i = 0; i < 90; i += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    if (date.getDay() === weekday) {
      dates.push(date);
    }

    if (dates.length === 5) 
      break;
  }

  return dates;

}

function formatDate(date: Date) {
  return date.toISOString().split('T')[0];
}

function buildDateTime(date: string, time: string) {
  return `${date}T${time}:00`;
}

function timeToMinutes(time: string) {

  const [hours, minutes] = time.slice(0, 5).split(':').map(Number);
  return hours * 60 + minutes;

}

function overlaps(startA: string, endA: string, startB: string, endB: string) {
  return (timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(endA) > timeToMinutes(startB));
}

function getOnboardingValue(note: string | null | undefined, label: string) {

  if (!note) 
    return '';

  const lines = String(note).split('\n');
  const prefix = `${label}:`;
  const found = lines.find((line) => line.toLowerCase().startsWith(prefix.toLowerCase()));

  return found ? found.slice(prefix.length).trim() : '';

}

export default function BookAppointmentScreen() {

  const { clinicId, clinicName, appointmentId, doctorId, serviceId, returnTo } =
    useLocalSearchParams<{
      clinicId?: string;
      clinicName?: string;
      appointmentId?: string;
      doctorId?: string;
      serviceId?: string;
      returnTo?: string;
    }>();

  const { theme } = useClinicTheme(clinicId);
  const { width } = useWindowDimensions();
  const isMobile = width < 720;
  const isReschedule = Boolean(appointmentId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successAppointmentId, setSuccessAppointmentId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [prefillDone, setPrefillDone] = useState(false);

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [existingPatientId, setExistingPatientId] = useState<string>('');
  const [userRole, setUserRole] = useState<UserRole>('patient');
  const [locations, setLocations] = useState<Location[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);

  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  const [bookedSlots, setBookedSlots] = useState<{ start_time: string; end_time: string | null }[]>([]);

  const [patientFirstName, setPatientFirstName] = useState('');
  const [patientLastName, setPatientLastName] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [customInsurance, setCustomInsurance] = useState('');
  const [patientNotes, setPatientNotes] = useState('');

  const [onboardingSymptoms, setOnboardingSymptoms] = useState('');
  const [onboardingMedications, setOnboardingMedications] = useState('');
  const [onboardingChronicConditions, setOnboardingChronicConditions] = useState('');
  const [onboardingMainConcern, setOnboardingMainConcern] = useState('');
  const [pendingOnboardingFiles, setPendingOnboardingFiles] = useState<PendingFile[]>([]);

  const stepsScrollRef = useRef<ScrollView | null>(null);
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const [insuranceDropdownOpen, setInsuranceDropdownOpen] = useState(false);
  const canEditOnboarding = userRole === 'patient';

  const steps = [

    'Location',
    'Doctor',
    'Service',
    'Date',
    'Time',
    'Personal Information',

  ];

  useEffect(() => {

    const load = async () => {
      try {
        setLoading(true);
        setError('');

        const { data: { user }, } = await supabase.auth.getUser();

        if (!user) {
          router.replace('/login');
          return;
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, insurance_provider, role')
          .eq('id', user.id)
          .maybeSingle();

        setProfile(profileData ?? null);
        setUserRole((profileData?.role as UserRole) ?? 'patient');
        setPatientFirstName(profileData?.first_name ?? '');
        setPatientLastName(profileData?.last_name ?? '');

        if (!isReschedule) {
          setInsuranceProvider(profileData?.insurance_provider ?? '');
        }

        const { data: locationData, error: locationError } = await supabase
          .from('clinic_locations')
          .select('id, name, address')
          .eq('clinic_id', clinicId)
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (locationError) {
          setError(locationError.message);
          return;
        }

        setLocations(locationData ?? []);
      } finally {
        setLoading(false);
      }
    };

    load();

  }, [clinicId, isReschedule]);

  useEffect(() => {

    const loadAppointmentForReschedule = async () => {
      if (!appointmentId) return;

      try {
        setLoading(true);
        setError('');

        const { data, error: appointmentError } = await supabase
          .from('appointments')
          .select(`
            id,
            clinic_id,
            location_id,
            doctor_id,
            service_id,
            patient_id,
            appointment_date,
            start_time,
            patient_first_name,
            patient_last_name,
            insurance_method,
            insurance_details,
            notes,
            ai_triage_patient_note
          `)
          .eq('id', appointmentId)
          .maybeSingle();

        if (appointmentError) {
          setError(appointmentError.message);
          return;
        }

        if (!data) {
          setError('Appointment not found.');
          return;
        }

        setSelectedLocationId(data.location_id);
        setSelectedDoctorId(data.doctor_id);
        setSelectedServiceId(data.service_id);
        setExistingPatientId(data.patient_id || '');
        setSelectedDate(data.appointment_date);
        setSelectedTime(String(data.start_time).slice(0, 5));
        setPatientFirstName(data.patient_first_name ?? '');
        setPatientLastName(data.patient_last_name ?? '');
        setInsuranceProvider(data.insurance_method ?? '');
        setPatientNotes(data.notes ?? '');
        setCustomInsurance(data.insurance_method === 'other' ? data.insurance_details ?? '' : '');
        setOnboardingMainConcern(getOnboardingValue(data.ai_triage_patient_note, 'Main concern'));
        setOnboardingSymptoms(getOnboardingValue(data.ai_triage_patient_note, 'Symptoms'));
        setOnboardingMedications(getOnboardingValue(data.ai_triage_patient_note, 'Medications'));
        setOnboardingChronicConditions(getOnboardingValue(data.ai_triage_patient_note, 'Chronic conditions'));

        setCurrentStep(0);
        setPrefillDone(true);
      } finally {
        setLoading(false);
      }
    };

    loadAppointmentForReschedule();

  }, [appointmentId]);

  useEffect(() => {

    const prefillFromParams = async () => {
      if (prefillDone || isReschedule || !clinicId || locations.length === 0) return;

      try {
        if (doctorId) {
          const { data } = await supabase
            .from('doctor_locations')
            .select('location_id')
            .eq('doctor_id', doctorId)
            .limit(1)
            .maybeSingle();

          if (data?.location_id) {
            setSelectedLocationId(data.location_id);
            setSelectedDoctorId(String(doctorId));
            setCurrentStep(serviceId ? 2 : 1);
          }

          setPrefillDone(true);
          return;
        }

        if (serviceId) {
          const { data: doctorServiceData } = await supabase
            .from('doctor_services')
            .select('doctor_id')
            .eq('service_id', serviceId)
            .limit(1)
            .maybeSingle();

          if (!doctorServiceData?.doctor_id) {
            setPrefillDone(true);
            return;
          }

          const { data: locationData } = await supabase
            .from('doctor_locations')
            .select('location_id')
            .eq('doctor_id', doctorServiceData.doctor_id)
            .limit(1)
            .maybeSingle();

          if (locationData?.location_id) {
            setSelectedLocationId(locationData.location_id);
            setSelectedDoctorId(doctorServiceData.doctor_id);
            setSelectedServiceId(String(serviceId));
            setCurrentStep(2);
          }
        }
      } finally {
        setPrefillDone(true);
      }
    };

    prefillFromParams();

  }, [clinicId, locations, doctorId, serviceId, prefillDone, isReschedule]);

  useEffect(() => {

    const loadDoctors = async () => {
      setDoctors([]);
      setServices([]);
      setAvailability([]);

      if (!selectedLocationId) 
        return;

      if (!doctorId && !serviceId && !isReschedule) {
        setSelectedDoctorId('');
        setSelectedServiceId('');
        setSelectedDate('');
        setSelectedTime('');
      }

      const { data, error: doctorsError } = await supabase
        .from('doctor_locations')
        .select(`
          doctor_id,
          doctors (
            id,
            first_name,
            last_name,
            specialty,
            avatar_url
          )
        `)
        .eq('location_id', selectedLocationId);

      if (doctorsError) {
        setError(doctorsError.message);
        return;
      }

      const mapped = data?.map((item: any) => item.doctors).filter(Boolean) ?? [];
      setDoctors(mapped);

      if (doctorId && mapped.some((doctor: Doctor) => doctor.id === doctorId)) {
        setSelectedDoctorId(String(doctorId));
      }
    };

    loadDoctors();

  }, [selectedLocationId, doctorId, serviceId, isReschedule]);

  useEffect(() => {

    const loadServicesAndAvailability = async () => {
      setServices([]);
      setAvailability([]);

      if (!selectedDoctorId) 
        return;

      if (!serviceId && !isReschedule) {
        setSelectedServiceId('');
      }

      if (!isReschedule) {
        setSelectedDate('');
        setSelectedTime('');
      }

      const { data: serviceData, error: serviceError } = await supabase
        .from('doctor_services')
        .select(`
          service_id,
          clinic_services (
            id,
            title,
            category,
            price_text,
            duration_minutes
          )
        `)
        .eq('doctor_id', selectedDoctorId);

      if (serviceError) {
        setError(serviceError.message);
        return;
      }

      const mappedServices = serviceData?.map((item: any) => item.clinic_services).filter(Boolean) ?? [];

      setServices(mappedServices);

      if (serviceId && mappedServices.some((service: Service) => service.id === serviceId)) {
        setSelectedServiceId(String(serviceId));
      }

      const { data: availabilityData, error: availabilityError } = await supabase
        .from('doctor_availability')
        .select('id, weekday, start_time, end_time')
        .eq('doctor_id', selectedDoctorId)
        .eq('location_id', selectedLocationId)
        .eq('is_active', true)
        .order('weekday', { ascending: true })
        .order('start_time', { ascending: true });

      if (availabilityError) {
        setError(availabilityError.message);
        return;
      }

      setAvailability(availabilityData ?? []);
    };

    loadServicesAndAvailability();

  }, [selectedDoctorId, selectedLocationId, serviceId, isReschedule]);

  useEffect(() => {

    const loadBookedSlots = async () => {
      if (!selectedDoctorId || !selectedLocationId || !selectedDate) {
        setBookedSlots([]);
        return;
      }

    const { data, error: bookedSlotsError } = await supabase
      .from('appointments')
      .select('start_time, end_time')
      .eq('doctor_id', selectedDoctorId)
      .eq('location_id', selectedLocationId)
      .eq('appointment_date', selectedDate)
      .in('status', ['scheduled', 'checked_in'])
      .neq('id', appointmentId || '00000000-0000-0000-0000-000000000000');

      if (bookedSlotsError) {
        setError(bookedSlotsError.message);
        return;
      }

      setBookedSlots(data ?? []);
    };

    loadBookedSlots();

  }, [selectedDoctorId, selectedLocationId, selectedDate, appointmentId]);

  const selectedLocation = locations.find((item) => item.id === selectedLocationId);
  const selectedDoctor = doctors.find((item) => item.id === selectedDoctorId);
  const selectedService = services.find((item) => item.id === selectedServiceId);
  
  const dateOptions = useMemo(() => {
    return availability.flatMap((item) => {
      const weekdayNumber = WEEKDAY_TO_NUMBER[item.weekday];
      if (weekdayNumber === undefined) 
        return [];

      return getNextDatesForWeekday(weekdayNumber).map((date) => ({
        availabilityId: item.id,
        label: `${WEEKDAYS[weekdayNumber]} · ${formatDate(date)}`,
        value: formatDate(date),
        startTime: item.start_time.slice(0, 5),
        endTime: item.end_time.slice(0, 5),
      }));
    });
  }, [availability]);

  const selectedDateOption = dateOptions.find((item) => item.value === selectedDate);

  const timeOptions = useMemo(() => {
    if (!selectedDateOption) 
      return [];

    const times: string[] = [];
    const [startHour, startMinute] = selectedDateOption.startTime.split(':').map(Number);
    const [endHour, endMinute] = selectedDateOption.endTime.split(':').map(Number);

    const start = new Date();
    start.setHours(startHour, startMinute, 0, 0);

    const end = new Date();
    end.setHours(endHour, endMinute, 0, 0);

    const current = new Date(start);

    while (current < end) {
      times.push(`${String(current.getHours()).padStart(2, '0')}:${String(current.getMinutes()).padStart(2, '0')}`);
      current.setMinutes(current.getMinutes() + 30);
    }

    const duration = selectedService?.duration_minutes || 30;

    return times.filter((time) => {
      const candidateStart = time;
      const candidateEndDate = new Date(buildDateTime(selectedDate, time));

      candidateEndDate.setMinutes(candidateEndDate.getMinutes() + duration);

      const candidateEnd = `${String(candidateEndDate.getHours()).padStart(2, '0')}:${String(candidateEndDate.getMinutes()).padStart(2, '0')}`;

      return !bookedSlots.some((slot) => {
        const slotStart = String(slot.start_time).slice(0, 5);
        const slotEnd = slot.end_time ? String(slot.end_time).slice(0, 5) : slotStart;

        return overlaps(candidateStart, candidateEnd, slotStart, slotEnd);
      });
    });

  }, [selectedDateOption, bookedSlots, selectedDate, selectedService?.duration_minutes]);

  const completedSteps = [

    Boolean(selectedLocationId),
    Boolean(selectedDoctorId),
    Boolean(selectedServiceId),
    Boolean(selectedDate),
    Boolean(selectedTime),
    Boolean(patientFirstName.trim() && patientLastName.trim() && insuranceProvider.trim()),

  ];

  const progressPercent = ((currentStep + 1) / steps.length) * 100;

  useEffect(() => {
    Animated.timing(progressAnimation, {
      toValue: progressPercent,
      duration: 260,
      useNativeDriver: false,
    }).start();
  }, [progressPercent, progressAnimation]);

  useEffect(() => {
    if (!isMobile) return;

    stepsScrollRef.current?.scrollTo({
      x: Math.max(0, currentStep * 126 - 20),
      animated: true,
    });
  }, [currentStep, isMobile]);

  const animatedProgressWidth = progressAnimation.interpolate({inputRange: [0, 100], outputRange: ['0%', '100%'],});

  const canOpenStep = (index: number) => {
    if (index <= currentStep) return true;
    if (index === 1) return Boolean(selectedLocationId);
    if (index === 2) return Boolean(selectedLocationId && selectedDoctorId);
    if (index === 3) return Boolean(selectedLocationId && selectedDoctorId && selectedServiceId);
    if (index === 4) return Boolean(selectedLocationId && selectedDoctorId && selectedServiceId && selectedDate);
    if (index === 5) return Boolean(selectedLocationId && selectedDoctorId && selectedServiceId && selectedDate && selectedTime);
    return false;
  };

  const validateStep = () => {
    if (currentStep === 0 && !selectedLocationId) return 'Please select a clinic location.';
    if (currentStep === 1 && !selectedDoctorId) return 'Please select a doctor.';
    if (currentStep === 2 && !selectedServiceId) return 'Please select a service.';
    if (currentStep === 3 && !selectedDate) return 'Please select a date.';
    if (currentStep === 4 && !selectedTime) return 'Please select a time.';

    if (currentStep === 5) {
      if (!patientFirstName.trim()) return 'Please enter your first name.';
      if (!patientLastName.trim()) return 'Please enter your last name.';
      if (!insuranceProvider.trim()) return 'Please select your insurance option.';
      if (insuranceProvider === 'other' && !customInsurance.trim()) {
        return 'Please enter your insurance details.';
      }
    }

    return '';
  };

  const validateAll = () => {
    if (!selectedLocationId) return 'Please select a clinic location.';
    if (!selectedDoctorId) return 'Please select a doctor.';
    if (!selectedServiceId) return 'Please select a service.';
    if (!selectedDate) return 'Please select a date.';
    if (!selectedTime) return 'Please select a time.';
    if (!patientFirstName.trim()) return 'Please enter your first name.';
    if (!patientLastName.trim()) return 'Please enter your last name.';
    if (!insuranceProvider.trim()) return 'Please select your insurance option.';
    if (insuranceProvider === 'other' && !customInsurance.trim()) {
      return 'Please enter your insurance details.';
    }

    return '';
  };

  const handleStepPress = (index: number) => {
    if (!canOpenStep(index)) return;
    setError('');
    setCurrentStep(index);
  };

  const handleNext = () => {
    const stepError = validateStep();

    if (stepError) {
      setError(stepError);
      return;
    }

    setError('');
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setError('');
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const pickOnboardingFile = async () => {
    if (!canEditOnboarding) 
      return;

    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false, });
    if (result.canceled || !result.assets?.[0]) 
      return;

    const file = result.assets[0];

    setPendingOnboardingFiles((prev) => [...prev, { id: `${Date.now()}-${file.name}`, name: file.name, uri: file.uri, mimeType: file.mimeType ?? null, }, ]);
  };

  const removePendingOnboardingFile = (id: string) => { setPendingOnboardingFiles((prev) => prev.filter((file) => file.id !== id)); };

  const uploadOnboardingFiles = async ({ appointmentIdToAttach,patientIdToAttach, }: { appointmentIdToAttach: string; patientIdToAttach: string; }) => {
    if (!canEditOnboarding || pendingOnboardingFiles.length === 0 || !clinicId) 
      return;

    const { data: { user }, } = await supabase.auth.getUser();

    for (const file of pendingOnboardingFiles) {
      const response = await fetch(file.uri);
      const blob = await response.blob();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${clinicId}/${patientIdToAttach}/onboarding/${appointmentIdToAttach}/${Date.now()}-${safeName}`;
      
      const { error: uploadError } = await supabase.storage.from('patient-files').upload(filePath, blob, { contentType: file.mimeType || 'application/octet-stream', upsert: false, });
      if (uploadError)
        throw new Error(uploadError.message);

      const { data: publicUrlData } = supabase.storage.from('patient-files').getPublicUrl(filePath);

      const { error: fileError } = await supabase.from('patient_files').insert({
        clinic_id: clinicId,
        patient_id: patientIdToAttach,
        doctor_id: selectedDoctorId || null,
        appointment_id: appointmentIdToAttach,
        medical_record_id: null,
        title: file.name,
        description: 'Uploaded during patient onboarding.',
        file_url: publicUrlData.publicUrl,
        file_type: file.mimeType || 'file',
        category: 'onboarding_file',
        uploaded_by: user?.id ?? null,
      });
      if (fileError)
        throw new Error(fileError.message);
    }

    setPendingOnboardingFiles([]);
  };


  const generateOnboardingReview = async (appointmentIdToReview: string) => {
    const response = await supabase.functions.invoke('ai-onboarding', { body: { appointmentId: appointmentIdToReview, }, });
    console.log('AI ONBOARDING REVIEW RESPONSE:', JSON.stringify(response, null, 2));
    if (response.error)
      throw new Error(response.error.message || 'AI onboarding review failed.');
    if (response.data?.error)
      throw new Error(response.data.error);

    return response.data?.review;
  };

  const handleBook = async () => {

    const validationError = validateAll();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError('');

      const { data: { user }, } = await supabase.auth.getUser();

      if (!user || !profile) {
        router.replace('/login');
        return;
      }

      const appointmentEndDate = new Date(buildDateTime(selectedDate, selectedTime));
      const duration = selectedService?.duration_minutes || 30;

      appointmentEndDate.setMinutes(appointmentEndDate.getMinutes() + duration);

      const endTime = `${String(appointmentEndDate.getHours()).padStart(2, '0')}:${String(appointmentEndDate.getMinutes()).padStart(2, '0')}:00`;

      const onboardingPayload = canEditOnboarding ? { ai_triage_patient_note:
              [ onboardingMainConcern.trim() ? `Main concern: ${onboardingMainConcern.trim()}` : '',
                onboardingSymptoms.trim() ? `Symptoms: ${onboardingSymptoms.trim()}` : '',
                onboardingMedications.trim() ? `Medications: ${onboardingMedications.trim()}` : '',
                onboardingChronicConditions.trim() ? `Chronic conditions: ${onboardingChronicConditions.trim()}` : '',
              ].filter(Boolean).join('\n') || null, } : {};

      const finalPatientId = appointmentId ? existingPatientId : profile.id;

      const payload = {
        clinic_id: clinicId,
        patient_id: finalPatientId,
        doctor_id: selectedDoctorId,
        location_id: selectedLocationId,
        service_id: selectedServiceId,
        appointment_date: selectedDate,
        start_time: `${selectedTime}:00`,
        end_time: endTime,
        patient_first_name: patientFirstName.trim(),
        patient_last_name: patientLastName.trim(),
        insurance_method: insuranceProvider,
        insurance_details: insuranceProvider === 'other' ? customInsurance.trim() : null,
        notes: patientNotes.trim() || null,
        updated_by: user.id,
        ...onboardingPayload,
      };

      if (appointmentId) {
        const { data, error: updateError } = await supabase
          .from('appointments')
          .update({
            ...payload,
            status: 'rescheduled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', appointmentId)
          .select('id')
          .single();

        if (updateError) {
          setError(updateError.message);
          return;
        }

        await supabase.functions.invoke('notifications', { body: { appointmentId: data.id, type: 'rescheduled', }, });
        await uploadOnboardingFiles({ appointmentIdToAttach: data.id, patientIdToAttach: finalPatientId });
        try {
          await generateOnboardingReview(data.id);
        } catch (reviewError: any) {
          console.log('AI review failed:', reviewError);
          //setError(reviewError?.message || 'AI onboarding review failed.');
          //return;
        }

        setSuccessAppointmentId(data.id);
        return;
      }

      const { data, error: insertError } = await supabase
        .from('appointments')
        .insert({
          ...payload,
          status: 'scheduled',
          created_by: user.id,
        })
        .select('id')
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      await supabase.functions.invoke('notifications', { body: { appointmentId: data.id, type: 'created', }, });
      await uploadOnboardingFiles({ appointmentIdToAttach: data.id, patientIdToAttach: finalPatientId });
      await generateOnboardingReview(data.id);

      setSuccessAppointmentId(data.id);
    } finally {
      setSaving(false);
    }

  };

  const renderCurrentStep = () => {

    if (currentStep === 0) {
      return (
        <StepCard title="Choose location" icon="location-outline" color={theme.primary}>
          {locations.length === 0 ? (
            <EmptyInline text="There are no clinic locations yet."/>
          ) : (
            <View style={styles.optionGrid}>
              {locations.map((item) => (
                <OptionCard
                  key={item.id}
                  title={item.name}
                  subtitle={item.address || 'Clinic location'}
                  active={selectedLocationId === item.id}
                  color={theme.primary}
                  onPress={() => {
                    setSelectedLocationId(item.id);
                    setSelectedDoctorId('');
                    setSelectedServiceId('');
                    setSelectedDate('');
                    setSelectedTime('');
                  }}
                />
              ))}
            </View>
          )}
        </StepCard>
      );
    }

    if (currentStep === 1) {
      return (
        <StepCard title="Choose doctor" icon="medkit-outline" color={theme.primary}>
          {!selectedLocationId ? (
            <EmptyInline text="Please select a clinic location first."/>
          ) : doctors.length === 0 ? (
            <EmptyInline text="There are no doctors available for this location yet."/>
          ) : (
            <View style={styles.optionGrid}>
              {doctors.map((item) => (
                <OptionCard
                  key={item.id}
                  title={getDoctorName(item)}
                  subtitle={item.specialty || 'General Medicine'}
                  active={selectedDoctorId === item.id}
                  color={theme.primary}
                  onPress={() => {
                    setSelectedDoctorId(item.id);
                    setSelectedServiceId('');
                    setSelectedDate('');
                    setSelectedTime('');
                  }}
                />
              ))}
            </View>
          )}
        </StepCard>
      );
    }

    if (currentStep === 2) {
      return (
        <StepCard title="Choose service" icon="list-outline" color={theme.primary}>
          {!selectedDoctorId ? (
            <EmptyInline text="Please select a doctor first."/>
          ) : services.length === 0 ? (
            <EmptyInline text="There are no services available for this doctor yet."/>
          ) : (
            <View style={styles.optionGrid}>
              {services.map((item) => (
                <OptionCard
                  key={item.id}
                  title={item.title}
                  subtitle={`${item.category || 'Service'}${
                    item.price_text ? ` · ${item.price_text}` : ''
                  }${item.duration_minutes ? ` · ${item.duration_minutes} min` : ''}`}
                  active={selectedServiceId === item.id}
                  color={theme.primary}
                  onPress={() => {
                    setSelectedServiceId(item.id);
                    setSelectedDate('');
                    setSelectedTime('');
                  }}
                />
              ))}
            </View>
          )}
        </StepCard>
      );
    }

    if (currentStep === 3) {
      return (
        <StepCard title="Choose date" icon="calendar-outline" color={theme.primary}>
          {!selectedServiceId ? (
            <EmptyInline text="Please select a service first."/>
          ) : dateOptions.length === 0 ? (
            <EmptyInline text="There are no available appointment dates for this doctor yet."/>
          ) : (
            <View style={styles.optionGrid}>
              {dateOptions.map((item) => (
                <OptionCard
                  key={`${item.availabilityId}-${item.value}`}
                  title={item.label}
                  subtitle={`${item.startTime} - ${item.endTime}`}
                  active={selectedDate === item.value}
                  color={theme.primary}
                  onPress={() => {
                    setSelectedDate(item.value);
                    setSelectedTime('');
                  }}
                />
              ))}
            </View>
          )}
        </StepCard>
      );
    }

    if (currentStep === 4) {
      return (
        <StepCard title="Choose time" icon="time-outline" color={theme.primary}>
          {!selectedDate ? (
            <EmptyInline text="Please select a date first."/>
          ) : timeOptions.length === 0 ? (
            <EmptyInline text="There are no available time slots for this date."/>
          ) : (
            <View style={styles.timeGrid}>
              {timeOptions.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setSelectedTime(item)}
                  style={[
                    styles.timeChip,
                    selectedTime === item && {
                      backgroundColor: `${theme.primary}14`,
                      borderColor: theme.primary,
                    },
                  ]}
                >
                  <Text style={[styles.timeChipText, selectedTime === item && { color: theme.primary }, ]}>
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </StepCard>
      );
    }

    return (
      <StepCard title="Personal information" icon="person-outline" color={theme.primary}>
        <View style={styles.formRow}>
          <View style={styles.field}>
            <Text style={styles.label}>First name</Text>
            <TextInput
              value={patientFirstName}
              onChangeText={setPatientFirstName}
              placeholder="First name"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Last name</Text>
            <TextInput
              value={patientLastName}
              onChangeText={setPatientLastName}
              placeholder="Last name"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />
          </View>

          <View style={[styles.field, insuranceDropdownOpen && styles.dropdownFieldOpen]}>
            <Text style={styles.label}>Insurance option</Text>

            <Pressable
              style={styles.dropdownButton}
              onPress={() => setInsuranceDropdownOpen((prev) => !prev)}
            >
              <Text style={styles.dropdownButtonText}>
                {INSURANCE_OPTIONS.find((item) => item.value === insuranceProvider)?.label ||
                  'Select insurance'}
              </Text>
              <Ionicons
                name={insuranceDropdownOpen ? 'chevron-up-outline' : 'chevron-down-outline'}
                size={18}
                color="#64748B"
              />
            </Pressable>

            {insuranceDropdownOpen && (
               <View style={[styles.dropdownMenu, { zIndex: 99999, elevation: 99999 }]}>
                {INSURANCE_OPTIONS.map((item) => (
                  <Pressable
                    key={item.value}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setInsuranceProvider(item.value);
                      setInsuranceDropdownOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        insuranceProvider === item.value && { color: theme.primary },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>

        {insuranceProvider === 'other' && (
          <View style={styles.fieldFull}>
            <Text style={styles.label}>Insurance details</Text>
            <TextInput
              value={customInsurance}
              onChangeText={setCustomInsurance}
              placeholder="Write your insurance option"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />
          </View>
        )}

        <View style={styles.fieldFull}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            value={patientNotes}
            onChangeText={setPatientNotes}
            placeholder="Write any notes for the clinic..."
            placeholderTextColor="#94A3B8"
            multiline
            style={[styles.input, styles.textArea]}
          />
        </View>
        <View style={styles.onboardingCard}>
          <View style={styles.onboardingHeader}>
            <Ionicons name="sparkles-outline" size={18} color={theme.primary}/>
            <Text style={styles.onboardingTitle}>AI patient onboarding</Text>
          </View>

          <Text style={styles.onboardingText}>Complete these details so AI can validate the form and prepare a short summary for the doctor.</Text>

          {!canEditOnboarding && (
            <View style={styles.readOnlyBanner}>
              <Ionicons name="lock-closed-outline" size={16} color="#92400E"/>
              <Text style={styles.readOnlyBannerText}>Patient onboarding details are read-only for clinic staff.</Text>
            </View>
          )}

          <View style={styles.formRow}>
            <View style={styles.field}>
              <Text style={styles.label}>Main concern</Text>
              <TextInput
                value={onboardingMainConcern}
                onChangeText={setOnboardingMainConcern}
                placeholder="Main reason for visit"
                placeholderTextColor="#94A3B8"
                editable={canEditOnboarding}
                multiline
                style={[styles.input, styles.textArea, !canEditOnboarding && styles.readOnlyInput]}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Current symptoms</Text>
              <TextInput
                value={onboardingSymptoms}
                onChangeText={setOnboardingSymptoms}
                placeholder="Symptoms, severity, duration..."
                placeholderTextColor="#94A3B8"
                editable={canEditOnboarding}
                multiline
                style={[styles.input, styles.textArea, !canEditOnboarding && styles.readOnlyInput]}
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.field}>
              <Text style={styles.label}>Current medications</Text>
              <TextInput
                value={onboardingMedications}
                onChangeText={setOnboardingMedications}
                placeholder="Medication names and doses"
                placeholderTextColor="#94A3B8"
                editable={canEditOnboarding}
                multiline
                style={[styles.input, styles.textArea, !canEditOnboarding && styles.readOnlyInput]}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Chronic conditions / allergies</Text>
              <TextInput
                value={onboardingChronicConditions}
                onChangeText={setOnboardingChronicConditions}
                placeholder="Diseases, surgeries, relevant history"
                placeholderTextColor="#94A3B8"
                editable={canEditOnboarding}
                multiline
                style={[styles.input, styles.textArea, !canEditOnboarding && styles.readOnlyInput]}
              />
            </View>
          </View>

          <View style={styles.uploadCard}>
            <View style={styles.uploadHeader}>
              <Ionicons name="document-attach-outline" size={18} color={theme.primary}/>
              <Text style={styles.uploadTitle}>Onboarding files</Text>
            </View>

            <Text style={styles.onboardingText}>Upload bloodwork, imaging reports, PDFs or documents for the doctor.</Text>

            {pendingOnboardingFiles.length === 0 ? (
              <Text style={styles.emptyInline}>No files selected yet.</Text>
            ) : (
              pendingOnboardingFiles.map((file) => (
                <View key={file.id} style={styles.pendingFileRow}>
                  <View style={styles.pendingFileTextWrap}>
                    <Ionicons name="document-attach-outline" size={16} color="#64748B"/>
                    <Text style={styles.pendingFileName}>{file.name}</Text>
                  </View>

                  {canEditOnboarding && (
                    <Pressable style={styles.removeFileButton} onPress={() => removePendingOnboardingFile(file.id)}>
                      <Ionicons name="close-outline" size={16} color="#BE123C"/>
                      <Text style={styles.removeFileButtonText}>Remove</Text>
                    </Pressable>
                  )}
                </View>
              ))
            )}

            {canEditOnboarding ? (
              <Pressable style={[styles.uploadButton, { borderColor: theme.primary }]} onPress={pickOnboardingFile}>
                <Ionicons name="cloud-upload-outline" size={17} color={theme.primary}/>
                <Text style={[styles.uploadButtonText, { color: theme.primary }]}>Upload file</Text>
              </Pressable>
            ) : (
              <Text style={styles.readOnlySmallText}>Clinic staff can view onboarding files in patient history, but only patients can upload them here.</Text>
            )}
          </View>
        </View>
      </StepCard>
    );
  };

  const getRoleLabel = () => {
    if (userRole === 'doctor') return 'Doctor';
    if (userRole === 'clinic_admin') return 'Clinic Admin';
    if (userRole === 'platform_admin') return 'Platform Admin';
    return 'Patient';
  };

  const handleNavbarBack = () => {

    if (userRole === 'doctor') {
      router.replace({
        pathname: '/main-doctor' as any,
        params: { clinicId, clinicName },
      });
      return;
    }

    if (userRole === 'clinic_admin') {
      router.replace({
        pathname: '/main-clinic-admin' as any,
        params: { clinicId, clinicName },
      });
      return;
    }

    if (userRole === 'platform_admin') {
      router.replace({
        pathname: '/main-platform-admin' as any,
        params: { clinicId, clinicName },
      });
      return;
    }

    router.replace({
      pathname: '/main-patient' as any,
      params: { clinicId, clinicName },
    });

  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primary}/>
      </View>
    );
  }

  if (successAppointmentId) {
    const successTitle = appointmentId ? 'Appointment rescheduled' : 'Appointment booked';

    const successSubtitle = appointmentId ? 'Your appointment was updated successfully.' : 'Your appointment was created successfully.';

    return (

      <ScrollView contentContainerStyle={styles.container} stickyHeaderIndices={[0]}>

        <ClinicNavbar
          clinicName={clinicName}
          clinicId={clinicId}
          primaryColor={theme.primary}
          roleLabel={getRoleLabel()}
          showRolePill={false}
          showBackButton
          onBackPress={handleNavbarBack}
          onChangeClinic={() => router.replace('/clinic-selection')}
        />
        <View style={styles.successCard}>

          <View style={styles.successTopRow}>
            <View style={[styles.successTopBadge, { backgroundColor: `${theme.primary}14` }]}>
              <Ionicons name="checkmark-circle-outline" size={28} color={theme.primary}/>
              <Text style={[styles.successTopBadgeText, { color: theme.primary }]}>
                Confirmed
              </Text>
            </View>

            <Pressable
              style={[styles.successTopButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                if (returnTo === 'manage-appointments') {
                  router.replace({
                    pathname: '/manage-appointments' as any,
                    params: { clinicId, clinicName, appointmentId },
                  });
                  return;
                }
                router.replace({
                  pathname: '/my-appointments' as any,
                  params: { clinicId, clinicName },
                });
              }}
            >
              <Text style={styles.primaryButtonText}>View My Appointments</Text>
            </Pressable>
          </View>

          <Text style={styles.successTitle}>{successTitle}</Text>

          <Text style={styles.successText}>
            {successSubtitle} Here are your appointment details.
          </Text>

          <View style={styles.confirmationPanel}>

            <View style={styles.confirmationDetails}>
              <SummaryTile icon="business-outline" label="Clinic" value={String(clinicName || 'Clinic')}/>
              <SummaryTile icon="location-outline" label="Location" value={selectedLocation?.name || '-'}/>
              <SummaryTile icon="medkit-outline" label="Doctor" value={getDoctorName(selectedDoctor) || '-'}/>
              <SummaryTile icon="list-outline" label="Service" value={selectedService?.title || '-'}/>
              <SummaryTile icon="calendar-outline" label="Date" value={selectedDate}/>
              <SummaryTile icon="time-outline" label="Time" value={selectedTime}/>
              <SummaryTile icon="cash-outline" label="Price" value={selectedService?.price_text || '-'}/>
              <SummaryTile
                icon="card-outline"
                label="Insurance"
                value={getInsuranceLabel(insuranceProvider, customInsurance)}
              />
            </View>

            <View style={styles.notesBox}>
              <Ionicons name="document-text-outline" size={20} color="#64748B"/>
              <Text style={styles.notesLabel}>Notes</Text>
              <Text style={styles.notesText}>
                {patientNotes.trim() || 'No notes added.'}
              </Text>
            </View>
          </View>

        </View>

      </ScrollView>

    );

  }

  return (

    <ScrollView contentContainerStyle={styles.container} stickyHeaderIndices={[0]}>

      <ClinicNavbar
        clinicName={clinicName}
        clinicId={clinicId}
        primaryColor={theme.primary}
        roleLabel={getRoleLabel()}
        showRolePill={false}
        showBackButton
        onBackPress={handleNavbarBack}
        onChangeClinic={() => router.replace('/clinic-selection')}
      />
      <View
        style={[styles.hero, isMobile && styles.heroMobile, { backgroundColor: theme.soft, borderColor: theme.borderSoft },]}>
        <Text style={[styles.heroEyebrow, { color: theme.primary }]}>
          {appointmentId ? 'Reschedule Appointment' : 'Book Appointment'}
        </Text>

        <Text style={[styles.heroTitle, { color: theme.secondary }]}>
          Choose the details for your visit
        </Text>

        <Text style={styles.heroSubtitle}>
          Complete each step to schedule your appointment.
        </Text>
      </View>

      {!!error && (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={20} color="#DC2626"/>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.progressCard}>
        <Text style={styles.progressText}>
          Step {currentStep + 1} of {steps.length}
        </Text>

        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              { width: animatedProgressWidth, backgroundColor: theme.primary },
            ]}
          />
        </View>

        <ScrollView
          ref={stepsScrollRef}
          horizontal={isMobile}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.stepsRow, isMobile && styles.stepsRowMobile, ]}>
          {steps.map((step, index) => {
            const active = index === currentStep;
            const done = completedSteps[index];
            const enabled = canOpenStep(index);

            return (

              <Pressable
                key={step}
                disabled={!enabled}
                onPress={() => handleStepPress(index)}
                style={[
                  styles.stepPill,
                  active && {
                    backgroundColor: `${theme.primary}14`,
                    borderColor: theme.primary,
                  },
                  done &&
                    !active && {
                      backgroundColor: `${theme.primary}10`,
                      borderColor: `${theme.primary}55`,
                    },
                  !enabled && styles.stepPillDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.stepPillText,
                    (active || done) && { color: theme.primary },
                  ]}
                >
                  {step}
                </Text>
              </Pressable>

            );
          })}

        </ScrollView>
      </View>

      {renderCurrentStep()}

      <View style={styles.navigationRow}>
        {currentStep > 0 && (
          <Pressable style={styles.secondaryButton} onPress={handleBack}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>
        )}

        {currentStep < steps.length - 1 ? (
          <Pressable
            style={[styles.submitButton, { backgroundColor: theme.primary }]}
            onPress={handleNext}
          >
            <Text style={styles.submitButtonText}>Next</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[
              styles.submitButton,
              { backgroundColor: theme.primary },
              saving && styles.disabledButton,
            ]}
            onPress={handleBook}
            disabled={saving}
          >
            <Text style={styles.submitButtonText}>
              {saving
                ? 'Saving...'
                : appointmentId
                  ? 'Confirm Reschedule'
                  : 'Confirm Appointment'}
            </Text>
          </Pressable>
        )}
      </View>

    </ScrollView>

  );

}

function StepCard({
  title,
  icon,
  color,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  children: React.ReactNode;
}) {

  return (

    <View style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <Ionicons name={icon} size={20} color={color}/>
        <Text style={styles.stepTitle}>{title}</Text>
      </View>
      {children}
    </View>

  );

}

function OptionCard({
  title,
  subtitle,
  active,
  color,
  onPress,
}: {
  title: string;
  subtitle: string;
  active: boolean;
  color: string;
  onPress: () => void;
}) {

  return (

    <Pressable
      onPress={onPress}
      style={[
        styles.optionCard,
        active && {
          backgroundColor: `${color}12`,
          borderColor: color,
        },
      ]}
    >
      <Text style={styles.optionTitle}>{title}</Text>
      <Text style={styles.optionSubtitle}>{subtitle}</Text>
    </Pressable>

  );

}

function EmptyInline({ text }: { text: string }) {
  return <Text style={styles.emptyInline}>{text}</Text>;
}

function SummaryTile({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {

  return (

    <View style={styles.summaryTile}>
      <Ionicons name={icon} size={19} color="#64748B"/>
      <Text style={styles.summaryTileLabel}>{label}</Text>
      <Text style={styles.summaryTileValue}>{value || '-'}</Text>
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
    flex: 1,
    backgroundColor: '#F8FAFC',
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

  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 12,
  },

  progressText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },

  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 999,
  },

  stepsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  stepsRowMobile: {
    flexWrap: 'nowrap',
    paddingRight: 8,
  },

  stepPill: {
    flexGrow: 1,
    minWidth: 120,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepPillDisabled: {
    opacity: 0.55,
  },

  stepPillText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#64748B',
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

  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 22,
    gap: 16,
    overflow: 'visible',
  },

  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  stepTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },

  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  optionCard: {
    flex: 1,
    minWidth: 240,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },

  optionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
  },

  optionSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
  },

  emptyInline: {
    fontSize: 14,
    lineHeight: 22,
    color: '#64748B',
    fontWeight: '600',
  },

  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  timeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 11,
  },

  timeChipText: {
    color: '#334155',
    fontWeight: '800',
  },

  formRow: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
    overflow: 'visible',
    zIndex: 999,
  },

  field: {
    flex: 1,
    minWidth: 240,
    position: 'relative',
  },

  dropdownFieldOpen: {
    zIndex: 10000,
    elevation: 10000,
  },

  fieldFull: {
    width: '100%',
    zIndex: 1,
  },

  label: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
  },

  textArea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },

  insuranceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  insuranceChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  insuranceChipText: {
    color: '#334155',
    fontWeight: '800',
    fontSize: 13,
  },

  navigationRow: {
    flexDirection: 'row',
    gap: 12,
  },

  submitButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  secondaryButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  secondaryButtonText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },

  disabledButton: {
    opacity: 0.7,
  },

  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 26,
    alignItems: 'center',
  },

  successTopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },

  successTopBadgeText: {
    fontSize: 13,
    fontWeight: '900',
  },

  successTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 10,
  },

  successText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 22,
    maxWidth: 560,
  },

  successTopRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 18,
    flexWrap: 'wrap',
  },

  successTopButton: {
    minHeight: 48,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  confirmationPanel: {
    width: '100%',
    maxWidth: 780,
    alignSelf: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    gap: 18,
    marginBottom: 22,
  },

  confirmationIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  confirmationService: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },

  confirmationDate: {
    marginTop: 5,
    fontSize: 15,
    fontWeight: '800',
    color: '#64748B',
    textAlign: 'center',
  },

  confirmationDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },

  summaryTile: {
    width: 170,
    minHeight: 112,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryTileLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '900',
    color: '#64748B',
    textAlign: 'center',
  },

  summaryTileValue: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },

  notesBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    alignItems: 'center',
  },

  notesLabel: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '900',
    color: '#64748B',
    textAlign: 'center',
  },

  notesText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 22,
    color: '#334155',
    fontWeight: '600',
    textAlign: 'center',
  },

  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  summaryCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 10,
    marginBottom: 20,
  },

  primaryButton: {
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },

  dropdownButton: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  dropdownButtonText: {
    flex: 1,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },

  dropdownMenu: {
    position: 'absolute',
    top: 76,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    zIndex: 9999,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },

  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

  dropdownItemText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '800',
  },

  readOnlyBanner: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  readOnlyBannerText: {
    flex: 1,
    color: '#92400E',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
  },

  readOnlyInput: {
    backgroundColor: '#F8FAFC',
    color: '#64748B',
  },

  uploadCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },

  uploadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  uploadTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },

  pendingFileRow: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  pendingFileTextWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  pendingFileName: {
    flex: 1,
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
  },

  removeFileButton: {
    borderRadius: 999,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  removeFileButtonText: {
    color: '#BE123C',
    fontSize: 12,
    fontWeight: '900',
  },

  uploadButton: {
    minHeight: 46,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  uploadButtonText: {
    fontSize: 13,
    fontWeight: '900',
  },

  readOnlySmallText: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },

  onboardingCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    padding: 16,
    gap: 14,
  },

  onboardingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  onboardingTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '900',
  },

  onboardingText: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },

});