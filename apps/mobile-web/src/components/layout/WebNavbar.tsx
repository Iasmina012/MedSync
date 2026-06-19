import React, { useEffect, useState, useRef } from 'react';
import { router, usePathname } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View, Animated, Easing, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

const BRAND = {

  primary: '#1D4ED8',
  secondary: '#0F172A',
  border: 'rgba(226,232,240,0.55)',
  text: '#0F172A',
  muted: '#475569',
  glass: 'rgba(255,255,255,0.56)',
  glassScrolled: 'rgba(255,255,255,0.68)',

};

function NavItem({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {

  const [hovered, setHovered] = useState(false);

  return (

    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        styles.navItem,
        active && styles.navItemActive,
        hovered && styles.navItemHover,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.navItemText, active && styles.navItemTextActive]}>
        {label}
      </Text>
    </Pressable>
  
  );

}

export default function WebNavbar() {

  const pathname = usePathname();

  const [scrolled, setScrolled] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);

  const menuOpacity = useRef(new Animated.Value(0)).current;
  const menuTranslateY = useRef(new Animated.Value(-8)).current;
  const menuScale = useRef(new Animated.Value(0.98)).current;

  useEffect(() => {

    if (Platform.OS !== 'web') return;

    const handleScroll = () => {
      setScrolled(window.scrollY > 12);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };

  }, []);

  useEffect(() => {

    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setIsAuthenticated(!!session);
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
          setIsAuthenticated(!!session);
          setMenuOpen(false);
          setMenuMounted(false);
        });

    return () => {
      subscription.unsubscribe();
    };

  }, []);

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

  const handleLogout = async () => {
    closeMenu(async () => {
      await supabase.auth.signOut();
      router.replace('/login');
    });
  };

  const goTo = (pathnameToGo: string) => {
    closeMenu(() => {
      router.push(pathnameToGo as any);
    });
  };

  const isClinicsActive = pathname === '/clinic-selection';

  return (

    <View style={[styles.outer, scrolled && styles.outerScrolled]}>

      <View style={[styles.wrapper, scrolled && styles.wrapperScrolled]}>
        <Pressable style={styles.brandWrap} onPress={() => router.push('/')}>
          <View style={styles.logoCircle}>
            <View style={styles.logoInner}>
              <Image source={require('../../../assets/images/logo.png')} style={styles.logoIcon}/>
            </View>
          </View>

          <View>
            <Text style={styles.brandTitle}>MedSync</Text>
            <Text style={styles.brandSubtitle}>
              Connected Healthcare
            </Text>
          </View>
        </Pressable>

        <View style={styles.linksRow}>
          <NavItem
            label="Home"
            active={pathname === '/'}
            onPress={() => router.push('/')}
          />

          <NavItem
            label="About"
            active={pathname === '/about'}
            onPress={() => router.push('/about')}
          />

          <NavItem
            label="Contact"
            active={pathname === '/contact'}
            onPress={() => router.push('/contact')}
          />

          {isAuthenticated && (
            <NavItem
              label="Clinics"
              active={isClinicsActive}
              onPress={() => router.push('/clinic-selection')}
            />
          )}

          {!isAuthenticated ? (
            <>
              <NavItem
                label="Login"
                active={pathname === '/login'}
                onPress={() => router.push('/login')}
              />

              <Pressable
                onPress={() => router.push('/signup')}
                style={({ pressed }) => [
                  styles.actionButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.actionButtonText}>Sign Up</Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.menuWrap}>
              <Pressable
                onPress={toggleMenu}
                style={({ pressed }) => [
                  styles.menuTrigger,
                  menuOpen && styles.menuTriggerActive,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name="person-circle-outline"
                  size={18}
                  color={menuOpen ? BRAND.primary : BRAND.text}
                />
                <Text
                  style={[
                    styles.menuTriggerText,
                    menuOpen && styles.menuTriggerTextActive,
                  ]}
                >
                  Menu
                </Text>
                <Ionicons
                  name={menuOpen ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={menuOpen ? BRAND.primary : BRAND.muted}
                />
              </Pressable>

              {menuMounted && (
                <Animated.View
                  style={[
                    styles.dropdown,
                    {
                      opacity: menuOpacity,
                      transform: [
                        { translateY: menuTranslateY },
                        { scale: menuScale },
                      ],
                    },
                  ]}
                >
                  <Pressable
                    style={styles.dropdownItem}
                    onPress={() => goTo('/my-profile')}
                  >
                    <Ionicons name="person-outline" size={18} color="#0F172A"/>
                    <Text style={styles.dropdownItemText}>My Profile</Text>
                  </Pressable>

                  <Pressable
                    style={styles.dropdownItem}
                    onPress={() => goTo('/settings')}
                  >
                    <Ionicons name="settings-outline" size={18} color="#0F172A"/>
                    <Text style={styles.dropdownItemText}>Settings</Text>
                  </Pressable>

                  <Pressable
                    style={styles.dropdownItem}
                    onPress={() => goTo('/policies')}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={18}
                      color="#0F172A"
                    />
                    <Text style={styles.dropdownItemText}>Policies</Text>
                  </Pressable>

                  <Pressable
                    style={styles.dropdownItem}
                    onPress={() => goTo('/privacy')}
                  >
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={18}
                      color="#0F172A"
                    />
                    <Text style={styles.dropdownItemText}>Privacy</Text>
                  </Pressable>

                  <Pressable style={styles.dropdownItem} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={18} color="#DC2626"/>
                    <Text style={[styles.dropdownItemText, { color: '#DC2626' }]}>
                      Logout
                    </Text>
                  </Pressable>
                </Animated.View>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  
  );

}

const styles = StyleSheet.create({

  outer: {
    position: 'sticky' as any,
    top: 0,
    zIndex: 999,
    paddingTop: 14,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },

  outerScrolled: {
    paddingTop: 10,
  },

  wrapper: {
    maxWidth: 1380,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BRAND.glass,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },

  wrapperScrolled: {
    backgroundColor: BRAND.glassScrolled,
    shadowOpacity: 0.1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 16 },
  },

  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  logoCircle: {
    width: 65,
    height: 65,
    borderRadius: 999,
    backgroundColor: 'rgba(219,234,254,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoInner: {
    width: 45,
    height: 45,
    borderRadius: 999,
    backgroundColor: 'rgba(186, 216, 255, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoIcon: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
  },

  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: BRAND.text,
  },

  brandSubtitle: {
    fontSize: 12,
    color: BRAND.muted,
    marginTop: 2,
  },

  linksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  navItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },

  navItemHover: {
    backgroundColor: 'rgba(239,246,255,0.95)',
    transform: [{ translateY: -1 }],
  },

  navItemActive: {
    backgroundColor: '#DBEAFE',
  },

  navItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: BRAND.text,
  },

  navItemTextActive: {
    color: BRAND.primary,
  },

  actionButton: {
    backgroundColor: BRAND.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },

  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  menuWrap: {
    position: 'relative',
    zIndex: 9999,
  },

  menuTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: BRAND.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },

  menuTriggerActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },

  menuTriggerText: {
    fontSize: 15,
    fontWeight: '700',
    color: BRAND.text,
  },

  menuTriggerTextActive: {
    color: BRAND.primary,
  },

  dropdown: {
    position: 'absolute',
    top: '100%' as any,
    right: 0,
    marginTop: 10,
    width: 290,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    paddingVertical: 8,
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
    zIndex: 9999,
  },

  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  dropdownItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },

  pressed: {
    opacity: 0.9,
  },

});