import React, { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Animated, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import ClinicNavbar from '../src/common/ClinicNavbar';
import { supabase } from '../src/lib/supabase';
import { requireRole } from '../src/lib/adminData';
import { useClinicTheme } from '../src/lib/clinicTheme';

type Tab = 'doctors' | 'services' | 'technologies' | 'tips';

type AnyItem = Record<string, any>;

const STORAGE_BUCKET = 'clinic-content';

const configs = {

  doctors: {
    title: 'Doctors',
    singleTitle: 'Doctor',
    icon: 'medkit-outline' as const,
    table: 'doctors',
    imageField: 'avatar_url',
    fields: [
      'first_name',
      'last_name',
      'specialty',
      'bio',
      'experience_years',
      'phone',
      'email',
      'schedule_text',
      'expertise',
      'memberships',
      'education',
      'experience',
      'avatar_url',
      'cover_image_url',
    ],
  },

  services: {
    title: 'Services',
    singleTitle: 'Service',
    icon: 'list-outline' as const,
    table: 'clinic_services',
    imageField: 'image_url',
    fields: [
      'title',
      'category',
      'description',
      'price_text',
      'duration_minutes',
      'image_url',
    ],
  },

  technologies: {
    title: 'Technologies',
    singleTitle: 'Technology',
    icon: 'hardware-chip-outline' as const,
    table: 'clinic_technologies',
    imageField: 'image_url',
    fields: ['title', 'category', 'description', 'image_url'],
  },

  tips: {
    title: 'Health Tips',
    singleTitle: 'Health Tip',
    icon: 'leaf-outline' as const,
    table: 'clinic_health_tips',
    imageField: null,
    fields: [
      'title',
      'summary',
      'content',
      'category',
      'icon_name',
      'min_age',
      'max_age',
      'gender_target',
      'condition_tags',
      'allergy_tags',
      'priority',
    ],
  },

} as const;

function cloneItem(item: AnyItem): AnyItem {
  return { ...item };
}

function fieldIsNumber(field: string) {
  return (field.includes('minutes') || field.includes('years') || field === 'priority' || field === 'min_age' || field === 'max_age');
}

function fieldIsMultiline(field: string) {
  return [ 'bio', 'description', 'content', 'summary', 'schedule_text', 'expertise', 'memberships', 'education', 'experience', 'condition_tags', 'allergy_tags', ].includes(field);
}

function formatLabel(field: string) {
  return field.replaceAll('_', ' ');
}

function parseArrayField(value: any) {

  if (Array.isArray(value)) 
    return value;
  const text = String(value || '').trim();
  if (!text) 
    return [];

  return text.split(',').map((item) => item.trim()).filter(Boolean);

}

async function uriToBlob(uri: string) {

  const response = await fetch(uri);
  return await response.blob();

}

function HoverCard({ children, onPress, }: { children: React.ReactNode; onPress: () => void; }) {

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

export default function ManageClinicContentScreen() {

  const { clinicId, clinicName, tab } = useLocalSearchParams<{
    clinicId?: string;
    clinicName?: string;
    tab?: Tab;
  }>();

  const initialTab = tab && ['doctors', 'services', 'technologies', 'tips'].includes(tab) ? tab : 'doctors';

  const { theme } = useClinicTheme(clinicId);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab as Tab);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AnyItem[]>([]);
  const [editing, setEditing] = useState<AnyItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const config = configs[activeTab];
  const isImageTab = Boolean(config.imageField);
  const imageField = config.imageField;

  const getImageUrl = (item?: AnyItem | null) => {
    if (!item || !imageField) 
      return '';
    return String(item[imageField] || '').trim();
  };

  const isWideImage = activeTab === 'services' || activeTab === 'technologies';

  useEffect(() => {
    const loadItems = async () => {
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

      const { data, error } = await supabase
        .from(config.table)
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });

      if (error) {
        Alert.alert('Error', error.message);
      }

      setItems(data ?? []);
      setLoading(false);
    };

    setEditing(null);
    loadItems();
  }, [activeTab, clinicId, config.table]);

  const refreshItems = async () => {
    if (!clinicId) return;

    const { data, error } = await supabase
      .from(config.table)
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false });

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setItems(data ?? []);
  };
  
  const createEmptyItem = () => {
    const next: AnyItem = { id: '', clinic_id: clinicId, is_active: true };

    config.fields.forEach((field) => { next[field] = fieldIsNumber(field) ? 0 : ''; });

    if (activeTab === 'tips') {
      next.category = 'General';
      next.icon_name = 'leaf-outline';
      next.content = '';
      next.condition_tags = '';
      next.allergy_tags = '';
    }

    setEditing(next);
  };

  const uploadImage = async () => {
    if (!editing || !clinicId || !imageField) 
      return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo access to upload images.');
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
      setUploading(true);

      const asset = result.assets[0];
      const extension = asset.uri.split('.').pop()?.split('?')[0] || 'jpg';
      const filePath = `${clinicId}/${activeTab}/${Date.now()}.${extension}`;
      const blob = await uriToBlob(asset.uri);

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, blob, {
          contentType: asset.mimeType || `image/${extension}`,
          upsert: true,
        });

      if (uploadError) {
        Alert.alert('Upload error', uploadError.message);
        return;
      }

      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);

      setEditing({ ...editing, [imageField]: data.publicUrl, });
    } catch (error: any) {
      Alert.alert('Upload error', error?.message || 'Could not upload image.');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    if (!editing || !imageField) 
      return;
    setEditing({ ...editing, [imageField]: '' });
  };

  const saveItem = async () => {
    if (!clinicId || !editing) 
      return;

    setSaving(true);

    const payload: AnyItem = { clinic_id: clinicId, is_active: editing.is_active ?? true, };

    config.fields.forEach((field) => {
      const value = editing[field];

      if (field === 'condition_tags' || field === 'allergy_tags') {
        payload[field] = parseArrayField(value);
        return;
      }

      if (fieldIsNumber(field)) {
        payload[field] = Number(value) || null;
        return;
      }

      payload[field] = String(value || '').trim() || null;
    });

    if (activeTab === 'doctors') {
      payload.first_name = payload.first_name || 'Doctor';
      payload.last_name = payload.last_name || 'Name';
    }

    if (activeTab !== 'doctors')
      payload.title = payload.title || config.singleTitle;

    if (activeTab === 'tips') {
      payload.content = payload.content || payload.summary || 'Health tip content';
      payload.category = payload.category || 'General';
      payload.icon_name = payload.icon_name || 'leaf-outline';
    }

    const result = editing.id ? await supabase.from(config.table).update(payload).eq('id', editing.id) : await supabase.from(config.table).insert(payload);

    setSaving(false);

    if (result.error) {
      Alert.alert('Error', result.error.message);
      return;
    }

    setEditing(null);
    refreshItems();
  };

  const toggleActive = async (item: AnyItem) => {
    const { error } = await supabase
      .from(config.table)
      .update({ is_active: !item.is_active })
      .eq('id', item.id);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    refreshItems();
  };

  const getItemTitle = (item: AnyItem) => {
    if (activeTab === 'doctors')
      return `Dr. ${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Doctor';
    return item.title || 'Untitled';
  };

  const getItemSubtitle = (item: AnyItem) => {
    if (activeTab === 'doctors') 
      return item.specialty || item.email || 'No specialty';
    if (activeTab === 'services') 
      return item.category || item.price_text || 'No service category';
    if (activeTab === 'technologies') 
      return item.category || item.description || 'No technology category';
    return item.category || item.summary || 'No health tip category';
  };

  return (

    <>

      <ScrollView contentContainerStyle={styles.container} stickyHeaderIndices={[0]}>

        <ClinicNavbar
          clinicName={clinicName}
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
          <Text style={[styles.eyebrow, { color: theme.primary }]}>Clinic Content</Text>

          <Text style={[styles.title, { color: theme.secondary }]}>Manage Doctors, Services, Technologies and Tips</Text>

          <Text style={styles.subtitle}>Add, edit and deactivate the clinic content that patients see.</Text>

          <Pressable
            style={[styles.heroAddButton, { backgroundColor: theme.primary }]}
            onPress={createEmptyItem}
          >
            <Ionicons name="add-outline" size={18} color="#FFFFFF"/>
            <Text style={styles.heroAddButtonText}>New {config.singleTitle}</Text>
          </Pressable>
        </View>

        <View style={styles.tabs}>
          {Object.entries(configs).map(([key, value]) => {
            const isActive = activeTab === key;

            return (
              <Pressable
                key={key}
                style={[
                  styles.tab,
                  isActive && {
                    backgroundColor: theme.soft,
                    borderColor: theme.borderSoft,
                  },
                ]}
                onPress={() => setActiveTab(key as Tab)}
              >
                <Ionicons
                  name={value.icon}
                  size={16}
                  color={isActive ? theme.primary : '#64748B'}
                />

                <Text style={[styles.tabText, isActive && { color: theme.primary }]}>
                  {value.title}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.primary}/>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name={config.icon} size={30} color={theme.primary}/>
            <Text style={styles.emptyTitle}>No {config.title.toLowerCase()} yet</Text>
            <Text style={styles.emptyText}>Press “New {config.singleTitle}” to create the first item.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {items.map((item) => {
              const imageUrl = getImageUrl(item);
              const wide = activeTab === 'services' || activeTab === 'technologies';

              return (
                <HoverCard key={item.id} onPress={() => setEditing(cloneItem(item))}>
                  {wide && (
                    <View style={[styles.cardWideImageWrap, { backgroundColor: `${theme.primary}12` }]}>
                      {imageUrl ? (
                        <Image source={{ uri: imageUrl }} style={styles.cardImage}/>
                      ) : (
                        <Ionicons name={config.icon} size={32} color={theme.primary}/>
                      )}
                    </View>
                  )}

                  <View style={styles.cardTop}>
                    {!wide && (
                      <View style={[styles.cardImageWrap, { backgroundColor: `${theme.primary}12` }]}>
                        {imageUrl ? (
                          <Image source={{ uri: imageUrl }} style={styles.cardImage}/>
                        ) : (
                          <Ionicons name={config.icon} size={20} color={theme.primary}/>
                        )}
                      </View>
                    )}

                    <View style={styles.cardText}>
                      <Text style={styles.cardTitle}>{getItemTitle(item)}</Text>
                      <Text style={styles.cardSubtitle}>{getItemSubtitle(item)}</Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: item.is_active ? '#DCFCE7' : '#FEE2E2' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: item.is_active ? '#166534' : '#991B1B' },
                        ]}
                      >
                        {item.is_active ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.actions}>
                    <Pressable
                      style={[
                        styles.secondaryButton,
                        {
                          backgroundColor: theme.primary,
                          borderColor: theme.primary,
                        },
                      ]}
                      onPress={(event) => {
                        event.stopPropagation?.();
                        setEditing(cloneItem(item));
                      }}
                    >
                      <Text style={styles.secondaryButtonText}>Edit</Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.secondaryButton,
                        {
                          backgroundColor: item.is_active ? '#FEF2F2' : '#DCFCE7',
                          borderColor: item.is_active ? '#FECACA' : '#BBF7D0',
                        },
                      ]}
                      onPress={(event) => {
                        event.stopPropagation?.();
                        toggleActive(item);
                      }}
                    >
                      <Text
                        style={[
                          styles.secondaryButtonText,
                          { color: item.is_active ? '#991B1B' : '#166534' },
                        ]}
                      >
                        {item.is_active ? 'Deactivate' : 'Activate'}
                      </Text>
                    </Pressable>
                  </View>
                </HoverCard>
              );
            })}
          </View>
        )}
      
      </ScrollView>

      <Modal visible={!!editing} transparent animationType="fade">

        <View style={styles.modalOverlay}>
          <View style={styles.modalCardLarge}>
            <View style={styles.modalHeader}>
              {isImageTab ? (
                <View
                  style={[
                    styles.modalImageWrap,
                    isWideImage && styles.modalImageWrapWide,
                    { backgroundColor: `${theme.primary}12` },
                  ]}
                >
                  {getImageUrl(editing) ? (
                    <Image source={{ uri: getImageUrl(editing) }} style={styles.modalImage}/>
                  ) : (
                    <Ionicons name={config.icon} size={34} color={theme.primary}/>
                  )}
                </View>
              ) : (
                <View style={[styles.modalIcon, { backgroundColor: `${theme.primary}12` }]}>
                  <Ionicons name={config.icon} size={34} color={theme.primary}/>
                </View>
              )}

              <Text style={styles.modalTitle}>
                {editing?.id ? `Edit ${config.singleTitle}` : `New ${config.singleTitle}`}
              </Text>

              <Text style={styles.modalSubtitle}>Update the fields below, then save the changes.</Text>
            </View>

            {editing && (
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator
              >
                {config.fields.map((field) => (
                  <React.Fragment key={field}>
                    <Input
                      label={formatLabel(field)}
                      value={
                        Array.isArray(editing[field])
                          ? editing[field].join(', ')
                          : String(editing[field] ?? '')
                      }
                      multiline={fieldIsMultiline(field)}
                      keyboardType={fieldIsNumber(field) ? 'numeric' : 'default'}
                      onChangeText={(value) => setEditing({ ...editing, [field]: value })}
                    />

                    {field === imageField && (
                      <View style={styles.imageActions}>
                        <Pressable
                          style={styles.imageButton}
                          onPress={uploadImage}
                          disabled={uploading}
                        >
                          <Ionicons
                            name={getImageUrl(editing) ? 'image-outline' : 'cloud-upload-outline'}
                            size={16}
                            color="#0F172A"
                          />
                          <Text style={styles.imageButtonText}>
                            {uploading ? 'Uploading...' : getImageUrl(editing) ? 'Change' : 'Upload'}
                          </Text>
                        </Pressable>

                        {!!getImageUrl(editing) && (
                          <Pressable style={styles.imageDangerButton} onPress={removeImage}>
                            <Ionicons name="trash-outline" size={16} color="#BE123C"/>
                            <Text style={styles.imageDangerText}>Remove</Text>
                          </Pressable>
                        )}
                      </View>
                    )}
                  </React.Fragment>
                ))}

                <Pressable
                  style={[
                    styles.statusToggleTop,
                    { backgroundColor: editing.is_active ? '#DCFCE7' : '#FEE2E2' },
                  ]}
                  onPress={() => setEditing({ ...editing, is_active: !editing.is_active })}
                >
                  <Ionicons
                    name={editing.is_active ? 'checkmark-circle-outline' : 'pause-circle-outline'}
                    size={19}
                    color={editing.is_active ? '#166534' : '#991B1B'}
                  />

                  <View style={styles.statusToggleCopy}>
                    <Text
                      style={[
                        styles.statusToggleText,
                        { color: editing.is_active ? '#166534' : '#991B1B' },
                      ]}
                    >
                      {editing.is_active
                        ? `${config.singleTitle} is active`
                        : `${config.singleTitle} is inactive`}
                    </Text>

                    <Text
                      style={[
                        styles.statusToggleHint,
                        { color: editing.is_active ? '#166534' : '#991B1B' },
                      ]}
                    >
                      Tap here to {editing.is_active ? 'deactivate' : 'activate'} this item.
                    </Text>
                  </View>
                </Pressable>
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setEditing(null)}
                disabled={saving}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.modalSaveButton, { backgroundColor: theme.primary }]}
                onPress={saveItem}
                disabled={saving || uploading}
              >
                <Text style={styles.modalSaveText}>{saving ? 'Saving...' : 'Save'}</Text>
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
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric';
}) {

  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[styles.input, multiline && styles.textarea]}
        placeholder={label}
        placeholderTextColor="#94A3B8"
      />
    </View>
  );

}

const styles = StyleSheet.create({

  container: {
    flexGrow: 1,
    padding: 24,
    gap: 18,
    backgroundColor: '#F8FAFC',
  },

  centered: {
    paddingVertical: 40,
    alignItems: 'center',
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
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },

  subtitle: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 24,
  },

  heroAddButton: {
    marginTop: 18,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },

  heroAddButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },

  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  tab: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  tabText: {
    color: '#0F172A',
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
    fontSize: 14,
    lineHeight: 22,
    color: '#64748B',
    textAlign: 'center',
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

  cardImageWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  cardWideImageWrap: {
    width: '100%',
    height: 150,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 14,
  },

  cardImage: {
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

  cardSubtitle: {
    color: '#64748B',
    fontWeight: '700',
    marginTop: 5,
    lineHeight: 20,
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

  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },

  secondaryButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  secondaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
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
    width: 96,
    height: 96,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  modalImageWrap: {
    width: 96,
    height: 96,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 14,
  },

  modalImageWrapWide: {
    width: '100%',
    height: 190,
    borderRadius: 24,
  },

  modalImage: {
    width: '100%',
    height: '100%',
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

  imageActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: -6,
    marginBottom: 18,
    justifyContent: 'flex-start',
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
    color: '#334155',
    fontWeight: '800',
    textTransform: 'capitalize',
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