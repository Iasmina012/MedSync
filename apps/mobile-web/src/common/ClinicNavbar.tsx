import React, { useState } from 'react';
import { router } from 'expo-router';
import { Modal, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

type Props = {

  clinicId?: string;
  clinicName?: string;
  primaryColor?: string;
  roleLabel: string;
  onChangeClinic?: () => void;
  showBackButton?: boolean;
  onBackPress?: () => void;
  showRolePill?: boolean;

};

export default function ClinicNavbar({
  clinicId,
  clinicName,
  primaryColor = '#1D4ED8',
  roleLabel,
  onChangeClinic,
  showBackButton = false,
  onBackPress,
  showRolePill = true,
}: Props) {

  const [menuOpen, setMenuOpen] = useState(false);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isMobile = width < 720;
  const isWeb = Platform.OS === 'web';

  const hasClinicContext = Boolean(clinicId || clinicName);
  const mobileTopPadding = isWeb ? 0 : Math.max(insets.top, 12);

  const goTo = (pathname: string) => {
    setMenuOpen(false);
    router.push({
      pathname: pathname as any,
      params: { clinicId, clinicName },
    });
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (

    <>

      <View
        style={[
          styles.outer,
          isMobile ? styles.outerMobile : styles.outerDesktop,
          isMobile && {
            paddingTop: mobileTopPadding,
          },
        ]}
      >

        <View style={[styles.wrapper, isMobile && styles.wrapperMobile]}>
          <View style={[styles.left, isMobile && styles.leftMobile]}>
            <View
              style={[
                styles.badge,
                isMobile && styles.badgeMobile,
                {
                  backgroundColor: `${primaryColor}12`,
                  borderColor: `${primaryColor}28`,
                },
              ]}
            >
              <Ionicons
                name={hasClinicContext ? 'business-outline' : 'person-circle-outline'}
                size={16}
                color={primaryColor}
              />
              <Text
                style={[styles.badgeText, { color: primaryColor }]}
                numberOfLines={1}
              >
                {hasClinicContext ? clinicName : 'My Account'}
              </Text>
            </View>

            {showRolePill && (
              <View style={[styles.rolePill, isMobile && styles.rolePillMobile]}>
                <Text style={styles.rolePillText} numberOfLines={1}>
                  {roleLabel}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.right}>
            {showBackButton && (
              <Pressable
                style={[
                  styles.iconButton,
                  isMobile ? styles.iconOnlyButtonMobile : styles.actionButtonDesktop,
                ]}
                onPress={onBackPress}
              >
                <Ionicons name="arrow-back" size={18} color="#0F172A"/>
                {!isMobile && <Text style={styles.iconButtonText}>Back</Text>}
              </Pressable>
            )}

            <Pressable
              style={[
                styles.iconButton,
                isMobile ? styles.iconOnlyButtonMobile : styles.actionButtonDesktop,
                !isMobile &&
                  (menuOpen
                    ? {
                        borderColor: `${primaryColor}35`,
                        backgroundColor: `${primaryColor}10`,
                      }
                    : null),
              ]}
              onPress={() => setMenuOpen((prev) => !prev)}
            >
              {isMobile ? (
                <Ionicons name="ellipsis-horizontal" size={20} color="#0F172A"/>
              ) : (
                <>
                  <Ionicons
                    name="person-circle-outline"
                    size={18}
                    color="#0F172A"
                  />
                  <Text style={styles.iconButtonText}>Menu</Text>
                  <Ionicons
                    name={menuOpen ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={menuOpen ? primaryColor : '#64748B'}
                  />
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>

      <Modal visible={menuOpen} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setMenuOpen(false)}>
          <Pressable
            style={[
              styles.dropdown,
              isMobile && styles.dropdownMobile,
              isMobile
                ? {
                    marginTop: Math.max(insets.top, 12) + 58,
                    marginRight: 0,
                  }
                : styles.dropdownDesktop,
            ]}
            onPress={() => {}}
          >
            {!!onChangeClinic && (
              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setMenuOpen(false);
                  onChangeClinic();
                }}
              >
                <Ionicons
                  name="swap-horizontal-outline"
                  size={18}
                  color={primaryColor}
                />
                <Text style={styles.menuItemText}>Change Clinic</Text>
              </Pressable>
            )}

            <Pressable style={styles.menuItem} onPress={() => goTo('/my-profile')}>
              <Ionicons name="person-outline" size={18} color="#0F172A"/>
              <Text style={styles.menuItemText}>My Profile</Text>
            </Pressable>

            <Pressable style={styles.menuItem} onPress={() => goTo('/settings')}>
              <Ionicons name="settings-outline" size={18} color="#0F172A"/>
              <Text style={styles.menuItemText}>Settings</Text>
            </Pressable>

            <Pressable style={styles.menuItem} onPress={() => goTo('/policies')}>
              <Ionicons
                name="document-text-outline"
                size={18}
                color="#0F172A"
              />
              <Text style={styles.menuItemText}>Policies</Text>
            </Pressable>

            <Pressable style={styles.menuItem} onPress={() => goTo('/privacy')}>
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color="#0F172A"
              />
              <Text style={styles.menuItemText}>Privacy</Text>
            </Pressable>

            <Pressable style={styles.menuItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color="#DC2626"/>
              <Text style={[styles.menuItemText, styles.logoutText]}>
                Logout
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      
      </Modal>
    
    </>
  
  );

}

const styles = StyleSheet.create({

  outer: {
    zIndex: 50,
  },

  outerMobile: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
    paddingBottom: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  outerDesktop: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    marginHorizontal: -24,
    paddingHorizontal: 24,
    paddingBottom: 14,
    paddingTop: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  wrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },

  wrapperMobile: {
    flexWrap: 'nowrap',
    alignItems: 'center',
  },

  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },

  leftMobile: {
    flexWrap: 'nowrap',
  },

  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 48,
    maxWidth: 320,
  },

  badgeMobile: {
    flex: 1,
    minWidth: 0,
    maxWidth: '100%',
  },

  badgeText: {
    fontWeight: '800',
    fontSize: 14,
    flexShrink: 1,
  },

  rolePill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 48,
    justifyContent: 'center',
  },

  rolePillMobile: {
    minWidth: 96,
    alignItems: 'center',
  },

  rolePillText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 13,
  },

  iconButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionButtonDesktop: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 8,
  },

  iconOnlyButtonMobile: {
    width: 48,
    height: 48,
  },

  iconButtonText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 14,
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.25)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
  },

  dropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },

  dropdownMobile: {
    width: 240,
  },

  dropdownDesktop: {
    width: 290,
    marginTop: 84,
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