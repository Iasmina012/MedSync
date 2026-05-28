import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

export default function MobileSplashScreen({ onFinish }: { onFinish: () => void }) {

  const opacity = useRef(new Animated.Value(0)).current;
  const logoIntroScale = useRef(new Animated.Value(0.72)).current;
  const logoPulseScale = useRef(new Animated.Value(1)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const logoY = useRef(new Animated.Value(22)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(14)).current;
  const ringIntroScale = useRef(new Animated.Value(0.6)).current;
  const ringPulseScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {

    const pulseLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(logoPulseScale, {
            toValue: 1.035,
            duration: 720,
            useNativeDriver: true,
          }),
          Animated.timing(logoPulseScale, {
            toValue: 1,
            duration: 720,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(ringPulseScale, {
            toValue: 1.12,
            duration: 720,
            useNativeDriver: true,
          }),
          Animated.timing(ringPulseScale, {
            toValue: 1,
            duration: 720,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(logoIntroScale, {
          toValue: 1,
          friction: 6,
          tension: 90,
          useNativeDriver: true,
        }),
        Animated.timing(logoY, {
          toValue: 0,
          duration: 520,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(180),
          Animated.parallel([
            Animated.timing(ringOpacity, {
              toValue: 1,
              duration: 220,
              useNativeDriver: true,
            }),
            Animated.timing(ringIntroScale, {
              toValue: 1.35,
              duration: 650,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]),

      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 360,
          useNativeDriver: true,
        }),
        Animated.timing(titleY, {
          toValue: 0,
          duration: 360,
          useNativeDriver: true,
        }),
      ]),

      Animated.delay(80),
    ]).start(() => {
      pulseLoop.start();

      setTimeout(() => {
        pulseLoop.stop();

        Animated.timing(opacity, {
          toValue: 0,
          duration: 360,
          useNativeDriver: true,
        }).start(() => onFinish());
      }, 1150);
    });

    return () => { pulseLoop.stop(); };
  }, [
    opacity,
    logoIntroScale,
    logoPulseScale,
    logoRotate,
    logoY,
    titleOpacity,
    titleY,
    ringIntroScale,
    ringPulseScale,
    ringOpacity,
    onFinish,
  
  ]);

  const rotate = logoRotate.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '0deg'], });

  return (

    <Animated.View style={[styles.container, { opacity }]}>

      <View style={styles.logoStage}>
        <Animated.View style={[styles.ring, { opacity: ringOpacity, transform: [{ scale: ringIntroScale }, { scale: ringPulseScale }] }]}/>
        <Animated.Image source={require('../../assets/images/logo.png')} style={[styles.logo, { transform: [{ scale: logoIntroScale }, { scale: logoPulseScale }, { translateY: logoY }, { rotate }] }]}/>
      </View>

      <Animated.View style={[styles.textWrap, { opacity: titleOpacity, transform: [{ translateY: titleY }] }]}>
        <Text style={styles.title}>MedSync</Text>
        <Text style={styles.subtitle}>Your care, connected.</Text>
      </Animated.View>

    </Animated.View>

  );

}

const styles = StyleSheet.create({

  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999999,
  },

  logoStage: {
    width: 230,
    height: 230,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  ring: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: '#DBEAFE',
  },

  logo: {
    width: 190,
    height: 190,
    resizeMode: 'contain',
  },

  textWrap: {
    alignItems: 'center',
  },

  title: {
    fontSize: 31,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 7,
  },

  subtitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#64748B',
  },

});