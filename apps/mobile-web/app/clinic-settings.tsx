import React, { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Animated, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import ColorPicker, { HueSlider, Panel1, Preview } from 'reanimated-color-picker';
import ClinicNavbar from '../src/common/ClinicNavbar';
import { supabase } from '../src/lib/supabase';
import { requireRole } from '../src/lib/adminData';
import { useClinicTheme } from '../src/lib/clinicTheme';

type ClinicRow = {

  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  primary_color: string;
  secondary_color: string;
  soft_color: string;
  is_active: boolean;

};

type DetailsRow = {

  about: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  opening_hours: string | null;
  emergency_text: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  map_embed_url: string | null;
  logo_url: string | null;
  hero_image_url: string | null;
  cover_image_url: string | null;

};

type SectionKey = 'branding' | 'details' | 'homepage';

type EditingSection = {

  key: SectionKey;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;

};

type ImageField = 'logo_url' | 'hero_image_url' | 'cover_image_url';

const STORAGE_BUCKET = 'clinic-assets';

const EMPTY_DETAILS: DetailsRow = {

  about: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  opening_hours: '',
  emergency_text: '',
  hero_title: '',
  hero_subtitle: '',
  map_embed_url: '',
  logo_url: '',
  hero_image_url: '',
  cover_image_url: '',

};

const sections: EditingSection[] = [

  { key: 'branding', title: 'Branding', icon: 'color-palette-outline' },
  { key: 'details', title: 'Clinic Details', icon: 'business-outline' },
  { key: 'homepage', title: 'Homepage Content', icon: 'images-outline' },

];

function normalizeHex(value: string) {

  const clean = value.trim();
  if (!clean) 
    return '#FFFFFF';
  return clean.startsWith('#') ? clean.toUpperCase() : `#${clean.toUpperCase()}`;

}

function HoverCard({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress: () => void;
}) {

  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const shadow = useRef(new Animated.Value(0)).current;

  const animateIn = () => {
    if (Platform.OS !== 'web') 
      return;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1.015, useNativeDriver: false, friction: 8 }),
      Animated.spring(translateY, { toValue: -5, useNativeDriver: false, friction: 8 }),
      Animated.timing(shadow, { toValue: 1, duration: 180, useNativeDriver: false }),
    ]).start();
  };

  const animateOut = () => {
    if (Platform.OS !== 'web') 
      return;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: false, friction: 8 }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: false, friction: 8 }),
      Animated.timing(shadow, { toValue: 0, duration: 180, useNativeDriver: false }),
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
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ scale }, { translateY }],
            shadowOpacity: shadow.interpolate({
              inputRange: [0, 1],
              outputRange: [0.04, 0.12],
            }) as any,
            shadowRadius: shadow.interpolate({
              inputRange: [0, 1],
              outputRange: [8, 18],
            }) as any,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>

  );

}

