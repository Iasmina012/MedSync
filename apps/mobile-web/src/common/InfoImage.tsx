import React, { useRef } from 'react';
import { Animated, Image, Platform, Pressable, StyleSheet, Text, View, } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {

  title: string;
  subtitle?: string;
  description: string;
  imageUrl?: string | null;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress?: () => void;

};

export default function InfoImage({
  title,
  subtitle,
  description,
  imageUrl,
  icon,
  color,
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
      style={styles.pressable}
    >

      {({ pressed }) => (

        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ scale }, { translateY }],
              shadowOpacity: animatedShadowOpacity as any,
              shadowRadius: animatedShadowRadius as any,
            },
            pressed && styles.pressed,
          ]}
        >

          <View style={styles.imageWrap}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.image} />
            ) : (
              <View
                style={[
                  styles.imageFallback,
                  { backgroundColor: `${color}12` },
                ]}
              >
                <Ionicons name={icon} size={28} color={color} />
              </View>
            )}
          </View>

          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>

          {!!subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}

          <Text style={styles.description} numberOfLines={3}>
            {description}
          </Text>

          <Text style={[styles.seeMore, { color }]}>
            See more <Ionicons name="arrow-forward" size={13} color={color} />
          </Text>

        </Animated.View>

      )}

    </Pressable>

  );

}

const styles = StyleSheet.create({

  pressable: {
    flexBasis: '31%',
    minWidth: 260,
    flexGrow: 1,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  imageWrap: {
    width: '100%',
    height: 180,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: '#F8FAFC',
  },

  image: {
    width: '100%',
    height: '100%',
  },

  imageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },

  description: {
    fontSize: 14,
    lineHeight: 22,
    color: '#64748B',
  },

  seeMore: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '800',
  },

  pressed: {
    opacity: 0.96,
  },

});