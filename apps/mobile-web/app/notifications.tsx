import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ClinicNavbar from '../src/common/ClinicNavbar';
import { supabase } from '../src/lib/supabase';
import { useClinicTheme } from '../src/lib/clinicTheme';
import { getCurrentUserProfile } from '../src/lib/auth';
import { getBackPathWithClinicFallback } from '../src/lib/navigation';

type NotificationItem = {

  id: string;
  appointment_id: string | null;
  recipient_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  deep_link: string | null;
  created_at: string;
  archived_at?: string | null;

};

function formatDate(value?: string | null) {

  if (!value) 
    return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) 
    return '';

  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', });

}

export default function NotificationsScreen() {

  const { clinicId, clinicName } = useLocalSearchParams<{ clinicId?: string; clinicName?: string; }>();

  const { theme } = useClinicTheme(clinicId);
  const { width } = useWindowDimensions();
  const isMobile = width < 720;

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('patient');
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);

  const unreadCount = items.filter((item) => !item.is_read).length;

  const loadNotifications = useCallback(async (targetUserId?: string | null) => {
    const finalUserId = targetUserId || userId;
    if (!finalUserId) 
      return;

    const { data, error } = await supabase
      .from('appointment_notifications')
      .select('*')
      .eq('recipient_id', finalUserId)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setItems((data || []) as NotificationItem[]);
  }, [userId]);

  useEffect(() => {
    const init = async () => {
      const { user, profile } = await getCurrentUserProfile();

      if (!user || !profile) {
        router.replace('/login');
        return;
      }

      setUserId(user.id);
      setRole(profile.role ?? 'patient');

      await loadNotifications(user.id);
      setLoading(false);
    };

    init();
  }, [loadNotifications]);

  useEffect(() => {
    if (!userId) 
      return;

    const channel = supabase.channel(`notifications-page-${userId}-${Date.now()}`);

    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'appointment_notifications',
        filter: `recipient_id=eq.${userId}`,
      },
      (payload) => {
        const notification = payload.new as NotificationItem;
        if (notification.archived_at) return;

        setItems((prev) => [notification, ...prev].slice(0, 50));
      }
    );

    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'appointment_notifications',
        filter: `recipient_id=eq.${userId}`,
      },
      (payload) => {
        const notification = payload.new as NotificationItem;

        if (notification.archived_at) {
          setItems((prev) => prev.filter((item) => item.id !== notification.id));
          return;
        }

        setItems((prev) =>
          prev.map((item) => (item.id === notification.id ? notification : item))
        );
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const getClinicNameForNotification = async (notification: NotificationItem) => {
    if (clinicName) 
      return String(clinicName);

    const clinicIdFromLink = notification.deep_link?.match(/clinicId=([^&]+)/)?.[1];
    if (!clinicIdFromLink) 
      return '';

    const { data } = await supabase
      .from('clinics')
      .select('name')
      .eq('id', decodeURIComponent(clinicIdFromLink))
      .maybeSingle();

    return data?.name || '';
  };

  const markAsRead = async (notification: NotificationItem) => {
    if (!notification.is_read) {
      await supabase
        .from('appointment_notifications')
        .update({ is_read: true })
        .eq('id', notification.id);

      setItems((prev) =>
        prev.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item
        )
      );
    }

    if (notification.deep_link) {
      const resolvedClinicName = await getClinicNameForNotification(notification);
      const separator = notification.deep_link.includes('?') ? '&' : '?';
      const clinicNameParam = resolvedClinicName ? `${separator}clinicName=${encodeURIComponent(resolvedClinicName)}` : '';
      router.push(`${notification.deep_link}${clinicNameParam}` as any);
    }
  };

  const markAllRead = async () => {
    if (!userId) 
      return;

    const { error } = await supabase
      .from('appointment_notifications')
      .update({ is_read: true })
      .eq('recipient_id', userId)
      .eq('is_read', false)
      .is('archived_at', null);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
  };

  const clearAll = async () => {
    if (!userId) 
      return;

    const { error } = await supabase
      .from('appointment_notifications')
      .update({ archived_at: new Date().toISOString(), is_read: true, })
      .eq('recipient_id', userId)
      .is('archived_at', null);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setItems([]);
  };

  const deleteNotification = async (notificationId: string) => {
    const { error } = await supabase
      .from('appointment_notifications')
      .update({  archived_at: new Date().toISOString(), is_read: true, })
      .eq('id', notificationId);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setItems((prev) => prev.filter((item) => item.id !== notificationId));
  };

  const confirmClearAll = () => {
    Alert.alert(
      'Clear all notifications?',
      'This will remove all notifications from your list.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear all', style: 'destructive', onPress: clearAll },
      ]
    );
  };

  const confirmDelete = (notificationId: string) => {
    Alert.alert(
      'Delete notification?',
      'This notification will be removed from your list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteNotification(notificationId),
        },
      ]
    );
  };

  const backRoute = getBackPathWithClinicFallback(role, clinicId, clinicName);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primary}/>
      </View>
    );
  }

  return (

    <ScrollView contentContainerStyle={styles.container} stickyHeaderIndices={[0]}>

      <ClinicNavbar
        clinicId={clinicId}
        clinicName={clinicName}
        primaryColor={theme.primary}
        roleLabel="Notifications"
        showRolePill={false}
        showBackButton
        onBackPress={() => router.replace(backRoute as any)}
        canChangeClinic={false}
      />

      <View style={[styles.hero, { backgroundColor: theme.soft, borderColor: theme.borderSoft }]}>
        <Text style={[styles.heroEyebrow, { color: theme.primary }]}>Notifications</Text>
        <Text style={[styles.heroTitle, { color: theme.secondary }]}>Check Appointment Updates</Text>
        <Text style={[styles.heroSubtitle]}>Review appointment reminders, cancellatons and schedule updates.</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.sectionTitle}>Recent Notifications</Text>
            <Text style={styles.sectionSubtitle}>{unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'All notifications are read'}</Text>
          </View>

          <View style={[styles.headerActions, isMobile && styles.headerActionsMobile]}>
            {unreadCount > 0 && (
              <Pressable style={[styles.headerButton, isMobile && styles.headerButtonMobile]} onPress={markAllRead}>
                <Text style={[styles.headerButtonText, { color: theme.primary }]}>Mark all as read</Text>
              </Pressable>
            )}
            {items.length > 0 && (
              <Pressable style={[styles.headerButton, isMobile && styles.headerButtonMobile]} onPress={confirmClearAll}>
                <Text style={[styles.headerButtonText, styles.dangerText]}>Clear all</Text>
              </Pressable>
            )}
          </View>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="notifications-outline" size={30} color="#94A3B8"/>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyText}>Appointment updates and reminders will appear here.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((item) => (
              <Pressable key={item.id} style={[styles.item, !item.is_read && styles.itemUnread]} onPress={() => markAsRead(item)}>
                <View style={styles.itemTop}>
                  <View style={styles.itemTitleWrap}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemDate}>{formatDate(item.created_at)}</Text>
                  </View>

                  {!item.is_read && (<View style={[styles.dot, { backgroundColor: theme.primary }]}/>)}

                  <Pressable style={styles.deleteButton} onPress={(event) => { event.stopPropagation(); confirmDelete(item.id); }}>
                    <Ionicons name="close-outline" size={18} color="#64748B"/>
                  </Pressable>
                </View>

                <Text style={styles.itemMessage}>{item.message}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

    </ScrollView>
  );

}

