import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MoodType } from '../lib/healthTips';

type Props = {

  value: MoodType;
  onChange: (value: MoodType) => void;
  primaryColor: string;

};

const MOODS: {

  value: MoodType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;

}[] = [
  { value: 'all', label: 'All', icon: 'apps-outline' },
  { value: 'great', label: 'Great', icon: 'happy-outline' },
  { value: 'okay', label: 'Okay', icon: 'sunny-outline' },
  { value: 'tired', label: 'Tired', icon: 'moon-outline' },
  { value: 'stressed', label: 'Stressed', icon: 'fitness-outline' },
];

export default function HealthMoodSelector({value, onChange, primaryColor,}: Props) {

  return (

    <View style={styles.wrap}>

      {MOODS.map((item) => {
        const active = value === item.value;

        return (
          <Pressable
            key={item.value}
            onPress={() => onChange(item.value)}
            style={[
              styles.item,
              active && {
                backgroundColor: `${primaryColor}12`,
                borderColor: `${primaryColor}40`,
              },
            ]}
          >
            <Ionicons
              name={item.icon}
              size={18}
              color={active ? primaryColor : '#64748B'}
            />
            <Text style={[styles.label, active && { color: primaryColor }]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    
    </View>
  );

}

const styles = StyleSheet.create({

  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },

});