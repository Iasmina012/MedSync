import React, { useState, useRef } from 'react';
import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import NotificationsBell from './NotificationsBell';

type Props = {

  clinicId?: string;
  clinicName?: string;
  primaryColor?: string;
  roleLabel: string;
  onChangeClinic?: () => void;
  showBackButton?: boolean;
  onBackPress?: () => void;
  showRolePill?: boolean;
  canChangeClinic?: boolean;

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
  canChangeClinic = true,
}: Props) {

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);

  const menuOpacity = useRef(new Animated.Value(0)).current;
  const menuTranslateY = useRef(new Animated.Value(-8)).current;
  const menuScale = useRef(new Animated.Value(0.98)).current;

  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isMobile = width < 720;
  const isWeb = Platform.OS === 'web';

  const hasClinicContext = Boolean(clinicId || clinicName);
  const mobileTopPadding = isWeb ? 0 : Math.max(insets.top, 12);

  const openMenu = () => {
    setMenuMounted(true);
    setMenuOpen(true);

    Animated.parallel([

      Animated.timing(menuOpacity, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(menuTranslateY, {
        toValue: 0,
        duration: 160,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(menuScale, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),

    ]).start();

  };

  const closeMenu = (afterClose?: () => void) => {

    Animated.parallel([

      Animated.timing(menuOpacity, {
        toValue: 0,
        duration: 120,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(menuTranslateY, {
        toValue: -8,
        duration: 120,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(menuScale, {
        toValue: 0.98,
        duration: 120,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),

    ]).start(() => {
      setMenuOpen(false);
      setMenuMounted(false);
      afterClose?.();
    });

  };

  const toggleMenu = () => {
    if (menuOpen) {
      closeMenu();
      return;
    }

    openMenu();
  };

  const goTo = (pathname: string) => {
    closeMenu(() => {
      router.push({
        pathname: pathname as any,
        params: { clinicId, clinicName },
      });
    });
  };

  const handleLogout = async () => {
    closeMenu(async () => {
      await supabase.auth.signOut();
      router.replace('/login');
    });
  };

  const handleChangeClinic = () => {
    closeMenu(() => {
      onChangeClinic?.();
    });
  };

  const dropdownContent = (

    <View style={[styles.dropdown, isMobile && styles.dropdownMobile]}>
     {!!onChangeClinic && canChangeClinic && (
        <Pressable style={styles.menuItem} onPress={handleChangeClinic}>
          <Ionicons name="swap-horizontal-outline" size={18} color={primaryColor}/>
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
        <Ionicons name="document-text-outline" size={18} color="#0F172A"/>
        <Text style={styles.menuItemText}>Policies</Text>
      </Pressable>

      <Pressable style={styles.menuItem} onPress={() => goTo('/privacy')}>
        <Ionicons name="shield-checkmark-outline" size={18} color="#0F172A"/>
        <Text style={styles.menuItemText}>Privacy</Text>
      </Pressable>

      <Pressable style={styles.menuItem} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color="#DC2626"/>
        <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
      </Pressable>
    </View>
  
  );

  return (

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
          <NotificationsBell primaryColor={primaryColor}/>
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

          <View style={styles.menuAnchor}>
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
              onPress={toggleMenu}
            >
              {isMobile ? (
                <Ionicons name="ellipsis-horizontal" size={20} color="#0F172A"/>
              ) : (
                <>
                  <Ionicons name="person-circle-outline" size={18} color="#0F172A"/>
                  <Text style={styles.iconButtonText}>Menu</Text>
                  <Ionicons
                    name={menuOpen ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={menuOpen ? primaryColor : '#64748B'}
                  />
                </>
              )}
            </Pressable>

            {menuMounted && (
              <Animated.View
                style={[
                  styles.dropdownWrap,
                  {
                    opacity: menuOpacity,
                    transform: [
                      { translateY: menuTranslateY },
                      { scale: menuScale },
                    ],
                  },
                ]}
              >
                {dropdownContent}
              </Animated.View>
            )}
          </View>
        </View>
      </View>

    </View>
  
  );

}

const styles = StyleSheet.create({

  outer: {
    zIndex: 9999,
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
    gap: 10,
  },

  wrapperMobile: {
    alignItems: 'center',
  },

  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },

  leftMobile: {
    flex: 1,
    minWidth: 0,
  },

  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },

  menuAnchor: {
    position: 'relative',
    zIndex: 9999,
  },

  dropdownWrap: {
    position: 'absolute',
    top: '100%' as any,
    right: 0,
    marginTop: 10,
    zIndex: 9999,
  },

  dropdown: {
    width: 290,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },

  dropdownMobile: {
    width: 240,
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
    flexShrink: 1,
    flexGrow: 0,
    minWidth: 0,
    maxWidth: 280,
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
    flex: 1,
    minWidth: 92,
    alignItems: 'center',
  },

  rolePillText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
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

});