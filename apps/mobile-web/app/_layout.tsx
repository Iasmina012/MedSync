import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function RootLayout() {
  
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