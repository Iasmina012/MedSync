import 'react-native-gesture-handler';
import React from 'react';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function RootLayout() {
  
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