import React, { useCallback, useEffect, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";

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
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationsBell({
  primaryColor = "#1D4ED8",
}: {
  primaryColor?: string;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NotificationItem | null>(
    null
  );

  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(-8)).current;

  const unreadCount = items.filter((item) => !item.is_read).length;

  const loadNotifications = useCallback(
    async (targetUserId?: string | null) => {
        const finalUserId = targetUserId || userId;
        if (!finalUserId) return;

        const { data, error } = await supabase
        .from("appointment_notifications")
        .select("*")
        .eq("recipient_id", finalUserId)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(20);

        if (error) {
        console.log("Notifications load error:", error.message);
        return;
        }

        setItems((data || []) as NotificationItem[]);
    },
    [userId]
  );

  useEffect(() => {
    const init = async () => {
        const {
        data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        setUserId(user.id);
        await loadNotifications(user.id);
    };

    init();
  }, [loadNotifications]);

  useEffect(() => {
    if (!userId) return;

    const existingChannels = supabase.getChannels();

    existingChannels
      .filter((channel: any) =>
        String(channel.topic || "").includes(`notifications-${userId}`)
      )
      .forEach((channel) => {
        supabase.removeChannel(channel);
      });

    const channel = supabase.channel(`notifications-${userId}-${Date.now()}`);

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "appointment_notifications",
        filter: `recipient_id=eq.${userId}`,
      },
      (payload) => {
        const notification = payload.new as NotificationItem;

        if (notification.archived_at) return;

        setItems((prev) => [notification, ...prev].slice(0, 20));
      }
    );

    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "appointment_notifications",
        filter: `recipient_id=eq.${userId}`,
      },
      (payload) => {
        const notification = payload.new as NotificationItem;

        if (notification.archived_at) {
          setItems((prev) =>
            prev.filter((item) => item.id !== notification.id)
          );
          return;
        }

        setItems((prev) =>
          prev.map((item) =>
            item.id === notification.id ? notification : item
          )
        );
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const openDropdown = () => {
    setMounted(true);
    setOpen(true);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 160,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeDropdown = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 120,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -8,
        duration: 120,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setOpen(false);
      setMounted(false);
    });
  };

  const toggle = () => {
    if (open) closeDropdown();
    else openDropdown();
  };

  const markAsRead = async (notification: NotificationItem) => {
    if (!notification.is_read) {
      await supabase
        .from("appointment_notifications")
        .update({ is_read: true })
        .eq("id", notification.id);

      setItems((prev) =>
        prev.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item
        )
      );
    }

    if (notification.deep_link) {
      closeDropdown();
      router.push(notification.deep_link as any);
    }
  };

  const markAllRead = async () => {
    if (!userId) return;

    const { error } = await supabase
      .from("appointment_notifications")
      .update({ is_read: true })
      .eq("recipient_id", userId)
      .eq("is_read", false)
      .is("archived_at", null);

    if (error) {
      console.log("Mark all read error:", error.message);
      return;
    }

    setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
  };

  const clearAll = async () => {
    if (!userId) return;

    const { error } = await supabase
      .from("appointment_notifications")
      .update({
        archived_at: new Date().toISOString(),
        is_read: true,
      })
      .eq("recipient_id", userId)
      .is("archived_at", null);

    if (error) {
      console.log("Clear notifications error:", error.message);
      return;
    }

    setItems([]);
    closeDropdown();
  };

  const deleteNotification = async (notificationId: string) => {
    const { error } = await supabase
      .from("appointment_notifications")
      .update({
        archived_at: new Date().toISOString(),
        is_read: true,
      })
      .eq("id", notificationId);

    if (error) {
      console.log("Delete notification error:", error.message);
      return;
    }

    setItems((prev) => prev.filter((item) => item.id !== notificationId));
  };

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.button} onPress={toggle}>
        <Ionicons name="notifications-outline" size={19} color="#0F172A" />

        {unreadCount > 0 && (
          <View style={[styles.badge, { backgroundColor: primaryColor }]}>
            <Text style={styles.badgeText}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </Text>
          </View>
        )}
      </Pressable>

      {mounted && (
        <Animated.View
          style={[
            styles.dropdown,
            {
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Notifications</Text>

            <View style={styles.headerActions}>
              {unreadCount > 0 && (
                <Pressable onPress={markAllRead}>
                  <Text style={[styles.markAll, { color: primaryColor }]}>
                    Mark all read
                  </Text>
                </Pressable>
              )}

              {items.length > 0 && (
                <Pressable onPress={() => setClearConfirmOpen(true)}>
                  <Text style={[styles.markAll, { color: "#DC2626" }]}>
                    Clear all
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
          >
            {items.length === 0 ? (
              <Text style={styles.emptyText}>No notifications yet.</Text>
            ) : (
              items.map((item) => (
                <Pressable
                  key={item.id}
                  style={[styles.item, !item.is_read && styles.itemUnread]}
                  onPress={() => markAsRead(item)}
                >
                  <View style={styles.itemTop}>
                    <Text style={styles.itemTitle}>{item.title}</Text>

                    {!item.is_read && (
                      <View
                        style={[styles.dot, { backgroundColor: primaryColor }]}
                      />
                    )}

                    <Pressable
                      style={styles.deleteButton}
                      onPress={(event) => {
                        event.stopPropagation();
                        setDeleteTarget(item);
                      }}
                    >
                      <Ionicons
                        name="close-outline"
                        size={16}
                        color="#64748B"
                      />
                    </Pressable>
                  </View>

                  <Text style={styles.itemMessage}>{item.message}</Text>
                  <Text style={styles.itemDate}>
                    {formatDate(item.created_at)}
                  </Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </Animated.View>
      )}

      <Modal visible={clearConfirmOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Clear all notifications?</Text>
            <Text style={styles.modalText}>
              This will remove all notifications from your bell.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setClearConfirmOpen(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={styles.modalConfirmButton}
                onPress={async () => {
                  setClearConfirmOpen(false);
                  await clearAll();
                }}
              >
                <Text style={styles.modalConfirmText}>Clear all</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!deleteTarget} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete notification?</Text>
            <Text style={styles.modalText}>
              This notification will be removed from your bell.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setDeleteTarget(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={styles.modalConfirmButton}
                onPress={async () => {
                  if (!deleteTarget) return;

                  const id = deleteTarget.id;
                  setDeleteTarget(null);
                  await deleteNotification(id);
                }}
              >
                <Text style={styles.modalConfirmText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    zIndex: 9999,
  },

  button: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },

  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 19,
    height: 19,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },

  dropdown: {
    position: "absolute",
    top: "100%" as any,
    right: 0,
    marginTop: 10,
    width: 340,
    maxHeight: 430,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
    overflow: "hidden",
  },

  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  title: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "900",
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  markAll: {
    fontSize: 12,
    fontWeight: "900",
  },

  list: {
    maxHeight: 360,
  },

  listContent: {
    padding: 10,
    gap: 8,
  },

  emptyText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "700",
    padding: 12,
  },

  item: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 12,
    gap: 5,
  },

  itemUnread: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },

  itemTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  itemTitle: {
    flex: 1,
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },

  deleteButton: {
    width: 26,
    height: 26,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },

  itemMessage: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },

  itemDate: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 22,
  },

  modalTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
  },

  modalText: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "700",
    marginBottom: 18,
  },

  modalActions: {
    flexDirection: "row",
    gap: 10,
  },

  modalCancelButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },

  modalCancelText: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
  },

  modalConfirmButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 999,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },

  modalConfirmText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
});
