import React from 'react';
import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function MobileTopRightLogout() {

  if (Platform.OS === 'web') return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (

    <View style={styles.wrapper}>
      <Pressable style={styles.button} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color="#0F172A" />
        <Text style={styles.buttonText}>Logout</Text>
      </Pressable>
    </View>
    
  );

}

const styles = StyleSheet.create({

  wrapper: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 16,
  },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  buttonText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  
});