import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {

  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;

};

export default function InfoSearchBar({
  value,
  onChangeText,
  placeholder = 'Search...',
}: Props) {

  return (

    <View style={styles.container}>

      <Ionicons name="search-outline" size={20} color="#64748B"/>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        style={styles.input}
      />

    </View>

  );

}

const styles = StyleSheet.create({

  container: {
    height: 56,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },

  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    outlineStyle: 'none' as any,
  },
  
});