import React, { useEffect, useState, useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Platform, } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { supabase } from '../src/lib/supabase';
import ClinicNavbar from '../src/common/ClinicNavbar';
import { useClinicTheme } from '../src/lib/clinicTheme';

type ClinicDetails = {

  about: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  opening_hours: string | null;
  emergency_text: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  map_embed_url: string | null;
  logo_url: string | null;
  hero_image_url: string | null;

};

function buildMapsEmbedUrl(query: string) {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;
}

function buildMapsOpenUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export default function ClinicInfoScreen() {

  const { clinicId, clinicName } = useLocalSearchParams<{
    clinicId?: string;
    clinicName?: string;
  }>();

  const { theme } = useClinicTheme(clinicId);

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<ClinicDetails | null>(null);
  const [mapSearch, setMapSearch] = useState('');
  const [activeMapQuery, setActiveMapQuery] = useState('');

  useEffect(() => {

    const load = async () => {
      if (!clinicId) return;

      setLoading(true);

      const { data } = await supabase
        .from('clinic_details')
        .select(`
          about,
          address,
          phone,
          email,
          opening_hours,
          emergency_text,
          hero_title,
          hero_subtitle,
          map_embed_url,
          logo_url,
          hero_image_url
        `)
        .eq('clinic_id', clinicId)
        .maybeSingle();

      setDetails(data ?? null);
      setLoading(false);
    };

    load();
  
  }, [clinicId]);

  useEffect(() => {

    if (!details) return;

    const defaultLocation =
      details.address?.trim() || clinicName || 'Bucharest, Romania';

    setMapSearch(defaultLocation);
    setActiveMapQuery(defaultLocation);

  }, [details, clinicName]);

  const mapUrl = useMemo(() => {

    if (activeMapQuery.trim()) {
      return buildMapsEmbedUrl(activeMapQuery.trim());
    }

    if (details?.map_embed_url) {
      return details.map_embed_url;
    }

    return buildMapsEmbedUrl(
      details?.address || clinicName || 'Bucharest, Romania'
    );

  }, [activeMapQuery, details?.map_embed_url, details?.address, clinicName]);

  const handleMapSearch = () => {
    const value = mapSearch.trim();
    if (!value) return;
    setActiveMapQuery(value);
  };

  const handleOpenMap = async () => {
    const query =
      activeMapQuery.trim() ||
      details?.address?.trim() ||
      clinicName ||
      'Bucharest, Romania';

    await Linking.openURL(buildMapsOpenUrl(query));
  };

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
        <View style={styles.heroLeft}>
          <Text style={[styles.heroEyebrow, { color: theme.primary }]}>
            Clinic Information
          </Text>

          <Text style={[styles.heroTitle, { color: theme.secondary }]}>
            {details?.hero_title || `Welcome to ${clinicName || 'your clinic'}`}
          </Text>

          <Text style={styles.heroSubtitle}>
            {details?.hero_subtitle ||
              'Explore the clinic story, contact details, schedule, and location in one place.'}
          </Text>

          <View style={styles.heroPills}>
            <View style={styles.heroPill}>
              <Ionicons name="location-outline" size={16} color={theme.primary}/>
              <Text style={[styles.heroPillText, { color: theme.primary }]}>
                Easy to find
              </Text>
            </View>

            <View style={styles.heroPill}>
              <Ionicons name="call-outline" size={16} color={theme.primary}/>
              <Text style={[styles.heroPillText, { color: theme.primary }]}>
                Direct contact
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.heroRight}>
          {!!details?.hero_image_url ? (
            <View style={styles.heroImageFrame}>
              <Image
                source={{ uri: details.hero_image_url }}
                style={styles.heroMediaImage}
                resizeMode="cover"
              />
            </View>
          ) : !!details?.logo_url ? (
            <View style={styles.heroLogoFrame}>
              <Image
                source={{ uri: details.logo_url }}
                style={styles.heroMediaImage}
                resizeMode="contain"
              />
            </View>
          ) : (
            <View
              style={[
                styles.heroFallback,
                { backgroundColor: `${theme.primary}12` },
              ]}
            >
              <Ionicons name="business-outline" size={42} color={theme.primary}/>
            </View>
          )}
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>About the Clinic</Text>
          <Text style={styles.panelText}>
            {details?.about || 'No clinic description added yet.'}
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Contact</Text>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color={theme.primary}/>
            <Text style={styles.infoText}>
              {details?.address || 'No address added yet.'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={18} color={theme.primary}/>
            <Text style={styles.infoText}>
              {details?.phone || 'No phone added yet.'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={18} color={theme.primary}/>
            <Text style={styles.infoText}>
              {details?.email || 'No email added yet.'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={18} color={theme.primary}/>
            <Text style={styles.infoText}>
              {details?.opening_hours || 'No opening hours added yet.'}
            </Text>
          </View>

          {!!details?.phone && (
            <Pressable
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              onPress={() => Linking.openURL(`tel:${details.phone}`)}
            >
              <Text style={styles.primaryButtonText}>Call Clinic</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Emergency Information</Text>
        <Text style={styles.panelText}>
          {details?.emergency_text || 'No emergency information added yet.'}
        </Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Clinic Map</Text>

        <View style={styles.mapControls}>
          <View style={styles.searchInputWrap}>
            <Ionicons name="search-outline" size={18} color="#64748B"/>
            <TextInput
              value={mapSearch}
              onChangeText={setMapSearch}
              placeholder="Search for a location on the map..."
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              onSubmitEditing={handleMapSearch}
              returnKeyType="search"
            />
          </View>

          <View style={styles.mapButtonsRow}>
            <Pressable
              style={[styles.mapButton, { backgroundColor: theme.primary }]}
              onPress={handleMapSearch}
            >
              <Text style={styles.mapButtonText}>Search</Text>
            </Pressable>

            <Pressable
              style={styles.mapSecondaryButton}
              onPress={handleOpenMap}
            >
              <Ionicons name="open-outline" size={16} color="#0F172A"/>
              <Text style={styles.mapSecondaryButtonText}>Open in Maps</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.mapWrap}>
          {Platform.OS === 'web' ? (
            <iframe
              src={mapUrl}
              style={styles.mapIframe as any}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Clinic Map"
            />
          ) : (
            <WebView source={{ uri: mapUrl }} style={styles.map}/>
          )}
        </View>
      </View>

    </ScrollView>

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
    borderRadius: 30,
    borderWidth: 1,
    padding: 24,
    flexDirection: 'row',
    gap: 20,
    flexWrap: 'wrap',
    alignItems: 'center',
  },

  heroLeft: {
    flex: 1.2,
    minWidth: 280,
  },

  heroRight: {
    flex: 0.8,
    minWidth: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroEyebrow: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },

  heroTitle: {
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 10,
  },

  heroSubtitle: {
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
    marginBottom: 16,
  },

  heroPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  heroPill: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  heroPillText: {
    fontSize: 13,
    fontWeight: '800',
  },

  heroLogoFrame: {
    width: 180,
    height: 180,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroImageFrame: {
    width: 220,
    height: 180,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  heroMediaImage: {
    width: '100%',
    height: '100%',
  },

  heroFallback: {
    width: 180,
    height: 180,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },

  panel: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 22,
  },

  panelTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 14,
  },

  panelText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
  },

  infoRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: '#334155',
  },

  primaryButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 8,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  mapControls: {
    gap: 12,
    marginBottom: 14,
  },

  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },

  mapButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },

  mapButton: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },

  mapButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },

  mapSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },

  mapSecondaryButtonText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 14,
  },

  mapWrap: {
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 320,
  },

  map: {
    flex: 1,
  },

  mapIframe: {
    width: '100%',
    height: '100%',
    borderWidth: 0,
  },

});