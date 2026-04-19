import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {

  compact?: boolean;
  mobileTwoColumns?: boolean;
  hideDescription?: boolean;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  onPress?: () => void;

};

export default function FeaturesCard({
  compact = false,
  mobileTwoColumns = false,
  hideDescription = false,
  title,
  description,
  icon,
  color = '#1D4ED8',
  backgroundColor = '#EFF6FF',
  borderColor = '#DBEAFE',
  onPress,
}: Props) {

  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const shadow = useRef(new Animated.Value(0)).current;

  const animateIn = () => {

    if (Platform.OS !== 'web') return;

    Animated.parallel([

      Animated.spring(scale, {
        toValue: 1.02,
        useNativeDriver: false,
        friction: 8,
      }),
      Animated.spring(translateY, {
        toValue: -6,
        useNativeDriver: false,
        friction: 8,
      }),
      Animated.timing(shadow, {
        toValue: 1,
        duration: 180,
        useNativeDriver: false,
      }),

    ]).start();

  };

  const animateOut = () => {

    if (Platform.OS !== 'web') return;

    Animated.parallel([

      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: false,
        friction: 8,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: false,
        friction: 8,
      }),
      Animated.timing(shadow, {
        toValue: 0,
        duration: 180,
        useNativeDriver: false,
      }),

    ]).start();

  };

  const animatedShadowOpacity = shadow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.04, 0.1],
  });

  const animatedShadowRadius = shadow.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 16],
  });

  return (

    <Pressable
      onPress={onPress}
      onHoverIn={animateIn}
      onHoverOut={animateOut}
      onPressIn={animateIn}
      onPressOut={animateOut}
      style={[
        styles.pressable,
        mobileTwoColumns && styles.pressableMobileTwoColumns,
      ]}
    >

      {({ pressed }) => (

        <Animated.View
          style={[
            styles.card,
            compact && styles.cardCompact,
            hideDescription && styles.cardMobileSimple,
            {
              backgroundColor,
              borderColor,
              transform: [{ scale }, { translateY }],
              shadowOpacity: animatedShadowOpacity as any,
              shadowRadius: animatedShadowRadius as any,
            },
            pressed && styles.pressed,
          ]}
        >
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: '#FFFFFF' },
              hideDescription && styles.iconWrapMobileCentered,
            ]}
          >
            <Ionicons name={icon} size={22} color={color}/>
          </View>

          <Text
            style={[
              styles.title,
              hideDescription && styles.titleMobileSimple,
            ]}
            numberOfLines={2}
          >
            {title}
          </Text>

          {!hideDescription && (
            <Text style={styles.description}>{description}</Text>
          )}
        </Animated.View>
      
      )}

    </Pressable>
  
);

}

const styles = StyleSheet.create({

  pressable: {
    flexBasis: '23%',
    minWidth: 220,
    flexGrow: 1,
  },

  pressableMobileTwoColumns: {
    flexBasis: '47%',
    minWidth: 0,
    flexGrow: 0,
  },

  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    minHeight: 154,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  cardCompact: {
    minHeight: 138,
  },

  cardMobileSimple: {
    minHeight: 132,
    justifyContent: 'center',
    alignItems: 'center',
  },

  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  iconWrapMobileCentered: {
    marginBottom: 12,
  },

  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },

  titleMobileSimple: {
    marginBottom: 0,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },

  description: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
  },

  pressed: {
    opacity: 0.96,
  },

});