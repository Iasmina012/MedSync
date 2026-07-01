import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/lib/supabase';
import { requireRole } from '../src/lib/adminData';
import { normalizeHex } from '../src/theme/colors';
import ColorPicker, { HueSlider, Panel1, Preview } from 'reanimated-color-picker';
import ClinicNavbar from '../src/common/ClinicNavbar';
import HoverCard from '../src/common/HoverCard';

type Clinic = {

  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  primary_color: string;
  secondary_color: string;
  soft_color: string;
  is_active: boolean;

};

const emptyClinic: Clinic = {

  id: '',
  name: '',
  slug: '',
  description: '',
  primary_color: '#1D4ED8',
  secondary_color: '#0F172A',
  soft_color: '#EFF6FF',
  is_active: true,

};

function cloneClinic(clinic: Clinic): Clinic {
  return { ...clinic };
}

export default function ManageClinicsScreen() {

  const [loading, setLoading] = useState(true);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [editing, setEditing] = useState<Clinic | null>(null);
  const [originalEditing, setOriginalEditing] = useState<Clinic | null>(null);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadClinics = async () => {
    setLoading(true);

    const roleCheck = await requireRole(['platform_admin']);
    if (!roleCheck.user) 
      return router.replace('/login');
    if (roleCheck.error === 'role') 
      return router.replace('/main-patient');

    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) 
      Alert.alert('Error', error.message);

    setClinics(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadClinics();
  }, []);

  const hasUnsavedChanges = () => {
    if (!editing || !originalEditing) return false;

    const isNew = !editing.id;

    return isNew || JSON.stringify(editing) !== JSON.stringify(originalEditing);
  };

  const closeEditing = () => {
    if (!hasUnsavedChanges()) {
      setEditing(null);
      setOriginalEditing(null);
      return;
    }

    setDiscardConfirmOpen(true);
  };

  const discardChanges = () => {
    setDiscardConfirmOpen(false);
    setEditing(null);
    setOriginalEditing(null);
  };

  const saveClinic = async () => {
    if (!editing?.name.trim()) {
      Alert.alert('Missing name', 'Please add a clinic name.');
      return;
    }

    setSaving(true);

    const payload = {
      name: editing.name.trim(),
      slug: editing.slug?.trim() || null,
      description: editing.description?.trim() || null,
      primary_color: normalizeHex(editing.primary_color || '#1D4ED8'),
      secondary_color: normalizeHex(editing.secondary_color || '#0F172A'),
      soft_color: normalizeHex(editing.soft_color || '#EFF6FF'),
      is_active: editing.is_active,
    };

    const result = editing.id ? await supabase.from('clinics').update(payload).eq('id', editing.id) : await supabase.from('clinics').insert(payload);

    setSaving(false);

    if (result.error) {
      Alert.alert('Error', result.error.message);
      return;
    }

    setEditing(null);
    setOriginalEditing(null);
    loadClinics();
  };

  const toggleClinicFromCard = async (clinic: Clinic) => {
    const { error } = await supabase
      .from('clinics')
      .update({ is_active: !clinic.is_active })
      .eq('id', clinic.id);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    loadClinics();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1D4ED8"/>
      </View>
    );
  }

  return (

    <>

      <ScrollView contentContainerStyle={styles.container} stickyHeaderIndices={[0]}>

        <ClinicNavbar
          clinicName="MedSync Platform"
          primaryColor="#1D4ED8"
          roleLabel="Platform Admin"
          showRolePill={false}
          showBackButton
          canChangeClinic={false}
          onBackPress={() => router.replace('/main-platform-admin')}
        />

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Manage Clinics</Text>
          <Text style={styles.title}>Supervise the Clinics</Text>
          <Text style={styles.subtitle}>Create and edit clinic information with ease. Customize branding colors, descriptions and basic details, while also quickly activating or deactivating clinics as needed.</Text>

          <Pressable style={styles.primaryButton} onPress={() => {
              const next = cloneClinic(emptyClinic);
              setEditing(next);
              setOriginalEditing(cloneClinic(next));
            }}>
            <Ionicons name="add-outline" size={18} color="#FFFFFF"/>
            <Text style={styles.primaryButtonText}>New Clinic</Text>
          </Pressable>
        </View>

        <View style={styles.grid}>
          {clinics.map((clinic) => (
            <HoverCard
              key={clinic.id}
              pressableStyle={styles.cardWrap}
              cardStyle={styles.card}
              withShadow
              onPress={() => {
                const next = cloneClinic(clinic);
                setEditing(next);
                setOriginalEditing(cloneClinic(next));
              }}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardTitleWrap}>
                  <Text style={styles.cardTitle}>{clinic.name}</Text>
                  <Text style={styles.cardMeta}>{clinic.slug || 'No slug'}</Text>
                </View>

                <View style={styles.cardRight}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: clinic.is_active ? '#DCFCE7' : '#FEE2E2' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: clinic.is_active ? '#166534' : '#991B1B' },
                      ]}
                    >
                      {clinic.is_active ? 'Active' : 'Inactive'}
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward-outline" size={20} color="#94A3B8" />
                </View>
              </View>

              <Text style={styles.cardDescription}>{clinic.description || 'No description added yet.'}</Text>

              <View style={styles.colorRow}>
                <View style={[styles.colorDot, { backgroundColor: clinic.primary_color }]}/>
                <View style={[styles.colorDot, { backgroundColor: clinic.secondary_color }]}/>
                <View style={[styles.colorDot, { backgroundColor: clinic.soft_color }]}/>
              </View>

              <View style={styles.actions}>
                <Pressable
                  style={[
                    styles.secondaryButton,
                    {
                      backgroundColor: clinic.primary_color || '#1D4ED8',
                      borderColor: clinic.primary_color || '#1D4ED8',
                    },
                  ]}
                  onPress={(event) => {
                    event.stopPropagation?.();
                    const next = cloneClinic(clinic);
                    setEditing(next);
                    setOriginalEditing(cloneClinic(next));
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Edit</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.secondaryButton,
                    {
                      backgroundColor: clinic.is_active ? '#FEF2F2' : '#DCFCE7',
                      borderColor: clinic.is_active ? '#FECACA' : '#BBF7D0',
                    },
                  ]}
                  onPress={(event) => {
                    event.stopPropagation?.();
                    toggleClinicFromCard(clinic);
                  }}
                >
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      { color: clinic.is_active ? '#991B1B' : '#166534' },
                    ]}
                  >
                    {clinic.is_active ? 'Deactivate' : 'Activate'}
                  </Text>
                </Pressable>
              </View>
            </HoverCard>
          ))}
        </View>

      </ScrollView>

      <Modal visible={!!editing} transparent animationType="fade">

        <View style={styles.modalOverlay}>
          <View style={styles.modalCardLarge}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIcon}>
                <Ionicons name="business-outline" size={34} color="#1D4ED8"/>
              </View>

              <Text style={styles.modalTitle}>{editing?.id ? 'Edit Clinic' : 'New Clinic'}</Text>

              <Text style={styles.modalSubtitle}>Update the clinic&apos;s branding and basic information. Changes made here are saved directly to the database.</Text>
            </View>

            {editing && (
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator
              >
                <Input
                  label="Name"
                  value={editing.name}
                  onChangeText={(name) => setEditing({ ...editing, name })}
                />

                <Input
                  label="Slug"
                  value={editing.slug || ''}
                  onChangeText={(slug) => setEditing({ ...editing, slug })}
                />

                <Input
                  label="Description"
                  value={editing.description || ''}
                  multiline
                  onChangeText={(description) => setEditing({ ...editing, description })}
                />

                <ColorInput
                  label="Primary Color"
                  value={editing.primary_color}
                  onChangeText={(primary_color) => setEditing({ ...editing, primary_color })}
                />

                <ColorInput
                  label="Secondary Color"
                  value={editing.secondary_color}
                  onChangeText={(secondary_color) => setEditing({ ...editing, secondary_color })}
                />

                <ColorInput
                  label="Soft Color"
                  value={editing.soft_color}
                  onChangeText={(soft_color) => setEditing({ ...editing, soft_color })}
                />

                <View style={styles.previewCard}>
                  <Text style={styles.previewLabel}>Branding preview</Text>

                  <View style={styles.previewDots}>
                    <View style={[styles.previewDot, { backgroundColor: editing.primary_color || '#1D4ED8' }]}/>
                    <View style={[styles.previewDot, { backgroundColor: editing.secondary_color || '#0F172A' }]}/>
                    <View style={[styles.previewDot, { backgroundColor: editing.soft_color || '#EFF6FF' }]}/>
                  </View>

                  <View
                    style={[
                      styles.previewBanner,
                      {
                        backgroundColor: editing.soft_color || '#EFF6FF',
                        borderColor: editing.primary_color || '#1D4ED8',
                      },
                    ]}
                  >
                    <Text style={[styles.previewTitle, { color: editing.secondary_color || '#0F172A' }]}>
                      {editing.name || 'Clinic Name'}
                    </Text>

                    <Text style={[styles.previewText, { color: editing.primary_color || '#1D4ED8' }]}>
                      {editing.description || 'Clinic description preview'}
                    </Text>
                  </View>
                </View>

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
                      {editing.is_active ? 'Clinic is active' : 'Clinic is inactive'}
                    </Text>

                    <Text
                      style={[
                        styles.statusToggleHint,
                        { color: editing.is_active ? '#166534' : '#991B1B' },
                      ]}
                    >
                      Tap here to {editing.is_active ? 'deactivate' : 'activate'} this clinic.
                    </Text>
                  </View>
                </Pressable>
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelButton} onPress={closeEditing} disabled={saving}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>

              <Pressable style={styles.modalSaveButton} onPress={saveClinic} disabled={saving}>
                <Text style={styles.modalSaveText}>{saving ? 'Saving...' : 'Save Clinic'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={discardConfirmOpen} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <Ionicons name="warning-outline" size={28} color="#B45309"/>
            </View>

            <Text style={styles.confirmTitle}>Discard changes?</Text>

            <Text style={styles.confirmText}>Any unsaved edits will be lost if you continue. Make sure to save your changes before leaving.</Text>

            <View style={styles.confirmActions}>
              <Pressable
                style={styles.confirmCancelButton}
                onPress={() => setDiscardConfirmOpen(false)}
              >
                <Text style={styles.confirmCancelText}>Keep editing</Text>
              </Pressable>

              <Pressable style={styles.confirmDiscardButton} onPress={discardChanges}>
                <Text style={styles.confirmDiscardText}>Discard</Text>
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
              <Preview/>
              <Panel1/>
              <HueSlider/>
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
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 28,
    padding: 24,
    gap: 10,
  },

  eyebrow: {
    color: '#1D4ED8',
    fontWeight: '900',
    fontSize: 13,
  },

  title: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 30,
  },

  subtitle: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 24,
  },

  grid: {
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
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },

  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },

  cardTitleWrap: {
    flex: 1,
  },

  cardTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
  },

  cardMeta: {
    color: '#64748B',
    fontWeight: '700',
    marginTop: 4,
  },

  cardDescription: {
    color: '#475569',
    lineHeight: 22,
    marginTop: 14,
  },

  statusBadge: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },

  statusText: {
    fontWeight: '900',
    fontSize: 12,
    lineHeight: 14,
  },

  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  colorRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },

  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },

  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },

  primaryButton: {
    backgroundColor: '#1D4ED8',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  secondaryButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    maxWidth: 660,
    maxHeight: '90%',
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
    backgroundColor: '#EFF6FF',
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
    paddingVertical: 10,
    minHeight: 52,
    backgroundColor: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    color: '#0F172A',
  },

  textarea: {
    minHeight: 130,
    paddingTop: 14,
    paddingBottom: 14,
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
    gap: 12,
    marginBottom: 18,
  },

  previewLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#334155',
  },

  previewDots: {
    flexDirection: 'row',
    gap: 8,
  },

  previewDot: {
    width: 26,
    height: 26,
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
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalSaveText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
    
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  confirmCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
  },

  confirmIcon: {
    width: 60,
    height: 60,
    borderRadius: 999,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  confirmTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },

  confirmText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 20,
  },

  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },

  confirmCancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  confirmCancelText: {
    color: '#0F172A',
    fontWeight: '800',
  },

  confirmDiscardButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },

  confirmDiscardText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

});