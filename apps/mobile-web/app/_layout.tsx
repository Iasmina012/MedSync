import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {

  useEffect(() => { 
    async function prepare() { 
      //fonts, auth, theme etc. 
    await SplashScreen.hideAsync(); 
  } prepare(); }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      document.title = 'MedSync';
    }
  }, []);
  
  return (

    <Stack screenOptions={{headerShown: false,}}>
      
      <Stack.Screen
        name="login"
        options={{animation: Platform.OS === 'web' ? 'none' : 'slide_from_right',}}
      />

      <Stack.Screen
        name="signup"
        options={{animation: Platform.OS === 'web' ? 'none' : 'slide_from_left',}}
      />

    </Stack>
    
  );

}