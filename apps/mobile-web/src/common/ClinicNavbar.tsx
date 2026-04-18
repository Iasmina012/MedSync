import React, { useState } from 'react';
import { router } from 'expo-router';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

type Props = {

  clinicName?: string;
  primaryColor?: string;
  roleLabel: string;
  onChangeClinic?: () => void;

};

export default function ClinicRoleTopBar({clinicName, primaryColor = '#1D4ED8', roleLabel, onChangeClinic,}: Props) {

  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const handleChangeClinic = () => {

    setMenuOpen(false);

    if (onChangeClinic) {
      onChangeClinic();
      return;
    }

    router.replace('/clinic-selection');

  };

  return (

    <>

      <View style={styles.wrapper}>
        
        <View style={styles.left}>
          <View style={[styles.badge, { backgroundColor: `${primaryColor}12` }]}>
            <Ionicons name="business-outline" size={16} color={primaryColor}/>
            <Text style={[styles.badgeText, { color: primaryColor }]}>
              {clinicName || 'Selected Clinic'}
            </Text>
          </View>

          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>{roleLabel}</Text>
          </View>
        </View>

        <View style={styles.right}>
          <Pressable style={styles.actionButton} onPress={() => setMenuOpen(true)}>
            <Ionicons name="person-circle-outline" size={18} color="#0F172A"/>
            <Text style={styles.actionButtonText}>Menu</Text>
            <Ionicons name="chevron-down-outline" size={16} color="#64748B"/>
          </Pressable>
        </View>
     
     </View>

      <Modal visible={menuOpen} transparent animationType="fade">

        <Pressable style={styles.overlay} onPress={() => setMenuOpen(false)}>
          <View style={styles.dropdown}>
            <Pressable style={styles.menuItem} onPress={handleChangeClinic}>
              <Ionicons name="swap-horizontal-outline" size={18} color="#0F172A"/>
              <Text style={styles.menuItemText}>Change Clinic</Text>
            </Pressable>

            <Pressable style={styles.menuItem} onPress={() => setMenuOpen(false)}>
              <Ionicons name="person-outline" size={18} color="#0F172A"/>
              <Text style={styles.menuItemText}>My Profile / Edit Account</Text>
            </Pressable>

            <Pressable style={styles.menuItem} onPress={() => setMenuOpen(false)}>
              <Ionicons name="document-text-outline" size={18} color="#0F172A"/>
              <Text style={styles.menuItemText}>Policies</Text>
            </Pressable>

            <Pressable style={styles.menuItem} onPress={() => setMenuOpen(false)}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#0F172A"/>
              <Text style={styles.menuItemText}>Privacy</Text>
            </Pressable>

            <Pressable style={styles.menuItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color="#DC2626"/>
              <Text style={[styles.menuItemText, { color: '#DC2626' }]}>
                Logout
              </Text>
            </Pressable>
          </View>
        </Pressable>
      
      </Modal>
    
    </>
  
);

}

const styles = StyleSheet.create({

  wrapper: {
    position: 'sticky' as any,
    top: Platform.OS === 'web' ? 14 : 0,
    zIndex: 100,
    backgroundColor: '#F8FAFC',
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },

  left: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  right: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  badge: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },

  badgeText: {
    fontWeight: '800',
    fontSize: 14,
  },

  rolePill: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  rolePillText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 13,
  },

  actionButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },

  actionButtonText: {
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
    backgroundColor: '#FFF',
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

});