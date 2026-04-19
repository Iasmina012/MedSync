import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function InfoCard({
  title,
  subtitle,
  description,
  color,
  icon,
  compact = false,
  onPress,
}: {
  title: string;
  subtitle?: string;
  description?: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  compact?: boolean;
  onPress?: () => void;
}) {

  return (

    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >

      <View style={[styles.iconWrap, { backgroundColor: `${color}14` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>

      <Text style={styles.title}>{title}</Text>

      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      {!compact && !!description && <Text style={styles.description}>{description}</Text>}

    </Pressable>

  );

}

const styles = StyleSheet.create({

  card: {
    flex: 1,
    minWidth: 240,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    padding: 18,
  },

  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },

  description: {
    fontSize: 14,
    lineHeight: 22,
    color: '#64748B',
  },

  pressed: {
    opacity: 0.9,
  },

});