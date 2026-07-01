import React, { useRef } from 'react';
import { Animated, Platform, Pressable, StyleProp, ViewStyle, } from 'react-native';

type HoverCardProps = {

  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  cardStyle?: StyleProp<ViewStyle>;
  pressableStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
  withShadow?: boolean;
  scaleTo?: number;
  translateYTo?: number;

};

export default function HoverCard({ children, onPress, style, cardStyle, pressableStyle, disabled = false, withShadow = false, scaleTo = 1.02, translateYTo = -6, }: HoverCardProps) {

  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const animateIn = () => {
    if (disabled || Platform.OS !== 'web') 
      return;
    Animated.parallel([
      Animated.spring(scale, {
        toValue: scaleTo,
        useNativeDriver: true,
        friction: 8,
      }),
      Animated.spring(translateY, {
        toValue: translateYTo,
        useNativeDriver: true,
        friction: 8,
      }),
    ]).start();
  };

  const animateOut = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
      }),
    ]).start();
  };

  return (

    <Pressable
      style={pressableStyle}
      onPress={onPress}
      disabled={disabled}
      onHoverIn={animateIn}
      onHoverOut={animateOut}
      onPressIn={animateIn}
      onPressOut={animateOut}
    >
      <Animated.View
        style={[
          style,
          cardStyle,
          withShadow && {
            shadowColor: '#0F172A',
            shadowOpacity: 0.08,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 3,
          },
          { transform: [{ scale }, { translateY }] },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>

  );

}