import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {

  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  description?: string;
  onPress?: () => void;
  color?: string;
  compact?: boolean;

};

export default function FeaturesCard({
  title,
  icon,
  description,
  onPress,
  color = '#1D4ED8',
  compact = false,
}: Props) {

  const scale = useRef(new Animated.Value(1)).current;

  const animateIn = () => {
    Animated.spring(scale, {
      toValue: 1.02,
      useNativeDriver: true,
      friction: 7,
    }).start();
  };

  const animateOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
    }).start();
  };

  return (

    <Pressable
      onPress={onPress}
      onHoverIn={animateIn}
      onHoverOut={animateOut}
      onPressIn={animateIn}
      onPressOut={animateOut}
    >
      <Animated.View style={[styles.card, compact && styles.compactCard, { transform: [{ scale }] }]}>
        <View style={[styles.iconWrap, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={22} color={color}/>
        </View>
        <Text style={styles.title}>{title}</Text>
        {!compact && !!description && <Text style={styles.description}>{description}</Text>}
      </Animated.View>
    </Pressable>

  );

}

const styles = StyleSheet.create({

  card: {
    flex: 1,
    minWidth: 220,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    padding: 18,
  },

  compactCard: {
    minWidth: 150,
    paddingVertical: 20,
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
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },

  description: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
  },

});