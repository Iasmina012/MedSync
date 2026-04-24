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

type MapCoords = {

  latitude: number;
  longitude: number;

};

function buildGoogleMapsEmbedUrl(query: string) {
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

function buildMapsOpenUrl(query: string) {

  const encoded = encodeURIComponent(query);

  if (Platform.OS === 'ios') {
    return `http://maps.apple.com/?q=${encoded}`;
  }

  if (Platform.OS === 'android') {
    return `geo:0,0?q=${encoded}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encoded}`;

}

function buildLeafletHtml({
  latitude,
  longitude,
  title,
}: {
  latitude: number;
  longitude: number;
  title: string;
}) {

  const safeTitle = title.replace(/`/g, '').replace(/</g, '').replace(/>/g, '');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />
        <style>
          html, body, #map {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: #F8FAFC;
          }
          .leaflet-container {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>

        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
          const map = L.map('map', {
            zoomControl: true,
            attributionControl: true
          }).setView([${latitude}, ${longitude}], 15);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
          }).addTo(map);

          L.marker([${latitude}, ${longitude}])
            .addTo(map)
            .bindPopup('${safeTitle}')
            .openPopup();
        </script>
      </body>
    </html>
  `;

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
  const [mapCoords, setMapCoords] = useState<MapCoords>({
    latitude: 44.4268,
    longitude: 26.1025,
  });
  const [geocoding, setGeocoding] = useState(false);
  const [mapError, setMapError] = useState('');

  useEffect(() => {

    const load = async () => {
      if (!clinicId) {
        setLoading(false);
        return;
      }

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

  const geocodeLocation = async (query: string, showError = true) => {

    const trimmedQuery = query.trim();

    if (!trimmedQuery) return;

    try {
      setGeocoding(true);
      setMapError('');

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(trimmedQuery)}&email=contact@medsync.com`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'MedSync/1.0 contact@medsync.com',
          },
        }
      );

      const results = await response.json();

      if (!Array.isArray(results) || results.length === 0) {
        if (showError) {
          setMapError('No location found. Try a more specific address.');
        }
        return;
      }

      const firstResult = results[0];

      setMapCoords({
        latitude: Number(firstResult.lat),
        longitude: Number(firstResult.lon),
      });
      setActiveMapQuery(trimmedQuery);
    } catch {
      if (showError) {
        setMapError('Could not search this location right now.');
      }
    } finally {
      setGeocoding(false);
    }

  };

  useEffect(() => {

    const defaultLocation = details?.address?.trim() || clinicName || 'Bucharest, Romania';

    setMapSearch(defaultLocation);
    setActiveMapQuery(defaultLocation);

    if (Platform.OS !== 'web') {
      geocodeLocation(defaultLocation, false);
    }
  }, [details, clinicName]);

  const mapUrl = useMemo(() => {

    if (activeMapQuery.trim()) {
      return buildGoogleMapsEmbedUrl(activeMapQuery.trim());
    }

    if (details?.map_embed_url) {
      return details.map_embed_url;
    }

    return buildGoogleMapsEmbedUrl(details?.address || clinicName || 'Bucharest, Romania');

  }, [activeMapQuery, details?.map_embed_url, details?.address, clinicName]);

  const nativeMapHtml = useMemo(
    () =>
      buildLeafletHtml({
        latitude: mapCoords.latitude,
        longitude: mapCoords.longitude,
        title: activeMapQuery || details?.address || clinicName || 'Clinic location',
      }),
    [mapCoords.latitude, mapCoords.longitude, activeMapQuery, details?.address, clinicName]
  );

  const handleMapSearch = () => {
    const value = mapSearch.trim();

    if (!value) 
      return;

    if (Platform.OS === 'web') {
      setActiveMapQuery(value);
      return;
    }

    geocodeLocation(value);
  };

  const handleOpenMap = async () => {
    const query =
      activeMapQuery.trim() ||
      details?.address?.trim() ||
      clinicName ||
      'Bucharest, Romania';

    const primaryUrl = buildMapsOpenUrl(query);
    const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      query
    )}`;

    try {
      const supported = await Linking.canOpenURL(primaryUrl);

      if (supported) {
        await Linking.openURL(primaryUrl);
        return;
      }

      await Linking.openURL(fallbackUrl);
    } catch {
      try {
        await Linking.openURL(fallbackUrl);
      } catch {
        setMapError('Could not open maps on this device.');
      }
    }
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
        </View>

      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Emergency Information</Text>
        <Text style={styles.panelText}>
          {details?.emergency_text || 'No emergency information added yet.'}
        </Text>
      </View>

      <View style={styles.mapPanel}>
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
            {!!mapSearch.trim() && (
              <Pressable
                onPress={() => {
                  setMapSearch('');
                  setMapError('');
                }}
                style={({ pressed }) => [styles.clearSearchButton, pressed && styles.pressed]}
              >
                <Ionicons name="close-circle" size={20} color="#94A3B8"/>
              </Pressable>
            )}
          </View>

          <View style={styles.mapButtonsRow}>
            <Pressable
              style={[styles.mapButton, { backgroundColor: theme.primary }]}
              onPress={handleMapSearch}
              disabled={geocoding}
            >
              <Text style={styles.mapButtonText}>
                {geocoding ? 'Searching...' : 'Search'}
              </Text>
            </Pressable>

            <Pressable
              style={styles.mapSecondaryButton}
              onPress={handleOpenMap}
            >
              <Ionicons name="open-outline" size={16} color="#0F172A"/>
              <Text style={styles.mapSecondaryButtonText}>Open in Maps</Text>
            </Pressable>
          </View>

          {!!mapError && <Text style={styles.mapErrorText}>{mapError}</Text>}
        </View>

        <View style={styles.mapWrap}>
          {Platform.OS === 'web' ? (
            <iframe
              src={mapUrl}
              style={
                {
                  width: '100%',
                  height: '100%',
                  border: '0',
                  display: 'block',
                } as any
              }
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Clinic Map"
            />
          ) : (
            <WebView
              key={`${mapCoords.latitude}-${mapCoords.longitude}`}
              originWhitelist={['*']}
              source={{ html: nativeMapHtml }}
              style={styles.map}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
            />
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

  mapPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 22,
    overflow: 'hidden',
  },

  mapControls: {
    gap: 12,
    marginBottom: 18,
    width: '100%',
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
    alignItems: 'center',
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

  mapErrorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },

  mapWrap: {
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: Platform.OS === 'web' ? 560 : 360,
    width: '100%',
    backgroundColor: '#FFFFFF',
  },

  map: {
    flex: 1,
  },

  clearSearchButton: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pressed: {
    opacity: 0.7,
  },

});