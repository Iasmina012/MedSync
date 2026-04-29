import React, { useState } from 'react';
import { router } from 'expo-router';
import { Modal, Pressable,  StyleSheet,  Text, } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {

  clinicId?: string;
  clinicName?: string;
  primaryColor?: string;
  compact?: boolean;

};

export default function UserMenu({
  clinicId,
  clinicName,
  primaryColor = '#1D4ED8',
  compact = false,
}: Props) {

  const [menuOpen, setMenuOpen] = useState(false);

  const goTo = (pathname: string) => {
    setMenuOpen(false);
    router.push({
      pathname: pathname as any,
      params: { clinicId, clinicName },
    });
  };

  return (

    <>

      <Pressable
        style={[
          styles.trigger,
          compact && styles.triggerCompact,
          menuOpen && {
            borderColor: `${primaryColor}35`,
            backgroundColor: `${primaryColor}10`,
          },
        ]}
        onPress={() => setMenuOpen((prev) => !prev)}
      >
        <Ionicons name="person-circle-outline" size={18} color="#0F172A"/>
        {!compact && <Text style={styles.triggerText}>Menu</Text>}
        {!compact && (
          <Ionicons
            name={menuOpen ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={menuOpen ? primaryColor : '#64748B'}
          />
        )}
      </Pressable>

      <Modal visible={menuOpen} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.dropdown} onPress={() => {}}>
            <Pressable style={styles.menuItem} onPress={() => goTo('/my-profile')}>
              <Ionicons name="person-outline" size={18} color="#0F172A"/>
              <Text style={styles.menuItemText}>My Profile</Text>
            </Pressable>

            <Pressable style={styles.menuItem} onPress={() => goTo('/settings')}>
              <Ionicons name="settings-outline" size={18} color="#0F172A"/>
              <Text style={styles.menuItemText}>Settings</Text>
            </Pressable>

            <Pressable style={styles.menuItem} onPress={() => goTo('/policies')}>
              <Ionicons name="document-text-outline" size={18} color="#0F172A"/>
              <Text style={styles.menuItemText}>Policies</Text>
            </Pressable>

            <Pressable style={styles.menuItem} onPress={() => goTo('/privacy')}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#0F172A"/>
              <Text style={styles.menuItemText}>Privacy</Text>
            </Pressable>

            <Pressable style={styles.menuItem} onPress={() => goTo('/logout')}>
              <Ionicons name="log-out-outline" size={18} color="#DC2626"/>
              <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

    </>

  );

}

const styles = StyleSheet.create({

  trigger: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  triggerCompact: {
    width: 48,
    height: 48,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },

  triggerText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 14,
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.25)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 84,
    paddingHorizontal: 24,
  },

  dropdown: {
    width: 290,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },

  menuItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  menuItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },

  logoutText: {
    color: '#DC2626',
  },

});