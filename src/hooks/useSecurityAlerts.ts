import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string | null;
  detected_at: string | null;
}

const ALERT_SOUNDS = {
  critical: [880, 0.3, 660, 0.3, 880, 0.3], // Urgent beeping pattern
  high: [660, 0.4, 550, 0.4], // Warning tone
};

export const useSecurityAlerts = (enabled: boolean = true) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const notificationPermissionRef = useRef<NotificationPermission>("default");

  // Initialize audio context
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  // Play alert sound
  const playAlertSound = useCallback((severity: "critical" | "high") => {
    try {
      const ctx = getAudioContext();
      const pattern = ALERT_SOUNDS[severity];
      let time = ctx.currentTime;

      for (let i = 0; i < pattern.length; i += 2) {
        const frequency = pattern[i] as number;
        const duration = pattern[i + 1] as number;

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = severity === "critical" ? "square" : "sine";

        gainNode.gain.setValueAtTime(0.3, time);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration);

        oscillator.start(time);
        oscillator.stop(time + duration);

        time += duration + 0.05;
      }
    } catch (error) {
      console.error("Error playing alert sound:", error);
    }
  }, [getAudioContext]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      console.log("Browser doesn't support notifications");
      return false;
    }

    if (Notification.permission === "granted") {
      notificationPermissionRef.current = "granted";
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      notificationPermissionRef.current = permission;
      return permission === "granted";
    }

    return false;
  }, []);

  // Send browser notification
  const sendBrowserNotification = useCallback((event: SecurityEvent) => {
    if (notificationPermissionRef.current !== "granted") return;

    const severityEmoji = event.severity === "critical" ? "🚨" : "⚠️";
    const title = `${severityEmoji} ${event.severity.toUpperCase()} Security Alert`;
    
    const notification = new Notification(title, {
      body: `${event.event_type}: ${event.description || "Security event detected"}`,
      icon: "/logo.png",
      tag: event.id,
      requireInteraction: event.severity === "critical",
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto-close after 10 seconds for high severity
    if (event.severity === "high") {
      setTimeout(() => notification.close(), 10000);
    }
  }, []);

  // Handle incoming security event
  const handleSecurityEvent = useCallback((event: SecurityEvent) => {
    if (event.severity !== "critical" && event.severity !== "high") return;

    // Play sound alert
    playAlertSound(event.severity);

    // Send browser notification
    sendBrowserNotification(event);

    // Show toast notification
    const toastFn = event.severity === "critical" ? toast.error : toast.warning;
    toastFn(`${event.severity.toUpperCase()}: ${event.event_type}`, {
      description: event.description || "Security event detected",
      duration: event.severity === "critical" ? 10000 : 5000,
    });
  }, [playAlertSound, sendBrowserNotification]);

  // Set up real-time subscription
  useEffect(() => {
    if (!enabled) return;

    // Request permission on mount
    requestNotificationPermission();

    const channel = supabase
      .channel("security-alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "security_events",
        },
        (payload) => {
          const event = payload.new as SecurityEvent;
          handleSecurityEvent(event);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [enabled, handleSecurityEvent, requestNotificationPermission]);

  return {
    requestNotificationPermission,
    playAlertSound,
  };
};
