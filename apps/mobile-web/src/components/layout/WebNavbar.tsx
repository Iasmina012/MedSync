import React, { useEffect, useState } from 'react';
import { router, usePathname } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View, } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

const BRAND = {
  primary: '#1D4ED8',
  secondary: '#0F172A',
  border: 'rgba(226,232,240,0.9)',
  text: '#0F172A',
  muted: '#475569',
  glass: 'rgba(255,255,255,0.78)',
};

function NavItem({label, active, onPress,}: {label: string; active?: boolean; onPress: () => void;}) {
  
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
    });

    return () => {
      subscription.unsubscribe();
    };

  }, []);

  const handleLogout = async () => {

    await supabase.auth.signOut();
    router.replace('/login');

  };

  const isClinicsActive = pathname === '/clinic-selection';

  return (

    <View style={[styles.outer, scrolled && styles.outerScrolled]}>
      
      <View style={[styles.wrapper, scrolled && styles.wrapperScrolled]}>
        <Pressable style={styles.brandWrap} onPress={() => router.push('/')}>
          <View style={styles.logoCircle}>
            <View style={styles.logoInner}>
              <Ionicons name="pulse-outline" size={20} color="#FFFFFF"/>
            </View>
          </View>

          <View>
            <Text style={styles.brandTitle}>MedSync</Text>
            <Text style={styles.brandSubtitle}>
              Multi-Clinic Medical Platform
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

          {isAuthenticated ? (
            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.actionButtonText}>Logout</Text>
            </Pressable>
          ) : (
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
    backgroundColor: 'rgba(255,255,255,0.80)',
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  wrapperScrolled: {
    backgroundColor: BRAND.glass,
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
  },

  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  logoCircle: {
    width: 50,
    height: 50,
    borderRadius: 999,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoInner: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: BRAND.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: '#EFF6FF',
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

  pressed: {
    opacity: 0.9,
  },

});