const styles = StyleSheet.create({

  centered: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  container: {
    flexGrow: 1,
    backgroundColor: '#F8FAFC',
    padding: 24,
    gap: 18,
  },

  hero: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 24,
  },

  heroMobile: {
    alignItems: 'center',
  },

  textCenter: {
    textAlign: 'center',
  },

  heroEyebrow: {
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 8,
  },

  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },

  heroSubtitle: {
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 22,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
    alignItems: 'flex-start',
    marginBottom: 18,
    flexWrap: 'wrap',
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },

  sectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
  },

  headerActions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },

  headerActionsMobile: {
    width: '100%',
    flexDirection: 'row',
  },

  headerButtonMobile: {
    flex: 1,
  },

  headerButton: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  headerButtonText: {
    fontSize: 12,
    fontWeight: '900',
  },

  dangerText: {
    color: '#DC2626',
  },

  emptyBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
  },

  emptyTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },

  emptyText: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 20,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '700',
  },

  list: {
    gap: 10,
  },

  item: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 8,
  },

  itemUnread: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },

  itemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },

  itemTitleWrap: {
    flex: 1,
  },

  itemTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
  },

  itemMessage: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },

  itemDate: {
    marginTop: 3,
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },

  dot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    marginTop: 5,
  },

  deleteButton: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },

});