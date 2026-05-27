import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View, } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Item = {

  label: string;
  value: string;

};

type Props = {

  value: string;
  onChange: (value: string) => void;
  items: Item[];
  placeholder?: string;

};

export default function DropdownMenu({
  value,
  onChange,
  items,
  placeholder = 'select',
}: Props) {

  const [open, setOpen] = useState(false);

  const selectedLabel = items.find((item) => item.value === value)?.label ?? placeholder;

  if (Platform.OS === 'web') {

    return (

      <View style={styles.webWrapper}>

        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={webSelectStyle}
        >
          {items.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <View pointerEvents="none" style={styles.webOverlay}>
          <Text style={styles.webOverlayText}>{selectedLabel}</Text>
          <Ionicons name="chevron-down" size={18} color="#334155"/>
        </View>
      
      </View>
    
  );
  
  }

  return (

    <>

      <Pressable style={styles.mobileTrigger} onPress={() => setOpen(true)}>
        <Text style={styles.mobileTriggerText}>{selectedLabel}</Text>
        <Ionicons name="chevron-down" size={18} color="#334155"/>
      </Pressable>

      <Modal visible={open} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
          <View style={styles.modalCard}>
            {items.map((item) => (
              <Pressable
                key={item.value}
                style={styles.modalItem}
                onPress={() => {
                  onChange(item.value);
                  setOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.modalItemText,
                    item.value === value && styles.modalItemTextActive,
                  ]}
                >
                  {item.label}
                </Text>

                {item.value === value && (
                  <Ionicons name="checkmark" size={18} color="#1D4ED8"/>
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    
    </>
  
  );

}

const styles = StyleSheet.create({

  webWrapper: {
    position: 'relative',
    height: 56,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    justifyContent: 'center',
  },

  webOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  webOverlayText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },

  mobileTrigger: {
    height: 56,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  mobileTriggerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.25)',
    justifyContent: 'center',
    padding: 24,
  },

  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },

  modalItem: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  modalItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },

  modalItemTextActive: {
    color: '#1D4ED8',
    fontWeight: '800',
  },

});

const webSelectStyle: React.CSSProperties = {

  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  opacity: 0,
  cursor: 'pointer',
  border: 'none',
  outline: 'none',
  boxShadow: 'none',
  background: 'transparent',
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',

};