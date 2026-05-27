import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {

  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  centered?: boolean;

};

export default function AnimatedStatsCard({
  label,
  value,
  icon,
  color = '#1D4ED8',
  centered = false,
}: Props) {

  const animated = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {

    const listener = animated.addListener(({ value }) => {
      setDisplay(Math.floor(value));
    });

    Animated.timing(animated, {
      toValue: value,
      duration: 900,
      useNativeDriver: false,
    }).start();

    return () => animated.removeListener(listener);

  }, [animated, value]);

  return (

    <View style={styles.card}>

    <View style={[styles.iconWrap, centered && styles.iconCentered, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={20} color={color}/>
    </View>
    <Text style={[styles.value, centered && styles.textCentered]}>{display}</Text>
    <Text style={[styles.label, centered && styles.textCentered]}>{label}</Text>

    </View>

  );

}

const styles = StyleSheet.create({

  card: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
  },

  iconCentered: {
    alignSelf: 'center',
  },

  textCentered: {
    textAlign: 'center',
  },

  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  value: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },

  label: {
    fontSize: 14,
    color: '#64748B',
  },

});