export default function ClinicSettingsScreen() {

  const { clinicId, clinicName } = useLocalSearchParams<{
    clinicId?: string;
    clinicName?: string;
  }>();

  const { theme } = useClinicTheme(clinicId);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<ImageField | null>(null);
  const [editingSection, setEditingSection] = useState<EditingSection | null>(null);

  const [clinic, setClinic] = useState<ClinicRow | null>(null);
  const [details, setDetails] = useState<DetailsRow>(EMPTY_DETAILS);

  useEffect(() => {

    const loadData = async () => {
      if (!clinicId) {
        router.replace('/clinic-selection');
        return;
      }

      setLoading(true);

      const roleCheck = await requireRole(['clinic_admin', 'platform_admin']);
      if (!roleCheck.user) {
        router.replace('/login');
        return;
      }

      if (roleCheck.error === 'role') {
        router.replace('/main-patient');
        return;
      }

      const { data: clinicData, error: clinicError } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', clinicId)
        .maybeSingle();

      if (clinicError || !clinicData) {
        Alert.alert('Error', clinicError?.message || 'Clinic not found.');
        setLoading(false);
        return;
      }

      const { data: detailsData } = await supabase
        .from('clinic_details')
        .select('*')
        .eq('clinic_id', clinicId)
        .maybeSingle();

      setClinic(clinicData);

      setDetails({
        about: detailsData?.about || '',
        address: detailsData?.address || '',
        phone: detailsData?.phone || '',
        email: detailsData?.email || '',
        website: detailsData?.website || '',
        opening_hours: detailsData?.opening_hours || '',
        emergency_text: detailsData?.emergency_text || '',
        hero_title: detailsData?.hero_title || '',
        hero_subtitle: detailsData?.hero_subtitle || '',
        map_embed_url: detailsData?.map_embed_url || '',
        logo_url: detailsData?.logo_url || '',
        hero_image_url: detailsData?.hero_image_url || '',
        cover_image_url: detailsData?.cover_image_url || '',
      });

      setLoading(false);
    };
    loadData();

  }, [clinicId]);

  const save = async () => {
    if (!clinic || !clinicId) 
      return;

    setSaving(true);

    const { error: clinicError } = await supabase
      .from('clinics')
      .update({
        name: clinic.name,
        slug: clinic.slug || null,
        description: clinic.description || null,
        primary_color: normalizeHex(clinic.primary_color),
        secondary_color: normalizeHex(clinic.secondary_color),
        soft_color: normalizeHex(clinic.soft_color),
        is_active: clinic.is_active,
      })
      .eq('id', clinicId);

    if (clinicError) {
      setSaving(false);
      Alert.alert('Error', clinicError.message);
      return;
    }

    const { error: detailsError } = await supabase
      .from('clinic_details')
      .upsert(
        {
          clinic_id: clinicId,
          ...details,
          about: details.about || null,
          address: details.address || null,
          phone: details.phone || null,
          email: details.email || null,
          website: details.website || null,
          opening_hours: details.opening_hours || null,
          emergency_text: details.emergency_text || null,
          hero_title: details.hero_title || null,
          hero_subtitle: details.hero_subtitle || null,
          map_embed_url: details.map_embed_url || null,
          logo_url: details.logo_url || null,
          hero_image_url: details.hero_image_url || null,
          cover_image_url: details.cover_image_url || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'clinic_id' }
      );

    setSaving(false);

    if (detailsError) {
      Alert.alert('Error', detailsError.message);
      return;
    }

    setEditingSection(null);
    Alert.alert('Saved', 'Clinic settings were updated.');
  };

  const uploadImage = async (field: ImageField) => {
    if (!clinicId) 
      return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to upload an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.[0]?.uri) 
      return;

    try {
      setUploadingField(field);

      const asset = result.assets[0];
      const extension = asset.uri.split('.').pop()?.split('?')[0] || 'jpg';
      const filePath = `${clinicId}/${field}-${Date.now()}.${extension}`;

      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, blob, {
          upsert: true,
          contentType: asset.mimeType || `image/${extension}`,
        });

      if (uploadError) {
        Alert.alert('Upload error', uploadError.message);
        return;
      }

      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);

      setDetails((prev) => ({
        ...prev,
        [field]: data.publicUrl,
      }));
    } catch (error: any) {
      Alert.alert('Upload error', error?.message || 'Could not upload image.');
    } finally {
      setUploadingField(null);
    }
  };

  const removeImage = (field: ImageField) => {
    setDetails((prev) => ({...prev, [field]: '', }));
  };

  const getSectionSubtitle = (key: SectionKey) => {
    if (key === 'branding')
      return clinic?.name || 'Clinic name, slug, description and brand colors.';
    if (key === 'details')
      return details.address || details.phone || details.email || 'Public contact information and opening hours.';

    return details.hero_title || details.logo_url || 'Landing page text and image URLs.';
  };

  if (loading || !clinic) {
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
          clinicName={clinicName || clinic.name}
          clinicId={clinicId}
          primaryColor={theme.primary}
          roleLabel="Clinic Admin"
          showBackButton
          onBackPress={() =>
            router.replace({
              pathname: '/main-clinic-admin',
              params: { clinicId, clinicName },
            })
          }
          canChangeClinic={false}
          onChangeClinic={() => router.replace('/clinic-selection')}
        />

        <View style={[styles.hero, { backgroundColor: theme.soft, borderColor: theme.borderSoft }]}>
          <Text style={[styles.eyebrow, { color: theme.primary }]}>Clinic Admin</Text>
          <Text style={[styles.title, { color: theme.secondary }]}>Clinic Settings</Text>
          <Text style={styles.subtitle}>Update public clinic information, branding colors, contact details and landing page content.</Text>
        </View>

        <View style={styles.grid}>
          {sections.map((section) => (
            <HoverCard key={section.key} onPress={() => setEditingSection(section)}>
              <View style={styles.cardTop}>
                <View style={[styles.cardIcon, { backgroundColor: `${theme.primary}12` }]}>
                  <Ionicons name={section.icon} size={22} color={theme.primary}/>
                </View>

                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{section.title}</Text>
                  <Text style={styles.cardSubtitle}>{getSectionSubtitle(section.key)}</Text>
                </View>

                <Ionicons name="chevron-forward-outline" size={20} color="#94A3B8"/>
              </View>

              <Text style={styles.cardHint}>Tap this card to edit this category.</Text>
            </HoverCard>
          ))}
        </View>
      
      </ScrollView>

      <Modal visible={!!editingSection} transparent animationType="fade">

        <View style={styles.modalOverlay}>
          <View style={styles.modalCardLarge}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIcon, { backgroundColor: `${theme.primary}12` }]}>
                <Ionicons
                  name={editingSection?.icon || 'settings-outline'}
                  size={34}
                  color={theme.primary}
                />
              </View>

              <Text style={styles.modalTitle}>{editingSection?.title}</Text>
              <Text style={styles.modalSubtitle}>Update this category, then save your changes.</Text>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator
            >
              {editingSection?.key === 'branding' && (
                <>
                  <Input
                    label="Clinic Name"
                    value={clinic.name}
                    onChangeText={(name) => setClinic({ ...clinic, name })}
                  />

                  <Input
                    label="Slug"
                    value={clinic.slug || ''}
                    onChangeText={(slug) => setClinic({ ...clinic, slug })}
                  />

                  <Input
                    label="Description"
                    value={clinic.description || ''}
                    multiline
                    onChangeText={(description) => setClinic({ ...clinic, description })}
                  />

                  <ColorInput
                    label="Primary Color"
                    value={clinic.primary_color}
                    onChangeText={(primary_color) => setClinic({ ...clinic, primary_color })}
                  />

                  <ColorInput
                    label="Secondary Color"
                    value={clinic.secondary_color}
                    onChangeText={(secondary_color) => setClinic({ ...clinic, secondary_color })}
                  />

                  <ColorInput
                    label="Soft Color"
                    value={clinic.soft_color}
                    onChangeText={(soft_color) => setClinic({ ...clinic, soft_color })}
                  />

                  <View style={styles.previewCard}>
                    <Text style={styles.previewLabel}>Brand preview</Text>

                    <View style={styles.previewDots}>
                      <View style={[styles.previewDot, { backgroundColor: clinic.primary_color || '#1D4ED8' }]}/>
                      <View style={[styles.previewDot, { backgroundColor: clinic.secondary_color || '#0F172A' }]}/>
                      <View style={[styles.previewDot, { backgroundColor: clinic.soft_color || '#EFF6FF' }]}/>
                    </View>

                    <View
                      style={[
                        styles.previewBanner,
                        {
                          backgroundColor: clinic.soft_color || '#EFF6FF',
                          borderColor: clinic.primary_color || '#1D4ED8',
                        },
                      ]}
                    >
                      <Text style={[styles.previewTitle, { color: clinic.secondary_color || '#0F172A' }]}>
                        {clinic.name || 'Clinic Name'}
                      </Text>

                      <Text style={[styles.previewText, { color: clinic.primary_color || '#1D4ED8' }]}>
                        {clinic.description || 'Clinic description preview'}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    style={[
                      styles.statusToggleTop,
                      { backgroundColor: clinic.is_active ? '#DCFCE7' : '#FEE2E2' },
                    ]}
                    onPress={() => setClinic({ ...clinic, is_active: !clinic.is_active })}
                  >
                    <Ionicons
                      name={clinic.is_active ? 'checkmark-circle-outline' : 'pause-circle-outline'}
                      size={19}
                      color={clinic.is_active ? '#166534' : '#991B1B'}
                    />

                    <View style={styles.statusToggleCopy}>
                      <Text
                        style={[
                          styles.statusToggleText,
                          { color: clinic.is_active ? '#166534' : '#991B1B' },
                        ]}
                      >
                        {clinic.is_active ? 'Clinic is active' : 'Clinic is inactive'}
                      </Text>

                      <Text
                        style={[
                          styles.statusToggleHint,
                          { color: clinic.is_active ? '#166534' : '#991B1B' },
                        ]}
                      >
                        Tap here to {clinic.is_active ? 'deactivate' : 'activate'} this clinic.
                      </Text>
                    </View>
                  </Pressable>
                </>
              )}

              {editingSection?.key === 'details' && (
                <>
                  <Input
                    label="About"
                    value={details.about || ''}
                    multiline
                    onChangeText={(about) => setDetails({ ...details, about })}
                  />

                  <Input
                    label="Address"
                    value={details.address || ''}
                    onChangeText={(address) => setDetails({ ...details, address })}
                  />

                  <Input
                    label="Phone"
                    value={details.phone || ''}
                    onChangeText={(phone) => setDetails({ ...details, phone })}
                  />

                  <Input
                    label="Email"
                    value={details.email || ''}
                    onChangeText={(email) => setDetails({ ...details, email })}
                  />

                  <Input
                    label="Website"
                    value={details.website || ''}
                    onChangeText={(website) => setDetails({ ...details, website })}
                  />

                  <Input
                    label="Opening Hours"
                    value={details.opening_hours || ''}
                    multiline
                    onChangeText={(opening_hours) => setDetails({ ...details, opening_hours })}
                  />

                  <Input
                    label="Emergency Text"
                    value={details.emergency_text || ''}
                    multiline
                    onChangeText={(emergency_text) => setDetails({ ...details, emergency_text })}
                  />

                  <Input
                    label="Map Embed URL"
                    value={details.map_embed_url || ''}
                    multiline
                    onChangeText={(map_embed_url) => setDetails({ ...details, map_embed_url })}
                  />
                </>
              )}

              {editingSection?.key === 'homepage' && (
                <>
                  <Input
                    label="Hero Title"
                    value={details.hero_title || ''}
                    onChangeText={(hero_title) => setDetails({ ...details, hero_title })}
                  />

                  <Input
                    label="Hero Subtitle"
                    value={details.hero_subtitle || ''}
                    multiline
                    onChangeText={(hero_subtitle) => setDetails({ ...details, hero_subtitle })}
                  />

                  <ImageInput
                    label="Logo"
                    value={details.logo_url || ''}
                    field="logo_url"
                    uploading={uploadingField === 'logo_url'}
                    onChangeText={(logo_url) => setDetails({ ...details, logo_url })}
                    onUpload={() => uploadImage('logo_url')}
                    onRemove={() => removeImage('logo_url')}
                  />

                  <ImageInput
                    label="Hero Image"
                    value={details.hero_image_url || ''}
                    field="hero_image_url"
                    wide
                    uploading={uploadingField === 'hero_image_url'}
                    onChangeText={(hero_image_url) => setDetails({ ...details, hero_image_url })}
                    onUpload={() => uploadImage('hero_image_url')}
                    onRemove={() => removeImage('hero_image_url')}
                  />

                  <ImageInput
                    label="Cover Image"
                    value={details.cover_image_url || ''}
                    field="cover_image_url"
                    wide
                    uploading={uploadingField === 'cover_image_url'}
                    onChangeText={(cover_image_url) => setDetails({ ...details, cover_image_url })}
                    onUpload={() => uploadImage('cover_image_url')}
                    onRemove={() => removeImage('cover_image_url')}
                  />
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setEditingSection(null)}
                disabled={saving}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.modalSaveButton, { backgroundColor: theme.primary }]}
                onPress={save}
                disabled={saving}
              >
                <Text style={styles.modalSaveText}>{saving ? 'Saving...' : 'Save Settings'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      
      </Modal>

    </>

  );

}

