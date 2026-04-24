import React, { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/lib/supabase';
import ClinicNavbar from '../src/common/ClinicNavbar';
import InfoSearchBar from '../src/common/InfoSearchBar';
import InfoModal from '../src/common/InfoModal';
import SortDropdown from '../src/common/SortDropdown';
import { useClinicTheme } from '../src/lib/clinicTheme';

type Doctor = {

  id: string;
  first_name: string;
  last_name: string;
  specialty: string | null;
  bio: string | null;
  experience_years: number | null;
  phone: string | null;
  email: string | null;
  schedule_text: string | null;
  expertise: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  memberships: string | null;
  education: string | null;
  experience: string | null;

};

type DoctorSort = | 'default' | 'name_asc' | 'name_desc' | 'experience_asc' | 'experience_desc';

function getDoctorBaseName(doctor?: Doctor | null) {

  if (!doctor) 
    return '';
  return `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim();

}

function getDoctorDisplayName(doctor?: Doctor | null) {

  const name = getDoctorBaseName(doctor);
  return name ? `Dr. ${name}` : 'Dr.';

}

function DoctorRowCard({
  doctor,
  color,
  onPress,
}: {
  doctor: Doctor;
  color: string;
  onPress: () => void;
}) {

  const scale = React.useRef(new Animated.Value(1)).current;
  const translateY = React.useRef(new Animated.Value(0)).current;
  const shadow = React.useRef(new Animated.Value(0)).current;

  const animateIn = () => {

    if (Platform.OS !== 'web') return;

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

    if (Platform.OS !== 'web') return;

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
    outputRange: [0.04, 0.1],
  });

  const animatedShadowRadius = shadow.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 16],
  });

  return (

    <Pressable
      onPress={onPress}
      onHoverIn={animateIn}
      onHoverOut={animateOut}
      onPressIn={animateIn}
      onPressOut={animateOut}
    >

      {({ pressed }) => (

        <Animated.View
          style={[
            styles.doctorCard,
            {
              transform: [{ scale }, { translateY }],
              shadowOpacity: animatedShadowOpacity as any,
              shadowRadius: animatedShadowRadius as any,
            },
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.doctorRow}>
            <View style={styles.doctorImageWrap}>
              {!!doctor.avatar_url ? (
                <Image source={{ uri: doctor.avatar_url }} style={styles.doctorImage}/>
              ) : (
                <View
                  style={[
                    styles.doctorImageFallback,
                    { backgroundColor: `${color}10` },
                  ]}
                />
              )}
            </View>

            <View style={styles.doctorContent}>
              <Text style={styles.doctorName} numberOfLines={1}>
                {getDoctorDisplayName(doctor)}
              </Text>

              <Text style={styles.doctorMeta} numberOfLines={1}>
                {doctor.specialty || 'General Medicine'}
                {doctor.experience_years
                  ? ` · ${doctor.experience_years} yrs`
                  : ''}
              </Text>

              <Text style={styles.doctorDescription} numberOfLines={2}>
                {doctor.bio || doctor.expertise || 'No details added yet.'}
              </Text>

              <View style={styles.seeMoreRow}>
                <Text style={[styles.seeMore, { color }]}>See more</Text>
                <Ionicons name="arrow-forward" size={14} color={color}/>
              </View>
            </View>
          </View>
        </Animated.View>
      
      )}
    
    </Pressable>
  
  );

}

export default function ClinicDoctorsScreen() {

  const { clinicId, clinicName } = useLocalSearchParams<{
    clinicId?: string;
    clinicName?: string;
  }>();

  const { width } = useWindowDimensions();
  const isMobile = width < 720;
  const { theme } = useClinicTheme(clinicId);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('All');
  const [sortBy, setSortBy] = useState<DoctorSort>('default');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  const hasFilters = search.trim() || specialtyFilter !== 'All';

  useEffect(() => {

    const load = async () => {
      if (!clinicId) return;

      setLoading(true);

      const { data } = await supabase
        .from('doctors')
        .select(`
          id,
          first_name,
          last_name,
          specialty,
          bio,
          experience_years,
          phone,
          email,
          schedule_text,
          expertise,
          avatar_url,
          cover_image_url,
          memberships,
          education,
          experience
        `)
        .eq('clinic_id', clinicId)
        .eq('is_active', true);

      setDoctors(data ?? []);
      setLoading(false);
    };

    load();
  
  }, [clinicId]);

  const specialties = useMemo(() => {

    const values = Array.from(
      new Set(
        doctors
          .map((doctor) => doctor.specialty?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b));

    return ['All', ...values];

  }, [doctors]);

  const filtered = useMemo(() => {

    let items = [...doctors];

    const q = search.trim().toLowerCase();

    if (q) {
      items = items.filter((doctor) => `${doctor.first_name || ''} ${doctor.last_name || ''} ${getDoctorDisplayName(doctor)} ${doctor.specialty || ''} ${doctor.bio || ''} ${doctor.expertise || ''}`
          .toLowerCase()
          .includes(q)
      );
    }

    if (specialtyFilter !== 'All') {
      items = items.filter((doctor) => doctor.specialty === specialtyFilter);
    }

    switch (sortBy) {
      case 'name_asc':
        items.sort((a, b) => getDoctorBaseName(a).localeCompare(getDoctorBaseName(b)));
        break;
      case 'name_desc':
        items.sort((a, b) => getDoctorBaseName(b).localeCompare(getDoctorBaseName(a)));
        break;
      case 'experience_asc':
        items.sort((a, b) => (a.experience_years || 0) - (b.experience_years || 0));
        break;
      case 'experience_desc':
        items.sort((a, b) => (b.experience_years || 0) - (a.experience_years || 0));
        break;
      case 'default':
      default:
        break;
    }

    return items;

  }, [doctors, search, specialtyFilter, sortBy]);

  return (

    <ScrollView contentContainerStyle={styles.container} stickyHeaderIndices={[0]}>

      <ClinicNavbar
        clinicName={clinicName}
        clinicId={clinicId}
        primaryColor={theme.primary}
        roleLabel="Patient"
        showRolePill={false}
        onChangeClinic={() => router.replace('/clinic-selection')}
        showBackButton
        onBackPress={() =>
          router.replace({
            pathname: '/main-patient',
            params: { clinicId, clinicName },
          })
        }
      />

      <View style={[styles.hero, { backgroundColor: theme.soft, borderColor: theme.borderSoft }]}>
        <Text style={[styles.heroEyebrow, { color: theme.primary }]}>Doctors</Text>
        <Text style={[styles.heroTitle, { color: theme.secondary }]}>
          Meet the doctors in {clinicName || 'this clinic'}
        </Text>
        <Text style={styles.heroSubtitle}>
          Search by doctor name, specialty, or area of expertise.
        </Text>
      </View>

      <View style={[styles.topControls, isMobile && styles.topControlsMobile]}>
        <View style={styles.searchWrap}>
          <InfoSearchBar value={search} onChangeText={setSearch} placeholder="Search doctors..."/>
        </View>

        <View style={[styles.sortWrap, isMobile && styles.sortWrapMobile]}>
          <SortDropdown
            value={sortBy}
            onChange={(value) => setSortBy(value as DoctorSort)}
            items={[
              { label: 'Default', value: 'default' },
              { label: 'Name A-Z', value: 'name_asc' },
              { label: 'Name Z-A', value: 'name_desc' },
              { label: 'Experience low-high', value: 'experience_asc' },
              { label: 'Experience high-high', value: 'experience_desc' },
            ]}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersScrollContent}
      >
        {specialties.map((item) => (
          <Pressable
            key={item}
            onPress={() => setSpecialtyFilter(item)}
            style={[
              styles.chip,
              specialtyFilter === item && {
                backgroundColor: `${theme.primary}14`,
                borderColor: theme.borderSoft,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                specialtyFilter === item && { color: theme.primary },
              ]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary}/>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons
            name={hasFilters ? 'search-outline' : 'people-outline'}
            size={24}
            color={theme.primary}
          />

          <Text style={styles.emptyTitle}>
            {hasFilters ? 'No doctors found' : 'No doctors available right now'}
          </Text>

          <Text style={styles.emptyText}>
            {hasFilters
              ? 'Try another name, specialty, or clear your filters.'
              : 'This clinic has not added any doctors yet.'}
          </Text>
        </View>
      ) : (
        <View style={styles.listWrap}>
          {filtered.map((doctor) => (
            <DoctorRowCard
              key={doctor.id}
              doctor={doctor}
              color={theme.primary}
              onPress={() => setSelectedDoctor(doctor)}
            />
          ))}
        </View>
      )}

      <InfoModal
        visible={!!selectedDoctor}
        onClose={() => setSelectedDoctor(null)}
        title={getDoctorDisplayName(selectedDoctor)}
        subtitle={`${selectedDoctor?.specialty || 'General Medicine'}${selectedDoctor?.experience_years ? ` · ${selectedDoctor?.experience_years} years experience` : ''}`}
        imageUrl={selectedDoctor?.avatar_url || selectedDoctor?.cover_image_url}
        imageVariant="square-centered"
        description={selectedDoctor?.bio || ''}
        color={theme.primary}
        sections={[
          { label: 'Expertise', value: selectedDoctor?.expertise },
          { label: 'Email', value: selectedDoctor?.email },
          { label: 'Phone', value: selectedDoctor?.phone },
          { label: 'Schedule', value: selectedDoctor?.schedule_text },
          { label: 'Memberships', value: selectedDoctor?.memberships },
          { label: 'Education', value: selectedDoctor?.education },
          { label: 'Experience', value: selectedDoctor?.experience },
        ]}
        actions={[
          {
            label: 'Book appointment',
            icon: 'calendar-outline',
            primary: true,
            onPress: () => {
              if (!selectedDoctor) return;
              router.push({
                pathname: '/manage-appointments' as any,
                params: { clinicId, clinicName, doctorId: selectedDoctor.id },
              });
            },
          },
          {
            label: 'Chat with me',
            icon: 'chatbubble-ellipses-outline',
            onPress: () => {
              if (!selectedDoctor) return;
              router.push({
                pathname: '/chat-doctor' as any,
                params: { clinicId, clinicName, doctorId: selectedDoctor.id },
              });
            },
          },
          {
            label: 'Call doctor',
            icon: 'call-outline',
            onPress: () => {
              if (selectedDoctor?.phone) Linking.openURL(`tel:${selectedDoctor.phone}`);
            },
          },
        ]}
      />
    
    </ScrollView>
  
  );

}

const styles = StyleSheet.create({

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

  topControls: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
  },

  topControlsMobile: {
    flexDirection: 'column',
  },

  searchWrap: {
    flex: 1,
  },

  sortWrap: {
    width: 240,
  },

  sortWrapMobile: {
    width: '100%',
  },

  filtersScroll: {
    flexGrow: 0,
    alignSelf: 'flex-start',
  },

  filtersScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 2,
  },

  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  chipText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 13,
  },

  centered: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  listWrap: {
    gap: 14,
  },

  doctorCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    padding: 16,
  },

  doctorRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },

  doctorImageWrap: {
    width: 96,
    height: 96,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },

  doctorImage: {
    width: '100%',
    height: '100%',
  },

  doctorImageFallback: {
    flex: 1,
  },

  doctorContent: {
    flex: 1,
  },

  doctorName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },

  doctorMeta: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },

  doctorDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: '#64748B',
  },

  seeMoreRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  seeMore: {
    fontSize: 14,
    fontWeight: '800',
  },

  pressed: {
    opacity: 0.92,
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },

  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    textAlign: 'center',
  },

});