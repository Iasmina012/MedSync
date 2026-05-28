import 'react-native-gesture-handler';
import React, { useEffect, useState, useCallback } from 'react';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import AppSplash from '../src/common/MobileSplashScreen';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {

  const [showSplash, setShowSplash] = useState(Platform.OS !== 'web');
  const handleSplashFinish = useCallback(() => { setShowSplash(false); }, []);
  const logo = require('../assets/images/logo.png');

  useEffect(() => { 
    async function prepare() { 
      //fonts, auth, theme etc. 
    await SplashScreen.hideAsync(); 
  } prepare(); }, []);

  useEffect(() => {

    if (Platform.OS !== 'web') 
      return;

    document.title = 'MedSync';
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;

    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    link.href = typeof logo === 'string' ? logo : logo.uri;

  }, [logo]);

  return (

    <>

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ animation: Platform.OS === 'web' ? 'none' : 'slide_from_right' }}/>
        <Stack.Screen name="signup" options={{ animation: Platform.OS === 'web' ? 'none' : 'slide_from_left' }}/>
      </Stack>
      {showSplash && <AppSplash onFinish={handleSplashFinish} />}

    </>

  );

}