function Input({
  label,
  value,
  onChangeText,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
}) {

  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        style={[styles.input, multiline && styles.textarea]}
        placeholder={label}
        placeholderTextColor="#94A3B8"
      />
    </View>
  );

}

function ColorInput({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {

  const [open, setOpen] = useState(false);
  const selectedColor = normalizeHex(value || '#FFFFFF');

  const onSelectColor = (color: { hex: string }) => { onChangeText(normalizeHex(color.hex)); };

  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>

      <Pressable style={styles.colorInputButton} onPress={() => setOpen(true)}>
        <View style={[styles.colorPreviewDot, { backgroundColor: selectedColor }]}/>
        <Text style={styles.colorInputText}>{selectedColor}</Text>
        <Ionicons name="color-palette-outline" size={18} color="#64748B"/>
      </Pressable>

      <Modal visible={open} transparent animationType="fade">
        <View style={styles.colorPickerOverlay}>
          <View style={styles.colorPickerCard}>
            <Text style={styles.colorPickerTitle}>{label}</Text>

            <ColorPicker value={selectedColor} onComplete={onSelectColor}>
              <Preview />
              <Panel1 />
              <HueSlider />
            </ColorPicker>

            <Pressable style={styles.colorPickerDoneButton} onPress={() => setOpen(false)}>
              <Text style={styles.colorPickerDoneText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );

}

function ImageInput({
  label,
  value,
  field,
  wide,
  uploading,
  onChangeText,
  onUpload,
  onRemove,
}: {
  label: string;
  value: string;
  field: ImageField;
  wide?: boolean;
  uploading: boolean;
  onChangeText: (value: string) => void;
  onUpload: () => void;
  onRemove: () => void;
}) {

  const hasImage = Boolean(value?.trim());

  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>

      <View style={[styles.imagePreviewBox, wide && styles.imagePreviewBoxWide]}>
        {hasImage ? (
          <Image source={{ uri: value }} style={styles.imagePreview}/>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={28} color="#64748B"/>
            <Text style={styles.imagePlaceholderText}>No image selected</Text>
          </View>
        )}
      </View>

      <Input
        label={`${label} URL`}
        value={value}
        onChangeText={onChangeText}
      />

      <View style={styles.imageActions}>
        <Pressable style={styles.imageButton} onPress={onUpload} disabled={uploading}>
          <Ionicons name="cloud-upload-outline" size={16} color="#0F172A"/>
          <Text style={styles.imageButtonText}>
            {uploading ? 'Uploading...' : hasImage ? 'Change' : 'Upload'}
          </Text>
        </Pressable>

        {hasImage && (
          <Pressable style={styles.imageDangerButton} onPress={onRemove}>
            <Ionicons name="trash-outline" size={16} color="#BE123C"/>
            <Text style={styles.imageDangerText}>Remove</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

}

const styles = StyleSheet.create({

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },

  container: {
    flexGrow: 1,
    padding: 24,
    gap: 18,
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

  cardWrap: {
    flexBasis: 330,
    flexGrow: 1,
    minWidth: 280,
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
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },

  cardTop: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },

  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardText: {
    flex: 1,
    minWidth: 0,
  },

  cardTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
  },

  cardSubtitle: {
    color: '#64748B',
    fontWeight: '700',
    marginTop: 5,
    lineHeight: 20,
  },

  cardHint: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 12,
    marginTop: 14,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  modalCardLarge: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'stretch',
  },

  modalHeader: {
    alignItems: 'center',
    marginBottom: 14,
  },

  modalIcon: {
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
    textAlign: 'center',
  },

  modalSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    color: '#64748B',
    fontWeight: '700',
    textAlign: 'center',
  },

  modalScroll: {
    width: '100%',
    maxHeight: 430,
  },

  modalScrollContent: {
    paddingBottom: 8,
  },

  inputWrap: {
    width: '100%',
    marginBottom: 18,
  },

  inputLabel: {
    fontWeight: '800',
    color: '#334155',
    fontSize: 14,
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 52,
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    fontSize: 14,
  },

  textarea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },

  colorInputButton: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 52,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  colorPreviewDot: {
    width: 26,
    height: 26,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },

  colorInputText: {
    flex: 1,
    color: '#0F172A',
    fontWeight: '900',
  },

  colorPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  colorPickerCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    gap: 18,
  },

  colorPickerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },

  colorPickerDoneButton: {
    minHeight: 50,
    borderRadius: 999,
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  colorPickerDoneText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  previewCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    padding: 16,
    marginBottom: 18,
    gap: 12,
  },

  previewLabel: {
    color: '#334155',
    fontWeight: '900',
    fontSize: 13,
  },

  previewDots: {
    flexDirection: 'row',
    gap: 8,
  },

  previewDot: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },

  previewBanner: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },

  previewTitle: {
    fontSize: 18,
    fontWeight: '900',
  },

  previewText: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },

  imagePreviewBox: {
    width: 112,
    height: 112,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    marginBottom: 12,
  },

  imagePreviewBoxWide: {
    width: '100%',
    height: 180,
  },

  imagePreview: {
    width: '100%',
    height: '100%',
  },

  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
  },

  imagePlaceholderText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },

  imageActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: -4,
  },

  imageButton: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FFFFFF',
  },

  imageButtonText: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 13,
  },

  imageDangerButton: {
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FFF1F2',
  },

  imageDangerText: {
    color: '#BE123C',
    fontWeight: '900',
    fontSize: 13,
  },

  statusToggleTop: {
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },

  statusToggleCopy: {
    flex: 1,
  },

  statusToggleText: {
    fontWeight: '900',
    fontSize: 14,
  },

  statusToggleHint: {
    marginTop: 2,
    fontWeight: '700',
    fontSize: 12,
    opacity: 0.85,
  },

  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 18,
  },

  modalCancelButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalCancelText: {
    color: '#0F172A',
    fontWeight: '900',
  },

  modalSaveButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalSaveText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

});