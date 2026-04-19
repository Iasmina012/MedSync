import React from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ActionButton = {

  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  primary?: boolean;

};

export default function InfoModal({
  visible,
  onClose,
  title,
  subtitle,
  imageUrl,
  description,
  sections = [],
  actions = [],
  color = '#1D4ED8',
  imageVariant = 'wide',
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  description?: string;
  sections?: { label: string; value?: string | null }[];
  actions?: ActionButton[];
  color?: string;
  imageVariant?: 'wide' | 'square-centered';
}) {
  const { width } = useWindowDimensions();
  const isMobile = width < 720;

  return (

    <Modal visible={visible} transparent animationType="fade">

      <View style={styles.overlay}>

        <View style={[styles.modalCard, isMobile && styles.modalCardMobile]}>

          <View style={styles.headerRow}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>{title}</Text>
              {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>

            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color="#0F172A"/>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {!!imageUrl && imageVariant === 'wide' && (
              <Image
                source={{ uri: imageUrl }}
                style={styles.coverImage}
                resizeMode="cover"
              />
            )}

            {!!imageUrl && imageVariant === 'square-centered' && (
              <View style={styles.imageCenteredWrap}>
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.squareImage}
                  resizeMode="cover"
                />
              </View>
            )}

            {!!description && <Text style={styles.description}>{description}</Text>}

            <View style={styles.sectionsWrap}>
              {sections
                .filter((section) => !!section.value)
                .map((section) => (
                  <View key={section.label} style={styles.sectionItem}>
                    <Text style={styles.sectionLabel}>{section.label}</Text>
                    <Text style={styles.sectionValue}>{section.value}</Text>
                  </View>
                ))}
            </View>

            {!!actions.length && (
              <View style={styles.actionsWrap}>
                {actions.map((action) => (
                  <Pressable
                    key={action.label}
                    onPress={action.onPress}
                    style={[
                      styles.actionButton,
                      action.primary && styles.primaryActionButton,
                      isMobile && styles.actionButtonMobile,
                      isMobile && action.primary && styles.primaryActionButtonMobile,
                      action.primary
                        ? { backgroundColor: color, borderColor: color }
                        : styles.secondaryActionButton,
                    ]}
                  >
                    <Ionicons
                      name={action.icon}
                      size={16}
                      color={action.primary ? '#FFFFFF' : '#0F172A'}
                    />
                    <Text
                      style={[
                        styles.actionButtonText,
                        action.primary && styles.primaryActionButtonText,
                      ]}
                    >
                      {action.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        
        </View>
      
      </View>

    </Modal>

  );

}

const styles = StyleSheet.create({

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.40)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  modalCard: {
    width: '100%',
    maxWidth: 760,
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 22,
  },

  modalCardMobile: {
    padding: 18,
  },

  headerRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 14,
  },

  headerTextWrap: {
    flex: 1,
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    marginTop: 6,
  },

  coverImage: {
    width: '100%',
    height: 220,
    borderRadius: 22,
    marginBottom: 16,
    backgroundColor: '#E2E8F0',
  },

  imageCenteredWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  squareImage: {
    width: 180,
    height: 180,
    borderRadius: 24,
    backgroundColor: '#E2E8F0',
  },

  description: {
    fontSize: 15,
    lineHeight: 24,
    color: '#334155',
    marginBottom: 18,
  },

  sectionsWrap: {
    gap: 12,
  },

  sectionItem: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 14,
  },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 6,
  },

  sectionValue: {
    fontSize: 14,
    lineHeight: 22,
    color: '#0F172A',
  },

  actionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 1,
    minHeight: 52,
    minWidth: 180,
  },

  primaryActionButton: {
    minWidth: 320,
  },

  actionButtonMobile: {
    minWidth: 0,
    alignSelf: 'center',
  },

  primaryActionButtonMobile: {
    width: 300,
  },

  secondaryActionButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
  },

  actionButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },

  primaryActionButtonText: {
    color: '#FFFFFF',
  },

});