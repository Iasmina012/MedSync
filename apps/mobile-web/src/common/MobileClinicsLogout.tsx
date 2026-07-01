import React from 'react';
import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

type Props = {
  inline?: boolean;
};

export default function MobileClinicsLogout({ inline = false }: Props) {

  if (Platform.OS === 'web') return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (

    <View style={[styles.wrapper, inline && styles.wrapperInline]}>
      <Pressable style={styles.button} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color="#DC2626"/>
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

  wrapperInline: {
    width: 'auto',
    marginBottom: 0,
    alignItems: 'flex-start',
  },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  buttonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
  
});