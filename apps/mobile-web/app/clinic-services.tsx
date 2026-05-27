import React, { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/lib/supabase';
import ClinicNavbar from '../src/common/ClinicNavbar';
import InfoSearchBar from '../src/common/InfoSearchBar';
import InfoImage from '../src/common/InfoImage';
import InfoModal from '../src/common/InfoModal';
import DropdownMenu from '../src/common/DropdownMenu';
import { useClinicTheme } from '../src/lib/clinicTheme';

type Service = {

  id: string;
  title: string;
  category: string | null;
  description: string | null;
  price_text: string | null;
  duration_minutes: number | null;
  image_url: string | null;

};

type ServiceSort = | 'default' | 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc';

function parsePrice(value?: string | null) {

  if (!value) return Number.MAX_SAFE_INTEGER;
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;

}

export default function ClinicServicesScreen() {

  const { clinicId, clinicName } = useLocalSearchParams<{
    clinicId?: string;
    clinicName?: string;
  }>();

  const { width } = useWindowDimensions();
  const isMobile = width < 720;
  const { theme } = useClinicTheme(clinicId);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState<ServiceSort>('default');
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const hasFilters = search.trim() || categoryFilter !== 'All';

  useEffect(() => {

    const load = async () => {
      if (!clinicId) return;

      setLoading(true);

      const { data } = await supabase
        .from('clinic_services')
        .select('id, title, category, description, price_text, duration_minutes, image_url')
        .eq('clinic_id', clinicId)
        .eq('is_active', true);

      setServices(data ?? []);
      setLoading(false);
    };

    load();
  
  }, [clinicId]);

  const categories = useMemo(() => {

    const values = Array.from(
      new Set(
        services
          .map((item) => item.category?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b));

    return ['All', ...values];

  }, [services]);

  const filtered = useMemo(() => {

    let items = [...services];

    const q = search.trim().toLowerCase();

    if (q) {
      items = items.filter((service) =>
      `${service.title} ${service.category || ''} ${service.description || ''} ${service.price_text || ''} ${service.duration_minutes ? `${service.duration_minutes} min` : ''}`          
          .toLowerCase()
          .includes(q)
      );
    }

    if (categoryFilter !== 'All') {
      items = items.filter((service) => service.category === categoryFilter);
    }

    switch (sortBy) {
      case 'name_asc':
        items.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'name_desc':
        items.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case 'price_asc':
        items.sort((a, b) => parsePrice(a.price_text) - parsePrice(b.price_text));
        break;
      case 'price_desc':
        items.sort((a, b) => parsePrice(b.price_text) - parsePrice(a.price_text));
        break;
      case 'default':
      default:
        break;
    }

    return items;

  }, [services, search, categoryFilter, sortBy]);

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

      <View
        style={[
          styles.hero,
          {
            backgroundColor: theme.soft,
            borderColor: theme.borderSoft,
          },
        ]}
      >
        <Text style={[styles.heroEyebrow, { color: theme.primary }]}>
          Services
        </Text>

        <Text style={[styles.heroTitle, { color: theme.secondary }]}>
          Services available in {clinicName || 'this clinic'}
        </Text>

        <Text style={styles.heroSubtitle}>
          Search for consultations, procedures and categories. Sort them by name or price.
        </Text>
      </View>

      <View style={[styles.topControls, isMobile && styles.topControlsMobile]}>
        <View style={styles.searchWrap}>
          <InfoSearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search for services..."
          />
        </View>

        <View style={[styles.sortWrap, isMobile && styles.sortWrapMobile]}>
          <DropdownMenu
            value={sortBy}
            onChange={(value) => setSortBy(value as ServiceSort)}
            items={[
              { label: 'Default', value: 'default' },
              { label: 'Name A-Z', value: 'name_asc' },
              { label: 'Name Z-A', value: 'name_desc' },
              { label: 'Price ↑', value: 'price_asc' },
              { label: 'Price ↓', value: 'price_desc' },
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
        {categories.map((item) => (
          <Pressable
            key={item}
            onPress={() => setCategoryFilter(item)}
            style={[
              styles.chip,
              categoryFilter === item && {
                backgroundColor: `${theme.primary}14`,
                borderColor: theme.borderSoft,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                categoryFilter === item && { color: theme.primary },
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
              name={hasFilters ? 'search-outline' : 'list-outline'}
              size={24}
              color={theme.primary}
            />

            <Text style={styles.emptyTitle}>
              {hasFilters ? 'No services found' : 'No services available right now'}
            </Text>

            <Text style={styles.emptyText}>
              {hasFilters
                ? 'Try another service name, category or clear your filters.'
                : 'This clinic has not added any services yet.'}
            </Text>
          </View>
        ) : (
        <View style={styles.grid}>
          {filtered.map((service) => (
            <InfoImage
              key={service.id}
              title={service.title}
              subtitle={`${service.category || 'Service'}${
                service.price_text ? ` · ${service.price_text}` : ''
              }`}
              description={service.description || 'No description added yet.'}
              imageUrl={service.image_url}
              icon="list-outline"
              color={theme.primary}
              onPress={() => setSelectedService(service)}
            />
          ))}
        </View>
      )}

      <InfoModal
        visible={!!selectedService}
        onClose={() => setSelectedService(null)}
        title={selectedService?.title || ''}
        subtitle={selectedService?.category || 'Service'}
        imageUrl={selectedService?.image_url}
        description={selectedService?.description || ''}
        color={theme.primary}
        sections={[
          { label: 'Price', value: selectedService?.price_text },
          { label: 'Duration', value: selectedService?.duration_minutes? `${selectedService.duration_minutes} min` : undefined,},
        ]}
        actions={[
          {
            label: 'Book Service',
            icon: 'calendar-outline',
            primary: true,
            onPress: () => {
              if (!selectedService) return;

              const selectedServiceId = selectedService.id;
              setSelectedService(null);

              router.push({
                pathname: '/book-appointment' as any,
                params: { clinicId, clinicName, serviceId: selectedServiceId },
              });
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

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
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