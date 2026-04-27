import React, { useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Animated, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/lib/supabase';
import ClinicNavbar from '../src/common/ClinicNavbar';
import SortDropdown from '../src/common/SortDropdown';
import { useClinicTheme } from '../src/lib/clinicTheme';

type AppointmentStatus =
  | 'scheduled'
  | 'rescheduled'
  | 'cancelled'
  | 'checked_in'
  | 'missed'
  | 'completed'
  | 'archived';

type AppointmentSort =
  | 'default'
  | 'date_asc'
  | 'date_desc'
  | 'price_asc'
  | 'price_desc'
  | 'doctor_asc'
  | 'doctor_desc'
  | 'service_asc'
  | 'service_desc';

type Appointment = {

  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string | null;
  status: AppointmentStatus;
  patient_first_name: string | null;
  patient_last_name: string | null;
  insurance_method: string | null;
  insurance_details: string | null;
  notes: string | null;

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

const INSURANCE_LABELS: Record<string, string> = {

  private_pay: 'Private pay',
  public_insurance: 'Public insurance',
  private_insurance: 'Private insurance',
  clinic_subscription: 'Clinic subscription',
  other: 'Other',

};

function getDoctorName(doctor: Appointment['doctors']) {

  if (!doctor) 
    return 'Doctor not assigned';
  return `Dr. ${doctor.first_name} ${doctor.last_name}`.trim();

}

function getPatientName(appointment: Appointment) {
  return `${appointment.patient_first_name || ''} ${appointment.patient_last_name || ''}`.trim();
}

function buildAppointmentDateTime(appointment: Appointment) {
  return `${appointment.appointment_date}T${appointment.start_time}`;
}

function formatDateTime(value: string) {

  const date = new Date(value);

  return date.toLocaleString(undefined, {
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

function parsePrice(value?: string | null) {

  if (!value) 
    return Number.MAX_SAFE_INTEGER;
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;

}

function getRelativeLabel(appointmentStart: string, status: AppointmentStatus) {

  if (status === 'cancelled') return 'Cancelled';
  if (status === 'missed') return 'Missed';
  if (status === 'completed') return 'Completed';
  if (status === 'checked_in') return 'Checked in';
  if (status === 'archived') return 'Archived';

  const today = startOfDay(new Date());
  const target = startOfDay(new Date(appointmentStart));

  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Missed';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';

  return `In ${diffDays} days`;

}

function getStatusIcon(label: string): keyof typeof Ionicons.glyphMap {

  if (label === 'Today') return 'sunny-outline';
  if (label === 'Tomorrow') return 'arrow-forward-circle-outline';
  if (label === 'Missed') return 'alert-circle-outline';
  if (label === 'Cancelled') return 'close-circle-outline';
  if (label === 'Completed') return 'checkmark-circle-outline';
  if (label === 'Checked in') return 'person-circle-outline';
  if (label === 'Archived') return 'archive-outline';
  return 'time-outline';

}

function AppointmentHoverCard({
  children,
  color,
  onPress,
}: {
  children: React.ReactNode;
  color: string;
  onPress: () => void;
}) {

  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const shadow = useRef(new Animated.Value(0)).current;

  const animateIn = () => {
  
    if (Platform.OS !== 'web') 
      return;

    Animated.parallel([

      Animated.spring(scale, {
        toValue: 1.015,
        useNativeDriver: false,
        friction: 8,
      }),
      Animated.spring(translateY, {
        toValue: -5,
        useNativeDriver: false,
        friction: 8,
      }),
      Animated.timing(shadow, {
        toValue: 1,
        duration: 180,
        useNativeDriver: false,
      }),

    ]).start();

  };

  const animateOut = () => {

    if (Platform.OS !== 'web') 
      return;

    Animated.parallel([

      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: false,
        friction: 8,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: false,
        friction: 8,
      }),
      Animated.timing(shadow, {
        toValue: 0,
        duration: 180,
        useNativeDriver: false,
      }),

    ]).start();

  };

  const animatedShadowOpacity = shadow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.04, 0.12],
  });

  const animatedShadowRadius = shadow.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 18],
  });

  return (

    <Pressable
      style={styles.appointmentItem}
      onPress={onPress}
      onHoverIn={animateIn}
      onHoverOut={animateOut}
      onPressIn={animateIn}
      onPressOut={animateOut}
    >
      <Animated.View
        style={[
          styles.appointmentCard,
          { borderColor: color },
          { transform: [{ scale }, { translateY }],
            shadowOpacity: animatedShadowOpacity as any,
            shadowRadius: animatedShadowRadius as any,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>

  );

}

export default function MyAppointmentsScreen() {

  const { clinicId, clinicName, appointmentId } = useLocalSearchParams<{
    clinicId?: string;
    clinicName?: string;
    appointmentId?: string;
  }>();

  const { theme } = useClinicTheme(clinicId);
  const { width } = useWindowDimensions();
  const isMobile = width < 720;

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState('');
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<Appointment | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [sortBy, setSortBy] = useState<AppointmentSort>('default');

  const loadAppointments = async () => {

    try {
      setLoading(true);
      setError('');

      const { data: { user }, } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      const { data, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          start_time,
          end_time,
          status,
          patient_first_name,
          patient_last_name,
          insurance_method,
          insurance_details,
          notes,
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
        .eq('clinic_id', clinicId)
        .eq('patient_id', user.id)
        .not('status', 'in', '("cancelled","completed","archived")')
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });

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
    } finally {
      setLoading(false);
    }

  };

  useEffect(() => {
    loadAppointments();
    //just to get rid of the warning
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId]);

  const sortedAppointments = useMemo(() => {

    const items = [...appointments];

    items.sort((a, b) => {

      if (appointmentId) {
        if (a.id === appointmentId) return -1;
        if (b.id === appointmentId) return 1;
      }

      const dateA = new Date(buildAppointmentDateTime(a)).getTime();
      const dateB = new Date(buildAppointmentDateTime(b)).getTime();
      const priceA = parsePrice(a.clinic_services?.price_text);
      const priceB = parsePrice(b.clinic_services?.price_text);
      const doctorA = getDoctorName(a.doctors).toLowerCase();
      const doctorB = getDoctorName(b.doctors).toLowerCase();
      const serviceA = (a.clinic_services?.title || '').toLowerCase();
      const serviceB = (b.clinic_services?.title || '').toLowerCase();

      switch (sortBy) {

        case 'date_desc':
          return dateB - dateA;

        case 'price_asc':
          return priceA - priceB;

        case 'price_desc':
          return priceB - priceA;

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

  const handleCancel = async () => {

    if (!cancelTarget) 
      return;

    try {
      setCancelling(true);

      const { data: { user }, } = await supabase.auth.getUser();

      const { error: cancelError } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          cancelled_by: user?.id ?? null,
          cancelled_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cancelTarget.id);

      if (cancelError) {
        Alert.alert('Error', cancelError.message);
        return;
      }

      setAppointments((prev) => prev.filter((item) => item.id !== cancelTarget.id));
      setCancelTarget(null);
      setDetailsTarget(null);

      Alert.alert('Appointment cancelled', 'Your appointment was cancelled successfully.');
    } finally {
      setCancelling(false);
    }

  };

  return (

    <>

      <ScrollView contentContainerStyle={styles.container} stickyHeaderIndices={[0]}>

        <ClinicNavbar
          clinicName={clinicName}
          clinicId={clinicId}
          primaryColor={theme.primary}
          roleLabel="Patient"
          showRolePill={false}
          showBackButton
          onBackPress={() =>
            router.replace({
              pathname: '/main-patient',
              params: { clinicId, clinicName },
            })
          }
          onChangeClinic={() => router.replace('/clinic-selection')}
        />

        <View
          style={[styles.hero, isMobile && styles.heroMobile, { backgroundColor: theme.soft, borderColor: theme.borderSoft },]}
        >
          <Text style={[styles.heroEyebrow, { color: theme.primary }]}>
            My Appointments
          </Text>

          <Text style={[styles.heroTitle, { color: theme.secondary }]}>
            Your clinic schedule
          </Text>

          <Text style={styles.heroSubtitle}>
            View upcoming visits, reschedule when needed, or cancel an appointment.
          </Text>

          <View style={[styles.heroControls, isMobile && styles.heroControlsMobile]}>
            <Pressable
              style={[styles.heroButton, isMobile && styles.heroButtonMobile, { backgroundColor: theme.primary }, ]}
              onPress={() =>
                router.push({
                  pathname: '/book-appointment' as any,
                  params: { clinicId, clinicName },
                })
              }
            >
              <Ionicons name="add-circle-outline" size={18} color="#FFFFFF"/>
              <Text style={styles.heroButtonText}>Book New Appointment</Text>
            </Pressable>

            <View style={[styles.sortWrap, isMobile && styles.sortWrapMobile]}>
              <SortDropdown
                value={sortBy}
                onChange={(value) => setSortBy(value as AppointmentSort)}
                items={[
                  { label: 'Default', value: 'default' },
                  { label: 'Date ↑', value: 'date_asc' },
                  { label: 'Date ↓', value: 'date_desc' },
                  { label: 'Price ↑', value: 'price_asc' },
                  { label: 'Price ↓', value: 'price_desc' },
                  { label: 'Doctor A-Z', value: 'doctor_asc' },
                  { label: 'Doctor Z-A', value: 'doctor_desc' },
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
        ) : sortedAppointments.length === 0 ? (
          <View style={[styles.emptyCard, isMobile && styles.emptyCardMobile]}>
            <Ionicons name="calendar-clear-outline" size={30} color={theme.primary}/>

            <Text style={[styles.emptyTitle, isMobile && styles.textLeft]}>
              No appointments yet
            </Text>

            <Text style={[styles.emptyText, isMobile && styles.emptyTextMobile]}>
              You do not have any active appointments. Book one whenever you are ready.
            </Text>

            <Pressable
              style={[styles.emptyButton, isMobile && styles.emptyButtonMobile, { backgroundColor: theme.primary }, ]}
              onPress={() =>
                router.push({
                  pathname: '/book-appointment' as any,
                  params: { clinicId, clinicName },
                })
              }
            >
              <Text style={styles.emptyButtonText}>Book an Appointment</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.listWrap}>
            {sortedAppointments.map((appointment) => {
              const appointmentDateTime = buildAppointmentDateTime(appointment);
              const relativeLabel = getRelativeLabel(appointmentDateTime, appointment.status);
              const isMissed = relativeLabel === 'Missed';
              const hasNotes = Boolean(appointment.notes?.trim());

              return (
                <AppointmentHoverCard
                  key={appointment.id}
                  color={theme.primary}
                  onPress={() => setDetailsTarget(appointment)}
                >

                  <View style={styles.cardTopRow}>
                    <View style={styles.cardBadgesRow}>
                      <View
                        style={[styles.statusBadge, { backgroundColor: isMissed ? '#FFF1F2' : `${theme.primary}12` }, ]}
                      >
                        <Ionicons
                          name={getStatusIcon(relativeLabel)}
                          size={17}
                          color={isMissed ? '#DC2626' : theme.primary}
                        />

                        <Text
                          style={[styles.statusBadgeText, { color: isMissed ? '#DC2626' : theme.primary }, ]}
                        >
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

                    <Text style={styles.dateText}>
                      {formatDateTime(appointmentDateTime)}
                    </Text>
                  </View>

                  <Text style={styles.serviceTitle}>
                    {appointment.clinic_services?.title || 'Medical appointment'}
                  </Text>

                  <Text style={styles.doctorText}>
                    {getDoctorName(appointment.doctors)}
                    {appointment.doctors?.specialty ? ` · ${appointment.doctors.specialty}` : ''}
                  </Text>

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
                          value={ appointment.clinic_services?.duration_minutes ? `${appointment.clinic_services.duration_minutes} min` : 'Not provided' }
                        />
                      </View>
                    </View>

                    <View style={styles.inlineDetailsRow}>
                      <View style={styles.inlineDetailItem}>
                        <DetailRow
                          icon="card-outline"
                          label="Insurance"
                          value={ appointment.insurance_method ? INSURANCE_LABELS[appointment.insurance_method] || appointment.insurance_method : 'Not provided' }
                        />
                      </View>

                      <View style={styles.inlineDetailItem}>
                        <DetailRow
                          icon="person-outline"
                          label="Patient"
                          value={getPatientName(appointment) || 'Not provided'}
                        />
                      </View>
                    </View>
                  </View>

                  <View style={[styles.cardActions, isMobile && styles.cardActionsMobile]}>
                    <Pressable
                      style={[styles.primaryAction, isMobile && styles.actionMobile, { backgroundColor: theme.primary }, ]}
                      onPress={() =>
                        router.push({
                          pathname: '/book-appointment' as any,
                          params: {
                            clinicId,
                            clinicName,
                            appointmentId: appointment.id,
                          },
                        })
                      }
                    >
                      <Text style={styles.primaryActionText}>Reschedule</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.dangerAction, isMobile && styles.actionMobile, ]}
                      onPress={() => setCancelTarget(appointment)}
                    >
                      <Text style={styles.dangerActionText}>Cancel</Text>
                    </Pressable>
                  </View>
                </AppointmentHoverCard>
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

            <Text style={styles.modalTitle}>Appointment details</Text>

            {detailsTarget && (
              <View style={styles.modalDetailsBlock}>
                {!!detailsTarget.notes?.trim() && (
                  <View style={styles.modalWarningBox}>
                    <Ionicons name="warning-outline" size={18} color="#B45309"/>
                    <Text style={styles.modalWarningText}>
                      You added notes for this appointment.
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
                  icon="medkit-outline"
                  label="Doctor"
                  value={getDoctorName(detailsTarget.doctors)}
                />

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
                  value={detailsTarget.clinic_services?.duration_minutes ? `${detailsTarget.clinic_services.duration_minutes} min` : 'Not provided' }
                />

                <DetailRow
                  icon="card-outline"
                  label="Insurance"
                  value={detailsTarget.insurance_method ? INSURANCE_LABELS[detailsTarget.insurance_method] || detailsTarget.insurance_method : 'Not provided'}
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
                  label="Notes / observations"
                  value={detailsTarget.notes?.trim() || 'No notes provided'}
                />
              </View>
            )}

            <Pressable
              style={[styles.modalFullButton, { backgroundColor: theme.primary }]}
              onPress={() => setDetailsTarget(null)}
            >
              <Text style={styles.modalFullButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>

      </Modal>

      <Modal visible={!!cancelTarget} transparent animationType="fade">

        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Ionicons name="alert-circle-outline" size={34} color="#DC2626"/>
            </View>

            <Text style={styles.modalTitle}>Are you sure?</Text>

            <Text style={styles.modalText}>
              This appointment will be cancelled and removed from your active appointment list.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setCancelTarget(null)}
                disabled={cancelling}
              >
                <Text style={styles.modalCancelText}>Keep appointment</Text>
              </Pressable>

              <Pressable
                style={[styles.modalConfirmButton, cancelling && styles.disabledButton]}
                onPress={handleCancel}
                disabled={cancelling}
              >
                <Text style={styles.modalConfirmText}>
                  {cancelling ? 'Cancelling...' : 'Yes, cancel'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

      </Modal>

    </>

  );

}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {

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
    marginBottom: 18,
  },

  heroControls: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
    flexWrap: 'wrap',
  },

  heroControlsMobile: {
    flexDirection: 'column',
  },

  heroButton: {
    width: 320,
    height: 55,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  heroButtonMobile: {
    width: '100%',
  },

  heroButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },

  sortWrap: {
    width: 320,
    height: 64,
  },

  sortWrapMobile: {
    width: '100%',
    height: 64,
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

  emptyCardMobile: {
    alignItems: 'stretch',
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },

  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    textAlign: 'center',
    maxWidth: 460,
  },

  emptyTextMobile: {
    textAlign: 'left',
    maxWidth: '100%',
  },

  textLeft: {
    textAlign: 'left',
  },

  emptyButton: {
    marginTop: 18,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyButtonMobile: {
    width: '100%',
  },

  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  listWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },

  appointmentItem: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 420,
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
    gap: 10,
    flexWrap: 'nowrap',
  },

  cardActionsMobile: {
    flexDirection: 'row',
  },

  primaryAction: {
    flex: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },

  dangerAction: {
    flex: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#FECDD3',
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  dangerActionText: {
    color: '#BE123C',
    fontWeight: '900',
    fontSize: 14,
  },

  actionMobile: {
    flex: 1,
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
    maxWidth: 560,
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
    marginBottom: 18,
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

  modalIcon: {
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

  modalConfirmButton: {
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

  disabledButton: {
    opacity: 0.7,
  },

});