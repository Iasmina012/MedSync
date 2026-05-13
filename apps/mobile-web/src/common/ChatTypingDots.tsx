import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

export default function ChatTypingDots({ color = '#94A3B8' }: { color?: string }) {

  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {

    const makeAnimation = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: -5,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }),
        ])
      );

    const a1 = makeAnimation(dot1, 0);
    const a2 = makeAnimation(dot2, 120);
    const a3 = makeAnimation(dot3, 240);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };

  }, [dot1, dot2, dot3]);

  return (

    <View style={styles.row}>

      {[dot1, dot2, dot3].map((dot, index) => (
        <Animated.View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor: color,
              transform: [{ translateY: dot }],
            },
          ]}
        />
      ))}

    </View>

  );

}

const styles = StyleSheet.create({

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },

});